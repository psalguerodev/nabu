export const id = "vpn";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "textbox",
    name: /Number of Site-to-Site VPN Connections/,
    label: "Site-to-Site VPN connections textbox",
  },
  {
    role: "spinbutton",
    name: /Average duration for each connection Value/,
    label: "average connection duration spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    siteToSiteConnections: params.site_to_site_connections,
    hoursPerDay: params.hours_per_day,
  };
}

export async function handler(page, config) {
  const {
    siteToSiteConnections = 1,
    hoursPerDay = 24,
  } = config;

  // VPN Connection is checked by default
  // Set number of Site-to-Site VPN connections
  if (siteToSiteConnections > 0) {
    const connInput = page.getByRole("textbox", { name: /Number of Site-to-Site VPN Connections/ });
    await connInput.fill(String(siteToSiteConnections));
  }

  // Average duration
  if (hoursPerDay !== 24) {
    const durInput = page.getByRole("spinbutton", { name: /Average duration for each connection Value/ }).first();
    await durInput.fill(String(hoursPerDay));
  }
}
