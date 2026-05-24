export const id = "cloudtrail";

export const version = "0.1.0";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "button",
    name: /^Management events units/,
    label: "management events units dropdown",
  },
  {
    role: "spinbutton",
    name: /Number of management events Value/,
    label: "management events spinbutton",
  },
  {
    role: "textbox",
    name: /^Management event trails$/,
    label: "management event trails textbox",
  },
  {
    role: "spinbutton",
    name: /Read management events Value/,
    label: "read management events spinbutton",
  },
  {
    role: "textbox",
    name: /^Read management trails$/,
    label: "read management trails textbox",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    mgmtEvents: params.mgmt_events,
    mgmtTrails: params.mgmt_trails,
    readMgmtEvents: params.read_mgmt_events,
    readMgmtTrails: params.read_mgmt_trails,
    s3Operations: params.s3_operations,
    s3Trails: params.s3_trails,
    lambdaEvents: params.lambda_events,
    lambdaTrails: params.lambda_trails,
    networkEvents: params.network_events,
    networkTrails: params.network_trails,
  };
}

// AWS CloudTrail
// Form has 5 sections (all expanded by default):
//   Management Events, Data Events, Network Activity Events,
//   Insight Events, CloudTrail Lake.
// For low-volume observability use cases, fill only Management Events +
// minimal Data Events (S3/Lambda).
export async function handler(page, config) {
  const {
    mgmtEvents = 5000,
    mgmtTrails = 3,
    readMgmtEvents = 1,
    readMgmtTrails = 1,
    s3Operations = 20000,
    s3Trails = 3,
    lambdaEvents = 10,
    lambdaTrails = 1,
    networkEvents = 5000,
    networkTrails = 1,
  } = config;

  // Hide chatbot widget and scroll to top — when CloudTrail is the last
  // service in a long sequence, the page can have stale state that breaks
  // dropdown interactions.
  await page.evaluate(() => {
    document.querySelectorAll("#chatbot-wrapper, [class*='notificationBubbleChatIcon']").forEach((el) => {
      el.style.display = "none";
    });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1000);

  // Helper: switch count unit dropdown from "millions" to "exact number".
  // Robust to slow rendering when CloudTrail is the last service in a long
  // sequence. Verifies success via post-click text and retries up to 5 times.
  const setUnitExact = async (sectionLabelRegex) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      // Find a visible button matching the regex (.first() may pick a hidden one)
      const all = await page.getByRole("button", { name: sectionLabelRegex }).all();
      let btn = null;
      for (const b of all) {
        if (await b.isVisible().catch(() => false)) { btn = b; break; }
      }
      if (!btn) return;
      const txt = await btn.innerText().catch(() => "");
      if (/exact number/i.test(txt)) return;

      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await btn.click();
      await page.waitForTimeout(1000);
      // Click the visible "exact number" option
      const opts = await page.getByRole("option", { name: /^exact number$/i }).all();
      let opt = null;
      for (const o of opts) {
        if (await o.isVisible().catch(() => false)) { opt = o; break; }
      }
      if (opt) {
        await opt.click();
        await page.waitForTimeout(800);
      } else {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      }
      // Verify switch
      const afterTxt = await btn.innerText().catch(() => "");
      if (/exact number/i.test(afterTxt)) return;
      await page.waitForTimeout(700);
    }
  };

  // Management events
  await setUnitExact(/^Management events units/);
  await page.getByRole("spinbutton", { name: /Number of management events Value/ }).fill(String(mgmtEvents));
  await page.getByRole("textbox", { name: /^Management event trails$/ }).fill(String(mgmtTrails));
  await page.getByRole("spinbutton", { name: /Read management events Value/ }).fill(String(readMgmtEvents));
  await page.getByRole("textbox", { name: /^Read management trails$/ }).fill(String(readMgmtTrails));

  // Data events — S3 + Lambda
  if (s3Operations > 0 || lambdaEvents > 0) {
    await setUnitExact(/^Data events units/);
    if (s3Operations > 0) {
      await page.getByRole("spinbutton", { name: /S3 operations Value/ }).fill(String(s3Operations));
      await page.getByRole("textbox", { name: /^S3 trails$/ }).fill(String(s3Trails));
    }
    if (lambdaEvents > 0) {
      await page.getByRole("spinbutton", { name: /Lambda data events Value/ }).fill(String(lambdaEvents));
      await page.getByRole("textbox", { name: /^Lambda trails$/ }).fill(String(lambdaTrails));
    }
  }

  // Network activity events
  if (networkEvents > 0) {
    await setUnitExact(/^Network activity events units/);
    await page.getByRole("spinbutton", { name: /Number of network activity events Value/ }).fill(String(networkEvents));
    await page.getByRole("textbox", { name: /^Network activity event trails$/ }).fill(String(networkTrails));
  }

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
}
