export const id = "waf";

// Locators the handler() depends on. Used by the daily health check.
export const healthLocators = [
  {
    role: "spinbutton",
    name: /Number of Web Access Control Lists/,
    label: "Web ACLs spinbutton",
  },
  {
    role: "spinbutton",
    name: /Number of Rules added per Web ACL/,
    label: "rules per ACL spinbutton",
  },
  {
    role: "spinbutton",
    name: /Number of Managed Rule Groups per Web ACL/,
    label: "managed rule groups spinbutton",
  },
  {
    role: "spinbutton",
    name: /Number of web requests received/,
    label: "web requests spinbutton",
  },
];

// Translate the catalog's snake_case params into the camelCase config
// the Playwright handler below consumes. Keep this pure — no I/O.
export function adapter(params) {
  return {
    webACLs: params.web_acls,
    rulesPerACL: params.rules_per_acl,
    ruleGroups: params.rule_groups,
    rulesPerGroup: params.rules_per_group,
    managedRuleGroups: params.managed_rule_groups,
    requestsPerMonth: params.requests_per_month,
  };
}

export async function handler(page, config) {
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
}
