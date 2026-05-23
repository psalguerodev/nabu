export const id = "s3-vectors";

export const version = "0.1.0";

// Health check must enable the S3 Vectors sub-feature before probing
// locators — without the checkbox toggled the form fields don't render.
export async function healthPrerequisite(page) {
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("label, span"));
    const node = labels.find((el) => el.textContent?.trim() === "S3 Vectors");
    if (!node) return;
    const wrap =
      node.closest("[data-id]") || node.parentElement?.closest("[data-id]");
    const input =
      wrap?.querySelector('input[type="checkbox"]') ||
      node.querySelector('input[type="checkbox"]');
    input?.click();
  });
  await page.waitForTimeout(1000);
}

// Locators the handler() depends on. Used by the daily health check.
// These appear only AFTER the "S3 Vectors" sub-checkbox is enabled at
// runtime, so the health check probes the S3 service page (where the
// S3 Vectors toggle lives) plus the post-toggle fields.
export const healthLocators = [
  {
    role: "textbox",
    name: /^Number of indexes/,
    label: "number of indexes textbox",
  },
  {
    role: "textbox",
    name: /Number of vectors per index/,
    label: "vectors per index textbox",
  },
  {
    role: "textbox",
    name: /Vector Dimensions/,
    label: "vector dimensions textbox",
  },
  {
    role: "spinbutton",
    name: /Filterable metadata \(KB\) per vector Value/,
    label: "filterable metadata spinbutton",
  },
  {
    role: "spinbutton",
    name: /Key size \(KB\) per vector Value/,
    label: "key size spinbutton",
  },
  {
    role: "spinbutton",
    name: /Total number of queries per month .* Value/,
    label: "total queries spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    numberOfIndexes: params.number_of_indexes,
    vectorsPerIndex: params.vectors_per_index,
    vectorDimensions: params.vector_dimensions,
    filterableMetadataKB: params.filterable_metadata_kb,
    nonFilterableMetadataKB: params.non_filterable_metadata_kb,
    keySizeKB: params.key_size_kb,
    percentOverwrittenPerMonth: params.percent_overwritten_per_month,
    totalQueriesPerMonth: params.total_queries_per_month,
  };
}

// Amazon S3 Vectors
// S3 Vectors is a sub-checkbox inside the "Amazon Simple Storage Service (S3)"
// service form. Defaults (S3 Standard + Data Transfer) are checked — we
// uncheck them and enable only S3 Vectors.
export async function handler(page, config) {
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
}
