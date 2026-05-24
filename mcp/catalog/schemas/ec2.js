import { z } from "zod";

// Generated from runner/lib/services/ec2.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code (e.g. us-east-1, eu-west-1)."),
    location_type: z.enum(["region", "local_zone", "wavelength_zone"]).default("region").describe("Calculator location type. Default is Region; the runner only fully supports Region today."),
    tenancy: z.enum(["shared_instances", "dedicated_instances", "dedicated_hosts"]).default("shared_instances").describe("EC2 tenancy mode."),
    os: z.enum(["linux", "windows_server", "windows_server_sql_standard", "windows_server_sql_web", "windows_server_sql_enterprise", "rhel", "sles", "linux_sql_standard", "linux_sql_web", "linux_sql_enterprise", "rhel_ha", "rhel_sql_web", "rhel_sql_standard", "rhel_sql_enterprise", "rhel_ha_sql_standard", "rhel_ha_sql_enterprise", "ubuntu_pro"]).default("linux").describe("Operating system / license bundle that drives per-hour pricing."),
    workload: z.enum(["constant"]).default("constant").describe("Usage pattern. Only `constant` is fully supported; spike variants reveal a schedule editor we don't model yet."),
    count: z.number().int().min(1).default(1).describe("Number of instances."),
    instance_type: z.string().regex(/^[a-z0-9-]+\.(nano|micro|small|medium|large|metal|[0-9]+x?large)$/).default("t3.medium").describe("Exact instance name as shown by AWS (e.g. t3.medium, t4g.large, m7a.xlarge,"),
    filter_instance_family: z.enum([]).optional().describe("Optional pre-filter for the instance table. ~140 families — not enumerated; pass any valid family token (a1, c4..c8i, g3..g7e, hpc6a..hpc8a, i2..i8ge, m4..m8id, p2..p6-b200, r3..r8in, t2..t4g, u-*, x1..x8i, z1d)."),
    filter_vcpus: z.enum(["any", "1", "2", "4", "8", "12", "16", "24", "32", "36", "40", "48", "64", "72", "96", "128", "192", "224", "256", "384", "448", "896"]).optional().describe("Optional vCPU count filter."),
    filter_memory_gib: z.enum([]).optional().describe("Optional memory filter (GiB)."),
    filter_network_performance: z.enum([]).optional().describe("Optional network performance filter."),
    pricing: z.enum(["compute_sp", "instance_sp", "on_demand", "spot", "reserved_standard", "reserved_convertible"]).default("on_demand").describe("Pricing strategy. Each value reveals its own sub-section in the wizard:"),
    pricing_term: z.enum(["1y", "3y"]).default("3y").describe("Commitment term for Savings Plans / Reserved Instances."),
    pricing_payment: z.enum(["no_upfront", "partial_upfront", "all_upfront"]).default("no_upfront").describe("Upfront payment posture."),
    usage: z.number().min(0).optional().describe("Usage amount; meaning depends on usage_type (% of month, hours/day, hours/week, hours/month)."),
    usage_type: z.enum(["utilization_pct", "hours_per_day", "hours_per_week", "hours_per_month"]).default("utilization_pct").describe("Unit for the `usage` field."),
    hours_per_month: z.number().min(0).max(744).optional().describe("Legacy v0.1 param. When set and != 730, the handler treats it as"),
    spot_discount_pct: z.number().min(0).max(100).optional().describe("Assumed % discount vs On-Demand for Spot pricing modeling."),
    monitoring: z.boolean().default(false).describe("Toggle CloudWatch detailed monitoring (paid)."),
    ebs: z.object({
    volume_type: z.enum(["gp3", "gp2", "io1", "io2", "st1", "sc1", "magnetic"]).default("gp3").describe("EBS volume type."),
    storage_gb: z.number().min(1).default(30).describe("Storage amount in GB per volume."),
    storage_unit: z.enum(["MB", "GB", "TB"]).default("GB"),
    iops: z.number().int().min(100).optional().describe("Provisioned IOPS per volume (gp3/io1/io2 only)."),
    throughput_mbps: z.number().int().min(125).optional().describe("Provisioned throughput in MBps (gp3 only)."),
    snapshot_frequency: z.enum(["none", "hourly", "daily", "2x_daily", "3x_daily", "4x_daily", "6x_daily", "weekly", "monthly"]).default("none")
  }).optional().describe("Per-instance EBS volume attached to each EC2 in this line item."),
    additional_cost: z.number().min(0).optional().describe("Free-form add-on cost (e.g. third-party license per month).")
  })
  .meta({ id: "ec2" });

export const jsonSchema = z.toJSONSchema(zodSchema);
