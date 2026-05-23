import { registerService } from "../calculator.js";

registerService("lambda", async (page, config) => {
  const {
    requests = 0,
    durationMs = 100,
    memoryMB = 128,
    architecture = "x86",
    freeTier = true,
  } = config;

  // Free tier toggle
  if (!freeTier) {
    await page.getByRole("radio", { name: "Lambda Function - Without Free Tier" }).click();
  }

  // Architecture
  if (architecture === "arm64") {
    await page.getByRole("button", { name: /Architecture x86/ }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole("option", { name: "arm64" }).click();
  }

  // Number of requests
  if (requests > 0) {
    const reqInput = page.getByRole("spinbutton", { name: /Number of requests Value/ }).first();
    await reqInput.fill(String(requests));
  }

  // Duration
  if (durationMs > 0) {
    const durInput = page.getByRole("textbox", { name: /Duration of each request.*Enter duration/ }).first();
    await durInput.fill(String(durationMs));
  }

  // Memory
  if (memoryMB > 0) {
    const memInput = page.getByRole("spinbutton", { name: /Amount of memory allocated/ }).first();
    await memInput.fill(String(memoryMB));
  }
});
