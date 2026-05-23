import { registerService } from "../calculator.js";

registerService("api-gateway", async (page, config) => {
  const {
    httpRequests = 0,       // millions per month
    restRequests = 0,       // millions per month
    websocketMessages = 0,  // thousands per second
    avgRequestSizeKB = 34,
    cacheGB = "None",
  } = config;

  // HTTP API requests
  if (httpRequests > 0) {
    const httpInput = page.getByRole("spinbutton", { name: /Requests Value/ }).first();
    await httpInput.fill(String(httpRequests));
  }

  // Average request size
  if (avgRequestSizeKB !== 34) {
    const sizeInput = page.getByRole("spinbutton", { name: /Average size of each request/ });
    await sizeInput.fill(String(avgRequestSizeKB));
  }

  // REST API requests
  if (restRequests > 0) {
    const restInput = page.getByRole("spinbutton", { name: /Requests Value/ }).nth(1);
    await restInput.fill(String(restRequests));
  }

  // Cache
  if (cacheGB !== "None") {
    await page.getByRole("button", { name: /Cache memory size/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole("option", { name: String(cacheGB) }).click();
  }

  // WebSocket messages
  if (websocketMessages > 0) {
    const wsInput = page.getByRole("spinbutton", { name: /Messages Value/ });
    await wsInput.fill(String(websocketMessages));
  }
});
