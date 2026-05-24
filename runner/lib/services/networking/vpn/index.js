export const id = "vpn";

export const version = "0.1.1";

// Scroll past the VPC sub-service toggle grid so the VPN Connection fields
// below it lazy-render before the probe runs.
export async function healthPrerequisite(page) {
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(400);
}

// CSS-based locators so we don't depend on platform-specific implicit roles
// of <input> elements.
export const healthLocators = [
  {
    css: 'input[aria-label*="Number of Site-to-Site VPN Connections"]',
    label: "Site-to-Site VPN connections input",
  },
  {
    css: 'input[aria-label*="Average duration for each connection"]',
    label: "average connection duration input",
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
