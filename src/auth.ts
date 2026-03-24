const ENV_SECRET_KEY = "SECRET_KEY";

function getSecretKey(): string {
  const raw = process.env[ENV_SECRET_KEY];
  if (raw === undefined || raw === "") {
    throw new Error(
      "SECRET_KEY não configurada. Defina a variável de ambiente SECRET_KEY (chave em Configurações → Credenciais de API)."
    );
  }
  return raw.trim();
}

export function getAuthHeader(): string {
  const secretKey = getSecretKey();
  const credentials = `${secretKey}:x`;
  const encoded = Buffer.from(credentials, "utf-8").toString("base64");
  return `Basic ${encoded}`;
}

export function requireSecretKey(): void {
  getSecretKey();
}
