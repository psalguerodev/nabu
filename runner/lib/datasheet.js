/**
 * YAML datasheet loader for service definitions.
 *
 * A datasheet (see runner/lib/services/ec2.yaml) is the single source of
 * truth for a service — describing both:
 *   • what the schema accepts (fields + types + enums + defaults)
 *   • how the runner navigates the wizard (flow + ui hints per field)
 *
 * This module reads the YAML, resolves any `extends:` parent chain and
 * `$include:` snippets, then compiles the (fields + flow) pair into the
 * primitive step list declarative.js executes.
 *
 * Composition primitives:
 *
 *   extends: <relative_path>
 *     Inherit from a parent datasheet. Merge rules:
 *       - fields:           concat; child wins on duplicate id
 *       - flow:             parent.flow_prelude + child.flow + parent.flow_postlude
 *       - health_locators:  concat
 *       - all other keys:   shallow override (child wins)
 *     Parents can themselves extend further — chain is resolved recursively.
 *
 *   $include: <relative_path>
 *     Inline a YAML snippet at this position. Resolved relative to the
 *     including file. Useful for cross-service blocks like region modal.
 *
 *   activates: { <dataId>: <bool>, ... }
 *     Convention used by family bases (see sagemaker/_base.yaml). The
 *     parent's flow_prelude can reference this via a step like
 *       { action: toggle_checkbox_data_id, targets_field: activates }
 *     and the compiler substitutes the child's `activates` map at the
 *     `targets` slot.
 *
 * Compilation rules per ui.kind:
 *
 *   dropdown      → one `select_dropdown` step per enum option, gated by
 *                   `<field> == '<value>'`. Mapping value → label uses the
 *                   field's options[].label.
 *   radio         → one `click` step (role=radio) per enum option, same gate.
 *   checkbox      → `check_checkbox` step, value taken from the field.
 *   number / text → `fill` step with value `{<field_id>}`.
 *   search_table  → `search_and_pick_first_row`, optionally followed by a
 *                   `verify_text` if the field has `verify_match: true`.
 *   region_modal  → no step emitted (the runner handles regions separately).
 *   section       → no step (container — children are applied via dotted
 *                   path in the flow, e.g. `apply: ebs.volume_type`).
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { buildServiceFromSchema } from "./declarative.js";

// ---------------------------------------------------------------------------
// Loading & composition
// ---------------------------------------------------------------------------

function toFsPath(url) {
  return typeof url === "string" ? url : fileURLToPath(url);
}

// Walk the tree replacing any `{ $include: '...' }` object with the YAML
// snippet at that path (resolved relative to `baseDir`). $include can sit
// inside arrays or objects; the replacement uses whatever shape the snippet
// has (array elements get spread when included inside an array).
function expandIncludes(node, baseDir, visited = new Set()) {
  if (node == null || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    const out = [];
    for (const item of node) {
      const expanded = expandIncludes(item, baseDir, visited);
      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        Object.keys(item).length === 1 &&
        "$include" in item &&
        Array.isArray(expanded)
      ) {
        for (const e of expanded) out.push(e);
      } else {
        out.push(expanded);
      }
    }
    return out;
  }
  const keys = Object.keys(node);
  if (keys.length === 1 && keys[0] === "$include") {
    const rel = node.$include;
    const resolved = pathResolve(baseDir, rel);
    if (visited.has(resolved)) {
      throw new Error(`datasheet: $include cycle at ${resolved}`);
    }
    const next = new Set(visited);
    next.add(resolved);
    const content = parseYaml(readFileSync(resolved, "utf8"));
    return expandIncludes(content, dirname(resolved), next);
  }
  const out = {};
  for (const k of keys) out[k] = expandIncludes(node[k], baseDir, visited);
  return out;
}

function mergeFields(parent = [], child = []) {
  const byId = new Map();
  for (const f of parent) byId.set(f.id, f);
  // Child wins; preserve overall ordering as parent fields first, then any
  // child fields not seen yet.
  const order = parent.map((f) => f.id);
  for (const f of child) {
    if (!byId.has(f.id)) order.push(f.id);
    byId.set(f.id, f);
  }
  return order.map((id) => byId.get(id));
}

function resolveExtends(rawDoc, sourcePath, visited = new Set()) {
  if (visited.has(sourcePath)) {
    throw new Error(`datasheet: extends cycle at ${sourcePath}`);
  }
  const baseDir = dirname(sourcePath);
  const doc = expandIncludes(rawDoc, baseDir);
  if (!doc.extends) return { doc, sourceDir: baseDir };

  const parentPath = pathResolve(baseDir, doc.extends);
  const parentRaw = parseYaml(readFileSync(parentPath, "utf8"));
  const next = new Set(visited);
  next.add(sourcePath);
  const { doc: parentDoc } = resolveExtends(parentRaw, parentPath, next);

  // Merge: child wins on scalars/maps, fields concatenated by id,
  // health_locators concatenated, flow stitched with parent's prelude/postlude.
  const { extends: _e, ...childRest } = doc;
  const merged = {
    ...parentDoc,
    ...childRest,
    meta: { ...(parentDoc.meta ?? {}), ...(childRest.meta ?? {}) },
    fields: mergeFields(parentDoc.fields, childRest.fields),
    health_locators: [
      ...(parentDoc.health_locators ?? []),
      ...(childRest.health_locators ?? []),
    ],
    flow: [
      ...(parentDoc.flow_prelude ?? []),
      ...(childRest.flow ?? []),
      ...(parentDoc.flow_postlude ?? []),
    ],
    // The prelude doubles as the health-probe prerequisite: it's the
    // sequence of steps that puts the wizard into the state the
    // health_locators expect. Exposed separately so the daily probe can
    // run it without driving the rest of the handler.
    health_prerequisite_flow: [...(parentDoc.flow_prelude ?? [])],
  };
  delete merged.flow_prelude;
  delete merged.flow_postlude;
  return { doc: merged, sourceDir: baseDir };
}

// Inline any `<name>_field: <key>` reference in a flow step by reading the
// merged doc's top-level `<key>` and substituting it under `<name>`. Used
// by family bases (e.g. sagemaker/_base.yaml) whose prelude needs values
// supplied by the child datasheet — see `activates`, `ready_text`.
function resolveTargetsFields(doc) {
  if (!Array.isArray(doc.flow)) return doc;
  const flow = doc.flow.map((step) => {
    if (!step || typeof step !== "object") return step;
    let next = step;
    for (const key of Object.keys(step)) {
      if (!key.endsWith("_field")) continue;
      const target = key.slice(0, -"_field".length);
      const docKey = step[key];
      const { [key]: _drop, ...rest } = next;
      next = { ...rest, [target]: doc[docKey] };
    }
    return next;
  });
  return { ...doc, flow };
}

// Same templating pass for the health prerequisite flow, so e.g.
// `pattern_field: ready_text` resolves to `pattern: "..."` there too.
function resolveTargetsFieldsForPrerequisite(doc) {
  if (!Array.isArray(doc.health_prerequisite_flow)) return doc;
  const flow = doc.health_prerequisite_flow.map((step) => {
    if (!step || typeof step !== "object") return step;
    let next = step;
    for (const key of Object.keys(step)) {
      if (!key.endsWith("_field")) continue;
      const target = key.slice(0, -"_field".length);
      const docKey = step[key];
      const { [key]: _drop, ...rest } = next;
      next = { ...rest, [target]: doc[docKey] };
    }
    return next;
  });
  return { ...doc, health_prerequisite_flow: flow };
}

export function loadDatasheet(url) {
  const sourcePath = toFsPath(url);
  const raw = parseYaml(readFileSync(sourcePath, "utf8"));
  const { doc } = resolveExtends(raw, sourcePath);
  return resolveTargetsFieldsForPrerequisite(resolveTargetsFields(doc));
}

/**
 * Read a datasheet, fully resolve extends/targets/includes, and serialize
 * it back to a self-contained YAML string. Used by publish.js so the
 * remote bundle ships standalone datasheets without their _base.yaml
 * parents.
 */
