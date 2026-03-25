import type { IncomingMessage, ServerResponse } from "node:http";

export function validateAuth(req: IncomingMessage, authToken: string | undefined): boolean {
  if (!authToken) return true;
  const header = req.headers["authorization"] ?? "";
  return header === `Bearer ${authToken}`;
}

export function unauthorized(res: ServerResponse): void {
  res.writeHead(401, {
    "Content-Type": "application/json",
    "WWW-Authenticate": 'Bearer realm="MCP Beehive"',
  });
  res.end(JSON.stringify({ error: "Unauthorized. Provide a valid Bearer token." }));
}
