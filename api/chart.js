import { buildCharts, calculateChart, shashtiamsaAmsha } from "../src/varga-engine.js";
import { buildPredictionReport } from "../src/prediction-engine.js";
import { ServerSwissEphemerisAdapter } from "../server/ephemeris-adapter.js";

const adapter = new ServerSwissEphemerisAdapter();

async function birthTimeSensitivity(result) {
  const minutes=[-10,-5,-2,-1,1,2,5,10];
  const samples=await Promise.all(minutes.map(async(minute)=>{
    const astronomical=await adapter.calculate({utcDate:new Date(new Date(result.utc).getTime()+minute*60000),latitude:result.location.latitude,longitude:result.location.longitude});
    const built=buildCharts(astronomical.positions);
    return {minute,ascendants:Object.fromEntries(["D1","D9","D10","D60"].map((code)=>[code,built.charts[code].ascSign])),d60AscAmsha:shashtiamsaAmsha(built.positions.Asc.longitude)};
  }));
  const baseline={ascendants:Object.fromEntries(["D1","D9","D10","D60"].map((code)=>[code,result.charts[code].ascSign])),d60AscAmsha:shashtiamsaAmsha(result.positions.Asc.longitude)};
  const stability=Object.fromEntries(Object.keys(baseline.ascendants).map((code)=>[code,samples.every((sample)=>sample.ascendants[code]===baseline.ascendants[code])]));
  const d60AmshaStable=samples.every((sample)=>sample.d60AscAmsha.number===baseline.d60AscAmsha.number);
  const level=!stability.D1?"High sensitivity":!stability.D9||!stability.D10?"Moderate sensitivity":!stability.D60||!d60AmshaStable?"Fine-chart sensitivity":"Stable within ±10 minutes";
  return {level,baseline,samples,stability,d60AmshaStable,rangeMinutes:10,note:"This is a deterministic perturbation test, not birth-time rectification. D60 changes are warnings and cannot override D1."};
}

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const result = await calculateChart(req.body || {}, adapter);
    result.birthTimeSensitivity=await birthTimeSensitivity(result);
    return res.status(200).json({ ...result, prediction: buildPredictionReport(result) });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Calculation failed." });
  }
}
