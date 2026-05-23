import { registerService } from "../calculator.js";

registerService("xray", async (page, config) => {
  const {
    requestsPerMonth = 0,
    samplingRate = 100,
    queriesPerMonth = 0,
    tracesPerQuery = 100,
  } = config;

  if (requestsPerMonth > 0) {
    const reqInput = page.getByRole("textbox", { name: /Number of requests per month/ });
    await reqInput.fill(String(requestsPerMonth));
  }

  if (samplingRate !== 100) {
    const sampleInput = page.getByRole("spinbutton", { name: /Sampling rate/ });
    await sampleInput.fill(String(samplingRate));
  }

  if (queriesPerMonth > 0) {
    const queryInput = page.getByRole("textbox", { name: /Number of queries per month/ });
    await queryInput.fill(String(queriesPerMonth));
  }

  if (tracesPerQuery !== 100) {
    const traceInput = page.getByRole("textbox", { name: /Traces retrieved per query/ });
    await traceInput.fill(String(tracesPerQuery));
  }
});
