import { registerService } from "../calculator.js";

registerService("systems-manager", async (page, config) => {
  const {
    standardParams = 0,
    advancedParams = 0,
    apiInteractionsPerParam = 0,
  } = config;

  // Parameter Store is checked by default
  if (standardParams > 0) {
    const stdInput = page.getByRole("textbox", { name: /Standard parameters/ });
    await stdInput.fill(String(standardParams));
  }

  if (advancedParams > 0) {
    const advInput = page.getByRole("textbox", { name: /Advanced parameters/ });
    await advInput.fill(String(advancedParams));
  }

  if (apiInteractionsPerParam > 0) {
    const apiInput = page.getByRole("spinbutton", { name: /Frequency of API interactions/ });
    await apiInput.fill(String(apiInteractionsPerParam));
  }
});
