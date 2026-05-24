export const id = "s3";

export const version = "0.1.1";

// CSS-based locators so we don't depend on the platform-specific implicit
// role of <input> (Linux Chromium calls it textbox, macOS Chromium calls
// it spinbutton — same DOM node). Broad aria-label prefix matches survive
// the "Value" / "Enter amount" suffix AWS sometimes appends.
export const healthLocators = [
  {
    css: 'input[aria-label^="S3 Standard storage"]',
    label: "S3 Standard storage input",
  },
  {
    css: 'input[aria-label*="PUT"]',
    label: "PUT requests input",
  },
  {
    css: 'input[aria-label*="GET, SELECT"]',
    label: "GET requests input",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    storageGB: params.storage_gb,
    putRequests: params.put_requests_per_month ?? 0,
    getRequests: params.get_requests_per_month ?? 0,
  };
}

export async function handler(page, config) {
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
}
