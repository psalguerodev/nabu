// Auto-generated barrel of every embedded schema. Bun's --compile
// follows static imports, so listing them here pulls all 38 schemas
// into the binary (instead of relying on a runtime dynamicImport that
// chases a non-existent /$bunfs path).
//
// Regenerate when schemas are added/removed:
//   ls mcp/catalog/schemas/*.js | grep -v schemas-bundle |
//     awk -F/ '{name=$NF; gsub(/\.js$/,"",name); print name}' |
//     awk '{printf "import * as s_%s from \"./schemas/%s.js\";\n", gensub(/-/,"_","g",$1), $1}'
//   then update the SCHEMAS map below to match.

import * as s_api_gateway from "./schemas/api-gateway.js";
import * as s_appsync from "./schemas/appsync.js";
import * as s_athena from "./schemas/athena.js";
import * as s_bedrock_agentcore from "./schemas/bedrock-agentcore.js";
import * as s_bedrock from "./schemas/bedrock.js";
import * as s_cloudfront from "./schemas/cloudfront.js";
import * as s_cloudtrail from "./schemas/cloudtrail.js";
import * as s_cloudwatch from "./schemas/cloudwatch.js";
import * as s_cognito from "./schemas/cognito.js";
import * as s_dynamodb from "./schemas/dynamodb.js";
import * as s_ebs from "./schemas/ebs.js";
import * as s_ec2 from "./schemas/ec2.js";
import * as s_ecr from "./schemas/ecr.js";
import * as s_eventbridge from "./schemas/eventbridge.js";
import * as s_glue from "./schemas/glue.js";
import * as s_kms from "./schemas/kms.js";
import * as s_lambda from "./schemas/lambda.js";
import * as s_nat_gateway from "./schemas/nat-gateway.js";
import * as s_redshift from "./schemas/redshift.js";
import * as s_s3 from "./schemas/s3.js";
import * as s_s3_vectors from "./schemas/s3-vectors.js";
import * as s_sagemaker_async from "./schemas/sagemaker-async.js";
import * as s_sagemaker_batch_transform from "./schemas/sagemaker-batch-transform.js";
import * as s_sagemaker_on_demand_notebooks from "./schemas/sagemaker-on-demand-notebooks.js";
import * as s_sagemaker_real_time_inference from "./schemas/sagemaker-real-time-inference.js";
import * as s_sagemaker_serverless_inference from "./schemas/sagemaker-serverless-inference.js";
import * as s_sagemaker_studio_notebooks from "./schemas/sagemaker-studio-notebooks.js";
import * as s_sagemaker_training from "./schemas/sagemaker-training.js";
import * as s_secrets_manager from "./schemas/secrets-manager.js";
import * as s_ses from "./schemas/ses.js";
import * as s_sns from "./schemas/sns.js";
import * as s_sqs from "./schemas/sqs.js";
import * as s_step_functions from "./schemas/step-functions.js";
import * as s_systems_manager from "./schemas/systems-manager.js";
import * as s_textract from "./schemas/textract.js";
import * as s_vpn from "./schemas/vpn.js";
import * as s_waf from "./schemas/waf.js";
import * as s_xray from "./schemas/xray.js";

export const EMBEDDED_SCHEMAS = {
  "api-gateway": s_api_gateway,
  appsync: s_appsync,
  athena: s_athena,
  "bedrock-agentcore": s_bedrock_agentcore,
  bedrock: s_bedrock,
  cloudfront: s_cloudfront,
  cloudtrail: s_cloudtrail,
  cloudwatch: s_cloudwatch,
  cognito: s_cognito,
  dynamodb: s_dynamodb,
  ebs: s_ebs,
  ec2: s_ec2,
  ecr: s_ecr,
  eventbridge: s_eventbridge,
  glue: s_glue,
  kms: s_kms,
  lambda: s_lambda,
  "nat-gateway": s_nat_gateway,
  redshift: s_redshift,
  s3: s_s3,
  "s3-vectors": s_s3_vectors,
  "sagemaker-async": s_sagemaker_async,
  "sagemaker-batch-transform": s_sagemaker_batch_transform,
  "sagemaker-on-demand-notebooks": s_sagemaker_on_demand_notebooks,
  "sagemaker-real-time-inference": s_sagemaker_real_time_inference,
  "sagemaker-serverless-inference": s_sagemaker_serverless_inference,
  "sagemaker-studio-notebooks": s_sagemaker_studio_notebooks,
  "sagemaker-training": s_sagemaker_training,
  "secrets-manager": s_secrets_manager,
  ses: s_ses,
  sns: s_sns,
  sqs: s_sqs,
  "step-functions": s_step_functions,
  "systems-manager": s_systems_manager,
  textract: s_textract,
  vpn: s_vpn,
  waf: s_waf,
  xray: s_xray,
};
