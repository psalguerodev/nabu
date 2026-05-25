// Importing package.json as JSON works under both Node (with the
// import-attribute syntax) and Bun. Bun's --compile bundles the JSON
// payload into the binary, avoiding the previous readFileSync that
// chased a non-existent /$bunfs/package.json at runtime.
import pkg from "../package.json" with { type: "json" };

export const SERVER_NAME = "nabu";
export const SERVER_VERSION = pkg.version;

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
