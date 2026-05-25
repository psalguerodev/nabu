import { chromium } from "playwright";
import { setRegion } from "./regions.js";

const CALCULATOR_URL = "https://calculator.aws/#/createCalculator";

const BLOCKED_RESOURCE_TYPES = ["image", "media", "font"];
const BLOCKED_URL_PATTERNS = [
  "googletagmanager", "google-analytics", "analytics", "hotjar",
  "facebook", "doubleclick", "adservice", "cloudfront-fls",
];

export async function createEstimate(services, options = {}) {
  const { headless = true, slowMo = 0, name = null, onProgress = () => {} } = options;

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.route("**/*", (route) => {
    const req = route.request();
    if (BLOCKED_RESOURCE_TYPES.includes(req.resourceType())) return route.abort();
    if (BLOCKED_URL_PATTERNS.some((p) => req.url().includes(p))) return route.abort();
    return route.continue();
  });

  const t0 = Date.now();

  try {
    await page.goto(CALCULATOR_URL, { waitUntil: "networkidle", timeout: 60000 });

    // Rename estimate
    if (name) {
      await page.getByRole("link", { name: "Edit My Estimate" }).click();
      await page.waitForTimeout(500);
      const nameInput = page.locator('input[aria-label="Enter Name"]');
      await nameInput.clear();
      await nameInput.fill(name);
      await page.getByRole("button", { name: "Save" }).click();
      await page.waitForTimeout(500);
    }

    const createdGroups = new Set();
    // State: "summary" = on estimate summary page, "addService" = on Add Service page
    let state = "summary";

    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      const isLast = i === services.length - 1;
      const prevGroup = i > 0 ? services[i - 1].group : null;
      const sameGroupAsPrev = i > 0 && svc.group && svc.group === prevGroup;

      // --- NAVIGATE TO ADD SERVICE PAGE ---

      if (sameGroupAsPrev && state === "addService") {
        // Already on Add Service page from previous "Save and add service"
        // Just continue to search
      } else {
        // Need to be on summary page first
        if (state === "addService") {
          // Go back to summary via breadcrumb
          const myEstimateLink = page.getByRole("link", { name: "My Estimate" }).or(page.locator('a:has-text("Security Platform")'));
          if (await myEstimateLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await myEstimateLink.first().click();
          } else {
            await page.goto(CALCULATOR_URL, { waitUntil: "networkidle", timeout: 60000 });
          }
          await waitForSummary(page, i, services.length);
          state = "summary";
        }

        // Create group if needed (must be on summary page)
        if (svc.group && !createdGroups.has(svc.group)) {
          // Reload to ensure React state is fresh (Create group button may be stale).
          // The chatbot widget can prevent networkidle from settling, so use
          // domcontentloaded and explicitly hide the widget afterwards.
          await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
          await hideChatbot(page);
          await page.waitForTimeout(1500);
          await createGroup(page, svc.group);
          createdGroups.add(svc.group);
        }

        // Click the correct "Add service" button. Sanitize the group
        // name first so we match the header rendered by createGroup
        // (which also sanitized).
        if (svc.group) {
          await clickGroupAddService(page, sanitizeGroupName(svc.group));
        } else {
          // Root level: click the main Add service button
          await page.getByRole("button", { name: "Add service" }).first().click();
        }
        state = "addService";
      }

      // --- SEARCH AND CONFIGURE SERVICE ---

      const searchBox = page.getByRole("searchbox", { name: "Find Service" });
      await searchBox.waitFor({ timeout: 15000 });
      await searchBox.clear();
      await searchBox.fill(getSearchName(svc.service));

      const configBtn = page.getByRole("button", { name: new RegExp(`Configure ${getConfigPattern(svc.service)}`) }).first();
      await configBtn.waitFor({ timeout: 5000 });
      await configBtn.click();

      await Promise.race([
        page.getByRole("textbox", { name: "Description" }).waitFor({ timeout: 20000 }),
        page.getByRole("button", { name: "Save and view summary" }).waitFor({ timeout: 20000 }),
      ]);

      onProgress({
        type: "service_start",
        index: i,
        total: services.length,
        service: svc.service,
      });

      // Fill the per-service "Description - optional" textbox so the
      // line item in the calculator estimate is labelled. Falls back to
      // the service id when the caller doesn't pass one. Best-effort:
      // any failure here must not block the configure flow.
      //
      // Use exact label + .first() because wizards like WAF render extra
      // Description-named textboxes (per Web ACL / per Rule) deeper in
      // the form. A loose substring match would hit strict-mode at fill
      // time and silently no-op.
      try {
        const descText = svc.description ?? svc.service;
        // Loose substring match + .first() — exact:true was producing
        // estimates that AWS's read-only share page couldn't render
        // ("Sorry, something went wrong"). Loose match preserves the
        // working v0 behaviour while .first() still disambiguates in
        // wizards (WAF, etc.) that render multiple Description-named
        // textboxes deeper in the form.
        const descBox = page
          .getByRole("textbox", { name: "Description" })
          .first();
        if (await descBox.isVisible({ timeout: 1500 }).catch(() => false)) {
          await descBox.fill(String(descText));
        }
      } catch {}

      if (svc.region) {
        await setRegion(page, svc.region);
      }

      if (typeof svc.handler !== "function") {
        throw new Error(
          `Service '${svc.service}' is missing a handler() function on its config entry`,
        );
      }
      try {
        await svc.handler(page, svc);
      } catch (err) {
        onProgress({
          type: "service_error",
          service: svc.service,
          message: err.message ?? String(err),
        });
        throw err;
      }
      onProgress({ type: "service_done", service: svc.service });

      // --- SAVE ---

      const nextSvc = services[i + 1];
      const nextIsSameGroup = nextSvc && svc.group && nextSvc.group === svc.group;

      if (isLast) {
        await hideChatbot(page);
        await clickVisible(page, "Save and view summary");
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        await page.waitForTimeout(750);
        await waitForSummary(page, i, services.length);
        state = "summary";
      } else if (nextIsSameGroup) {
        // Same group next: save and stay on Add Service page
        await hideChatbot(page);
        await clickVisible(page, "Save and add service");
        // Wait for Add Service page to reload
        await page.getByRole("searchbox", { name: "Find Service" }).waitFor({ timeout: 15000 });
        state = "addService";
      } else {
        // Different group next: save and go back to summary
        await hideChatbot(page);
        await clickVisible(page, "Save and view summary");
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        await page.waitForTimeout(750);
        await waitForSummary(page, i, services.length);
        state = "summary";
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const costs = extractCosts(await page.content());
    const url = await shareEstimate(page);

    await browser.close();
    return { url, elapsed, ...costs };
  } catch (err) {
    await page.screenshot({ path: "/tmp/aws-calc-error.png" });
    await browser.close();
    throw err;
  }
}

async function hideChatbot(page) {
  await page.evaluate(() => {
    document.querySelectorAll("#chatbot-wrapper, [class*='notificationBubbleChatIcon']").forEach((el) => {
      try { el.style.display = "none"; } catch (_) {}
    });
  }).catch(() => {});
}

async function waitForSummary(page, index, total) {
  const iter = `${index + 1}/${total}`;
  try {
    await page.locator("text=Estimate summary").waitFor({ timeout: 30000 });
    return;
  } catch (_) {
    // Fallback: snapshot + try to recover by hiding chatbot and clicking breadcrumb.
    try {
      await page.screenshot({ path: "/tmp/nabu-summary-stuck.png", fullPage: true });
    } catch (_) {}
    await hideChatbot(page);
    try {
      const breadcrumb = page
        .getByRole("link", { name: "My Estimate" })
        .or(page.getByRole("link", { name: /Estimate summary/i }))
        .or(page.locator('nav[aria-label*="readcrumb"] a').last());
      if (await breadcrumb.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await breadcrumb.first().click().catch(() => {});
      }
    } catch (_) {}
    try {
      await page.locator("text=Estimate summary").waitFor({ timeout: 30000 });
      return;
    } catch (err) {
      throw new Error(
        `Timed out waiting for "Estimate summary" after saving service ${iter}. ` +
        `Screenshot at /tmp/nabu-summary-stuck.png. Original: ${err.message}`
      );
    }
  }
}

// calculator.aws's "Group name" input rejects `&`, `<`, `>`, `"`,
// `/` and a few other special chars with an inline validation error,
// which leaves the modal's Create button disabled and stalls the
// run. Sanitize defensively so a caller asking for "Storage & Delivery"
// gets "Storage and Delivery" without failing the whole estimate.
function sanitizeGroupName(name) {
  return String(name)
    .replace(/&/g, "and")
    .replace(/[<>"/\\]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

async function createGroup(page, groupName) {
  const safeName = sanitizeGroupName(groupName);
  const btn = page.getByRole("button", { name: "Create group" }).first();

  // Poll until enabled (up to 15 seconds)
  for (let w = 0; w < 30; w++) {
    if (await btn.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(500);
  }

  await btn.click({ timeout: 10000 });
  await page.waitForTimeout(500);

  const nameInput = page.locator('input[aria-label*="Group name"]');
  await nameInput.waitFor({ timeout: 5000 });
  await nameInput.clear();
  await nameInput.fill(safeName);

  // Wait briefly so validation completes before reading the Create
  // button state — without it we sometimes clicked while still disabled.
  await page.waitForTimeout(200);

  // Click the modal's Create group button (last one on page). Poll
  // until enabled so we don't hit the previous "element is not enabled"
  // 30s timeout.
  const allBtns = await page.getByRole("button", { name: "Create group" }).all();
  const modalBtn = allBtns[allBtns.length - 1];
  for (let w = 0; w < 20; w++) {
    if (await modalBtn.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  await modalBtn.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
}

async function clickGroupAddService(page, groupName) {
  // Find the Add service button inside the group section
  const clicked = await page.evaluate((gName) => {
    const headers = [...document.querySelectorAll("h2")];
    const groupH2 = headers.find((h) => h.textContent.trim() === gName);
    if (!groupH2) return false;
    let container = groupH2;
    for (let j = 0; j < 10; j++) {
      container = container.parentElement;
      if (!container) break;
    }
    const btn = [...(container?.querySelectorAll("button") || [])].find(
      (b) => b.textContent.trim() === "Add service"
    );
    if (btn) { btn.click(); return true; }
    return false;
  }, groupName);

  if (!clicked) {
    // Fallback
    await page.getByRole("button", { name: "Add service" }).first().click();
  }
}

// Iterate all buttons matching name and click the first VISIBLE one.
// Cloudscape renders duplicate footer Save buttons (one hidden in mobile menu);
// .first() can hit the hidden one and silently no-op.
async function clickVisible(page, buttonName) {
  const all = await page.getByRole("button", { name: buttonName }).all();
  for (const btn of all) {
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      return;
    }
  }
  // Fallback
  await page.getByRole("button", { name: buttonName }).first().click();
}

async function shareEstimate(page) {
  // Hide the persistent chatbot widget that intercepts clicks on top-right buttons.
  await page.evaluate(() => {
    document.querySelectorAll("#chatbot-wrapper, [class*='notificationBubbleChatIcon']").forEach((el) => {
      el.style.display = "none";
    });
  });
  await page.getByRole("button", { name: "Share", exact: true }).click();

  const agreeBtn = page.getByRole("button", { name: "Agree and continue" });
  if (await agreeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await agreeBtn.click();
  }

  const linkInput = page.getByRole("textbox", { name: "Copy public link" }).first();
  let url = "";
  for (let i = 0; i < 15; i++) {
    url = await linkInput.inputValue().catch(() => "");
    if (url && url.includes("calculator.aws")) break;
    await page.waitForTimeout(1000);
  }

  await page.getByRole("button", { name: "Close modal" }).click().catch(() => {});
  return url;
}

function extractCosts(html) {
  const monthlyMatch = html.match(/Monthly cost[\s\S]*?([\d,.]+)\s*USD/);
  const upfrontMatch = html.match(/Upfront cost[\s\S]*?([\d,.]+)\s*USD/);
  const totalMatch = html.match(/Total 12 months cost[\s\S]*?([\d,.]+)\s*USD/);
  return {
    monthly: monthlyMatch ? parseFloat(monthlyMatch[1].replace(",", "")) : 0,
    upfront: upfrontMatch ? parseFloat(upfrontMatch[1].replace(",", "")) : 0,
    annual: totalMatch ? parseFloat(totalMatch[1].replace(",", "")) : 0,
  };
}

export function getSearchName(service) {
  const map = {
    ec2: "EC2", s3: "S3", lambda: "Lambda", ebs: "EBS",
    "step-functions": "Step Functions", dynamodb: "DynamoDB",
    "api-gateway": "API Gateway", cloudfront: "CloudFront",
    vpn: "VPN", cognito: "Cognito", waf: "WAF",
    kms: "Key Management",
    "nat-gateway": "VPC",
    athena: "Athena", eventbridge: "EventBridge",
    cloudwatch: "CloudWatch", xray: "X-Ray",
    "systems-manager": "Systems Manager",
    bedrock: "Bedrock", "bedrock-agentcore": "Bedrock AgentCore",
    "sagemaker-async": "SageMaker",
    "sagemaker-studio-notebooks": "SageMaker",
    "sagemaker-on-demand-notebooks": "SageMaker",
    "sagemaker-training": "SageMaker",
    "sagemaker-real-time-inference": "SageMaker",
    "sagemaker-serverless-inference": "SageMaker",
    "sagemaker-batch-transform": "SageMaker",
    textract: "Textract",
    cloudtrail: "CloudTrail",
    "s3-vectors": "S3",
    "secrets-manager": "Secrets Manager",
    ses: "Simple Email",
    sns: "Simple Notification",
    sqs: "SQS",
    ecr: "Elastic Container Registry",
    appsync: "AppSync",
    glue: "Glue",
    redshift: "Redshift",
  };
  return map[service] || service;
}

export function getConfigPattern(service) {
  const map = {
    ec2: "Amazon EC2", s3: "Amazon Simple Storage Service",
    ebs: "Amazon Elastic Block Store \\(EBS\\)",
    lambda: "AWS Lambda", "step-functions": "AWS Step Functions",
    dynamodb: "Amazon DynamoDB", "api-gateway": "Amazon API Gateway",
    cloudfront: "Amazon CloudFront", vpn: "Amazon Virtual Private Cloud",
    "nat-gateway": "Amazon Virtual Private Cloud",
    cognito: "Amazon Cognito", waf: "AWS Web Application Firewall",
    kms: "AWS Key Management Service",
    athena: "Amazon Athena", eventbridge: "Amazon EventBridge",
    cloudwatch: "Amazon CloudWatch", xray: "AWS X-Ray",
    "systems-manager": "AWS Systems Manager",
    bedrock: "Amazon Bedrock", "bedrock-agentcore": "Amazon Bedrock AgentCore",
    "sagemaker-async": "Amazon SageMaker(?! Ground)",
    "sagemaker-studio-notebooks": "Amazon SageMaker(?! Ground)",
    "sagemaker-on-demand-notebooks": "Amazon SageMaker(?! Ground)",
    "sagemaker-training": "Amazon SageMaker(?! Ground)",
    "sagemaker-real-time-inference": "Amazon SageMaker(?! Ground)",
    "sagemaker-serverless-inference": "Amazon SageMaker(?! Ground)",
    "sagemaker-batch-transform": "Amazon SageMaker(?! Ground)",
    textract: "Amazon Textract",
    cloudtrail: "AWS CloudTrail",
    "s3-vectors": "Amazon Simple Storage Service",
    "secrets-manager": "AWS Secrets Manager",
    ses: "Amazon Simple Email Service \\(SES\\)",
    sns: "Amazon Simple Notification Service \\(SNS\\)",
    sqs: "Amazon Simple Queue Service \\(SQS\\)",
    ecr: "Amazon Elastic Container Registry",
    appsync: "AWS AppSync",
    glue: "AWS Glue(?! Crawlers| Data| DataBrew| ETL)",
    redshift: "Amazon Redshift(?! Backup)",
  };
  return map[service] || service;
}

