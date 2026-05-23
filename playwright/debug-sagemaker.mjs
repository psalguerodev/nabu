#!/usr/bin/env node
// Debug script to inspect SageMaker save behavior
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

await page.goto("https://calculator.aws/#/createCalculator");
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);

// Add service
await page.getByRole("button", { name: "Add service" }).first().click();
await page.waitForTimeout(1500);

// Search SageMaker
await page.getByRole("searchbox", { name: "Find Service" }).fill("SageMaker");
await page.waitForTimeout(1500);

// Configure (avoid Ground Truth)
const buttons = await page.getByRole("button", { name: /Configure Amazon SageMaker(?! Ground)/ }).all();
console.log("Found", buttons.length, "configure buttons");
await buttons[0].click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(3000);

// Toggle checkboxes via evaluate — bypass interception by clicking the
// underlying input element programmatically (fires React onChange).
await page.evaluate(() => {
  const toggle = (dataId) => {
    const wrapper = document.querySelector(`[data-id="${dataId}"]`);
    if (!wrapper) return false;
    const input = wrapper.querySelector('input[type="checkbox"]');
    if (!input) return false;
    input.click(); // native click on real input fires React onChange
    return true;
  };
  toggle("sageMakerStudioNotebooks");
  toggle("sageMakerOnDemandNotebookInstances");
  toggle("sageMakerAsynchronousInference");
});
await page.waitForTimeout(1500);

// Verify state via DOM
const cbState = await page.evaluate(() => {
  const ids = [
    "sageMakerStudioNotebooks",
    "sageMakerOnDemandNotebookInstances",
    "sageMakerAsynchronousInference",
  ];
  return ids.map((id) => {
    const wrap = document.querySelector(`[data-id="${id}"]`);
    const input = wrap?.querySelector('input[type="checkbox"]');
    return { id, checked: input?.checked };
  });
});
console.log("Checkbox state after toggles:", cbState);

// Fill fields
await page.getByRole("textbox", { name: /Number of models deployed/ }).fill("1");
await page.getByRole("textbox", { name: /Number of models per endpoint/ }).fill("1");
await page.getByRole("textbox", { name: /Number of instances per endpoint/ }).fill("1");
await page.getByRole("textbox", { name: /Endpoint hour\(s\) per day/ }).fill("12");
await page.getByRole("textbox", { name: /Endpoint day\(s\) per month/ }).fill("30");

// Instance combobox
const combo = page.getByRole("combobox", { name: "Select an instance" }).last();
await combo.fill("ml.g5.2xlarge");
await page.waitForTimeout(800);
await combo.press("ArrowDown");
await page.waitForTimeout(300);
await combo.press("Enter");
await page.waitForTimeout(800);

// Storage (may not exist when only Async is enabled)
const storage = page.getByRole("spinbutton", { name: "Storage amount Value" });
if ((await storage.count()) > 0) {
  await storage.first().fill("100");
}
await page.keyboard.press("Tab");
await page.waitForTimeout(1500);

// Diagnostic: list all spinbuttons and textboxes on the page
const allSpins = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[role="spinbutton"]')).map((e) => e.getAttribute("aria-label"))
);
console.log("All spinbuttons:", allSpins);
const allTextboxes = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[role="textbox"]')).map((e) => e.getAttribute("aria-label"))
);
console.log("All textboxes:", allTextboxes.slice(0, 20));

// Check button visibility
const saveBtns = await page.getByRole("button", { name: "Save and view summary" }).all();
console.log("Save buttons found:", saveBtns.length);
for (let i = 0; i < saveBtns.length; i++) {
  const visible = await saveBtns[i].isVisible();
  const enabled = await saveBtns[i].isEnabled();
  console.log(`  [${i}] visible=${visible} enabled=${enabled}`);
}

// Try clicking the visible one
console.log("Clicking visible Save and view summary...");
const visibleSave = page.locator('button:visible', { hasText: "Save and view summary" }).first();
await visibleSave.click();
await page.waitForTimeout(3000);

// Check current state
const url = page.url();
const title = await page.title();
console.log("After click — URL:", url);
console.log("After click — title:", title);

// Check for invalid fields
const invalid = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[aria-invalid="true"]')).map((e) => e.getAttribute("aria-label") || e.id)
);
console.log("Invalid fields:", invalid);

// Check for error text
const errorTexts = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[class*="error"], [class*="alert"]'))
    .slice(0, 10)
    .map((e) => e.textContent.trim())
    .filter((t) => t.length > 0 && t.length < 200)
);
console.log("Error/alert texts:", errorTexts);

// Wait 20s for manual inspection
console.log("Pausing 20s for manual inspection...");
await page.waitForTimeout(20000);

await browser.close();
