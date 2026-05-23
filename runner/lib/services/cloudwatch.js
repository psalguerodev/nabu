export const id = "cloudwatch";

export const version = "0.1.0";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "textbox",
    name: /Number of Metrics.*Enter the amount/,
    label: "number of metrics textbox",
  },
  {
    role: "textbox",
    name: /Number of other API requests/,
    label: "API requests textbox",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    metrics: params.metrics,
    apiRequests: params.api_requests,
  };
}

export async function handler(page, config) {
  const {
    metrics = 0,        // custom/detailed metrics
    apiRequests = 0,    // other API requests
  } = config;

  // Number of metrics
  if (metrics > 0) {
    const metricInput = page.getByRole("textbox", { name: /Number of Metrics.*Enter the amount/ });
    await metricInput.fill(String(metrics));
  }

  // API requests
  if (apiRequests > 0) {
    const apiInput = page.getByRole("textbox", { name: /Number of other API requests/ });
    await apiInput.fill(String(apiRequests));
  }
}
