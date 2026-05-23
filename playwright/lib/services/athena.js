import { registerService } from "../calculator.js";

// NOTE: "Total number of queries" default unit is "per day" (not per month)
// The queriesPerDay parameter maps directly to the field value
registerService("athena", async (page, config) => {
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
});
