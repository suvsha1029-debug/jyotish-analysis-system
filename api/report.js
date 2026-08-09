import { calculateFullChart } from "../server/chart-service.js";
import { buildLifeReportPdf } from "../server/pdf-report.js";

function safeFilename(value) {
  const slug = String(value || "birth-chart").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "birth-chart";
  return `jyotish-life-report-${slug}.pdf`;
}

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const result = await calculateFullChart(req.body || {});
    const bytes = await buildLifeReportPdf(result, { locationName: req.body?.locationName });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(req.body?.locationName)}"`);
    res.setHeader("Content-Length", String(bytes.length));
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Report generation failed." });
  }
}
