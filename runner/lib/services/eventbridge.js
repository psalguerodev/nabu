import { registerService } from "../calculator.js";

// NOTE: All event counts are in MILLIONS per month (calculator default unit)
// Example: 8,640 events/month = 0.00864 million
registerService("eventbridge", async (page, config) => {
  const {
    customEvents = 0,   // millions per month
    payloadSizeKB = 1,
  } = config;

  // Payload size
  if (payloadSizeKB !== 1) {
    const sizeInput = page.getByRole("spinbutton", { name: /Size of the payload Value/ });
    await sizeInput.fill(String(payloadSizeKB));
  }

  // Custom events (most common for CRON/scheduled rules)
  if (customEvents > 0) {
    const eventInput = page.getByRole("spinbutton", { name: /Number of custom events Value/ });
    await eventInput.fill(String(customEvents));
  }
});
