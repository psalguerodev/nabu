import { listJobs } from "../jobs/store.js";

export const definition = {
  name: "list_jobs",
  description:
    "List recent estimate jobs (most recent first). Useful for resuming context across conversations.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 200 },
    },
  },
};

export async function handler(args) {
  const limit = args?.limit ?? 20;
  const jobs = listJobs(limit).map((j) => ({
    job_id: j.id,
    service: j.service,
    status: j.status,
    created_at: j.created_at,
    finished_at: j.finished_at,
  }));
  return {
    content: [
      { type: "text", text: JSON.stringify({ count: jobs.length, jobs }, null, 2) },
    ],
  };
}
