import { z } from "zod";

const TransactionMetadataSchema = z.object({
  provider: z.string().min(1, "metadata.provider é obrigatório"),
  user_email: z.string().min(1, "metadata.user_email é obrigatório"),
  order_id: z.string().min(1, "metadata.order_id é obrigatório"),
  checkout_url: z.string().min(1, "metadata.checkout_url é obrigatório"),
  shop_url: z.string().min(1, "metadata.shop_url é obrigatório"),
});

const DocumentSchema = z.object({
  number: z.string().min(1, "customer.document.number é obrigatório"),
  type: z.string().optional(),
});

const CustomerRequestSchema = z.object({
  name: z.string().min(1, "customer.name é obrigatório"),
  email: z.string().min(1, "customer.email é obrigatório"),
  document: DocumentSchema,
  phone: z.string().optional(),
  externalRef: z.string().optional(),
  birthdate: z.string().optional(),
  address: z.record(z.unknown()).optional(),
});

const ItemSchema = z.object({
  title: z.string().min(1, "items[].title é obrigatório"),
  unitPrice: z.number().int().nonnegative("items[].unitPrice deve ser inteiro não negativo"),
  quantity: z.number().int().positive("items[].quantity deve ser positivo"),
  tangible: z.boolean(),
  externalRef: z.string().optional(),
});

export const TransactionCreateRequestSchema = z.object({
  amount: z.number().int().nonnegative("amount é obrigatório (centavos)"),
  paymentMethod: z.enum(["credit_card", "boleto", "pix"], {
    errorMap: () => ({ message: "paymentMethod deve ser credit_card, boleto ou pix" }),
  }),
  customer: CustomerRequestSchema,
  items: z.array(ItemSchema).min(1, "pelo menos um item é obrigatório"),
  metadata: TransactionMetadataSchema,
  postbackUrl: z.string().url().optional().or(z.literal("")),
  card: z.unknown().optional(),
  installments: z.number().int().positive().optional(),
  pix: z.record(z.unknown()).optional(),
  boleto: z.record(z.unknown()).optional(),
  shipping: z.record(z.unknown()).optional(),
  traceable: z.boolean().optional(),
  ip: z.string().optional(),
  externalRef: z.string().optional(),
  splits: z.array(z.unknown()).optional(),
});

export type TransactionCreateRequest = z.infer<typeof TransactionCreateRequestSchema>;

const REQUIRED_FIELD_ORDER = [
  "customer.document.number",
  "customer.name",
  "customer.email",
  "metadata.provider",
  "metadata.user_email",
  "metadata.order_id",
  "metadata.checkout_url",
  "metadata.shop_url",
  "amount",
  "paymentMethod",
  "items",
] as const;

type RequiredFieldPath = (typeof REQUIRED_FIELD_ORDER)[number];

const FIELD_LABELS: Record<RequiredFieldPath, string> = {
  "customer.document.number": "CPF do cliente (customer.document.number)",
  "customer.name": "nome do cliente (customer.name)",
  "customer.email": "email do cliente (customer.email)",
  "metadata.provider": "metadata.provider",
  "metadata.user_email": "metadata.user_email",
  "metadata.order_id": "metadata.order_id",
  "metadata.checkout_url": "metadata.checkout_url",
  "metadata.shop_url": "metadata.shop_url",
  amount: "amount",
  paymentMethod: "paymentMethod",
  items: "items (pelo menos um item)",
};

function parseIssuePath(path: unknown[]): string {
  return path
    .map((part) => (typeof part === "number" ? `[${part}]` : String(part)))
    .join(".")
    .replace(".[", "[");
}

function getMissingRequiredFields(errors: z.ZodIssue[]): RequiredFieldPath[] {
  const requiredSet = new Set<RequiredFieldPath>();

  for (const issue of errors) {
    const parsedPath = parseIssuePath(issue.path);
    const normalizedPath = parsedPath.replace(/\[\d+\]/g, "");

    if (
      issue.code === "invalid_type" &&
      "received" in issue &&
      issue.received === "undefined" &&
      REQUIRED_FIELD_ORDER.includes(normalizedPath as RequiredFieldPath)
    ) {
      requiredSet.add(normalizedPath as RequiredFieldPath);
      continue;
    }

    if (
      issue.code === "too_small" &&
      "type" in issue &&
      issue.type === "string" &&
      REQUIRED_FIELD_ORDER.includes(normalizedPath as RequiredFieldPath)
    ) {
      requiredSet.add(normalizedPath as RequiredFieldPath);
      continue;
    }

    if (normalizedPath === "items" && issue.code === "too_small") {
      requiredSet.add("items");
    }
  }

  return REQUIRED_FIELD_ORDER.filter((field) => requiredSet.has(field));
}

