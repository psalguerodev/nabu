import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    "utf8",
  ),
);

export const SERVER_NAME = "nabu";
export const SERVER_VERSION = PKG.version;

export const definition = {
  name: "get_version",
  description: "Return the Nabu MCP server name and version.",
  inputSchema: { type: "object", properties: {} },
};

export async function handler() {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ name: SERVER_NAME, version: SERVER_VERSION }),
      },
    ],
  };
}
