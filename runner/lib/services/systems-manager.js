export const id = "systems-manager";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "textbox",
    name: /Standard parameters/,
    label: "standard parameters textbox",
  },
  {
    role: "textbox",
    name: /Advanced parameters/,
    label: "advanced parameters textbox",
  },
  {
    role: "spinbutton",
    name: /Frequency of API interactions/,
    label: "API interactions spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    standardParams: params.standard_params,
    advancedParams: params.advanced_params,
    apiInteractionsPerParam: params.api_interactions_per_param,
  };
}

export async function handler(page, config) {
  const {
    standardParams = 0,
    advancedParams = 0,
    apiInteractionsPerParam = 0,
  } = config;

  // Parameter Store is checked by default
  if (standardParams > 0) {
    const stdInput = page.getByRole("textbox", { name: /Standard parameters/ });
    await stdInput.fill(String(standardParams));
  }

  if (advancedParams > 0) {
    const advInput = page.getByRole("textbox", { name: /Advanced parameters/ });
    await advInput.fill(String(advancedParams));
  }

  if (apiInteractionsPerParam > 0) {
    const apiInput = page.getByRole("spinbutton", { name: /Frequency of API interactions/ });
    await apiInput.fill(String(apiInteractionsPerParam));
  }
}
