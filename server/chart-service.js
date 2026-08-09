import { buildCharts, calculateChart, shashtiamsaAmsha } from "../src/varga-engine.js";
import { buildPredictionReport } from "../src/prediction-engine.js";
import { ServerSwissEphemerisAdapter } from "./ephemeris-adapter.js";

export const serverEphemeris = new ServerSwissEphemerisAdapter();

export async function calculateBirthTimeSensitivity(result, adapter = serverEphemeris) {
  const minutes = [-10, -5, -2, -1, 1, 2, 5, 10];
  const samples = await Promise.all(minutes.map(async (minute) => {
    const astronomical = await adapter.calculate({ utcDate: new Date(new Date(result.utc).getTime() + minute * 60000), latitude: result.location.latitude, longitude: result.location.longitude });
    const built = buildCharts(astronomical.positions);
    return { minute, ascendants: Object.fromEntries(["D1", "D9", "D10", "D60"].map((code) => [code, built.charts[code].ascSign])), d60AscAmsha: shashtiamsaAmsha(built.positions.Asc.longitude) };
  }));
  const baseline = { ascendants: Object.fromEntries(["D1", "D9", "D10", "D60"].map((code) => [code, result.charts[code].ascSign])), d60AscAmsha: shashtiamsaAmsha(result.positions.Asc.longitude) };
  const stability = Object.fromEntries(Object.keys(baseline.ascendants).map((code) => [code, samples.every((sample) => sample.ascendants[code] === baseline.ascendants[code])]));
  const d60AmshaStable = samples.every((sample) => sample.d60AscAmsha.number === baseline.d60AscAmsha.number);
  const level = !stability.D1 ? "High sensitivity" : !stability.D9 || !stability.D10 ? "Moderate sensitivity" : !stability.D60 || !d60AmshaStable ? "Fine-chart sensitivity" : "Stable within +/-10 minutes";
  return { level, baseline, samples, stability, d60AmshaStable, rangeMinutes: 10, note: "Deterministic perturbation test, not birth-time rectification. D60 cannot override D1." };
}

export async function calculateFullChart(input, { includeSensitivity = true } = {}) {
  const result = await calculateChart(input || {}, serverEphemeris);
  if (includeSensitivity) result.birthTimeSensitivity = await calculateBirthTimeSensitivity(result);
  return { ...result, prediction: buildPredictionReport(result) };
}
