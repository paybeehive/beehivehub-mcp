const DEFAULT_BASE_URL = "https://api.conta.paybeehive.com.br/v1";

export function getBaseUrl(): string {
  const url = process.env.BEEHIVE_API_BASE_URL ?? DEFAULT_BASE_URL;
  return url.replace(/\/$/, "");
}

export interface BeehiveClientOptions {
  authHeader: string;
  baseUrl?: string;
}

export function createBeehiveClient(options: BeehiveClientOptions) {
  const baseUrl = options.baseUrl ?? getBaseUrl();

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Authorization: options.authHeader,
      "Content-Type": "application/json",
    };
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Falha de autenticação com a API Beehive. Verifique SECRET_KEY e base URL.");
      }
      throw new Error(
        `API Beehive erro ${res.status}: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`
      );
    }

    if (text.length === 0) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  return {
    get<T>(path: string): Promise<T> {
      return request<T>("GET", path);
    },
    post<T>(path: string, body: unknown): Promise<T> {
      return request<T>("POST", path, body);
    },
  };
}
