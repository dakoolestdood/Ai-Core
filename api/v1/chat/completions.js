const { timingSafeEqual, createHash } = require("node:crypto");

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function constantTimeMatch(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string" || !received || !expected) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { error: { message: "Use POST.", type: "method_not_allowed" } });

  const expectedKey = process.env.AICORE_API_KEY;
  if (!expectedKey) return send(res, 503, { error: { message: "Ai Core API is not configured: AICORE_API_KEY is missing.", type: "configuration_error" } });

  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || !constantTimeMatch(match[1], expectedKey)) {
    return send(res, 401, { error: { message: "Invalid or missing Ai Core API key.", type: "authentication_error" } });
  }

  const upstream = process.env.MODEL_API_URL;
  if (!upstream) return send(res, 503, { error: { message: "API key authentication is ready, but no server-side Qwen inference endpoint is configured yet.", type: "model_backend_not_configured" } });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return send(res, 400, { error: { message: "Request body must be valid JSON.", type: "invalid_request_error" } }); }
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.messages) || body.messages.length < 1) {
    return send(res, 400, { error: { message: "Provide a JSON body with a non-empty messages array.", type: "invalid_request_error" } });
  }
  if (body.messages.length > 40 || body.messages.some(m => !m || !["system", "user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 12000)) {
    return send(res, 400, { error: { message: "Messages must use system, user, or assistant roles and contain at most 12,000 characters each (40 messages maximum).", type: "invalid_request_error" } });
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (process.env.MODEL_API_KEY) headers.Authorization = "Bearer " + process.env.MODEL_API_KEY;
    const upstreamResponse = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: body.model || process.env.MODEL_NAME || "Qwen2.5-0.5B-Instruct",
        messages: body.messages,
        max_tokens: Math.min(Math.max(Number(body.max_tokens) || 256, 1), 1024),
        temperature: Number.isFinite(Number(body.temperature)) ? Math.min(Math.max(Number(body.temperature), 0), 2) : 0.7,
        stream: false
      })
    });
    const raw = await upstreamResponse.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { error: { message: raw.slice(0, 1000) || "The model backend returned an unreadable response." } }; }
    return send(res, upstreamResponse.status, data);
  } catch (error) {
    return send(res, 502, { error: { message: "Could not reach the configured model backend: " + String(error.message || error).slice(0, 300), type: "upstream_error" } });
  }
};
