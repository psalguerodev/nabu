export const id = "cognito";

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    tier: params.tier,
    mau: params.mau,
    samlMau: params.saml_mau,
  };
}

export async function handler(page, config) {
  const {
    tier = "lite", // "lite", "essentials", "plus"
    mau = 0,       // monthly active users
    samlMau = 0,   // SAML/OIDC federation users
  } = config;

  // Select tier
  const tierMap = { lite: "Cognito Lite Tier", essentials: "Cognito Essentials Tier", plus: "Cognito Plus Tier" };
  const tierName = tierMap[tier] || tierMap.lite;
  await page.getByRole("radio", { name: tierName }).click();
  await page.waitForTimeout(500);

  // Monthly active users
  if (mau > 0) {
    const mauInput = page.getByRole("textbox", { name: /Number of monthly active users \(MAU\) Enter/ }).first();
    await mauInput.fill(String(mau));
  }

  // SAML/OIDC users
  if (samlMau > 0) {
    const samlInput = page.getByRole("textbox", { name: /SAML or OIDC federation/ });
    await samlInput.fill(String(samlMau));
  }
}
