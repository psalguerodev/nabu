# Nabu — Product / Functional definition

## What Nabu is

A desktop companion for AWS presales work. It lets a salesperson (or Claude on their behalf) generate **real, editable estimates on calculator.aws** — the kind you can share as an AWS-hosted link with the customer — without manually clicking through the wizard.

## Who uses it

- **Presales engineers at ARKHO**: primary users. They draft estimates per opportunity, iterate with the customer, and ship a calculator.aws link plus an Excel export.
- **Claude (via MCP)**: indirect user. Builds the estimate JSON from natural language conversations, validates it, and dispatches jobs to Nabu.

## Core jobs to be done

1. **Translate a conversation into an estimate.** "3 EC2 m5.large + RDS Postgres + 1TB S3 in us-east-1" → validated payload.
2. **Generate the native calculator.aws estimate** (not a local approximation). The output must be a real AWS-hosted link the customer can review and which the salesperson can later edit in the AWS UI.
3. **Iterate.** "Swap the RDS for Aurora" → new job that starts from the previous estimate, not from zero.
4. **Stay in sync with what AWS supports.** New services (Bedrock variants, AgentCore, S3 Vectors, etc.) should be available without waiting for a full app release.
5. **Export.** Excel (`.xlsx`) for internal pricing review; the calculator.aws link for the customer.

## Non-goals

- Replacing calculator.aws. Nabu drives it, not replaces it.
- Being a generic AWS cost forecasting tool (no usage-based projections, no billing data ingestion).
- Being a terminal or IDE. The app has no shell.
- Multi-user / SaaS. Nabu is a local desktop app per user.

## Primary user flows

### Flow A — New estimate from Claude Desktop

1. User chats with Claude: "armame la estimación para Cliente X con [...]".
2. Claude calls `get_service_schema` for each service, asks clarifying questions in chat.
3. Claude calls `validate_estimate(payload)` to surface any missing fields without paying the Playwright cost.
4. Claude calls `enqueue_estimate_job(payload)`. Nabu returns a `job_id` and a deep link.
5. User opens Nabu (or the deep link); Jobs tab shows the new job, running headed or headless per settings.
6. On success, Jobs tab shows the calculator.aws URL and `.xlsx` path. Claude can fetch these via `get_job_result`.

### Flow B — Iterate on an existing estimate

1. User: "del estimado anterior, cámbiale el RDS a Aurora".
2. Claude reads the previous payload via `get_job_result`, computes a diff, calls `enqueue_estimate_job` with the modified payload and a `parent_job_id`.
3. Nabu's job uses `load_estimate` on the parent URL where possible, then applies the diff. Faster than rebuilding from scratch.

### Flow C — New service support arrives

1. User opens the **Updates** tab.
2. They click **Install latest release** (or change the base URL first to point at a private release feed).
3. The MCP downloads `latest.json`, `latest.json.sig` and `nabu-catalog.tar.gz`, verifies the Ed25519 signature against the embedded pubkey, recomputes per-file SHA-256 against the signed index, atomic-renames the staged directory into `<app_config_dir>/remote-catalog/`, then reloads.
4. Within a couple of seconds the Updates list reflects the new handler versions (`v0.1.0-<sha>`); the next time Claude lists tools it sees the expanded surface.

## UI inventory (no terminal)

- **Dashboard**: placeholder today; intended to surface active jobs, recent runs, MCP connection status.
- **Jobs**: list of past and current jobs with checkboxes for bulk delete. Detail view: status badge, created/started/finished timestamps, `Show input JSON` toggle exposing the exact params, calculator.aws link with total monthly, streamed logs, error trace, and a `Retry` button on failed jobs that re-enqueues the same payload with a `(retry)` suffix on the name.
- **Services**: searchable catalog browser. Each row shows status and tags; the detail panel renders required/optional fields with types, defaults, descriptions, and a "Show raw JSON Schema" toggle. Container query collapses the detail into a stacked card below 560 px.
- **Updates**: active catalog version, remote/embedded/total counts, `Reload catalog from disk` and `Install latest release` (with a configurable base URL) actions, full list of installed services with their per-handler `v0.1.0-<sha>` version and a `REMOTE`/`embedded` source badge.
- **Settings**: headless on/off, default region, MCP port (read-only this milestone), plus a **Claude Desktop integration** card that detects the OS, shows the resolved config path, and lets the user install or remove the `nabu` MCP entry from `claude_desktop_config.json` (with a timestamped backup before writing).

## Estimate payload — current shape (carried from legacy MCP)

```json
{
  "client": "Coopeuch",
  "region": "us-east-1",
  "services": [
    { "type": "ec2", "instance": "m5.large", "count": 3, "os": "linux", "tenancy": "shared" },
    { "type": "rds", "engine": "postgres", "instance": "db.t3.medium", "storage_gb": 100 },
    { "type": "s3", "storage_gb": 1024, "tier": "standard" }
  ],
  "options": {
    "headless": false,
    "save_intermediate_screenshots": true
  }
}
```

Authoritative schemas live per-service in the catalog (`schemas/<service>.json`).

## Service coverage — current catalog

26 services with Zod schemas, self-contained handlers under `runner/lib/services/`, and entries in `mcp/catalog/catalog.json`:

| Category | Services |
|---|---|
| Compute | ec2, lambda |
| Storage | s3, s3-vectors, ecr |
| Database | dynamodb, redshift |
| Networking | api-gateway, cloudfront, appsync, vpn |
| Serverless | step-functions, eventbridge |
| Data / Analytics | athena, glue |
| AI / ML | bedrock, bedrock-agentcore, sagemaker-async, textract |
| Security / Identity | cognito, cloudtrail, secrets-manager, waf |
| Observability | cloudwatch, xray |
| Management | systems-manager |

All entries currently carry `status: schema-only` (handler version `0.0.0`). They are validated against the live calculator opportunistically by running real jobs; a scheduled health check is on the Milestone 5 list.

## Success metrics (internal)

- Time from "user describes opportunity" to "calculator.aws link delivered": target ≤ 5 minutes.
- Handler success rate against live calculator.aws: ≥ 95% for `stable` services, tracked weekly.
- Time to add a new service handler (using the `aws-calc-train` skill): target ≤ 1 day.
