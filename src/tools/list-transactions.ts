import { z } from "zod";

export const ListTransactionsInputSchema = z.object({
  id: z.number().int().optional(),
  paymentMethods: z.string().optional(),
  status: z.string().optional(),
  deliveryStatus: z.string().optional(),
  installments: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  traceable: z.boolean().optional(),
});

export type ListTransactionsInput = z.infer<typeof ListTransactionsInputSchema>;

export type BeehiveClientForList = {
  get<T>(path: string): Promise<T>;
};

export function buildListTransactionsQuery(args: ListTransactionsInput): string {
  const params = new URLSearchParams();
  if (args.id !== undefined && args.id !== null) params.set("id", String(args.id));
  if (args.paymentMethods != null && args.paymentMethods !== "") params.set("paymentMethods", args.paymentMethods);
  if (args.status != null && args.status !== "") params.set("status", args.status);
  if (args.deliveryStatus != null && args.deliveryStatus !== "") params.set("deliveryStatus", args.deliveryStatus);
  if (args.installments != null && args.installments !== "") params.set("installments", args.installments);
  if (args.name != null && args.name !== "") params.set("name", args.name);
  if (args.email != null && args.email !== "") params.set("email", args.email);
  if (args.documentNumber != null && args.documentNumber !== "") params.set("documentNumber", args.documentNumber);
  if (args.phone != null && args.phone !== "") params.set("phone", args.phone);
  if (args.traceable !== undefined && args.traceable !== null) params.set("traceable", String(args.traceable));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listTransactionsHandler(
  client: BeehiveClientForList,
  args: ListTransactionsInput
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const query = buildListTransactionsQuery(args);
    const path = `/transactions${query}`;
    const data = await client.get<unknown>(path);
    const text =
      typeof data === "object" && data !== null
        ? JSON.stringify(data, null, 2)
        : String(data);
    return { content: [{ type: "text", text }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao listar transações na API Beehive.";
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
}

export function registerListTransactions(server: any, client: BeehiveClientForList): void {
  server.registerTool(
    "list_transactions",
    {
      title: "Listar transações",
      description:
        "Lista transações na API Beehive com filtros opcionais (id, paymentMethods, status, deliveryStatus, installments, name, email, documentNumber, phone, traceable). GET /transactions.",
      inputSchema: ListTransactionsInputSchema,
    },
    async (args: unknown) => {
      const parsed = ListTransactionsInputSchema.safeParse(args ?? {});
      const input = parsed.success ? parsed.data : {};
      return listTransactionsHandler(client, input);
    }
  );
}
