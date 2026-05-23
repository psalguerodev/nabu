export const id = "bedrock";

export const version = "0.1.2";

// Locators the handler() depends on. Used by the daily health check.
// The provider checkboxes have no accessible label (the visible text
// "Amazon" / "Anthropic" lives in a grandparent span without aria-
// linkage), so we can't probe them with getByRole + name. Instead we
// probe the controls that ARE labelled and that must be present after a
// provider is toggled on — model dropdown plus the four token-volume
// textboxes. Amazon is enabled by default so they're visible immediately
// without a healthPrerequisite.
export const healthLocators = [
  {
    role: "button",
    name: /^Select Model/i,
    label: "model selection button",
  },
  {
    role: "textbox",
    name: "Average requests per minute",
    label: "requests per minute textbox",
  },
  {
    role: "textbox",
    name: "Hours per day at this rate",
    label: "hours per day textbox",
  },
  {
    role: "textbox",
    name: "Average input tokens per request",
    label: "input tokens textbox",
  },
  {
    role: "textbox",
    name: "Average output tokens per request",
    label: "output tokens textbox",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    provider: params.provider,
    model: params.model,
    requestsPerMinute: params.requests_per_minute,
    hoursPerDay: params.hours_per_day,
    inputTokensPerRequest: params.input_tokens_per_request,
    outputTokensPerRequest: params.output_tokens_per_request,
  };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Amazon Bedrock - Foundation Model pricing
//
// Provider selection uses unlabeled checkboxes (the provider name lives in
// a grandparent span with no aria-linkage), so we click them by walking
// from the provider-name text node to the nearest checkbox input. Amazon
// is checked by default; everything else is off.
//
// Available Anthropic models (as of 2026-05):
//   Claude Haiku 4.5, Claude Opus 4.5/4.6,
//   Claude Sonnet 4 / 4.5 / 4.6 (and Long Context variants).
// Available Amazon Nova models:
//   Nova Micro, Nova Lite, Nova Pro, Nova Premier.
export async function handler(page, config) {
  const {
    provider = "Anthropic",
    model = null,
    requestsPerMinute = 0,
    hoursPerDay = 24,
    inputTokensPerRequest = 1000,
    outputTokensPerRequest = 500,
  } = config;

  // Toggle a provider checkbox to the desired state, looking it up by the
  // sibling/ancestor text content since the input itself is unlabeled.
  const setProvider = async (name, wantOn) => {
    await page.evaluate(
      ({ name, wantOn }) => {
        const labels = Array.from(document.querySelectorAll("span, label"));
        const target = labels.find(
          (el) => el.textContent?.trim() === name,
        );
        if (!target) return false;
        let node = target;
        let input = null;
        for (let i = 0; i < 6 && node; i++) {
          input =
            node.querySelector?.('input[type="checkbox"]') ||
            node.parentElement?.querySelector?.('input[type="checkbox"]');
          if (input) break;
          node = node.parentElement;
        }
        if (!input) return false;
        if (!!input.checked !== !!wantOn) input.click();
        return true;
      },
      { name, wantOn },
    );
    await page.waitForTimeout(500);
  };

  if (provider === "Anthropic") {
    await setProvider("Anthropic", true);
    await setProvider("Amazon", false);
  } else if (provider === "Amazon") {
    await setProvider("Amazon", true);
    await setProvider("Anthropic", false);
  } else {
    // Generic: just turn the requested provider on. Don't fight whatever
    // else is enabled — keeps the handler resilient when callers pass a
    // provider name we don't have a hard-coded branch for.
    await setProvider(provider, true);
  }
  await page.waitForTimeout(1500);

  // Model dropdown. Button reads "Select Model" before a selection and
  // "Selected Model: <name>" / "Selected Model Ondemand" after.
  if (model) {
    const modelBtn = page
      .getByRole("button", { name: /^(Select|Selected) Model/i })
      .first();
    if (await modelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modelBtn.scrollIntoViewIfNeeded();
      await modelBtn.click();
      await page.waitForTimeout(1200);
      const option = page
        .getByRole("option", { name: new RegExp(escapeRegex(model), "i") })
        .first();
      if ((await option.count()) > 0) {
        await option.click();
        await page.waitForTimeout(600);
      }
    }
  }

  // Aria-labels on these textboxes can repeat (one usage block per
  // enabled provider), so .first() targets the active section.
  if (requestsPerMinute > 0) {
    await page
      .getByRole("textbox", { name: "Average requests per minute" })
      .first()
      .fill(String(requestsPerMinute));
  }
  if (hoursPerDay > 0) {
    await page
      .getByRole("textbox", { name: "Hours per day at this rate" })
      .first()
      .fill(String(hoursPerDay));
  }
  if (inputTokensPerRequest > 0) {
    await page
      .getByRole("textbox", { name: "Average input tokens per request" })
      .first()
      .fill(String(inputTokensPerRequest));
  }
  if (outputTokensPerRequest > 0) {
    await page
      .getByRole("textbox", { name: "Average output tokens per request" })
      .first()
      .fill(String(outputTokensPerRequest));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
}
