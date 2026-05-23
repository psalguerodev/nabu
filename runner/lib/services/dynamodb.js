import { registerService } from "../calculator.js";

registerService("dynamodb", async (page, config) => {
  const {
    capacityMode = "provisioned", // "provisioned" or "on-demand"
    storageGB = 0,
    avgItemSizeKB = 1,
    // Provisioned mode
    baselineWriteRate = 100,
    peakWriteRate = 400,
    baselineReadRate = 100,
    peakReadRate = 400,
    peakDurationHours = 72,
  } = config;

  // Switch capacity mode if needed
  if (capacityMode === "on-demand") {
    // AWS CloudScape wraps checkboxes with a span that intercepts pointer events.
    // Use JS to click native inputs directly, with retry to ensure React state updates.
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.evaluate(() => {
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          const label = cb.closest('[class*="wrapper"]')?.textContent?.trim() || '';
          if (label.includes('DynamoDB provisioned capacity') && cb.checked) cb.click();
          if (label.includes('DynamoDB on-demand capacity') && !cb.checked) cb.click();
        });
      });
      await page.waitForTimeout(800);
      // Verify
      const provChecked = await page.getByRole("checkbox", { name: "DynamoDB provisioned capacity" }).isChecked();
      const odChecked = await page.getByRole("checkbox", { name: "DynamoDB on-demand capacity" }).isChecked();
      if (!provChecked && odChecked) break;
    }
  }

  // Data storage (available in both modes)
  if (storageGB > 0) {
    const storageInput = page.getByRole("spinbutton", { name: /Data storage size Value/ }).first();
    await storageInput.fill(String(storageGB));
  }

  // Average item size
  if (avgItemSizeKB !== 1) {
    const itemInput = page.getByRole("spinbutton", { name: /Average item size/ }).first();
    await itemInput.fill(String(avgItemSizeKB));
  }

  // Only configure read/write for provisioned mode
  if (capacityMode === "provisioned") {
    await page.getByRole("spinbutton", { name: /Baseline write rate Value/ }).fill(String(baselineWriteRate));
    await page.getByRole("spinbutton", { name: /Peak write rate Value/ }).fill(String(peakWriteRate));
    await page.getByRole("spinbutton", { name: /Duration of peak write activity Value/ }).fill(String(peakDurationHours));

    await page.getByRole("spinbutton", { name: /Baseline read rate Value/ }).fill(String(baselineReadRate));
    await page.getByRole("spinbutton", { name: /Peak read rate Value/ }).fill(String(peakReadRate));
    await page.getByRole("spinbutton", { name: /Duration of peak read activity Value/ }).fill(String(peakDurationHours));
  }
});
