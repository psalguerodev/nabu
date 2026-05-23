import { registerService } from "../calculator.js";

registerService("ec2", async (page, config) => {
  const {
    instances = 1,
    instanceType = "t3.medium",
    os = "Linux",
    pricing = "On-Demand",
  } = config;

  // Set number of instances
  const instancesInput = page.getByRole("spinbutton", { name: /Number of instances/ });
  await instancesInput.fill(String(instances));

  // Search instance type
  const searchInput = page.getByRole("searchbox", { name: /Search instance types/ });
  await searchInput.fill(instanceType);
  await page.waitForTimeout(1500);

  // Select the instance (single result in table)
  await page.locator("table[aria-label='EC2 selection'] tbody input[type='radio']").first().click();
  await page.waitForTimeout(500);

  // Set OS if not Linux
  if (os !== "Linux") {
    await page.getByRole("button", { name: /Operating system/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole("option", { name: os }).click();
  }

  // Scroll to payment options
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500);

  // Select pricing strategy
  if (pricing === "On-Demand") {
    await page.getByRole("radio", { name: "On-Demand" }).click();
  } else if (pricing === "Spot") {
    await page.getByRole("radio", { name: "Spot Instances" }).click();
  }
  // Default is Compute Savings Plans — leave as is for other cases
});
