import { registerService } from "../calculator.js";

registerService("waf", async (page, config) => {
  const {
    webACLs = 1,
    rulesPerACL = 5,
    ruleGroups = 0,
    rulesPerGroup = 0,
    managedRuleGroups = 1,
    requestsPerMonth = 1, // millions
  } = config;

  const fill = async (name, value) => {
    const input = page.getByRole("spinbutton", { name: new RegExp(name) });
    await input.fill(String(value));
  };

  await fill("Number of Web Access Control Lists", webACLs);
  await fill("Number of Rules added per Web ACL", rulesPerACL);
  await fill("Number of Rule Groups per Web ACL", ruleGroups);
  await fill("Number of Rules inside each Rule Group", rulesPerGroup);
  await fill("Number of Managed Rule Groups per Web ACL", managedRuleGroups);
  await fill("Number of web requests received", requestsPerMonth);
});
