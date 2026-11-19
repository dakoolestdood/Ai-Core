const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { generateReply } = require("./ai");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, data, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  res.end(type.startsWith("application/json") ? JSON.stringify(data) : data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/health") {
    return send(res, 200, { ok: true, name: "Ai", mode: "local-rule-engine" });
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    try {
      const body = await readBody(req);
      const message = String(body.message || "").trim().slice(0, 4000);
      const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
      if (!message) return send(res, 400, { error: "Message cannot be empty." });

      const reply = generateReply(message, history);
      return send(res, 200, { reply, mode: "local-rule-engine" });
    } catch (error) {
      return send(res, 400, { error: error.message || "Could not process the message." });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, { error: "Method not allowed." });
  }

  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = path.resolve(PUBLIC, requested);
  if (!filePath.startsWith(PUBLIC + path.sep) && filePath !== PUBLIC) {
    return send(res, 403, { error: "Forbidden." });
  }

  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, { error: "Not found." });
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    if (req.method === "HEAD") return res.end();
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ai is running on port ${PORT}`);
});
