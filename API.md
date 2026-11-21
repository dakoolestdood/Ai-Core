# Ai Core API

Ai Core exposes an OpenAI-compatible chat endpoint:

`POST /api/v1/chat/completions`

## Required Vercel environment variables

- `AICORE_API_KEY`: your private Ai Core key. Generate a long random secret and add it in Vercel Project Settings → Environment Variables. Never put this value in browser JavaScript or commit it to GitHub.
- `MODEL_API_URL`: the full server-side chat-completions URL for a Qwen-compatible inference service.

Optional:
- `MODEL_API_KEY`: secret for the model host, if that host requires one.
- `MODEL_NAME`: model identifier expected by the model host (defaults to `Qwen2.5-0.5B-Instruct`).

The browser-loaded Qwen model in `public/app.js` is not reachable by this server endpoint. A server-side Qwen inference service must be configured through `MODEL_API_URL`. Until then, the API validates your Ai Core key and returns HTTP 503 for chat requests rather than pretending inference works.

## Request

```http
POST /api/v1/chat/completions
Authorization: Bearer YOUR_AICORE_API_KEY
Content-Type: application/json
```

```json
{
  "model": "Qwen2.5-0.5B-Instruct",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "max_tokens": 256,
  "temperature": 0.7
}
```

Responses use the configured model host's OpenAI-compatible JSON format. Requests are sent server-to-server; model-host credentials are never exposed to callers.
