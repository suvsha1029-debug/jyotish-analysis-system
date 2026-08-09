import { calculateFullChart } from "../server/chart-service.js";

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    return res.status(200).json(await calculateFullChart(req.body || {}));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Calculation failed." });
  }
}
