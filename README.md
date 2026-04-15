# Tiny LLM Gateway

OpenAI-compatible gateway with multi-provider routing (Gemini, Qwen, local), admin login, encrypted API key storage, and Docker support.

## Quickstart

```bash
cp .env.example .env
# Set ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET
# Generate STORE_ENCRYPTION_KEY:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm install
npm run dev
```

Open `http://localhost:4000/admin`, create a gateway key, then:

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-gw-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hello!"}]}'
```

## Docker

```bash
docker compose up --build
```

Mount `./data` for encrypted `*.enc` files.

## Security

- Never commit `.env` or `data/`.
- `STORE_ENCRYPTION_KEY` must be 64 hex characters (32 bytes).
