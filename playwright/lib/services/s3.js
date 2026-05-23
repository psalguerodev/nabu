import { registerService } from "../calculator.js";

registerService("s3", async (page, config) => {
  const {
    storageGB = 0,
    putRequests = 0,
    getRequests = 0,
  } = config;

  // S3 Standard is checked by default — set storage amount
  if (storageGB > 0) {
    const storageInput = page.getByRole("spinbutton", { name: /S3 Standard storage/ });
    await storageInput.fill(String(storageGB));
  }

  // Optional: PUT requests
  if (putRequests > 0) {
    const putInput = page.getByRole("textbox", { name: /PUT, COPY, POST, LIST requests/ });
    await putInput.fill(String(putRequests));
  }

  // Optional: GET requests
  if (getRequests > 0) {
    const getInput = page.getByRole("textbox", { name: /GET, SELECT, and all other requests/ });
    await getInput.fill(String(getRequests));
  }
});
