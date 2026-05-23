export const id = "textract";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "textbox",
    name: /Number of pages/,
    label: "number of pages textbox",
  },
  {
    role: "spinbutton",
    name: /Percent of pages with text \(Detect Document Text API\)/,
    label: "percent with text spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    numberOfPages: params.number_of_pages,
    percentWithText: params.percent_with_text,
    percentWithQueries: params.percent_with_queries,
    percentWithTables: params.percent_with_tables,
    percentWithForms: params.percent_with_forms,
    percentWithFormsTables: params.percent_with_forms_tables,
    percentWithLayout: params.percent_with_layout,
    percentWithExpense: params.percent_with_expense,
    percentWithId: params.percent_with_id,
    percentWithLending: params.percent_with_lending,
    percentWithSignatures: params.percent_with_signatures,
  };
}

// Amazon Textract
// Simple form: number of pages + per-API distribution percentages.
// Defaults: 100% Detect Document Text (basic OCR). Other APIs (Analyze Document,
// Analyze Expense, Analyze ID, Analyze Lending) are opt-in via percentages.
export async function handler(page, config) {
  const {
    numberOfPages = 0,
    percentWithText = 100,
    percentWithQueries = 0,
    percentWithTables = 0,
    percentWithForms = 0,
    percentWithFormsTables = 0,
    percentWithLayout = 0,
    percentWithExpense = 0,
    percentWithId = 0,
    percentWithLending = 0,
    percentWithSignatures = 0,
  } = config;

  await page.getByRole("textbox", { name: /Number of pages/ }).fill(String(numberOfPages));

  const setPct = async (labelRegex, value) => {
    if (value === 0 || value == null) return;
    const f = page.getByRole("spinbutton", { name: labelRegex });
    if ((await f.count()) === 0) return;
    await f.first().fill(String(value));
  };

  await setPct(/Percent of pages with text \(Detect Document Text API\)/, percentWithText);
  await setPct(/Percent of pages with Queries \(Analyze Document API\)/, percentWithQueries);
  await setPct(/^Percent of pages with Tables \(Analyze Document API\)/, percentWithTables);
  await setPct(/^Percent of pages with Forms \(Analyze Document API\)/, percentWithForms);
  await setPct(/Percent of pages with Forms and Tables \(Analyze Document API\)/, percentWithFormsTables);
  await setPct(/Percent of pages with Layouts \(Analyze Document API\)/, percentWithLayout);
  await setPct(/Percent of pages with invoices and receipts \(Analyze Expense API\)/, percentWithExpense);
  await setPct(/Percent of pages with identity documents \(Analyze ID API\)/, percentWithId);
  await setPct(/Percent of pages with lending documents \(Analyze Lending API\)/, percentWithLending);
  await setPct(/Percent of pages with signatures \(Analyze Document API\)/, percentWithSignatures);

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
}
