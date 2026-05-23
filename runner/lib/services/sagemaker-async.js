export const id = "sagemaker-async";

// Health check must mirror the same three-toggle sequence the handler
// uses to land on the Asynchronous Inference form (disable the two
// notebook sub-features, enable Async Inference).
export async function healthPrerequisite(page) {
  await page.evaluate(() => {
    const toggle = (dataId) => {
      const wrap = document.querySelector(`[data-id="${dataId}"]`);
      wrap?.querySelector('input[type="checkbox"]')?.click();
    };
    toggle("sageMakerStudioNotebooks");
    toggle("sageMakerOnDemandNotebookInstances");
    toggle("sageMakerAsynchronousInference");
  });
  await page.waitForTimeout(1200);
}

// Locators the handler() depends on. Used by the daily health check.
// The Async section only renders after the SageMaker Asynchronous
// Inference sub-checkbox is enabled; the locators below match labels
// from that post-toggle form.
export const healthLocators = [
  {
    role: "textbox",
    name: /Number of models deployed/,
    label: "models deployed textbox",
  },
  {
    role: "textbox",
    name: /Number of models per endpoint/,
    label: "models per endpoint textbox",
  },
  {
    role: "textbox",
    name: /Number of instances per endpoint/,
    label: "instances per endpoint textbox",
  },
  {
    role: "textbox",
    name: /Endpoint hour\(s\) per day/,
    label: "endpoint hours per day textbox",
  },
  {
    role: "combobox",
    name: "Select an instance",
    label: "instance type combobox",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    modelsDeployed: params.models_deployed,
    modelsPerEndpoint: params.models_per_endpoint,
    instancesPerEndpoint: params.instances_per_endpoint,
    hoursPerDay: params.hours_per_day,
    daysPerMonth: params.days_per_month,
    instanceType: params.instance_type,
    storageAmountGB: params.storage_amount_gb,
    dataInGB: params.data_in_gb,
    dataOutGB: params.data_out_gb,
  };
}

// SageMaker Asynchronous Inference
//
// The SageMaker config form starts with two feature checkboxes checked by
// default: "SageMaker Studio Notebooks" and "SageMaker On-Demand Notebook
// Instances". Each renders its own required fields. We need to uncheck both
// and enable "SageMaker Asynchronous Inference".
//
// Gotcha: CloudScape wraps each checkbox in a span with class `.prevented`
// that intercepts pointer events — Playwright's normal `.click()` and even
// `.click({ force: true })` on the role-based locator do not fire the React
// onChange. The only reliable path is `input.click()` via page.evaluate.
export async function handler(page, config) {
  const {
    modelsDeployed = 1,
    modelsPerEndpoint = 1,
    instancesPerEndpoint = 1,
    hoursPerDay = 12,
    daysPerMonth = 30,
    instanceType = "ml.g5.2xlarge",
    storageAmountGB = 100,
    dataInGB = 0,
    dataOutGB = 0,
  } = config;

  // Toggle feature checkboxes via underlying input click (fires React onChange).
  await page.evaluate(() => {
    const toggle = (dataId) => {
      const wrap = document.querySelector(`[data-id="${dataId}"]`);
      wrap?.querySelector('input[type="checkbox"]')?.click();
    };
    toggle("sageMakerStudioNotebooks");
    toggle("sageMakerOnDemandNotebookInstances");
    toggle("sageMakerAsynchronousInference");
  });
  await page.waitForTimeout(1500);

  // Wait for the Async section to render
  await page.waitForFunction(
    () => /Asynchronous Inference Instances/.test(document.body.innerText),
    { timeout: 10000 }
  );

  // Fill numeric fields
  await page.getByRole("textbox", { name: /Number of models deployed/ }).fill(String(modelsDeployed));
  await page.getByRole("textbox", { name: /Number of models per endpoint/ }).fill(String(modelsPerEndpoint));
  await page.getByRole("textbox", { name: /Number of instances per endpoint/ }).fill(String(instancesPerEndpoint));
  await page.getByRole("textbox", { name: /Endpoint hour\(s\) per day/ }).fill(String(hoursPerDay));
  await page.getByRole("textbox", { name: /Endpoint day\(s\) per month/ }).fill(String(daysPerMonth));

  // Instance combobox (CloudScape autocomplete). Keyboard nav commits selection.
  const combo = page.getByRole("combobox", { name: "Select an instance" }).last();
  await combo.fill(instanceType);
  await page.waitForTimeout(700);
  await combo.press("ArrowDown");
  await page.waitForTimeout(200);
  await combo.press("Enter");
  await page.waitForTimeout(600);

  // ML Storage — Async-specific Storage amount (may not appear if section
  // hasn't rendered yet; tolerate missing).
  const storage = page.getByRole("spinbutton", { name: "Storage amount Value" });
  if ((await storage.count()) > 0) {
    await storage.first().fill(String(storageAmountGB));
  }

  // Data Processing IN/OUT (optional)
  if (dataInGB > 0) {
    const dIn = page.getByRole("spinbutton", { name: "Data Processed IN Value" });
    if ((await dIn.count()) > 0) await dIn.first().fill(String(dataInGB));
  }
  if (dataOutGB > 0) {
    const dOut = page.getByRole("spinbutton", { name: "Data Processed OUT Value" });
    if ((await dOut.count()) > 0) await dOut.first().fill(String(dataOutGB));
  }

  // Commit last field
  await page.keyboard.press("Tab");
  await page.waitForTimeout(800);
}
