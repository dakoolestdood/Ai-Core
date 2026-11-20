const { URLSearchParams } = require("node:url");

function decode(s=""){return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function text(s=""){return decode(s.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim());}
module.exports = async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET"&&req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  try{
    let q=req.method==="GET"?req.query?.q:req.body?.q;
    if(typeof q!=="string"||!q.trim())throw Error("Enter something to search for.");
    q=q.trim().slice(0,300);
    const params=new URLSearchParams({q, kl:"wt-wt"});
    const response=await fetch("https://html.duckduckgo.com/html/?"+params.toString(),{headers:{"User-Agent":"Mozilla/5.0 (compatible; AiCore/1.0)","Accept":"text/html"},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error("Web search returned HTTP "+response.status);
    const html=await response.text();
    const results=[];
    const re=/<div class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="result|<\/div>)/gi;
    let m;
    while((m=re.exec(html))&&results.length<6){
      const block=m[1];
      const link=block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if(!link)continue;
      let url=decode(link[1]);
      if(url.startsWith("//"))url="https:"+url;
      try{const u=new URL(url);if(!["http:","https:"].includes(u.protocol))continue;if(u.hostname.includes("duckduckgo.com")){const target=u.searchParams.get("uddg");if(target)url=target;}}catch{continue;}
      const snippet=block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      const title=text(link[2]),summary=snippet?text(snippet[1]):"";
      if(title&&url&&!results.some(x=>x.url===url))results.push({title,url,snippet:summary});
    }
    if(!results.length)throw Error("No readable search results were returned. Try rephrasing the query.");
    res.status(200).json({query:q,results});
  }catch(e){res.status(502).json({error:e.message||"Web search failed."});}
};
