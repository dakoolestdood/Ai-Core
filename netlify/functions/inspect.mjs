import dns from "node:dns/promises";
import net from "node:net";

const MAX_PAGE = 1024 * 1024;

function privateIPv4(ip) {
  const p = ip.split(".").map(Number);
  return p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255) ||
    p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) || p[0] >= 224;
}

function privateIPv6(ip) {
  const s = ip.toLowerCase();
  return s === "::" || s === "::1" || s.startsWith("fc") ||
    s.startsWith("fd") || /^fe[89ab]/.test(s) ||
    (s.startsWith("::ffff:") && privateIPv4(s.slice(7)));
}

async function validatePublicUrl(value) {
  let u;
  try { u = new URL(value); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    throw new Error("Only public HTTP or HTTPS URLs are supported.");
  if (!u.hostname || u.hostname === "localhost" ||
      u.hostname.endsWith(".localhost") || u.hostname.endsWith(".local"))
    throw new Error("Local and private network addresses are blocked.");
  if (net.isIP(u.hostname)) {
    if (net.isIPv4(u.hostname) ? privateIPv4(u.hostname) : privateIPv6(u.hostname))
      throw new Error("Private network addresses are blocked.");
    throw new Error("Use a public website hostname instead of an IP address.");
  }
  const records = await dns.lookup(u.hostname, { all: true, verbatim: true });
  if (!records.length || records.some(r =>
    net.isIPv4(r.address) ? privateIPv4(r.address) : privateIPv6(r.address)))
    throw new Error("This hostname resolves to a private or restricted address.");
  return u;
}

function stripHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/article|\/section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t\f\v]+/g, " ").replace(/\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n").trim();
}

function extractTitle(html) {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "Web page")
    .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim().slice(0, 180);
}

async function inspectPage(input) {
  let url = await validatePublicUrl(input);
  for (let redirects = 0; redirects <= 4; redirects++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch(url, {
        redirect: "manual", signal: controller.signal,
        headers: { "User-Agent": "AiCoreReader/1.0", "Accept": "text/html,text/plain,application/xhtml+xml" }
      });
    } finally { clearTimeout(timer); }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects === 4) throw new Error("Too many redirects.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without a location.");
      url = await validatePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error("Website returned HTTP " + response.status);
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("text/plain") && !type.includes("application/xhtml+xml"))
      throw new Error("This URL does not return a readable HTML or text page.");
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_PAGE) throw new Error("Page is larger than the 1 MB inspection limit.");
    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_PAGE) throw new Error("Page is larger than the 1 MB inspection limit.");
    const text = type.includes("text/plain") ? raw : stripHtml(raw);
    if (text.length < 30) throw new Error("No readable page text was found. It may require JavaScript or a login.");
    return { url: url.toString(), title: type.includes("text/plain") ? url.hostname : extractTitle(raw), text: text.slice(0, 16000) };
  }
  throw new Error("Could not follow website redirects.");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed." }) };
  try {
    const body = JSON.parse(event.body || "{}");
    if (typeof body.url !== "string" || body.url.length > 2048)
      throw new Error("Provide one URL up to 2048 characters.");
    const result = await inspectPage(body.url);
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(result) };
  } catch (error) {
    const message = error.name === "AbortError" ? "Website request timed out." : (error.message || "Inspection failed.");
    return { statusCode: 400, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ error: message }) };
  }
};
