// AWS region code → calculator.aws display label mapping.
// Source: AWS region docs (https://docs.aws.amazon.com/general/latest/gr/rande.html).
// Calculator dropdowns show the human label; we need the code → label conversion
// because consumers pass codes (us-east-1) and the wizard renders names.

export const REGION_LABELS = {
  "us-east-1": "US East (N. Virginia)",
  "us-east-2": "US East (Ohio)",
  "us-west-1": "US West (N. California)",
  "us-west-2": "US West (Oregon)",
  "af-south-1": "Africa (Cape Town)",
  "ap-east-1": "Asia Pacific (Hong Kong)",
  "ap-south-1": "Asia Pacific (Mumbai)",
  "ap-south-2": "Asia Pacific (Hyderabad)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
  "ap-southeast-2": "Asia Pacific (Sydney)",
  "ap-southeast-3": "Asia Pacific (Jakarta)",
  "ap-southeast-4": "Asia Pacific (Melbourne)",
  "ap-northeast-1": "Asia Pacific (Tokyo)",
  "ap-northeast-2": "Asia Pacific (Seoul)",
  "ap-northeast-3": "Asia Pacific (Osaka)",
  "ca-central-1": "Canada (Central)",
  "eu-central-1": "Europe (Frankfurt)",
  "eu-central-2": "Europe (Zurich)",
  "eu-west-1": "Europe (Ireland)",
  "eu-west-2": "Europe (London)",
  "eu-west-3": "Europe (Paris)",
  "eu-south-1": "Europe (Milan)",
  "eu-south-2": "Europe (Spain)",
  "eu-north-1": "Europe (Stockholm)",
  "il-central-1": "Israel (Tel Aviv)",
  "me-south-1": "Middle East (Bahrain)",
  "me-central-1": "Middle East (UAE)",
  "sa-east-1": "South America (São Paulo)",
};

export function regionLabel(code) {
  return REGION_LABELS[code] ?? null;
}

/**
 * Open the region picker on the current service config page and select the
 * requested region. Returns true on success, false if the picker could not
 * be found (some services may not surface it). Never throws on missing UI —
 * a missing picker means we accept the calculator's default region.
 */
export async function setRegion(page, regionCode) {
  const label = regionLabel(regionCode);
  if (!label) return false;

  const picker = page
    .getByRole("button", { name: /Choose a Region/i })
    .first();
  const visible = await picker
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (!visible) return false;

  await picker.click();
  await page.waitForTimeout(300);

  const option = page.getByRole("option", { name: label }).first();
  const optionVisible = await option
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (!optionVisible) {
    // Close the picker again if we opened it but cannot match.
    await page.keyboard.press("Escape").catch(() => {});
    return false;
  }
  await option.click();
  await page.waitForTimeout(500);
  return true;
}
