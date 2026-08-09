import express from "express";
import { rateLimit } from "express-rate-limit";
import { calculateFullChart } from "./chart-service.js";
import { buildLifeReportPdf } from "./pdf-report.js";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "12kb" }));
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" });
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean);
  const origin = req.get("origin");
  if (origin && (allowed.includes(origin) || allowed.includes("*"))) res.set("Access-Control-Allow-Origin", origin);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use("/api", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }));
app.get("/api/health", (_req, res) => res.json({ status: "ready" }));
app.post("/api/chart", async (req, res) => {
  try {
    res.json(await calculateFullChart(req.body || {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Calculation failed." });
  }
});
app.post("/api/report", async (req, res) => {
  try {
    const result = await calculateFullChart(req.body || {});
    const bytes = await buildLifeReportPdf(result, { locationName:req.body?.locationName });
    res.set({ "Content-Type":"application/pdf", "Content-Disposition":"attachment; filename=\"jyotish-life-report.pdf\"", "Content-Length":String(bytes.length) });
    res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Report generation failed." });
  }
});
app.use(express.static("dist", { etag: true, maxAge: "1h" }));
app.get("/{*path}", (_req, res) => res.sendFile("index.html", { root: "dist" }));

export default app;
