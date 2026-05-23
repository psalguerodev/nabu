import { registerService } from "../calculator.js";

registerService("cloudwatch", async (page, config) => {
  const {
    metrics = 0,        // custom/detailed metrics
    apiRequests = 0,    // other API requests
  } = config;

  // Number of metrics
  if (metrics > 0) {
    const metricInput = page.getByRole("textbox", { name: /Number of Metrics.*Enter the amount/ });
    await metricInput.fill(String(metrics));
  }

  // API requests
  if (apiRequests > 0) {
    const apiInput = page.getByRole("textbox", { name: /Number of other API requests/ });
    await apiInput.fill(String(apiRequests));
  }
});
