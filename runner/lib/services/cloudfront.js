export const id = "cloudfront";

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    pricingModel: "payg",
    dataOutGB: params.data_out_gb_per_month,
    dataOutToOriginGB: params.data_to_origin_gb_per_month,
    httpsRequests: params.https_requests_per_month,
  };
}

export async function handler(page, config) {
  const {
    pricingModel = "payg", // "flat" or "payg"
    // Pay as you go
    dataOutGB = 0,
    dataOutToOriginGB = 0,
    httpsRequests = 0,
    // Flat rate
    plan = null, // "free", "pro", "business", "premium"
    planQuantity = 1,
  } = config;

  if (pricingModel === "payg") {
    // Switch to Pay as you go
    await page.getByRole("radio", { name: "Pay as you go" }).click();
    await page.waitForTimeout(1000);

    // United States section (expanded by default)
    if (dataOutGB > 0) {
      const dataInput = page.getByRole("spinbutton", { name: /Data transfer out to internet Value/ });
      await dataInput.fill(String(dataOutGB));
    }

    if (dataOutToOriginGB > 0) {
      const originInput = page.getByRole("spinbutton", { name: /Data transfer out to origin Value/ });
      await originInput.fill(String(dataOutToOriginGB));
    }

    if (httpsRequests > 0) {
      const reqInput = page.getByRole("spinbutton", { name: /Number of requests \(HTTPS\) Value/ });
      await reqInput.fill(String(httpsRequests));
    }
  } else {
    // Flat Rate (default)
    const planMap = {
      free: "Free Plan",
      pro: "Pro Plan",
      business: "Business Plan",
      premium: "Premium Plan",
    };
    const planName = planMap[plan] || "Free Plan";
    const planInput = page.getByRole("textbox", { name: new RegExp(`${planName} Enter quantity`) });
    await planInput.fill(String(planQuantity));
  }
}
