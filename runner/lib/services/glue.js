export const id = "glue";

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    sparkDpus: params.spark_dpus,
    sparkMinutesPerMonth: params.spark_minutes_per_month,
    pythonShellDpus: params.python_shell_dpus,
    pythonShellMinutesPerMonth: params.python_shell_minutes_per_month,
    interactiveDpus: params.interactive_dpus,
    interactiveMinutesPerMonth: params.interactive_minutes_per_month,
  };
}

// AWS Glue - "ETL jobs and interactive sessions" template (default checked)
// Pricing: $0.44 per DPU-hour for Apache Spark / Python Shell jobs.
// Workers: G.1X = 1 DPU, G.2X = 2 DPU per worker.
export async function handler(page, config) {
  const {
    sparkDpus = 0,
    sparkMinutesPerMonth = 0,
    pythonShellDpus = 0,
    pythonShellMinutesPerMonth = 0,
    interactiveDpus = 2,
    interactiveMinutesPerMonth = 1,
  } = config;

  if (sparkDpus > 0) {
    await page.getByRole("textbox", { name: /Number of DPUs for Apache Spark job/ }).fill(String(sparkDpus));
  }
  if (sparkMinutesPerMonth > 0) {
    await page.getByRole("spinbutton", { name: /Duration for which Apache Spark ETL job runs/ }).fill(String(sparkMinutesPerMonth));
  }

  if (pythonShellDpus > 0) {
    await page.getByRole("textbox", { name: /Number of DPUs for Python Shell job/ }).fill(String(pythonShellDpus));
  }
  if (pythonShellMinutesPerMonth > 0) {
    await page.getByRole("spinbutton", { name: /Duration for which Python Shell job ETL runs/ }).fill(String(pythonShellMinutesPerMonth));
  }

  // The Interactive sessions block is expanded by default and the calculator
  // rejects DPU < 2 / duration < 1 with inline validation. If the caller did
  // not opt into interactive sessions (value 0), leave the UI defaults alone
  // — they amount to a few cents per month and let Save and view summary go
  // through. Only fill when the caller explicitly passed a usable value.
  if (interactiveDpus >= 2) {
    await page.getByRole("textbox", { name: /Number of DPUs for each provisioned interactive session/ }).fill(String(interactiveDpus));
  }
  if (interactiveMinutesPerMonth >= 1) {
    await page.getByRole("spinbutton", { name: /Duration for provisioned interactive sessions/ }).fill(String(interactiveMinutesPerMonth));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
}
