export const id = "appsync";

export const version = "0.1.0";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "checkbox",
    name: "AppSync GraphQL Real-Time",
    label: "Real-Time feature checkbox",
  },
  {
    role: "checkbox",
    name: "Appsync Data Transfer",
    label: "Data Transfer feature checkbox",
  },
  {
    role: "spinbutton",
    name: /Number of API Requests/,
    label: "API requests spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    apiRequestsPerMonth: params.api_requests_per_month,
    enableRealTime: params.enable_real_time,
    subscribedClients: params.subscribed_clients,
    realTimeAvgDurationMinutes: params.real_time_avg_duration_minutes,
    inboundMessagesPerMonth: params.inbound_messages_per_month,
    outboundMessagesPerMonth: params.outbound_messages_per_month,
    enableDataTransfer: params.enable_data_transfer,
  };
}

export async function handler(page, config) {
  const {
    apiRequestsPerMonth = 0,
    enableRealTime = false,
    subscribedClients = 100,
    realTimeAvgDurationMinutes = 0,
    inboundMessagesPerMonth = 0,
    outboundMessagesPerMonth = 0,
    enableDataTransfer = false,
  } = config;

  const setFeature = async (label, want) => {
    const cb = page.getByRole("checkbox", { name: label });
    if (await cb.count() === 0) return;
    const isChecked = await cb.isChecked().catch(() => false);
    if (isChecked !== want) {
      await cb.click();
      await page.waitForTimeout(500);
    }
  };

  await setFeature("AppSync GraphQL Real-Time", enableRealTime);
  await setFeature("Appsync Data Transfer", enableDataTransfer);

  if (apiRequestsPerMonth > 0) {
    await page.getByRole("spinbutton", { name: /Number of API Requests/ }).fill(String(apiRequestsPerMonth));
  }

  if (enableRealTime) {
    await page.getByRole("textbox", { name: /Number Of Subscribed Clients/ }).fill(String(subscribedClients));
    if (realTimeAvgDurationMinutes > 0) {
      await page.getByRole("spinbutton", { name: /Average Active Duration per Subscribed Clients/ }).fill(String(realTimeAvgDurationMinutes));
    }
    if (inboundMessagesPerMonth > 0) {
      await page.getByRole("spinbutton", { name: /Number of Inbound Messages/ }).fill(String(inboundMessagesPerMonth));
    }
    if (outboundMessagesPerMonth > 0) {
      await page.getByRole("spinbutton", { name: /Number of Outbound Messages/ }).fill(String(outboundMessagesPerMonth));
    }
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
}
