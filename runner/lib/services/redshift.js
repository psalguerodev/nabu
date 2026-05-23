import { registerService } from "../calculator.js";

// Amazon Redshift - supports both Provisioned and Serverless modes.
// Provisioned: nodes × instance type × utilization × pricing model.
// Serverless: baseRPU × hoursPerDay × $0.366/RPU-hr (us-east-2).
registerService("redshift", async (page, config) => {
  const {
    mode = "serverless",
    nodes = 1,
    instanceType = "ra3.xlplus",
    utilizationPercent = 100,
    baseRPU = 8,
    hoursPerDay = 0,
    workloadSize = null,
  } = config;

  if (mode === "provisioned") {
    await page.getByRole("textbox", { name: "Nodes", exact: true }).fill(String(nodes));

    // CloudScape autocomplete combobox - must use keyboard navigation
    // (option.click() doesn't commit selection in React state)
    const combo = page.getByRole("combobox", { name: /Select an instance/ });
    await combo.fill(instanceType);
    await page.waitForTimeout(800);
    await combo.press("ArrowDown");
    await combo.press("Enter");
    await page.waitForTimeout(500);

    if (utilizationPercent > 0 && utilizationPercent !== 100) {
      await page
        .getByRole("spinbutton", { name: /Utilization \(On-Demand only\)/ })
        .fill(String(utilizationPercent));
    }
  } else {
    const radio = page.getByRole("radio", { name: "Redshift Serverless" });
    if (!(await radio.isChecked())) {
      await radio.click();
      await page.waitForTimeout(2000);
    }

    if (workloadSize) {
      await page.getByRole("button", { name: /Workload size/ }).click();
      await page.waitForTimeout(800);
      await page.getByRole("option", { name: workloadSize }).first().click();
      await page.waitForTimeout(500);
    }

    await page.getByRole("button", { name: /Base RPU/ }).click();
    await page.waitForTimeout(800);
    await page
      .getByRole("option", { name: String(baseRPU), exact: true })
      .first()
      .click();
    await page.waitForTimeout(500);

    if (hoursPerDay > 0) {
      await page
        .getByRole("textbox", { name: /Expected daily runtime/ })
        .fill(String(hoursPerDay));
    }
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
});
