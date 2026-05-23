import { registerService } from "../calculator.js";

// calculator.aws caps the "Average duration of each secret" at 30.42 days
// (one month). For longer durations we have to switch the unit dropdown
// from "days" to "months" and convert the value.
const DAYS_PER_MONTH = 30.42;

async function trySwitchUnitToMonths(page) {
  const candidates = [
    page.locator('button:has-text("days")').first(),
    page.getByRole("combobox", { name: /unit/i }).first(),
    page.locator('[data-testid="duration-unit"]').first(),
    page.getByRole("button", { name: /^days$/i }).first(),
  ];
  for (const trigger of candidates) {
    if (await trigger.isVisible({ timeout: 800 }).catch(() => false)) {
      await trigger.click().catch(() => {});
      await page.waitForTimeout(250);
      const opt = page
        .getByRole("option", { name: /^months?$/i })
        .first()
        .or(page.locator('li:has-text("months")').first())
        .or(page.locator('[role="option"]:has-text("month")').first());
      if (await opt.isVisible({ timeout: 1200 }).catch(() => false)) {
        await opt.click();
        await page.waitForTimeout(250);
        return true;
      }
      // Close popover if option not found
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  return false;
}

registerService("secrets-manager", async (page, config) => {
  const {
    numberOfSecrets = 0,
    avgSecretDurationDays = 30,
    apiCallsPerMonth = 0,
  } = config;

  if (numberOfSecrets > 0) {
    await page
      .getByRole("textbox", { name: /Number of secrets/ })
      .fill(String(numberOfSecrets));
  }

  if (avgSecretDurationDays > 0) {
    let value = avgSecretDurationDays;
    let switched = false;

    if (avgSecretDurationDays > DAYS_PER_MONTH) {
      switched = await trySwitchUnitToMonths(page);
      if (switched) {
        value = Number((avgSecretDurationDays / DAYS_PER_MONTH).toFixed(2));
      } else {
        // Could not switch the unit; cap at the calculator's max integer days.
        value = 30;
      }
    } else {
      // Days-unit requires integer values.
      value = Math.max(1, Math.round(avgSecretDurationDays));
    }

    await page
      .getByRole("spinbutton", { name: /Average duration of each secret/ })
      .fill(String(value));
  }

  if (apiCallsPerMonth > 0) {
    await page
      .getByRole("spinbutton", { name: /Number of API calls/ })
      .fill(String(apiCallsPerMonth));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
});
