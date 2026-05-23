import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const page = await browser.newContext({ viewport: { width: 1400, height: 900 } }).then(c => c.newPage());

await page.goto("https://calculator.aws/#/createCalculator");
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2000);
await page.evaluate(() => { document.querySelectorAll("#chatbot-wrapper").forEach(e => e.style.display = "none"); });

await page.getByRole("button", { name: "Add service" }).first().click();
await page.waitForTimeout(1500);
await page.getByRole("searchbox", { name: "Find Service" }).fill("Bedrock AgentCore");
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Configure Amazon Bedrock AgentCore/ }).first().click();
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(3000);

await page.getByRole("checkbox", { name: "AgentCore Browser Tools" }).click({ force: true });
await page.waitForTimeout(500);
await page.getByRole("checkbox", { name: "AgentCore Observability" }).click({ force: true });
await page.waitForTimeout(1500);

// Runtime
await page.getByRole("textbox", { name: /Number of agent sessions per month/ }).first().fill("144000");
await page.getByRole("textbox", { name: /Average Session Duration/ }).first().fill("15");
await page.getByRole("spinbutton", { name: /I\/O Wait Time/ }).first().fill("20");
await page.getByRole("textbox", { name: /Average vCPU/ }).first().fill("2");
await page.getByRole("textbox", { name: /Average Session Memory/ }).first().fill("5");

// Browser Tools - find ALL textboxes related
await page.waitForTimeout(1000);
const allTextboxes = await page.evaluate(() =>
  Array.from(document.querySelectorAll('input[type="text"], input[role="textbox"]')).map(e => ({
    label: e.getAttribute("aria-label"),
    placeholder: e.placeholder,
    value: e.value
  })).filter(e => e.label || e.placeholder)
);
console.log(JSON.stringify(allTextboxes, null, 2));

await page.waitForTimeout(60000);
await browser.close();
