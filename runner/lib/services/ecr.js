export const id = "ecr";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "spinbutton",
    name: /Amount of data stored/,
    label: "data stored spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    storageGB: params.storage_gb,
  };
}

export async function handler(page, config) {
  const {
    storageGB = 0,
  } = config;

  if (storageGB > 0) {
    await page.getByRole("spinbutton", { name: /Amount of data stored/ }).fill(String(storageGB));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
}
