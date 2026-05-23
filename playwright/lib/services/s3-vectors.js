import { registerService } from "../calculator.js";

// Amazon S3 Vectors
// S3 Vectors is a sub-checkbox inside the "Amazon Simple Storage Service (S3)"
// service form. Defaults (S3 Standard + Data Transfer) are checked — we
// uncheck them and enable only S3 Vectors.
registerService("s3-vectors", async (page, config) => {
  const {
    numberOfIndexes = 1,
    vectorsPerIndex = 120000,
    vectorDimensions = 1024,
    filterableMetadataKB = 2,
    nonFilterableMetadataKB = 0,
    keySizeKB = 0.5,
    percentOverwrittenPerMonth = 0.167,
    totalQueriesPerMonth = 15000,
  } = config;

  // Toggle storage class checkboxes via the underlying input (CloudScape
  // .prevented wrapper requires this approach — see sagemaker-async.js notes).
  await page.evaluate(() => {
    const toggleByLabel = (labelText) => {
      const labels = Array.from(document.querySelectorAll("label, span"));
      const node = labels.find((el) => el.textContent?.trim() === labelText);
      if (!node) return;
      const wrap = node.closest("[data-id]") || node.parentElement?.closest("[data-id]");
      const input = wrap?.querySelector('input[type="checkbox"]') || node.querySelector('input[type="checkbox"]');
      input?.click();
    };
    toggleByLabel("S3 Standard");
    toggleByLabel("Data Transfer");
    toggleByLabel("S3 Vectors");
  });
  await page.waitForTimeout(1500);

  await page.waitForFunction(() => /S3 Vectors/.test(document.body.innerText), { timeout: 8000 });

  await page.getByRole("textbox", { name: /^Number of indexes/ }).fill(String(numberOfIndexes));
  await page.getByRole("textbox", { name: /Number of vectors per index/ }).fill(String(vectorsPerIndex));
  await page.getByRole("textbox", { name: /Vector Dimensions/ }).fill(String(vectorDimensions));
  await page.getByRole("spinbutton", { name: /Filterable metadata \(KB\) per vector Value/ }).fill(String(filterableMetadataKB));
  if (nonFilterableMetadataKB > 0) {
    await page.getByRole("spinbutton", { name: /Non-filterable metadata \(KB\) per vector Value/ }).fill(String(nonFilterableMetadataKB));
  }
  await page.getByRole("spinbutton", { name: /Key size \(KB\) per vector Value/ }).fill(String(keySizeKB));
  await page.getByRole("spinbutton", { name: /Percentage of vectors overwritten per month/ }).fill(String(percentOverwrittenPerMonth));
  await page.getByRole("spinbutton", { name: /Total number of queries per month .* Value/ }).fill(String(totalQueriesPerMonth));

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
});
