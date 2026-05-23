import { registerService } from "../calculator.js";

// Amazon Bedrock - Foundation Model pricing
//
// Supports providers: "Anthropic" (Claude) and "Amazon" (Nova).
// The provider checkbox "Amazon" is CHECKED by default; "Anthropic" is NOT.
//
// Available Anthropic models (as of 2026-04):
//   Claude Haiku 4.5, Claude Opus 4.5, Claude Opus 4.6,
//   Claude Sonnet 4, Claude Sonnet 4 (Long Context),
//   Claude Sonnet 4.5, Claude Sonnet 4.5 (Long Context),
//   Claude Sonnet 4.6
//
// Available Amazon Nova models (as of 2026-05):
//   Nova Micro, Nova Lite, Nova Pro, Nova Premier
registerService("bedrock", async (page, config) => {
  const {
    provider = "Anthropic",
    model = null,
    requestsPerMinute = 0,
    hoursPerDay = 24,
    inputTokensPerRequest = 1000,
    outputTokensPerRequest = 500,
  } = config;

  // Enable target provider, disable the other.
  // CloudScape .prevented wrapper requires force click.
  const setCb = async (name, wantChecked) => {
    const cb = page.getByRole("checkbox", { name, exact: true });
    if ((await cb.count()) === 0) return;
    const isChecked = await cb.isChecked().catch(() => false);
    if (isChecked !== wantChecked) {
      await cb.click({ force: true });
      await page.waitForTimeout(500);
    }
  };

  if (provider === "Anthropic") {
    await setCb("Anthropic", true);
    await setCb("Amazon", false);
  } else if (provider === "Amazon") {
    await setCb("Amazon", true);
    await setCb("Anthropic", false);
  }
  await page.waitForTimeout(1000);

  // Select model. The model dropdown shows the currently selected model as
  // its button text (e.g. "Amazon : Nova Lite" or "Anthropic : Claude...").
  // Filter by the provider-prefixed pattern.
  if (model) {
    const filterPattern =
      provider === "Amazon" ? /Amazon\s*:\s*Nova/ : /Anthropic\s*:|Claude/;
    const modelBtn = page
      .locator('button[aria-haspopup="listbox"]')
      .filter({ hasText: filterPattern })
      .first();
    await modelBtn.scrollIntoViewIfNeeded();
    await modelBtn.click();
    await page.waitForTimeout(1500);
    const option = page.getByRole("option", { name: new RegExp(model, "i") }).first();
    if ((await option.count()) > 0) {
      await option.click();
      await page.waitForTimeout(600);
    }
  }

  // Model settings.
  // NOTE: The Bedrock config page can render one usage-settings block per
  // enabled provider (Anthropic + Amazon), so these aria-labels are not
  // unique on the page. We target the first matching field, which
  // corresponds to the currently-selected provider's section (the other
  // provider was just toggled off above, but its block may still be in the
  // DOM until the page settles). Use .first() to satisfy Playwright strict
  // mode.
  if (requestsPerMinute > 0) {
    await page.getByRole("textbox", { name: "Average requests per minute" }).first().fill(String(requestsPerMinute));
  }
  if (hoursPerDay > 0) {
    await page.getByRole("textbox", { name: "Hours per day at this rate" }).first().fill(String(hoursPerDay));
  }
  if (inputTokensPerRequest > 0) {
    await page.getByRole("textbox", { name: "Average input tokens per request" }).first().fill(String(inputTokensPerRequest));
  }
  if (outputTokensPerRequest > 0) {
    await page.getByRole("textbox", { name: "Average output tokens per request" }).first().fill(String(outputTokensPerRequest));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
});
