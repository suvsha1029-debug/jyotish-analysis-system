import { calculateChart } from "../src/varga-engine.js";
import { buildPredictionReport } from "../src/prediction-engine.js";
import { ServerSwissEphemerisAdapter } from "../server/ephemeris-adapter.js";

const adapter = new ServerSwissEphemerisAdapter();

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const result = await calculateChart(req.body || {}, adapter);
    return res.status(200).json({ ...result, prediction: buildPredictionReport(result) });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Calculation failed." });
  }
}
