// Service registry — maps catalog service id to its handler folder relative
// to this file. Loaders (mcp/catalog, runner/health, runner/tools/gen-zod,
// runner/tools/check-catalog) read this map to resolve handler/YAML paths
// without hard-coding the layout.
//
// To register a new service: add the entry here, drop the handler folder
// under the matching AWS category, and (if it's a datasheet-driven service)
// run `pnpm -C runner gen:zod <id>`.

export const SERVICE_PATHS = {
  "api-gateway": "networking/api-gateway",
  appsync: "networking/appsync",
  athena: "analytics/athena",
  bedrock: "ai/bedrock",
  "bedrock-agentcore": "ai/bedrock-agentcore",
  cloudfront: "networking/cloudfront",
  cloudtrail: "observability/cloudtrail",
  cloudwatch: "observability/cloudwatch",
  cognito: "security/cognito",
  dynamodb: "database/dynamodb",
  ebs: "compute/ebs",
  ec2: "compute/ec2",
  ecr: "compute/ecr",
  eventbridge: "analytics/eventbridge",
  glue: "analytics/glue",
  lambda: "compute/lambda",
  redshift: "database/redshift",
  s3: "storage/s3",
  "s3-vectors": "ai/s3-vectors",
  "sagemaker-async": "ai/sagemaker/async",
  "sagemaker-batch-transform": "ai/sagemaker/batch-transform",
  "sagemaker-on-demand-notebooks": "ai/sagemaker/on-demand-notebooks",
  "sagemaker-real-time-inference": "ai/sagemaker/real-time-inference",
  "sagemaker-serverless-inference": "ai/sagemaker/serverless-inference",
  "sagemaker-studio-notebooks": "ai/sagemaker/studio-notebooks",
  "sagemaker-training": "ai/sagemaker/training",
  "secrets-manager": "security/secrets-manager",
  ses: "messaging/ses",
  "step-functions": "analytics/step-functions",
  "systems-manager": "management/systems-manager",
  textract: "ai/textract",
  vpn: "networking/vpn",
  waf: "security/waf",
  xray: "observability/xray",
};

export function pathFor(serviceId) {
  return SERVICE_PATHS[serviceId];
}

export function listServiceIds() {
  return Object.keys(SERVICE_PATHS).sort();
}
