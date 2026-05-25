/**
 * Declarative service handler interpreter.
 *
 * A service can be defined as a JSON schema instead of imperative Playwright
 * code. The schema describes locators + actions + conditions, and this
 * module turns it into the same { id, version, healthLocators, adapter,
 * handler } contract that runner/lib/services/*.js modules export.
 *
 * Schema shape (see ec2.schema.json for a worked example):
 *
 *   {
 *     "id": "ec2",
 *     "version": "0.2.0",
 *     "defaults": { "pricing": "on_demand" },
 *     "transforms": { "os": { "type": "map", "values": { ... } } },
 *     "healthLocators": [ { role, name, label } | { css, label } ],
 *     "steps": [ { action: <type>, when?: <expr>, ...args }, ... ]
 *   }
 *
 * Actions implemented (matches the EC2 discovery matrix; SageMaker primitives
 * like select_combobox / toggle_checkbox_data_id will be added when we port
 * that family):
 *
 *   fill                       — role|css + name + value
 *   click                      — role|css + name
 *   select_dropdown            — open a CloudScape select button, click option
 *   check_checkbox             — set checkbox to desired state idempotently
 *   wait_ms                    — fixed delay
 *   wait_for_text              — poll body innerText for a regex
 *   scroll                     — mouse wheel by dy
 *   press_key                  — keyboard.press
 *   fill_if_visible            — tolerant fill, skip when locator absent
 *   expand_section             — click only if aria-expanded != "true"
 *   search_and_pick_first_row  — composite: fill search + click first row radio
 *
 * Conditions: a step's `when` is evaluated by a small purpose-built parser
 * (see evalWhen) supporting identifiers, literals, comparisons (===, !==,
 * ==, !=, >, <, >=, <=), and logical && / ||. No arbitrary JS is executed,
 * so schemas remain safe to load from disk.
 *
 * Value interpolation: any string field can contain `{param_name}` tokens
 * that resolve from the same context.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function loadSchema(url) {
  const path = typeof url === "string" ? url : fileURLToPath(url);
  return JSON.parse(readFileSync(path, "utf8"));
}

function compileName(name) {
  if (name == null) return undefined;
  if (typeof name === "string") return name;
  if (typeof name === "object" && typeof name.regex === "string") {
    return new RegExp(name.regex, name.flags || "");
  }
  throw new Error(`unsupported name shape: ${JSON.stringify(name)}`);
}

function buildLocator(page, spec) {
  let loc;
  if (spec.css) {
    loc = page.locator(spec.css);
  } else if (spec.role) {
    const name = compileName(spec.name);
    loc =
      name !== undefined
        ? page.getByRole(spec.role, { name })
        : page.getByRole(spec.role);
  } else {
    throw new Error(`locator needs role or css: ${JSON.stringify(spec)}`);
  }
  if (spec.first) loc = loc.first();
  else if (typeof spec.nth === "number") loc = loc.nth(spec.nth);
  return loc;
}

function interpolate(value, ctx) {
  if (typeof value !== "string") return value;
  return value.replace(/\{([a-z_][a-z0-9_.]*)\}/gi, (_, key) => {
    const parts = key.split(".");
    let v = ctx;
    for (const p of parts) v = v == null ? undefined : v[p];
    return v == null ? "" : String(v);
  });
}

function applyDefaults(params, defaults) {
  const out = { ...params };
  for (const [k, v] of Object.entries(defaults ?? {})) {
    if (out[k] === undefined || out[k] === null) out[k] = v;
  }
  return out;
}

function applyTransforms(params, transforms) {
  const out = { ...params };
  for (const [key, t] of Object.entries(transforms ?? {})) {
    if (t.type === "map" && out[key] != null) {
      const mapped = t.values?.[out[key]];
      if (mapped !== undefined) out[key] = mapped;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mini expression evaluator for `when` clauses
//
// Grammar (recursive descent):
//   or   := and ('||' and)*
//   and  := cmp ('&&' cmp)*
//   cmp  := unary (('==='|'!=='|'=='|'!='|'>='|'<='|'>'|'<') unary)?
//   unary:= '!' unary | primary
//   prim := number | string | 'null' | 'true' | 'false' | ident | '(' or ')'
//
// We intentionally do NOT support arithmetic, function calls, member access,
// or assignment. Anything outside that grammar throws a parse error.
// ---------------------------------------------------------------------------
function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(" || c === ")" || c === ".") { out.push({ t: c }); i++; continue; }
    if (c === "!" || c === "=" || c === "<" || c === ">" || c === "&" || c === "|") {
      const two = src.slice(i, i + 3);
      if (two === "===" || two === "!==") { out.push({ t: two }); i += 3; continue; }
      const one = src.slice(i, i + 2);
      if (one === "==" || one === "!=" || one === ">=" || one === "<=" || one === "&&" || one === "||") {
        out.push({ t: one });
        i += 2;
        continue;
      }
      if (c === "!" || c === "<" || c === ">") {
        out.push({ t: c });
        i++;
        continue;
      }
      throw new Error(`bad operator at: ${src.slice(i)}`);
    }
    if (c === "'" || c === '"') {
      const q = c;
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") j += 2; else j++;
      }
      if (j >= src.length) throw new Error("unterminated string");
      out.push({ t: "str", v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: "num", v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (word === "null") out.push({ t: "lit", v: null });
      else if (word === "true") out.push({ t: "lit", v: true });
      else if (word === "false") out.push({ t: "lit", v: false });
      else out.push({ t: "ident", v: word });
      i = j;
      continue;
    }
    throw new Error(`unexpected char '${c}' at: ${src.slice(i)}`);
  }
  return out;
}

function makeParser(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (t) => {
    const tok = tokens[pos];
    if (!tok || tok.t !== t) throw new Error(`expected ${t}, got ${tok ? tok.t : "EOF"}`);
    pos++;
    return tok;
  };

  function parseOr() {
    let node = parseAnd();
    while (peek()?.t === "||") {
      eat("||");
      node = { op: "||", l: node, r: parseAnd() };
    }
    return node;
  }
  function parseAnd() {
    let node = parseCmp();
    while (peek()?.t === "&&") {
      eat("&&");
      node = { op: "&&", l: node, r: parseCmp() };
    }
    return node;
  }
  function parseCmp() {
    const left = parseUnary();
    const tok = peek();
    if (tok && ["===", "!==", "==", "!=", ">=", "<=", ">", "<"].includes(tok.t)) {
      pos++;
      const right = parseUnary();
      return { op: tok.t, l: left, r: right };
    }
    return left;
  }
  function parseUnary() {
    if (peek()?.t === "!") {
      eat("!");
      return { op: "!", r: parseUnary() };
    }
    return parsePrim();
  }
  function parsePrim() {
    const tok = peek();
    if (!tok) throw new Error("unexpected EOF");
    let node;
    if (tok.t === "(") {
      eat("(");
      node = parseOr();
      eat(")");
    } else if (tok.t === "num" || tok.t === "str" || tok.t === "lit") {
      pos++;
      node = { lit: tok.v };
    } else if (tok.t === "ident") {
      pos++;
      node = { id: tok.v };
    } else {
      throw new Error(`unexpected token: ${tok.t}`);
    }
    // Member access chain: foo.bar.baz
    while (peek()?.t === ".") {
      eat(".");
      const m = eat("ident");
      node = { op: ".", obj: node, prop: m.v };
    }
    return node;
  }

  return { parse: () => { const n = parseOr(); if (pos !== tokens.length) throw new Error("trailing tokens"); return n; } };
}

function evalAst(node, ctx) {
  if ("lit" in node) return node.lit;
  if ("id" in node) return ctx[node.id];
  if (node.op === ".") {
    const obj = evalAst(node.obj, ctx);
    return obj == null ? undefined : obj[node.prop];
  }
  if (node.op === "!") return !evalAst(node.r, ctx);
  if (node.op === "&&") return evalAst(node.l, ctx) && evalAst(node.r, ctx);
  if (node.op === "||") return evalAst(node.l, ctx) || evalAst(node.r, ctx);
  const l = evalAst(node.l, ctx);
  const r = evalAst(node.r, ctx);
  switch (node.op) {
    case "===": return l === r;
    case "!==": return l !== r;
    case "==": return l == r;
    case "!=": return l != r;
    case ">": return l > r;
    case "<": return l < r;
    case ">=": return l >= r;
    case "<=": return l <= r;
    default: throw new Error(`bad op ${node.op}`);
  }
}

const exprCache = new Map();
function evalWhen(expr, ctx) {
  if (!expr) return true;
  let ast = exprCache.get(expr);
  if (!ast) {
    ast = makeParser(tokenize(expr)).parse();
    exprCache.set(expr, ast);
  }
  return Boolean(evalAst(ast, ctx));
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function dispatchAction(page, step, ctx) {
  switch (step.action) {
    case "fill": {
      const loc = buildLocator(page, step);
      await loc.fill(String(interpolate(step.value, ctx)));
      return;
    }

    case "click": {
      const loc = buildLocator(page, step);
      await loc.click(step.force ? { force: true } : undefined);
      return;
    }

    case "select_dropdown": {
      const trigger = buildLocator(page, step.trigger);
      await trigger.click();
      await page.waitForTimeout(step.open_wait_ms ?? 500);
      const optionName = interpolate(step.option, ctx);
      const option = page
        .getByRole("option", {
          name: new RegExp(`^${escapeRegex(optionName)}$`, "i"),
        })
        .first();
      await option.click();
      await page.waitForTimeout(step.settle_ms ?? 300);
      return;
    }

    case "check_checkbox": {
      const loc = buildLocator(page, step);
      const want = step.value === undefined ? true : Boolean(step.value);
      const checked = await loc.isChecked().catch(() => false);
      if (checked !== want) {
        // Some CloudScape checkbox variants wrap the native input in a span
        // that intercepts pointer events (e.g. the Bedrock provider grid:
        // `<span data-id="amazon" class="...prevented">` intercepts the
        // click). Honour `force: true` on the step to bypass actionability.
        await loc.click(step.force ? { force: true } : undefined);
      }
      return;
    }

    case "wait_ms":
      await page.waitForTimeout(step.ms);
      return;

    case "wait_for_text":
      await page.waitForFunction(
        ({ pattern, flags }) =>
          new RegExp(pattern, flags).test(document.body.innerText),
        { pattern: step.pattern, flags: step.flags || "" },
        { timeout: step.timeout_ms ?? 10000 },
      );
      return;

    case "scroll":
      await page.mouse.wheel(0, step.dy ?? 0);
      return;

    case "press_key":
      await page.keyboard.press(step.key);
      return;

    case "fill_if_visible": {
      const loc = buildLocator(page, step);
      const visible = await loc
        .isVisible({ timeout: step.timeout_ms ?? 1500 })
        .catch(() => false);
      if (visible) {
        await loc.fill(String(interpolate(step.value, ctx)));
      }
      return;
    }

    case "expand_section": {
      const loc = buildLocator(page, step);
      const expanded =
        (await loc.getAttribute("aria-expanded").catch(() => null)) === "true";
      if (!expanded) {
        await loc.click();
        await page.waitForTimeout(step.settle_ms ?? 400);
      }
      return;
    }

    case "search_and_pick_first_row": {
      const search = buildLocator(page, step.search);
      await search.fill(String(interpolate(step.value, ctx)));
      await page.waitForTimeout(step.settle_ms ?? 1500);
      const row = page.locator(step.row_css).first();
      await row.click();
      await page.waitForTimeout(step.click_wait_ms ?? 500);
      return;
    }

    case "select_combobox": {
      // CloudScape autocomplete: a role=combobox where the user types text,
      // matching options appear, and selection commits only via keyboard
      // (Enter). A bare `option.click()` does NOT persist into React state,
      // so the saved estimate would later fail to recompute. ArrowDown +
      // Enter is the reliable path.
      const combo = buildLocator(page, step);
      const value = String(interpolate(step.value, ctx));
      await combo.fill(value);
      await page.waitForTimeout(step.match_wait_ms ?? 700);
      await combo.press("ArrowDown");
      await page.waitForTimeout(200);
      await combo.press("Enter");
      await page.waitForTimeout(step.settle_ms ?? 600);
      return;
    }

    case "toggle_checkbox_data_id": {
      // Native input.click() under data-id wrappers, one at a time, with
      // verify-retry. Used by SageMaker-style forms where CloudScape wraps
      // each input in a span.prevented that swallows role-based clicks.
      // `targets` is an object { dataId: desiredBoolean, ... }.
      const targets = step.targets ?? {};
      const ids = Object.keys(targets);
      if (!ids.length) return;

      // Wait for at least one wrapper's React fiber to bind onChange so the
      // click is not a silent no-op during initial hydration.
      await page
        .waitForFunction(
          (targetIds) =>
            targetIds.some((id) => {
              const wrap = document.querySelector(`[data-id="${id}"]`);
              const input = wrap?.querySelector('input[type="checkbox"]');
              if (!input) return false;
              const fiberKey = Object.keys(input).find((k) =>
                k.startsWith("__reactProps$"),
              );
              return Boolean(fiberKey && input[fiberKey]?.onChange);
            }),
          ids,
          { timeout: step.hydration_timeout_ms ?? 10000 },
        )
        .catch(() => {});

      for (const [dataId, want] of Object.entries(targets)) {
        for (let attempt = 0; attempt < (step.retries ?? 3); attempt++) {
          const state = await page.evaluate(
            ({ dataId, want }) => {
              const wrap = document.querySelector(`[data-id="${dataId}"]`);
              const input = wrap?.querySelector('input[type="checkbox"]');
              if (!input) return { found: false };
              if (!!input.checked !== !!want) input.click();
              return { found: true, after: input.checked };
            },
            { dataId, want },
          );
          await page.waitForTimeout(step.inter_click_ms ?? 500);
          if (!state.found || state.after === !!want) break;
        }
      }
      return;
    }

    default:
      throw new Error(`unknown action: ${step.action}`);
  }
}

export async function executeSchema(page, schema, params) {
  const withDefaults = applyDefaults(params, schema.defaults);
  const ctx = applyTransforms(withDefaults, schema.transforms);
  for (const step of schema.steps ?? []) {
    if (!evalWhen(step.when, ctx)) continue;
    await dispatchAction(page, step, ctx);
  }
}

// Same execution shape as executeSchema but for a standalone step list with
// no params context — used by the health probe to run a prerequisite that
// puts the wizard into the state the health_locators expect.
export async function executeSteps(page, steps, params = {}) {
  for (const step of steps ?? []) {
    if (!evalWhen(step.when, params)) continue;
    await dispatchAction(page, step, params);
  }
}

// Convenience: build the { id, version, healthLocators, healthPrerequisite,
// adapter, handler } shape a service module needs to export. The adapter is
// identity (the interpreter consumes snake_case params directly via {token}
// interpolation), and the handler delegates to executeSchema(). The optional
// healthPrerequisite mirrors the prelude steps so the daily health probe
// can put the wizard into the state the locators expect.
export function buildServiceFromSchema(schema) {
  const out = {
    id: schema.id,
    version: schema.version,
    healthLocators: schema.healthLocators ?? [],
    adapter: (params) => params,
    handler: (page, config) => executeSchema(page, schema, config),
  };
  if (Array.isArray(schema.healthPrerequisiteSteps) && schema.healthPrerequisiteSteps.length) {
    out.healthPrerequisite = (page) =>
      executeSteps(page, schema.healthPrerequisiteSteps);
  }
  return out;
}

// Exported for tests.
export const _internals = { tokenize, makeParser, evalAst, evalWhen, interpolate, applyDefaults, applyTransforms };
