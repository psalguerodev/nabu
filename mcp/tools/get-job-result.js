import { getJobDetail } from "../jobs/store.js";

export const definition = {
  name: "get_job_result",
  description:
    "Return the final result for a succeeded job (calculator URL, line items, xlsx path).",
  inputSchema: {
    type: "object",
    properties: { job_id: { type: "string" } },
    required: ["job_id"],
  },
};

export async function handler(args) {
  const job = getJobDetail(args?.job_id);
  if (!job) throw new Error(`Unknown job_id: ${args?.job_id}`);
  if (job.status !== "succeeded") {
    throw new Error(
      `Job ${job.id} is ${job.status}, no result available yet`,
    );
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            job_id: job.id,
            service: job.service,
            ...(job.result ?? {}),
          },
          null,
          2,
        ),
      },
    ],
  };
}
