import express from "express";
import { rateLimit } from "express-rate-limit";
import { calculateChart } from "../src/varga-engine.js";
import { buildPredictionReport } from "../src/prediction-engine.js";
import { ServerSwissEphemerisAdapter } from "./ephemeris-adapter.js";

const adapter = new ServerSwissEphemerisAdapter();
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
    const result = await calculateChart(req.body || {}, adapter);
    res.json({ ...result, prediction: buildPredictionReport(result) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Calculation failed." });
  }
});
app.use(express.static("dist", { etag: true, maxAge: "1h" }));
app.get("/{*path}", (_req, res) => res.sendFile("index.html", { root: "dist" }));

export default app;
