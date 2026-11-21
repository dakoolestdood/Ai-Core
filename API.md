# Ai Core API

Ai Core exposes an OpenAI-compatible chat endpoint:

`POST /api/v1/chat/completions`

## Required Vercel environment variables

- `AICORE_API_KEY`: your private Ai Core key. Generate a long random secret and add it in Vercel Project Settings → Environment Variables. Never put this value in browser JavaScript or commit it to GitHub.
- `MODEL_API_KEY`: a Hugging Face user token with **Make calls to Inference Providers** permission. Store it only in Vercel; never put it in browser code or GitHub.

The default model backend is Hugging Face Inference Providers at `https://router.huggingface.co/v1/chat/completions`, using `Qwen/Qwen2.5-0.5B-Instruct`. The model page currently lists Featherless AI as an inference provider. Usage is subject to provider availability, account limits, and pricing.

Optional:
- `MODEL_API_URL`: override the default Hugging Face chat-completions URL.
- `MODEL_NAME`: model identifier expected by the model host (defaults to `Qwen/Qwen2.5-0.5B-Instruct`).

The browser-loaded Qwen model in `public/app.js` is separate from this API. The API now routes requests to the Hugging Face Inference Providers router by default. Set `MODEL_API_KEY` in Vercel before it can generate responses. You can override the backend with `MODEL_API_URL` and `MODEL_NAME` if you later host Qwen elsewhere.

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
