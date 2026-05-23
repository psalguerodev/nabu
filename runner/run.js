#!/usr/bin/env node
/**
 * Nabu Playwright runner.
 *
 * Reads a JSON job spec from stdin:
 *   { jobId, services: [{ service, params }, ...], options: { headless, name } }
 *
 * Emits NDJSON to stdout, one event per line:
 *   { type: "log",    level: "info"|"warn"|"error", message }
 *   { type: "result", calculator_url, total_monthly, line_items, xlsx_path }
 *   { type: "error",  message }
 *
 * Exits 0 on success, 1 on failure.
 */
import { createEstimate } from "./index.js";

function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n");
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

function toLegacyService(service, params) {
  switch (service) {
    case "ec2": {
      const ignored = [];
      return {
        legacy: {
          service: "ec2",
          region: params.region,
          instances: params.count,
          instanceType: params.instance_type,
          os: params.os === "windows" ? "Windows" : "Linux",
          pricing: "On-Demand",
          hoursPerMonth: params.hours_per_month,
        },
        ignored,
      };
    }
    case "s3": {
      const ignored = [];
      if (params.storage_class && params.storage_class !== "standard")
        ignored.push("storage_class");
      return {
        legacy: {
          service: "s3",
          region: params.region,
          storageGB: params.storage_gb,
          putRequests: params.put_requests_per_month ?? 0,
          getRequests: params.get_requests_per_month ?? 0,
        },
        ignored,
      };
    }
    case "lambda": {
      const ignored = [];
      return {
        legacy: {
          service: "lambda",
          region: params.region,
          requests: params.invocations_per_month,
          durationMs: params.avg_duration_ms,
          memoryMB: params.memory_mb,
          architecture: params.architecture === "arm64" ? "arm64" : "x86",
          freeTier: false,
        },
        ignored,
      };
    }
    case "dynamodb": {
      return {
        legacy: {
          service: "dynamodb",
          region: params.region,
          capacityMode: params.capacity_mode,
          storageGB: params.storage_gb,
          avgItemSizeKB: params.avg_item_size_kb,
          baselineWriteRate: params.baseline_write_per_sec,
          peakWriteRate: params.peak_write_per_sec,
          baselineReadRate: params.baseline_read_per_sec,
          peakReadRate: params.peak_read_per_sec,
          peakDurationHours: params.peak_duration_hours,
        },
        ignored: [],
      };
    }
    case "api-gateway": {
      return {
        legacy: {
          service: "api-gateway",
          region: params.region,
          httpRequests: params.http_requests_millions_per_month,
          restRequests: params.rest_requests_millions_per_month,
          avgRequestSizeKB: params.avg_request_size_kb,
        },
        ignored: [],
      };
    }
    case "cloudfront": {
      return {
        legacy: {
          service: "cloudfront",
          region: params.region,
          pricingModel: "payg",
          dataOutGB: params.data_out_gb_per_month,
          dataOutToOriginGB: params.data_to_origin_gb_per_month,
          httpsRequests: params.https_requests_per_month,
        },
        ignored: [],
      };
    }
    case "appsync": {
      return {
        legacy: {
          service: "appsync",
          region: params.region,
          apiRequestsPerMonth: params.api_requests_per_month,
          enableRealTime: params.enable_real_time,
          subscribedClients: params.subscribed_clients,
          realTimeAvgDurationMinutes: params.real_time_avg_duration_minutes,
          inboundMessagesPerMonth: params.inbound_messages_per_month,
          outboundMessagesPerMonth: params.outbound_messages_per_month,
          enableDataTransfer: params.enable_data_transfer,
        },
        ignored: [],
      };
    }
    case "athena": {
      return {
        legacy: {
          service: "athena",
          region: params.region,
          queriesPerDay: params.queries_per_day,
          dataScannedPerQueryGB: params.data_scanned_per_query_gb,
        },
        ignored: [],
      };
    }
    case "bedrock": {
      return {
        legacy: {
          service: "bedrock",
          region: params.region,
          provider: params.provider,
          model: params.model,
          requestsPerMinute: params.requests_per_minute,
          hoursPerDay: params.hours_per_day,
          inputTokensPerRequest: params.input_tokens_per_request,
          outputTokensPerRequest: params.output_tokens_per_request,
        },
        ignored: [],
      };
    }
    case "bedrock-agentcore": {
      return {
        legacy: {
          service: "bedrock-agentcore",
          region: params.region,
          enableGateway: params.enable_gateway,
          enableIdentity: params.enable_identity,
          enableBrowserTools: params.enable_browser_tools,
          enableCodeInterpreter: params.enable_code_interpreter,
          enableMemory: params.enable_memory,
          enableObservability: params.enable_observability,
          sessionsPerMonth: params.sessions_per_month,
          avgSessionDurationSec: params.avg_session_duration_sec,
          ioWaitPercent: params.io_wait_percent,
          avgVcpu: params.avg_vcpu,
          avgSessionMemoryGB: params.avg_session_memory_gb,
          gatewaySessions: params.gateway_sessions,
          gatewayTools: params.gateway_tools,
          gatewaySearchRequests: params.gateway_search_requests,
          gatewayToolInvocations: params.gateway_tool_invocations,
          observabilityLogsGB: params.observability_logs_gb,
          observabilitySpansGB: params.observability_spans_gb,
        },
        ignored: [],
      };
    }
    case "cloudtrail": {
      return {
        legacy: {
          service: "cloudtrail",
          region: params.region,
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
        },
        ignored: [],
      };
    }
    case "cloudwatch": {
      return {
        legacy: {
          service: "cloudwatch",
          region: params.region,
          metrics: params.metrics,
          apiRequests: params.api_requests,
        },
        ignored: [],
      };
    }
    case "cognito": {
      return {
        legacy: {
          service: "cognito",
          region: params.region,
          tier: params.tier,
          mau: params.mau,
          samlMau: params.saml_mau,
        },
        ignored: [],
      };
    }
    case "ecr": {
      return {
        legacy: {
          service: "ecr",
          region: params.region,
          storageGB: params.storage_gb,
        },
        ignored: [],
      };
    }
    case "eventbridge": {
      return {
        legacy: {
          service: "eventbridge",
          region: params.region,
          customEvents: params.custom_events,
          payloadSizeKB: params.payload_size_kb,
        },
        ignored: [],
      };
    }
    case "glue": {
      return {
        legacy: {
          service: "glue",
          region: params.region,
          sparkDpus: params.spark_dpus,
          sparkMinutesPerMonth: params.spark_minutes_per_month,
          pythonShellDpus: params.python_shell_dpus,
          pythonShellMinutesPerMonth: params.python_shell_minutes_per_month,
          interactiveDpus: params.interactive_dpus,
          interactiveMinutesPerMonth: params.interactive_minutes_per_month,
        },
        ignored: [],
      };
    }
    case "redshift": {
      return {
        legacy: {
          service: "redshift",
          region: params.region,
          mode: params.mode,
          nodes: params.nodes,
          instanceType: params.instance_type,
          utilizationPercent: params.utilization_percent,
          baseRPU: params.base_rpu,
          hoursPerDay: params.hours_per_day,
          workloadSize: params.workload_size,
        },
        ignored: [],
      };
    }
    case "s3-vectors": {
      return {
        legacy: {
          service: "s3-vectors",
          region: params.region,
          numberOfIndexes: params.number_of_indexes,
          vectorsPerIndex: params.vectors_per_index,
          vectorDimensions: params.vector_dimensions,
          filterableMetadataKB: params.filterable_metadata_kb,
          nonFilterableMetadataKB: params.non_filterable_metadata_kb,
          keySizeKB: params.key_size_kb,
          percentOverwrittenPerMonth: params.percent_overwritten_per_month,
          totalQueriesPerMonth: params.total_queries_per_month,
        },
        ignored: [],
      };
    }
    case "sagemaker-async": {
      return {
        legacy: {
          service: "sagemaker-async",
          region: params.region,
          modelsDeployed: params.models_deployed,
          modelsPerEndpoint: params.models_per_endpoint,
          instancesPerEndpoint: params.instances_per_endpoint,
          hoursPerDay: params.hours_per_day,
          daysPerMonth: params.days_per_month,
          instanceType: params.instance_type,
          storageAmountGB: params.storage_amount_gb,
          dataInGB: params.data_in_gb,
          dataOutGB: params.data_out_gb,
        },
        ignored: [],
      };
    }
    case "secrets-manager": {
      return {
        legacy: {
          service: "secrets-manager",
          region: params.region,
          numberOfSecrets: params.number_of_secrets,
          avgSecretDurationDays: params.avg_secret_duration_days,
          apiCallsPerMonth: params.api_calls_per_month,
        },
        ignored: [],
      };
    }
    case "step-functions": {
      return {
        legacy: {
          service: "step-functions",
          region: params.region,
          workflowRequests: params.workflow_requests,
          transitionsPerWorkflow: params.transitions_per_workflow,
          express: params.express,
        },
        ignored: [],
      };
    }
    case "systems-manager": {
      return {
        legacy: {
          service: "systems-manager",
          region: params.region,
          standardParams: params.standard_params,
          advancedParams: params.advanced_params,
          apiInteractionsPerParam: params.api_interactions_per_param,
        },
        ignored: [],
      };
    }
    case "textract": {
      return {
        legacy: {
          service: "textract",
          region: params.region,
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
        },
        ignored: [],
      };
    }
    case "vpn": {
      return {
        legacy: {
          service: "vpn",
          region: params.region,
          siteToSiteConnections: params.site_to_site_connections,
          hoursPerDay: params.hours_per_day,
        },
        ignored: [],
      };
    }
    case "waf": {
      return {
        legacy: {
          service: "waf",
          region: params.region,
          webACLs: params.web_acls,
          rulesPerACL: params.rules_per_acl,
          ruleGroups: params.rule_groups,
          rulesPerGroup: params.rules_per_group,
          managedRuleGroups: params.managed_rule_groups,
          requestsPerMonth: params.requests_per_month,
        },
        ignored: [],
      };
    }
    case "xray": {
      return {
        legacy: {
          service: "xray",
          region: params.region,
          requestsPerMonth: params.requests_per_month,
          samplingRate: params.sampling_rate,
          queriesPerMonth: params.queries_per_month,
          tracesPerQuery: params.traces_per_query,
        },
        ignored: [],
      };
    }
    default:
      throw new Error(`Unsupported service: ${service}`);
  }
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    emit({ type: "error", message: "no job spec on stdin" });
    process.exit(2);
  }
  const spec = JSON.parse(raw);
  const services = spec.services ?? [];
  const options = spec.options ?? {};

  if (!services.length) {
    emit({ type: "error", message: "services[] is empty" });
    process.exit(2);
  }

  emit({
    type: "log",
    level: "info",
    message: `runner starting for ${services.length} service(s): ${services.map((s) => s.service).join(", ")}`,
  });

  const legacyServices = [];
  try {
    for (const { service, params } of services) {
      const adapted = toLegacyService(service, params);
      legacyServices.push(adapted.legacy);
      for (const field of adapted.ignored) {
        emit({
          type: "log",
          level: "warn",
          message: `${service}: param '${field}' is not wired through to the calculator handler yet`,
        });
      }
    }
  } catch (err) {
    emit({ type: "error", message: err.message });
    process.exit(1);
  }

  try {
    emit({ type: "log", level: "info", message: "launching browser" });
    const result = await createEstimate(legacyServices, {
      headless: options.headless !== false,
      name: options.name ?? null,
      onProgress: (ev) => {
        if (ev.type === "service_start") {
          emit({
            type: "log",
            level: "info",
            message: `[${ev.index + 1}/${ev.total}] configuring ${ev.service}`,
          });
        } else if (ev.type === "service_done") {
          emit({
            type: "log",
            level: "info",
            message: `[done] ${ev.service}`,
          });
        } else if (ev.type === "service_error") {
          emit({
            type: "log",
            level: "error",
            message: `[fail] ${ev.service}: ${ev.message}`,
          });
        }
      },
    });
    emit({
      type: "result",
      calculator_url: result.url,
      line_items: services.map(({ service }) => ({
        service,
        configured: true,
      })),
      total_monthly: result.monthly ?? 0,
      upfront: result.upfront ?? 0,
      annual: result.annual ?? 0,
      xlsx_path: null,
    });
    emit({ type: "log", level: "info", message: `done in ${result.elapsed}s` });
    process.exit(0);
  } catch (err) {
    emit({ type: "error", message: err.message ?? String(err) });
    process.exit(1);
  }
}

main().catch((err) => {
  emit({ type: "error", message: String(err) });
  process.exit(1);
});
