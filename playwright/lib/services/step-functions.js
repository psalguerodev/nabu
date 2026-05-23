import { registerService } from "../calculator.js";

registerService("step-functions", async (page, config) => {
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
});
