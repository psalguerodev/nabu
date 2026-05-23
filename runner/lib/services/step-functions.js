export const id = "step-functions";

export const version = "0.1.0";

// Locators the handler() depends on. Used by the daily health check.
// Express Workflows checkbox is opt-in and excluded.
export const healthLocators = [
  {
    role: "spinbutton",
    name: /Workflow requests Value/,
    label: "workflow requests spinbutton",
  },
  {
    role: "textbox",
    name: /State transitions per workflow/,
    label: "state transitions textbox",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    workflowRequests: params.workflow_requests,
    transitionsPerWorkflow: params.transitions_per_workflow,
    express: params.express,
  };
}

export async function handler(page, config) {
  const {
    workflowRequests = 0,
    transitionsPerWorkflow = 0,
    express = false,
  } = config;

  // Enable Express Workflows if needed
  if (express) {
    await page.getByRole("checkbox", { name: "Step Functions - Express Workflows" }).click();
  }

  // Workflow requests
  if (workflowRequests > 0) {
    const reqInput = page.getByRole("spinbutton", { name: /Workflow requests Value/ });
    await reqInput.fill(String(workflowRequests));
  }

  // State transitions per workflow
  if (transitionsPerWorkflow > 0) {
    const transInput = page.getByRole("textbox", { name: /State transitions per workflow/ });
    await transInput.fill(String(transitionsPerWorkflow));
  }
}
