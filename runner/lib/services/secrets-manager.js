import { registerService } from "../calculator.js";

registerService("secrets-manager", async (page, config) => {
  const {
    numberOfSecrets = 0,
    avgSecretDurationDays = 30,
    apiCallsPerMonth = 0,
  } = config;

  if (numberOfSecrets > 0) {
    await page.getByRole("textbox", { name: /Number of secrets/ }).fill(String(numberOfSecrets));
  }

  if (avgSecretDurationDays > 0) {
    await page.getByRole("spinbutton", { name: /Average duration of each secret/ }).fill(String(avgSecretDurationDays));
  }

  if (apiCallsPerMonth > 0) {
    await page.getByRole("spinbutton", { name: /Number of API calls/ }).fill(String(apiCallsPerMonth));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
});
