import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBeehiveClient, getBaseUrl } from "../src/beehive-client.js";

function makeFetchMock(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

describe("getBaseUrl", () => {
  const ORIGINAL = process.env.BEEHIVE_API_BASE_URL;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.BEEHIVE_API_BASE_URL;
    } else {
      process.env.BEEHIVE_API_BASE_URL = ORIGINAL;
    }
  });

  it("usa a URL de produção quando env não está definida", () => {
    delete process.env.BEEHIVE_API_BASE_URL;
    expect(getBaseUrl()).toBe("https://api.conta.paybeehive.com.br/v1");
  });

  it("usa a URL da env quando definida", () => {
    process.env.BEEHIVE_API_BASE_URL = "https://api.sandbox.hopysplit.com.br/v1";
    expect(getBaseUrl()).toBe("https://api.sandbox.hopysplit.com.br/v1");
  });

  it("remove barra final da URL", () => {
    process.env.BEEHIVE_API_BASE_URL = "https://api.sandbox.hopysplit.com.br/v1/";
    expect(getBaseUrl()).toBe("https://api.sandbox.hopysplit.com.br/v1");
  });
});

describe("createBeehiveClient", () => {
  const BASE = "https://api.example.com/v1";
  const AUTH = "Basic dGVzdDp4";

  beforeEach(() => {
    vi.stubGlobal("fetch", undefined);
  });

  it("GET: faz requisição com headers corretos e retorna JSON parseado", async () => {
    const mockFetch = makeFetchMock(200, JSON.stringify({ id: 1, status: "paid" }));
    vi.stubGlobal("fetch", mockFetch);

    const client = createBeehiveClient({ authHeader: AUTH, baseUrl: BASE });
    const result = await client.get("/transactions/1");

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/transactions/1`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: AUTH }),
      })
    );
    expect(result).toEqual({ id: 1, status: "paid" });
  });

  it("POST: envia body serializado como JSON", async () => {
    const mockFetch = makeFetchMock(201, JSON.stringify({ id: 99 }));
    vi.stubGlobal("fetch", mockFetch);

    const client = createBeehiveClient({ authHeader: AUTH, baseUrl: BASE });
    const payload = { amount: 1000, paymentMethod: "pix" };
    await client.post("/transactions", payload);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify(payload));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("lança erro de autenticação em resposta 401", async () => {
    vi.stubGlobal("fetch", makeFetchMock(401, "Unauthorized"));

    const client = createBeehiveClient({ authHeader: AUTH, baseUrl: BASE });
    await expect(client.get("/balance")).rejects.toThrow(
      "Falha de autenticação com a API Beehive"
    );
  });

  it("lança erro genérico com status code em outros erros HTTP", async () => {
    vi.stubGlobal("fetch", makeFetchMock(422, "Unprocessable Entity"));

    const client = createBeehiveClient({ authHeader: AUTH, baseUrl: BASE });
    await expect(client.get("/transactions")).rejects.toThrow("API Beehive erro 422");
  });

  it("retorna undefined em resposta com body vazio", async () => {
    vi.stubGlobal("fetch", makeFetchMock(200, ""));

    const client = createBeehiveClient({ authHeader: AUTH, baseUrl: BASE });
    const result = await client.get("/any");
    expect(result).toBeUndefined();
  });

  it("aceita URL absoluta no path sem prefixar baseUrl", async () => {
    const mockFetch = makeFetchMock(200, "{}");
    vi.stubGlobal("fetch", mockFetch);

    const client = createBeehiveClient({ authHeader: AUTH, baseUrl: BASE });
    const fullUrl = "https://outro.dominio.com/endpoint";
    await client.get(fullUrl);

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe(fullUrl);
  });
});
