import { z } from "zod";

const CheckoutCustomerSchema = z.object({
  name: z.string().min(1, "customer.name não pode ser vazio").optional(),
  email: z.string().min(1, "customer.email não pode ser vazio").optional(),
  document: z
    .object({
      number: z.string().min(1, "customer.document.number não pode ser vazio"),
      type: z.string().optional(),
    })
    .optional(),
  phone: z.string().optional(),
  externalRef: z.string().optional(),
  birthdate: z.string().optional(),
  address: z.record(z.unknown()).optional(),
});

export const CheckoutCreateRequestSchema = z.object({
  amount: z.number().int().nonnegative("amount é obrigatório (centavos)"),
  description: z.string().min(1, "description é obrigatório"),
  expiresAt: z.string().optional(),
  externalRef: z.string().optional(),
  customer: CheckoutCustomerSchema.optional(),
});

export type CheckoutCreateRequest = z.infer<typeof CheckoutCreateRequestSchema>;

export function validateCreateCheckoutPayload(
  raw: unknown
): { success: true; data: CheckoutCreateRequest } | { success: false; message: string; issues: string[] } {
  const result = CheckoutCreateRequestSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
  const message = `Validação falhou: ${issues.slice(0, 5).join("; ")}${issues.length > 5 ? ` (+${issues.length - 5} mais)` : ""}`;
  return { success: false, message, issues };
}

export type BeehiveClientForCheckout = {
  post<T>(path: string, body: unknown): Promise<T>;
};

export function buildCreateCheckoutHandler(client: BeehiveClientForCheckout) {
  return async (args: { payload?: unknown }) => {
    const validation = validateCreateCheckoutPayload(args.payload);
    if (!validation.success) {
      const detail = validation.issues.length > 0 ? ` Campos: ${validation.issues.join("; ")}` : "";
      return {
        content: [{ type: "text" as const, text: validation.message + detail }],
        isError: true,
      };
    }

    try {
      const data = await client.post<unknown>("/checkouts", validation.data);
      const text =
        typeof data === "object" && data !== null
          ? JSON.stringify(data, null, 2)
          : String(data);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar link de pagamento na API Beehive.";
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  };
}

export function registerCreateCheckout(server: any, client: BeehiveClientForCheckout): void {
  server.registerTool(
    "create_checkout",
    {
      title: "Criar link de pagamento",
      description:
        "Cria um link de pagamento na API Beehive (POST /checkouts). Requer amount e description; não inventa nem preenche dados automaticamente.",
      inputSchema: z.object({
        payload: z.unknown().describe("JSON de criação de checkout (CheckoutCreateRequest)"),
      }),
    },
    buildCreateCheckoutHandler(client)
  );
}
