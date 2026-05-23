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
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(3000);

// Toggle
await page.getByRole("checkbox", { name: "AgentCore Browser Tools" }).click({ force: true });
await page.waitForTimeout(500);
await page.getByRole("checkbox", { name: "AgentCore Observability" }).click({ force: true });
await page.waitForTimeout(1500);

// Runtime
await page.getByRole("textbox", { name: "Number of agent sessions per month" }).nth(0).fill("144000");
await page.getByRole("textbox", { name: "Average Session Duration (seconds)" }).nth(0).fill("15");
await page.getByRole("spinbutton", { name: /I\/O Wait Time/ }).nth(0).fill("20");
await page.getByRole("textbox", { name: "Average vCPU excluding I/O wait time" }).nth(0).fill("2");
await page.getByRole("textbox", { name: "Average Session Memory (in GB)" }).nth(0).fill("5");

// Browser Tools (sessions/duration at nth=1)
await page.getByRole("textbox", { name: "vCPU per Browser Session" }).first().fill("1");
await page.getByRole("textbox", { name: "Memory per Browser Session (GB)" }).first().fill("2");
await page.getByRole("textbox", { name: "Number of agent sessions per month" }).nth(1).fill("144000");
await page.getByRole("textbox", { name: "Average Session Duration (seconds)" }).nth(1).fill("15");

// Observability
await page.getByRole("spinbutton", { name: /Observability vended logs/ }).first().fill("10");
await page.getByRole("spinbutton", { name: /Observability spans/ }).first().fill("10");
await page.keyboard.press("Tab");
await page.waitForTimeout(2000);

// Check invalid
const invalid = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(e => e.getAttribute("aria-label") || e.id)
);
console.log("Invalid:", invalid);
const errorTexts = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[class*="error"], [class*="invalid"]')).slice(0, 10).map(e => e.textContent.trim()).filter(t => t.length > 0 && t.length < 200)
);
console.log("Errors:", errorTexts);

// Click Save
await page.getByRole("button", { name: "Save and view summary" }).first().click();
await page.waitForTimeout(3000);

console.log("URL after save:", page.url());

// Wait
await page.waitForTimeout(15000);
await browser.close();
