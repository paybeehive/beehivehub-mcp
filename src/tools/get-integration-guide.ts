import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DEFAULT_RELATIVE_PATH = path.join("llms-txt", "dist", "llms.txt");

export function resolveLlmsTxtPath(): string {
  const envPath = process.env.LLMS_TXT_PATH;
  if (envPath && envPath.trim().length > 0) {
    return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  }
  return path.join(process.cwd(), "..", DEFAULT_RELATIVE_PATH);
}

export async function readIntegrationGuide(llmsPath: string): Promise<string> {
  try {
    const content = await readFile(llmsPath, "utf-8");
    return content;
  } catch {
    return "";
  }
}

const ERROR_MESSAGE =
  "Guia de integração não disponível. Verifique que o llms.txt foi gerado (npm run generate em llms-txt).";

export function registerGetIntegrationGuide(
  server: any,
  options?: { llmsTxtPath?: string }
): void {
  server.registerTool(
    "get_integration_guide",
    {
      title: "Obter guia de integração",
      description:
        "Devolve o conteúdo do guia de integração (llms.txt) — visão da API, auth, transação, PIX, exemplos. Não requer URL externa; usa o ficheiro gerado no repositório.",
      inputSchema: z.object({}),
    },
    async () => {
      const llmsPath = options?.llmsTxtPath ?? resolveLlmsTxtPath();
      const text = await readIntegrationGuide(llmsPath);
      if (text === "") {
        return {
          content: [{ type: "text" as const, text: ERROR_MESSAGE }],
          isError: true,
        };
      }
      return { content: [{ type: "text" as const, text }] };
    }
  );
}
