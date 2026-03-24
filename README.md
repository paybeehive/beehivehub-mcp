# mcp-server-beehive-standalone

Repositório standalone do MCP Server Beehive (sem módulo `llms-txt` no monorepo).

## Configuração

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Defina a variável `SECRET_KEY` no `.env`.

## Executar

```bash
npm install
npm run dev
```

## Tools disponíveis

- `get_balance`
- `create_transaction`
- `create_checkout`
- `get_transaction`
- `list_transactions`
- `get_integration_guide` (opcional: configure `LLMS_TXT_PATH` se quiser usar arquivo externo)
