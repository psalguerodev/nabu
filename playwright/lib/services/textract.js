import { registerService } from "../calculator.js";

// Amazon Textract
// Simple form: number of pages + per-API distribution percentages.
// Defaults: 100% Detect Document Text (basic OCR). Other APIs (Analyze Document,
// Analyze Expense, Analyze ID, Analyze Lending) are opt-in via percentages.
registerService("textract", async (page, config) => {
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
});
