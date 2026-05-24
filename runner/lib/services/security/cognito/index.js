export const id = "cognito";

export const version = "0.1.0";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "radio",
    name: "Cognito Lite Tier",
    label: "Lite tier radio",
  },
  {
    role: "radio",
    name: "Cognito Essentials Tier",
    label: "Essentials tier radio",
  },
  {
    role: "radio",
    name: "Cognito Plus Tier",
    label: "Plus tier radio",
  },
  {
    role: "textbox",
    name: /Number of monthly active users \(MAU\) Enter/,
    label: "MAU textbox",
  },
  {
    role: "textbox",
    name: /SAML or OIDC federation/,
    label: "SAML/OIDC users textbox",
  },
];

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
