import { z } from "zod";

const TransactionIdSchema = z.union([
  z.string().min(1, "transactionId é obrigatório e não pode ser vazio"),
  z.number().int().positive("transactionId deve ser string não vazia ou número positivo"),
]);

export function validateTransactionId(
  raw: unknown
): { success: true; transactionId: string } | { success: false; message: string } {
  const result = TransactionIdSchema.safeParse(raw);
  if (result.success) {
    return { success: true, transactionId: String(result.data) };
  }
  const message = result.error.errors.map((e) => e.message).join("; ");
  return { success: false, message: message || "transactionId inválido" };
}

export type BeehiveClientForGet = {
  get<T>(path: string): Promise<T>;
};

export function buildGetTransactionHandler(client: BeehiveClientForGet) {
  return async (args: { transactionId?: unknown }) => {
    const validation = validateTransactionId(args.transactionId);
    if (!validation.success) {
      return {
        content: [{ type: "text" as const, text: validation.message }],
        isError: true,
      };
    }
    try {
      const path = `/transactions/${encodeURIComponent(validation.transactionId)}`;
      const data = await client.get<unknown>(path);
      const text =
        typeof data === "object" && data !== null
          ? JSON.stringify(data, null, 2)
          : String(data);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao obter transação na API Beehive.";
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  };
}

export function registerGetTransaction(server: any, client: BeehiveClientForGet): void {
  server.registerTool(
    "get_transaction",
    {
      title: "Obter transação",
      description:
        "Obtém uma transação por ID na API Beehive (GET /transactions/{transactionId}). Devolve dados da transação (estado, PIX, etc.) ou erro claro em caso de 404 ou outro falha.",
      inputSchema: z.object({
        transactionId: z
          .union([z.string().min(1), z.number().int().positive()])
          .describe("ID da transação"),
      }),
    },
    buildGetTransactionHandler(client)
  );
}
