export const id = "bedrock-agentcore";

export const version = "0.1.1";

// Locators the handler() depends on. Used by the daily health check.
// Only the always-on Runtime section is probed; sub-services (Gateway,
// Browser Tools, Observability, etc.) are opt-in and skipped here.
export const healthLocators = [
  {
    role: "textbox",
    name: /Number of agent sessions per month/,
    label: "Runtime sessions per month textbox",
  },
  {
    role: "textbox",
    name: /Average Session Duration/,
    label: "Runtime average session duration textbox",
  },
  {
    role: "textbox",
    name: /Average vCPU/,
    label: "Runtime average vCPU textbox",
  },
  {
    role: "textbox",
    name: /Average Session Memory/,
    label: "Runtime session memory textbox",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    enableGateway: params.enable_gateway,
    enableIdentity: params.enable_identity,
    enableBrowserTools: params.enable_browser_tools,
    enableCodeInterpreter: params.enable_code_interpreter,
    enableMemory: params.enable_memory,
    enableObservability: params.enable_observability,
    sessionsPerMonth: params.sessions_per_month,
    avgSessionDurationSec: params.avg_session_duration_sec,
    ioWaitPercent: params.io_wait_percent,
    avgVcpu: params.avg_vcpu,
    avgSessionMemoryGB: params.avg_session_memory_gb,
    gatewaySessions: params.gateway_sessions,
    gatewayTools: params.gateway_tools,
    gatewaySearchRequests: params.gateway_search_requests,
    gatewayToolInvocations: params.gateway_tool_invocations,
    observabilityLogsGB: params.observability_logs_gb,
    observabilitySpansGB: params.observability_spans_gb,
    browserSessionsPerMonth: params.browser_sessions_per_month,
    browserSessionDurationSec: params.browser_session_duration_sec,
    browserSessionVcpu: params.browser_session_vcpu,
    browserSessionMemoryGB: params.browser_session_memory_gb,
  };
}

export async function handler(page, config) {
  const {
    // Sub-services to enable
    enableGateway = false,
    enableIdentity = false,
    enableBrowserTools = false,
    enableCodeInterpreter = false,
    enableMemory = false,
    enableObservability = false,
    // Runtime (enabled by default)
    sessionsPerMonth = 0,
    avgSessionDurationSec = 60,
    ioWaitPercent = 0,
    avgVcpu = 1,
    avgSessionMemoryGB = 1,
    // Gateway
    gatewaySessions = 0,
    gatewayTools = 0,
    gatewaySearchRequests = 0,
    gatewayToolInvocations = 0,
    // Observability
    observabilityLogsGB = 0,
    observabilitySpansGB = 0,
  } = config;

  // Enable sub-services
  if (enableGateway) {
    await page.getByRole("checkbox", { name: "AgentCore Gateway" }).click({ force: true });
    await page.waitForTimeout(300);
  }
  if (enableIdentity) {
    await page.getByRole("checkbox", { name: "AgentCore Identity" }).click({ force: true });
    await page.waitForTimeout(300);
  }
  if (enableBrowserTools) {
    await page.getByRole("checkbox", { name: "AgentCore Browser Tools" }).click({ force: true });
    await page.waitForTimeout(300);
  }
  if (enableCodeInterpreter) {
    await page.getByRole("checkbox", { name: "AgentCore Code Interpreter" }).click({ force: true });
    await page.waitForTimeout(300);
  }
  if (enableMemory) {
    await page.getByRole("checkbox", { name: "AgentCore Memory" }).click({ force: true });
    await page.waitForTimeout(300);
  }
  if (enableObservability) {
    await page.getByRole("checkbox", { name: "AgentCore Observability" }).click({ force: true });
    await page.waitForTimeout(300);
  }

  await page.waitForTimeout(500);

  // Runtime fields
  if (sessionsPerMonth > 0) {
    await page.getByRole("textbox", { name: /Number of agent sessions per month/ }).first().fill(String(sessionsPerMonth));
  }
  if (avgSessionDurationSec > 0) {
    await page.getByRole("textbox", { name: /Average Session Duration/ }).first().fill(String(avgSessionDurationSec));
  }
  if (ioWaitPercent > 0) {
    await page.getByRole("spinbutton", { name: /I\/O Wait Time/ }).first().fill(String(ioWaitPercent));
  }
  if (avgVcpu > 0) {
    await page.getByRole("textbox", { name: /Average vCPU/ }).first().fill(String(avgVcpu));
  }
  if (avgSessionMemoryGB > 0) {
    await page.getByRole("textbox", { name: /Average Session Memory/ }).first().fill(String(avgSessionMemoryGB));
  }

  // Gateway fields
  if (enableGateway && gatewaySessions > 0) {
    await page.getByRole("textbox", { name: /Number of agent sessions per month/ }).nth(1).fill(String(gatewaySessions));
  }
  if (enableGateway && gatewayTools > 0) {
    await page.getByRole("textbox", { name: /Total Number of tools defined/ }).fill(String(gatewayTools));
  }
  if (enableGateway && gatewaySearchRequests > 0) {
    await page.getByRole("textbox", { name: /Average number of Search API requests/ }).fill(String(gatewaySearchRequests));
  }
  if (enableGateway && gatewayToolInvocations > 0) {
    await page.getByRole("textbox", { name: /Average number of tool invocations/ }).fill(String(gatewayToolInvocations));
  }

  // Browser Tools fields (required if enabled)
  // Browser Tools adds its own "Number of agent sessions per month" + duration
  // + vCPU + Memory inputs. We target the BT-specific labels exactly.
  if (enableBrowserTools) {
    const btSessions = config.browserSessionsPerMonth ?? sessionsPerMonth;
    const btDuration = config.browserSessionDurationSec ?? avgSessionDurationSec;
    const btVcpu = config.browserSessionVcpu ?? 1;
    const btMemory = config.browserSessionMemoryGB ?? 2;
    // Use exact-label lookups for BT-specific fields
    await page.getByRole("textbox", { name: "vCPU per Browser Session" }).first().fill(String(btVcpu));
    await page.getByRole("textbox", { name: "Memory per Browser Session (GB)" }).first().fill(String(btMemory));
    // BT sessions/duration share label with Runtime — pick the BT instance.
    // Order in DOM (when Gateway disabled): Runtime sessions, BT sessions,
    // CodeInterp sessions (if enabled), Memory sessions (if enabled).
    const sessionsLocator = page.getByRole("textbox", { name: "Number of agent sessions per month" });
    const durationLocator = page.getByRole("textbox", { name: "Average Session Duration (seconds)" });
    const btSessionsIdx = (enableGateway ? 1 : 0) + 1;
    await sessionsLocator.nth(btSessionsIdx).fill(String(btSessions));
    await durationLocator.nth(btSessionsIdx).fill(String(btDuration));
  }

  // Observability fields
  if (enableObservability && observabilityLogsGB > 0) {
    await page.getByRole("spinbutton", { name: /Observability vended logs ingested/ }).first().fill(String(observabilityLogsGB));
  }
  if (enableObservability && observabilitySpansGB > 0) {
    await page.getByRole("spinbutton", { name: /Observability spans ingested/ }).first().fill(String(observabilitySpansGB));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);

  // Diagnostic: log any remaining invalid fields
  const invalid = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-invalid="true"]'))
      .map((e) => e.getAttribute("aria-label") || e.id)
      .filter(Boolean)
  );
  if (invalid.length > 0) {
    console.error("⚠️ AgentCore invalid fields:", JSON.stringify(invalid));
  }
}
