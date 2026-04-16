# Tiny LLM Gateway

OpenAI-compatible gateway with **Google Gemini** and **custom OpenAI-compatible** upstreams, admin login, encrypted provider configuration, and Docker support.

## Quickstart

```bash
cp .env.example .env
# Set ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET
# Generate STORE_ENCRYPTION_KEY:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm install
npm run dev
```

Configure **only** `.env` (admin login, session, encryption key, port). In **Admin → Providers**, each row needs **API key**, **model** (upstream id, required when adding), **host** (optional), and **priority** (lower = earlier in the failover chain).

**Public API — `model`:**

- **Default:** omit `model`, send an empty string, or send **`"auto"`** (case-insensitive). The gateway tries **every** eligible row in **priority** order (Gemini and OpenAI-compatible merged) until one succeeds.
- **Pinned:** any other `model` string uses **only** rows whose configured model matches exactly, in priority order. If **no** row has that model, the gateway returns **400** (no silent fallback to other models).
- The literal **`auto`** is reserved for this routing mode; use it when a client must send an explicit field.

Gateway **client** keys are created on the dashboard. On **Test LLM**, paste a `sk-gw-…` key (optional: stored in the browser’s `localStorage` after a successful request).

```bash
# Auto routing (omit model or use "auto")
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-gw-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'

# Pin to one configured model id (errors if no row has this model)
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-gw-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-1.5-flash","messages":[{"role":"user","content":"Hello!"}]}'
```

## Docker

```bash
docker compose up --build
```

Mount `./data` for encrypted files (`provider_keys.enc`, gateway key store, etc.).

## Custom OpenAI-compatible backends

Any server that implements `POST .../v1/chat/completions` (Ollama, LM Studio, vLLM, etc.). Set **host** to `https://host`, `https://host/v1`, or a full `.../v1/chat/completions` path — the gateway normalizes it. Empty **host** defaults to `http://127.0.0.1:11434/v1`. The **model** on the row is sent upstream as the OpenAI `model` field.

## Gemini

**Host** defaults to Google’s Generative Language API root if omitted. **Model** should be the Google model id (e.g. `gemini-1.5-flash`).

## Security

- Never commit `.env` or `data/`.
- `STORE_ENCRYPTION_KEY` must be 64 hex characters (32 bytes).
