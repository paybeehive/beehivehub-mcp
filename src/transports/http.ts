import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { validateAuth, unauthorized } from "./auth-middleware.js";

type ServerFactory = () => McpServer;

export async function startHttp(buildServer: ServerFactory): Promise<void> {
  const port = parseInt(process.env.MCP_PORT ?? "3000", 10);
  const authToken = process.env.MCP_AUTH_TOKEN;

  if (!authToken) {
    process.stderr.write(
      "[WARN] MCP_AUTH_TOKEN não definido — servidor HTTP acessível sem autenticação.\n" +
      "       Defina MCP_AUTH_TOKEN para proteger o servidor em ambientes públicos.\n"
    );
  }

  // Stateful: cada sessão tem seu próprio server + transport
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!validateAuth(req, authToken)) {
      unauthorized(res);
      return;
    }

    const url = new URL(req.url!, `http://localhost:${port}`);

    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found. Use POST/GET /mcp");
      return;
    }

    // DELETE: encerra sessão
    if (req.method === "DELETE") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId) {
        const transport = sessions.get(sessionId);
        if (transport) {
          await transport.close();
          sessions.delete(sessionId);
        }
      }
      res.writeHead(204);
      res.end();
      return;
    }

    // GET: stream SSE de notificações do servidor (session existente)
    if (req.method === "GET") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const transport = sessionId ? sessions.get(sessionId) : undefined;
      if (!transport) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found. Initiate via POST first." }));
        return;
      }
      await transport.handleRequest(req, res);
      return;
    }

    // POST: mensagens MCP
    if (req.method === "POST") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId ? sessions.get(sessionId) : undefined;

      // Lê o body
      const body = await new Promise<unknown>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
          } catch {
            reject(new Error("Invalid JSON body"));
          }
        });
        req.on("error", reject);
      });

      // Nova sessão se for initialize
      if (!transport) {
        const newId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newId,
        });
        transport.onclose = () => sessions.delete(newId);
        sessions.set(newId, transport);
        await buildServer().connect(transport);
      }

      await transport.handleRequest(req, res, body);
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
  }

  const httpServer = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      process.stderr.write(`[MCP HTTP error] ${err}\n`);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
  });

  httpServer.listen(port, () => {
    process.stderr.write(`MCP Beehive (HTTP/Streamable) → http://localhost:${port}/mcp\n`);
    if (authToken) {
      process.stderr.write(`Auth: Bearer ${authToken}\n`);
    }
  });
}
