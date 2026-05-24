export const id = "athena";

export const version = "0.1.1";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "spinbutton",
    name: /Total number of queries Value/,
    label: "total queries spinbutton",
  },
  {
    role: "spinbutton",
    name: /Amount of data scanned per query Value/,
    label: "data scanned per query spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    queriesPerDay: params.queries_per_day,
    queriesPerMonth: params.queries_per_month,
    dataScannedPerQueryGB: params.data_scanned_per_query_gb,
  };
}

// NOTE: "Total number of queries" default unit is "per day" (not per month)
// The queriesPerDay parameter maps directly to the field value
export async function handler(page, config) {
  const {
    queriesPerDay = 0,
    // Legacy: if queriesPerMonth is provided, convert to per day
    queriesPerMonth = 0,
    dataScannedPerQueryGB = 1,
  } = config;

  const queries = queriesPerDay > 0 ? queriesPerDay : Math.ceil(queriesPerMonth / 30);

  if (queries > 0) {
    const queryInput = page.getByRole("spinbutton", { name: /Total number of queries Value/ });
    await queryInput.fill(String(queries));
  }

  if (dataScannedPerQueryGB > 0) {
    const scanInput = page.getByRole("spinbutton", { name: /Amount of data scanned per query Value/ });
    await scanInput.fill(String(dataScannedPerQueryGB));
  }
}
