import { buildCharts, calculateChart, shashtiamsaAmsha } from "../src/varga-engine.js";
import { buildPredictionReport } from "../src/prediction-engine.js";
import { ServerSwissEphemerisAdapter } from "./ephemeris-adapter.js";
import { buildKPAnalysis } from "../src/kp-engine.js";
import { buildCalculationProfiles, matchesJHoraReference } from "../src/calculation-profiles.js";

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
  // KP is deliberately not part of the application report. The isolated
  // kp-engine module remains available only for developer research/tests.
  result.kp = null;
  const referenceMatch = matchesJHoraReference(input);
  result.jhora = buildKPAnalysis(result.jhora, {
    profileId:"jhora",
    system:referenceMatch ? "JHora supplied reference · equal cusps" : "JHora-calibrated comparison · equal cusps",
    houseSystem:"Equal houses centred on the Ascendant",
    methodNote:"This reproduces the supplied JHora-style star/sub and equal-house table independently. It is never blended into the primary Parāśari score.",
    limitations:referenceMatch
      ? "The supplied birth data and reference ayanāṃśa are matched. Ruling planets, transit and finer event judgment remain outside this natal comparison."
      : "The ayanāṃśa uses an epoch-calibrated offset because the JHora option name was not supplied. It is a comparison profile, not a guaranteed JHora clone for other dates.",
  });
  result.calculationProfiles = buildCalculationProfiles({
    lahiriAyanamsa:result.lahiriAyanamsa,
    jhoraAyanamsa:result.jhora?.ayanamsa,
    referenceMatch,
  });
  if (includeSensitivity) result.birthTimeSensitivity = await calculateBirthTimeSensitivity(result);
  const verifiedByUser = [true, "true", "on", "1", 1].includes(input?.d60Verified);
  if (verifiedByUser) {
    result.birthTimeSensitivity = result.birthTimeSensitivity || { level: "User-verified exact time", note: "No perturbation audit was run. D60 cannot override D1." };
    result.birthTimeSensitivity.verifiedByUser = true;
  }
  return { ...result, prediction: buildPredictionReport(result) };
}
