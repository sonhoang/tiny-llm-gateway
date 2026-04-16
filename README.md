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

Open `http://localhost:4000/admin`, create a **gateway client** key, manage **upstream** credentials under **Providers (BYOK)** (Gemini, Qwen, local/OpenAI-compatible URLs with optional API keys, priority, enable/disable), and use **Test LLM** to verify routing. Then:

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

## Local / custom OpenAI-compatible backends

The **`local`** provider talks to any server that implements `POST .../v1/chat/completions` (Ollama, LM Studio, vLLM, LiteLLM, your own gateway, etc.).

- **`LOCAL_LLM_URL`** — default base URL for all **`LOCAL_API_KEYS`** entries. You can set `https://host`, `https://host/v1`, or a full `.../v1/chat/completions` path; the gateway normalizes it.
- **`LOCAL_API_KEYS`** — comma-separated **Bearer** tokens for that URL (optional; leave empty for no `Authorization` header, e.g. Ollama).
- **`LOCAL_PROVIDER_ENDPOINTS`** — optional. Comma-separated **`url|apikey`** pairs so each backend can have its **own** URL and key, e.g. `http://localhost:1234/v1|sk-a,https://other/v1|sk-b`. Use `https://host/v1` alone (no `|`) for no key. If set, it seeds the encrypted store instead of `LOCAL_API_KEYS` + `LOCAL_LLM_URL` for local rows.

Provider keys are still persisted in **`data/provider_keys.enc`** after the first run; update `.env` and reset or edit via a fresh deploy as needed.

## Security

- Never commit `.env` or `data/`.
- `STORE_ENCRYPTION_KEY` must be 64 hex characters (32 bytes).
