# mcp-server-beehive

Servidor MCP para a API Beehive. Expõe ferramentas de consulta e criação de transações, checkouts e saldo para qualquer cliente compatível com o protocolo [MCP](https://modelcontextprotocol.io).

## Ferramentas disponíveis

| Tool | Descrição |
|---|---|
| `get_balance` | Consulta o saldo disponível |
| `list_transactions` | Lista transações com filtros opcionais |
| `get_transaction` | Busca uma transação por ID |
| `create_transaction` | Cria uma transação (PIX, cartão ou boleto) |
| `create_checkout` | Cria um link de pagamento |
| `get_integration_guide` | Retorna o guia de integração da API |

---

## Pré-requisitos

- Node.js >= 22
- Uma `SECRET_KEY` da API Beehive (Configurações → Credenciais de API)

---

## Instalação

```bash
git clone <repo>
cd beehivehub-mcp
npm install
cp .env.example .env
# edite .env com suas credenciais
```

---

## Modos de uso

O servidor suporta três modos. O modo é controlado pela variável `MCP_TRANSPORT`.

---

### Modo 1 — stdio + ferramenta local (Cursor, Claude Desktop, Windsurf)

A ferramenta inicia o processo MCP automaticamente via `stdio`. Não é necessário rodar nada manualmente.

**Como configurar:**

Copie os arquivos de template e edite com suas credenciais:

```bash
cp mcp.json.example .cursor/mcp.json
cp .env.example .env
# edite .env com suas credenciais
```

Conteúdo de `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "beehive": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/caminho/absoluto/para/beehivehub-mcp"
    }
  }
}
```

> As credenciais (`SECRET_KEY`, `BEEHIVE_API_BASE_URL`) são lidas do `.env` automaticamente — não é necessário defini-las no `mcp.json`.

> **Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`), **Windsurf** (`~/.codeium/windsurf/mcp_config.json`) e **Continue** (`.continue/config.json`) usam o mesmo formato JSON acima.

---

### Modo 2 — HTTP + ferramenta local (n8n local, LangChain, scripts)

Suba o servidor manualmente e aponte a ferramenta para o endereço local.

```bash
npm run dev:http
# ou com porta customizada:
MCP_PORT=4000 npm run dev:http
```

Configure na ferramenta:
- **Transporte**: HTTP transmissível
- **Autenticação**: Nenhuma (ou Chave API se definir `MCP_AUTH_TOKEN`)
- **URL**: depende de como a ferramenta está rodando:

| Ferramenta rodando via | URL |
|---|---|
| `npm` (sem Docker) | `http://localhost:3000/mcp` |
| Docker | `http://host.docker.internal:3000/mcp` |
| n8n cloud | ❌ não funciona — use o Modo 3 |

---

### Modo 3 — HTTP + ferramenta externa (Perplexity, Comet, n8n cloud, Make, Zapier)

O servidor precisa ser acessível pela internet. A forma recomendada é um deploy em container.

**Deploy em container (EasyPanel, Railway, Render, Fly.io):**

O repositório inclui um `Dockerfile` pronto. Suba a imagem na plataforma de sua escolha e configure as variáveis de ambiente no painel:

| Variável | Valor |
|---|---|
| `SECRET_KEY` | `sk_live_...` |
| `BEEHIVE_API_BASE_URL` | `https://api.conta.paybeehive.com.br/v1` |
| `MCP_AUTH_TOKEN` | token seguro (veja abaixo como gerar) |

> `MCP_TRANSPORT=http` e `MCP_PORT=3000` já estão definidos no `Dockerfile` como padrão.

Configure na ferramenta externa:
- **URL**: `https://seu-dominio.com/mcp`
- **Transporte**: HTTP transmissível
- **Autenticação**: Chave API → `Bearer <MCP_AUTH_TOKEN>`

**Gerar um token seguro:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ Sempre defina `MCP_AUTH_TOKEN` em ambientes públicos. Sem ele, qualquer pessoa com a URL pode usar o servidor e consumir sua `SECRET_KEY` da Beehive.

**Alternativa para testes rápidos — tunnel com ngrok:**

Se precisar expor o servidor localmente sem fazer deploy, use um tunnel temporário. Não recomendado para produção (URL muda a cada restart no plano gratuito).

```bash
# terminal 1: sobe o servidor com autenticação
MCP_AUTH_TOKEN=meu-token npm run dev:http

# terminal 2: expõe via tunnel
ngrok http 3000
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `SECRET_KEY` | ✅ | — | Chave de API Beehive |
| `BEEHIVE_API_BASE_URL` | — | `https://api.conta.paybeehive.com.br/v1` | URL base da API |
| `MCP_TRANSPORT` | — | `stdio` | `stdio` ou `http` |
| `MCP_PORT` | — | `3000` | Porta do servidor HTTP (modos 2 e 3) |
| `MCP_AUTH_TOKEN` | — | — | Token Bearer para proteger o servidor HTTP |
| `LLMS_TXT_PATH` | — | `../llms-txt/dist/llms.txt` | Caminho para o arquivo llms.txt (somente se fora do padrão) |

---

## Scripts disponíveis

```bash
npm run dev          # stdio (modo 1)
npm run dev:http     # HTTP na porta 3000 (modos 2 e 3)
npm test             # roda os testes unitários
npm run test:watch   # testes em modo watch
npm run build        # compila TypeScript para dist/
```

---

## Sandbox vs Produção

| Ambiente | SECRET_KEY | BEEHIVE_API_BASE_URL |
|---|---|---|
| Sandbox | `sk_test_...` | `https://api.sandbox.hopysplit.com.br/v1` |
| Produção | `sk_live_...` | `https://api.conta.paybeehive.com.br/v1` |

---

## Testes

```bash
npm test
```

21 testes unitários — rodam offline, sem dependência de API ou rede.
