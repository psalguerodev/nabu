import { chromium } from "playwright";
const browser = await chromium.launch({ headless: false, slowMo: 50 });
const page = await browser.newContext({ viewport: { width: 1400, height: 900 } }).then(c => c.newPage());

await page.goto("https://calculator.aws/#/createCalculator");
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2000);
await page.evaluate(() => document.querySelectorAll("#chatbot-wrapper").forEach(e => e.style.display = "none"));

await page.getByRole("button", { name: "Add service" }).first().click();
await page.waitForTimeout(1500);
await page.getByRole("searchbox", { name: "Find Service" }).fill("Bedrock AgentCore");
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Configure Amazon Bedrock AgentCore/ }).first().click();
await page.waitForTimeout(3000);

// Enable BT + Observability
await page.getByRole("checkbox", { name: "AgentCore Browser Tools" }).click({ force: true });
await page.waitForTimeout(500);
await page.getByRole("checkbox", { name: "AgentCore Observability" }).click({ force: true });
await page.waitForTimeout(1500);

// Fill ALL textboxes/spinbuttons with reasonable defaults
const allInputs = await page.evaluate(() => {
  const arr = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'));
  return arr.map(e => ({
    tag: e.tagName,
    type: e.type,
    role: e.getAttribute("role"),
    label: e.getAttribute("aria-label"),
    placeholder: e.placeholder,
    id: e.id,
    value: e.value,
    required: e.required || e.getAttribute("aria-required") === "true"
  })).filter(e => e.label);
});
console.log("All inputs at start:");
console.log(JSON.stringify(allInputs, null, 2));

// Fill all visible empty inputs with 1 (or 144000 for sessions)
for (const inp of allInputs) {
  if (!inp.value && inp.label) {
    const isSessions = /sessions|monthly/i.test(inp.label);
    const val = isSessions ? "144000" : (/duration|seconds/i.test(inp.label) ? "15" : "1");
    try {
      await page.locator(`#${inp.id}`).fill(val);
    } catch {}
  }
}
await page.waitForTimeout(1000);

// Click save
const saves = await page.getByRole("button", { name: "Save and view summary" }).all();
for (const s of saves) {
  if (await s.isVisible()) {
    await s.click();
    break;
  }
}
await page.waitForTimeout(4000);

// Post-save state
console.log("URL after save:", page.url());
const invalid = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(e => e.getAttribute("aria-label") || e.id)
);
console.log("Invalid after save:", invalid);
const errors = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[aria-live], .error, [class*="error-text"], [class*="invalid"]')).slice(0, 20).map(e => e.textContent.trim()).filter(t => t && t.length < 200)
);
console.log("Errors:", errors);

await page.waitForTimeout(10000);
await browser.close();