export function flattenDatasheetToYaml(url) {
  const resolved = loadDatasheet(url);
  return stringifyYaml(resolved);
}

// ---------------------------------------------------------------------------
// Compilation: datasheet → primitive steps
// ---------------------------------------------------------------------------

function indexFields(fields) {
  const map = new Map();
  for (const f of fields ?? []) {
    map.set(f.id, { path: f.id, field: f });
    if (Array.isArray(f.children)) {
      for (const c of f.children) {
        map.set(`${f.id}.${c.id}`, { path: `${f.id}.${c.id}`, field: c, parent: f });
      }
    }
  }
  return map;
}

function andWhen(a, b) {
  if (!a) return b;
  if (!b) return a;
  return `(${a}) && (${b})`;
}

function buildDefaults(fields) {
  const out = {};
  for (const f of fields ?? []) {
    if (f.default !== undefined) out[f.id] = f.default;
  }
  return out;
}

function fieldRef(path) {
  return path;
}

function normalizeLocator(loc) {
  if (!loc) return loc;
  if (loc.name_prefix && !loc.name) {
    const prefix = String(loc.name_prefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const { name_prefix, ...rest } = loc;
    return { ...rest, name: { regex: `^${prefix}` } };
  }
  return loc;
}

function compileFieldApplication(path, field, flowEntry) {
  const ui = field.ui ?? {};
  const when = flowEntry.when || null;
  const id = fieldRef(path);
  const steps = [];

  switch (ui.kind) {
    case "dropdown": {
      for (const opt of field.options ?? []) {
        if (opt.unsupported) continue;
        const optWhen = `${id} == '${opt.value}'`;
        steps.push({
          when: andWhen(when, optWhen),
          action: "select_dropdown",
          trigger: normalizeLocator(ui.locator),
          option: opt.label,
        });
      }
      return steps;
    }

    case "radio":
    case "radio_group": {
      for (const opt of field.options ?? []) {
        if (opt.unsupported) continue;
        const optWhen = `${id} == '${opt.value}'`;
        const step = {
          when: andWhen(when, optWhen),
          action: "click",
          role: "radio",
          name: opt.label,
        };
        if (typeof opt.nth === "number") step.nth = opt.nth;
        steps.push(step);
      }
      return steps;
    }

    case "checkbox": {
      steps.push({
        when,
        action: "check_checkbox",
        ...normalizeLocator(ui.locator),
        value: true,
      });
      return steps;
    }

    case "number":
    case "text": {
      steps.push({
        when,
        action: "fill",
        ...normalizeLocator(ui.locator),
        value: `{${id}}`,
      });
      return steps;
    }

    case "combobox": {
      // Autocomplete: type + ArrowDown + Enter (SageMaker instance pickers).
      steps.push({
        when,
        action: "select_combobox",
        ...normalizeLocator(ui.locator),
        value: `{${id}}`,
      });
      return steps;
    }

    case "search_table": {
      steps.push({
        when,
        action: "search_and_pick_first_row",
        search: normalizeLocator(ui.locator.search),
        row_css: ui.locator.row_css,
        value: `{${id}}`,
        settle_ms: 1500,
        click_wait_ms: 500,
      });
      return steps;
    }

    case "region_modal":
    case "section":
      return steps;

    default:
      throw new Error(
        `datasheet: unsupported ui.kind '${ui.kind}' for field ${path}`,
      );
  }
}

export function compileDatasheet(ds) {
  if (!ds.service) throw new Error("datasheet: missing `service`");
  if (!ds.version) throw new Error("datasheet: missing `version`");

  const fields = indexFields(ds.fields);
  const defaults = buildDefaults(ds.fields);
  const steps = [];

  for (const entry of ds.flow ?? []) {
    if (entry.action) {
      steps.push({ ...entry });
      continue;
    }
    if (entry.apply) {
      const ref = fields.get(entry.apply);
      if (!ref) {
        throw new Error(
          `datasheet: flow references unknown field "${entry.apply}"`,
        );
      }
      const compiled = compileFieldApplication(ref.path, ref.field, entry);
      for (const s of compiled) steps.push(s);
      continue;
    }
    throw new Error(
      `datasheet: flow entry has neither action nor apply: ${JSON.stringify(entry)}`,
    );
  }

  return {
    id: ds.service,
    version: ds.version,
    defaults,
    healthLocators: ds.health_locators ?? [],
    steps,
    healthPrerequisiteSteps: ds.health_prerequisite_flow ?? [],
  };
}

export function buildServiceFromDatasheet(ds) {
  const compiled = compileDatasheet(ds);
  return buildServiceFromSchema(compiled);
}

// ---------------------------------------------------------------------------
// Handler module resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the on-disk handler source for a service folder.
 *
 *   <folder>/index.js      → imperative handler (return { kind: 'js', path })
 *   <folder>/<leaf>.yaml   → declarative datasheet (return { kind: 'yaml', path })
 *
 * `<leaf>` is the trailing segment of the folder path. Returns null if
 * neither exists.
 */
export function resolveHandlerSource(folderAbs) {
  const jsPath = join(folderAbs, "index.js");
  if (existsSync(jsPath)) return { kind: "js", path: jsPath };
  const leaf = basename(folderAbs);
  const yamlPath = join(folderAbs, `${leaf}.yaml`);
  if (existsSync(yamlPath)) return { kind: "yaml", path: yamlPath };
  return null;
}

/**
 * Load a handler module from a YAML datasheet path. Returns a plain object
 * shaped like a handler module (id, version, healthLocators,
 * healthPrerequisite, adapter, handler) — the same surface the deleted
 * wrapper index.js files used to export.
 */
export function loadHandlerFromYaml(yamlPath) {
  const ds = loadDatasheet(yamlPath);
  const svc = buildServiceFromDatasheet(ds);
  return {
    id: svc.id,
    version: svc.version,
    healthLocators: svc.healthLocators,
    healthPrerequisite: svc.healthPrerequisite,
    adapter: svc.adapter,
    handler: svc.handler,
  };
}

/**
 * Dynamic-import a handler module from a path that may be either a JS
 * module or a YAML datasheet. Used by all three loaders so the call sites
 * stay uniform.
 */
export async function importHandlerModule(modulePath) {
  if (modulePath.endsWith(".yaml") || modulePath.endsWith(".yml")) {
    return loadHandlerFromYaml(modulePath);
  }
  return import(pathToFileURL(modulePath).href);
}
