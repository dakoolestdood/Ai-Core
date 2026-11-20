import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OUTPUT = "public/learned.json";
const FEEDS = [
  { name: "NASA News", url: "https://www.nasa.gov/feed/" },
  { name: "arXiv Artificial Intelligence", url: "https://export.arxiv.org/rss/cs.AI" },
  { name: "Wikimedia Research", url: "https://research.wikimedia.org/feed.xml" }
];
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const MAX_ITEMS = 150;

function clean(s = "") {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ").trim();
}
function field(block, name) {
  const m = block.match(new RegExp("<(?:[\\w.-]+:)?" + name + "\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?" + name + "\\s*>", "i"));
  return clean(m?.[1] || "");
}
function sensitive(s) {
  return /(api[_ -]?key|secret[_ -]?key|password|passwd|authorization:\s*bearer|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----|sk-[A-Za-z0-9_-]{16,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(s);
}
async function get(url, accept = "application/xml") {
  const r = await fetch(url, {
    headers: { "user-agent": "AiCorePublicKnowledge/1.1 (public educational index)", accept },
    signal: AbortSignal.timeout(25000)
  });
  if (!r.ok) throw Error("HTTP " + r.status);
  return r;
}
async function collectFeed(feed) {
  const xml = await (await get(feed.url)).text();
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/gi)].map(m => m[0]);
  const out = [];
  for (const block of blocks) {
    const title = field(block, "title");
    const summary = (field(block, "description") || field(block, "summary") || field(block, "content")).slice(0, 1800);
    const link = field(block, "link") || block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || "";
    const published = field(block, "pubDate") || field(block, "published") || field(block, "updated");
    if (!title || !summary || !link || sensitive(title + " " + summary)) continue;
    try {
      const url = new URL(link, feed.url).href;
      if (!["http:", "https:"].includes(new URL(url).protocol)) continue;
      out.push({ title, source: feed.name, url, published, summary, learnedAt: new Date().toISOString() });
    } catch {}
    if (out.length >= 20) break;
  }
  return out;
}
async function collectWikipedia() {
  const params = new URLSearchParams({
    action: "query", list: "recentchanges", rcnamespace: "0",
    rctype: "new|edit", rclimit: "30", rcprop: "title|timestamp",
    format: "json", origin: "*"
  });
  const changes = await (await get(WIKI_API + "?" + params, "application/json")).json();
  const pages = [...new Map((changes.query?.recentchanges || []).map(x => [x.title, x])).values()].slice(0, 12);
  if (!pages.length) return [];
  const extractParams = new URLSearchParams({
    action: "query", prop: "extracts|info", exintro: "1",
    explaintext: "1", exsentences: "5", inprop: "url",
    titles: pages.map(x => x.title).join("|"),
    format: "json", origin: "*"
  });
  const data = await (await get(WIKI_API + "?" + extractParams, "application/json")).json();
  return Object.values(data.query?.pages || {}).flatMap(page => {
    const summary = String(page.extract || "").slice(0, 1800);
    if (!page.title || summary.length < 80 || sensitive(page.title + " " + summary)) return [];
    return [{
      title: page.title,
      source: "Wikipedia · Recent changes",
      url: page.fullurl || "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")),
      published: pages.find(x => x.title === page.title)?.timestamp || "",
      summary,
      learnedAt: new Date().toISOString()
    }];
  });
}

const sources = [
  ...FEEDS.map(({ name, url }) => ({ name, url })),
  { name: "Wikipedia · Recent changes", url: "https://en.wikipedia.org/wiki/Special:RecentChanges" }
];
const fresh = [];
for (const feed of FEEDS) {
  try {
    const items = await collectFeed(feed);
    fresh.push(...items);
    console.log(feed.name + ": " + items.length);
  } catch (error) {
    console.warn("Feed failed: " + feed.name + ": " + error.message);
  }
}
try {
  const items = await collectWikipedia();
  fresh.push(...items);
  console.log("Wikipedia: " + items.length);
} catch (error) {
  console.warn("Wikipedia collection failed: " + error.message);
}
let previous = { items: [] };
try { previous = JSON.parse(await readFile(OUTPUT, "utf8")); } catch {}
const merged = new Map();
for (const item of [...fresh, ...(previous.items || [])]) {
  if (item?.url && item?.title && item?.summary) merged.set(item.url, item);
}
const items = [...merged.values()].slice(0, MAX_ITEMS);
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify({
  updatedAt: new Date().toISOString(),
  sources,
  items
}, null, 2) + "\n");
console.log("Saved " + items.length + " public knowledge entries.");
