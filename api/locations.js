export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  const query=String(req.query?.q||"").trim();
  if(query.length<2||query.length>120) return res.status(400).json({ error:"Enter between 2 and 120 characters." });
  const url=new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format","jsonv2");
  url.searchParams.set("q",query);
  url.searchParams.set("limit","7");
  url.searchParams.set("addressdetails","1");
  try {
    const response=await fetch(url,{headers:{Accept:"application/json","Accept-Language":"en","User-Agent":"JyotishAnalysisBeta/0.1 (https://javascriptengine.vercel.app)"},signal:AbortSignal.timeout(9000)});
    if(!response.ok) return res.status(502).json({error:"The location provider is temporarily unavailable."});
    const places=(await response.json()).map((item)=>({name:item.display_name,latitude:Number(item.lat),longitude:Number(item.lon)})).filter((item)=>Number.isFinite(item.latitude)&&Number.isFinite(item.longitude));
    res.setHeader("Cache-Control","s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({places});
  } catch {
    return res.status(504).json({error:"Location search timed out. Please try again."});
  }
}
