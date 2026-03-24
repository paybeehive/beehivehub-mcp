import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getAuthHeader, requireSecretKey } from "./auth.js";
import { createBeehiveClient } from "./beehive-client.js";
import { registerCreateTransaction } from "./tools/create-transaction.js";
import { registerCreateCheckout } from "./tools/create-checkout.js";
import { registerGetTransaction } from "./tools/get-transaction.js";
import { registerGetIntegrationGuide } from "./tools/get-integration-guide.js";
import { registerListTransactions } from "./tools/list-transactions.js";

requireSecretKey();

const authHeader = getAuthHeader();
const client = createBeehiveClient({ authHeader });

const server = new McpServer({
  name: "mcp-server-beehive",
  version: "1.0.0",
});

registerCreateTransaction(server, client);
registerCreateCheckout(server, client);
registerGetTransaction(server, client);
registerListTransactions(server, client);
registerGetIntegrationGuide(server);

server.registerTool(
  "get_balance",
  {
    title: "Obter saldo",
    description: "Consulta o saldo disponível na API Beehive (valida conexão e autenticação).",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const data = await client.get<{ available?: number; [k: string]: unknown }>("/balance");
      const text =
        typeof data === "object" && data !== null
          ? JSON.stringify(data, null, 2)
          : String(data);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao consultar saldo.";
      return {
        content: [{ type: "text", text: message }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
