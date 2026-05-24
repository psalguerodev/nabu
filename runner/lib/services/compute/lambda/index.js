export const id = "lambda";

export const version = "0.1.0";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "radio",
    name: "Lambda Function - Without Free Tier",
    label: "Without Free Tier radio",
  },
  {
    role: "spinbutton",
    name: /Number of requests Value/,
    label: "number of requests spinbutton",
  },
  {
    role: "textbox",
    name: /Duration of each request.*Enter duration/,
    label: "duration of each request textbox",
  },
  {
    role: "spinbutton",
    name: /Amount of memory allocated/,
    label: "memory allocated spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    requests: params.invocations_per_month,
    durationMs: params.avg_duration_ms,
    memoryMB: params.memory_mb,
    architecture: params.architecture === "arm64" ? "arm64" : "x86",
    freeTier: false,
  };
}

export async function handler(page, config) {
  const {
    requests = 0,
    durationMs = 100,
    memoryMB = 128,
    architecture = "x86",
    freeTier = true,
  } = config;

  // Free tier toggle
  if (!freeTier) {
    await page.getByRole("radio", { name: "Lambda Function - Without Free Tier" }).click();
  }

  // Architecture
  if (architecture === "arm64") {
    await page.getByRole("button", { name: /Architecture x86/ }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole("option", { name: "arm64" }).click();
  }

  // Number of requests
  if (requests > 0) {
    const reqInput = page.getByRole("spinbutton", { name: /Number of requests Value/ }).first();
    await reqInput.fill(String(requests));
  }

  // Duration
  if (durationMs > 0) {
    const durInput = page.getByRole("textbox", { name: /Duration of each request.*Enter duration/ }).first();
    await durInput.fill(String(durationMs));
  }

  // Memory
  if (memoryMB > 0) {
    const memInput = page.getByRole("spinbutton", { name: /Amount of memory allocated/ }).first();
    await memInput.fill(String(memoryMB));
  }
}
