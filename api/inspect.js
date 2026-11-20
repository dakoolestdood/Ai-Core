const dns=require("node:dns").promises;
const net=require("node:net");
const {URL}=require("node:url");
const MAX_PAGE=700000;
function private4(ip){const p=ip.split(".").map(Number);return p.length!==4||p[0]===10||p[0]===127||p[0]===0||p[0]===169&&p[1]===254||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&p[1]===168||p[0]>=224}
function private6(ip){const s=ip.toLowerCase();return s==="::"||s==="::1"||s.startsWith("fc")||s.startsWith("fd")||/^fe[89ab]/.test(s)||s.startsWith("::ffff:")&&private4(s.slice(7))}
async function safeUrl(value){let u;try{u=new URL(value)}catch{throw Error("Invalid URL.")}if(!["http:","https:"].includes(u.protocol)||u.username||u.password)throw Error("Only public HTTP or HTTPS URLs are allowed.");if(!u.hostname||u.hostname==="localhost"||u.hostname.endsWith(".localhost")||u.hostname.endsWith(".local"))throw Error("Local addresses are blocked.");if(net.isIP(u.hostname))throw Error("Use a public website hostname.");const rows=await dns.lookup(u.hostname,{all:true});if(!rows.length||rows.some(x=>net.isIPv4(x.address)?private4(x.address):private6(x.address)))throw Error("Private network addresses are blocked.");return u}
function clean(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi," ").replace(/<!--([\s\S]*?)-->/g," ").replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/article|\/section)[^>]*>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/[ \t]+/g," ").replace(/\n\s*/g,"\n").replace(/\n{3,}/g,"\n\n").trim()}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return}
 try{
  const value=req.body?.url;if(typeof value!=="string"||value.length>2048)throw Error("Provide one public URL up to 2048 characters.");
  let url=await safeUrl(value),response;
  for(let i=0;i<4;i++){
   response=await fetch(url,{redirect:"manual",headers:{"User-Agent":"Mozilla/5.0 (compatible; AiCoreReader/1.0)","Accept":"text/html,text/plain,application/xhtml+xml"},signal:AbortSignal.timeout(12000)});
   if([301,302,303,307,308].includes(response.status)){const loc=response.headers.get("location");if(!loc)throw Error("Invalid redirect.");url=await safeUrl(new URL(loc,url).toString());continue}
   break;
  }
  if(!response?.ok)throw Error("Website returned HTTP "+(response?.status||"error"));
  const type=(response.headers.get("content-type")||"").toLowerCase();if(!type.includes("text/html")&&!type.includes("text/plain")&&!type.includes("application/xhtml+xml"))throw Error("This page is not readable HTML or text.");
  const raw=await response.text();if(Buffer.byteLength(raw)>MAX_PAGE)throw Error("Page exceeds the 700 KB reading limit.");
  const title=type.includes("text/plain")?url.hostname:(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||url.hostname).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,180);
  const content=type.includes("text/plain")?raw:clean(raw);if(content.length<30)throw Error("No readable text found. The page may require JavaScript or a login.");
  res.status(200).json({url:url.toString(),title,text:content.slice(0,14000)});
 }catch(e){res.status(400).json({error:e.message||"Page inspection failed."})}
};
