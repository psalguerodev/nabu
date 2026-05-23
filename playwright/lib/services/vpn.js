import { registerService } from "../calculator.js";

registerService("vpn", async (page, config) => {
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
});
