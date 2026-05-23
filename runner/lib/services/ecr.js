import { registerService } from "../calculator.js";

registerService("ecr", async (page, config) => {
  const {
    storageGB = 0,
  } = config;

  if (storageGB > 0) {
    await page.getByRole("spinbutton", { name: /Amount of data stored/ }).fill(String(storageGB));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
});
