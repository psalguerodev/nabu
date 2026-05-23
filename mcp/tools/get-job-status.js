import { getJob } from "../jobs/store.js";

export const definition = {
  name: "get_job_status",
  description: "Return the current status of an estimate job.",
  inputSchema: {
    type: "object",
    properties: { job_id: { type: "string" } },
    required: ["job_id"],
  },
};

export async function handler(args) {
  const job = getJob(args?.job_id);
  if (!job) throw new Error(`Unknown job_id: ${args?.job_id}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            job_id: job.id,
            service: job.service,
            status: job.status,
            created_at: job.created_at,
            started_at: job.started_at,
            finished_at: job.finished_at,
            error: job.error,
          },
          null,
          2,
        ),
      },
    ],
  };
}