function buildMissingRequiredMessage(missing: RequiredFieldPath[]): string {
  if (missing.length === 1) {
    if (missing[0] === "customer.document.number") {
      return "Estou criando sua transação, poderia me informar o CPF do seu cliente?";
    }
    return `Estou criando sua transação, poderia me informar ${FIELD_LABELS[missing[0]]}?`;
  }

  const checklist = missing.map((field) => `- ${FIELD_LABELS[field]}`).join("\n");
  return [
    "Para criar a transação sem inventar dados, preciso que você informe os campos obrigatórios em falta:",
    checklist,
  ].join("\n");
}

export function validateCreateTransactionPayload(
  raw: unknown
):
  | { success: true; data: TransactionCreateRequest }
  | { success: false; message: string; issues: string[]; missingRequired: RequiredFieldPath[] } {
  const result = TransactionCreateRequestSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const missingRequired = getMissingRequiredFields(result.error.errors);
  const issues = result.error.errors.map((e) => `${parseIssuePath(e.path)}: ${e.message}`);

  if (missingRequired.length > 0) {
    const message = buildMissingRequiredMessage(missingRequired);
    return { success: false, message, issues, missingRequired };
  }

  const message = `Validação falhou: ${issues.slice(0, 5).join("; ")}${issues.length > 5 ? ` (+${issues.length - 5} mais)` : ""}`;
  return { success: false, message, issues, missingRequired: [] };
}

export type BeehiveClient = {
  post<T>(path: string, body: unknown): Promise<T>;
};

type CheckoutCreateRequest = {
  amount: number;
  customer: TransactionCreateRequest["customer"];
  items: TransactionCreateRequest["items"];
  metadata: TransactionCreateRequest["metadata"];
  defaultPaymentMethod: "credit_card";
  postbackUrl?: string;
  shipping?: TransactionCreateRequest["shipping"];
  traceable?: boolean;
  ip?: string;
  externalRef?: string;
  splits?: TransactionCreateRequest["splits"];
};

export function toCheckoutPayload(payload: TransactionCreateRequest): CheckoutCreateRequest {
  return {
    amount: payload.amount,
    customer: payload.customer,
    items: payload.items,
    metadata: payload.metadata,
    defaultPaymentMethod: "credit_card",
    postbackUrl: payload.postbackUrl && payload.postbackUrl.length > 0 ? payload.postbackUrl : undefined,
    shipping: payload.shipping,
    traceable: payload.traceable,
    ip: payload.ip,
    externalRef: payload.externalRef,
    splits: payload.splits,
  };
}

export function buildCreateTransactionHandler(client: BeehiveClient) {
  return async (args: { payload?: unknown }) => {
    const validation = validateCreateTransactionPayload(args.payload);
    if (!validation.success) {
      const detail =
        validation.missingRequired.length > 0
          ? ""
          : validation.issues.length > 0
            ? ` Campos: ${validation.issues.join("; ")}`
            : "";
      return {
        content: [{ type: "text" as const, text: validation.message + detail }],
        isError: true,
      };
    }

    try {
      const isCreditCard = validation.data.paymentMethod === "credit_card";
      const endpoint = isCreditCard ? "/checkouts" : "/transactions";
      const body = isCreditCard ? toCheckoutPayload(validation.data) : validation.data;
      const data = await client.post<unknown>(endpoint, body);
      const text =
        typeof data === "object" && data !== null
          ? JSON.stringify(data, null, 2)
          : String(data);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar transação na API Beehive.";
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  };
}

export function registerCreateTransaction(server: any, client: BeehiveClient): void {
  server.registerTool(
    "create_transaction",
    {
      title: "Criar transação",
      description:
        "Cria uma transação na API Beehive (PIX, cartão ou boleto). Para pedidos de cartão, este MCP gera link de pagamento automaticamente. Payload completo: amount, paymentMethod, customer, items, metadata (provider, user_email, order_id, checkout_url, shop_url), postbackUrl opcional. Não inventa, não infere e não preenche dados; valida campos obrigatórios e só usa dados enviados pelo agente/usuário.",
      inputSchema: z.object({
        payload: z.unknown().describe("JSON de criação (TransactionCreateRequest)"),
      }),
    },
    buildCreateTransactionHandler(client)
  );
}
