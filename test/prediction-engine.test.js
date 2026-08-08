import { describe, expect, it } from "vitest";
import { buildCharts } from "../src/varga-engine.js";
import { CONFIRMATION_WEIGHTS, DOMAIN_SPECS, buildPredictionReport, evaluateDomain, vimshottariTimeline } from "../src/prediction-engine.js";

const longitudes = { Sun:128.47, Moon:106.84, Mars:311.84, Mercury:152.11, Jupiter:125.79, Venus:130.47, Saturn:76.15, Rahu:30.57, Ketu:210.57, Asc:125.84 };
const positions = Object.fromEntries(Object.entries(longitudes).map(([name, longitude]) => [name, { longitude, retrograde:name === "Mars" }]));
const built = buildCharts(positions);
const result = { ...built, utc:"2003-08-26T00:23:34.000Z" };

describe("prediction domains", () => {
  it("defines the practical rulebook domains", () => {
    expect(Object.keys(DOMAIN_SPECS)).toEqual(["overview","money","career","fame","marriage","foreign","property","vehicles","gains"]);
  });
  it.each(Object.keys(DOMAIN_SPECS))("builds traceable evidence for %s", (key) => {
    const report = evaluateDomain(result, key);
    expect(report.evidence.length).toBeGreaterThan(0);
    expect(report.dimensions).toHaveProperty("promise");
    expect(report.limitations).toContain("not yet calculated");
  });
});

describe("Vimshottari timeline", () => {
  it("finds one current MD-AD period and ordered boundaries", () => {
    const timeline = vimshottariTimeline(106.84, new Date(result.utc), new Date("2026-08-08T00:00:00Z"));
    expect(timeline.periods.filter((period) => period.current)).toHaveLength(1);
    expect(timeline.periods.every((period) => period.start < period.end)).toBe(true);
  });
  it("adds MD-AD geometry to the full report", () => {
    const report = buildPredictionReport(result, new Date("2026-08-08T00:00:00Z"));
    expect(report.currentPeriod).not.toBeNull();
    expect(report.currentPeriod.geometry.relation).toBeTruthy();
    expect(report.currentPeriod.theme.headline).toBeTruthy();
    expect(report.currentPeriod.theme.domains).toHaveLength(3);
    expect(report.currentPeriod.theme.d60).toHaveLength(2);
    expect(report.foreignAnalysis.houses.map((item)=>item.house)).toEqual([4,9,12]);
    expect(report.foreignAnalysis.primary.houses.map((item)=>item.house)).toEqual([9,12]);
    expect(report.foreignAnalysis.supporting.map((item)=>item.code)).toEqual(["D10","D9"]);
    expect(report.foreignAnalysis.functional.every((item)=>["FB","FM","Mixed","Node"].includes(item.code))).toBe(true);
    expect(report.timeline.periods.some((period) => period.theme.phase === "past")).toBe(true);
    expect(report.timeline.periods.some((period) => period.theme.phase === "upcoming")).toBe(true);
    expect(report.readingOrder).toHaveLength(6);
  });
  it("weights Varga confirmation and Ashtakavarga in every final assessment", () => {
    const report = buildPredictionReport(result, new Date("2026-08-08T00:00:00Z"));
    expect(Object.values(CONFIRMATION_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100);
    for (const domain of Object.values(report.domains)) {
      expect(domain.confirmation.components).toHaveLength(5);
      expect(domain.confirmation.components.find((item) => item.key === "varga")?.chart).toBe(domain.varga);
      expect(domain.confirmation.components.find((item) => item.key === "d1")?.weight).toBe(45);
      expect(domain.confirmation.components.find((item) => item.key === "varga")?.weight).toBe(10);
      expect(domain.confirmation.components.find((item) => item.key === "timing")?.weight).toBe(25);
      const calculated = Math.round(domain.confirmation.components.reduce((sum, item) => sum + item.score * item.weight, 0) / 100);
      expect(domain.confirmation.score).toBe(calculated);
      expect(["Good","Moderate","Low"]).toContain(domain.dimensions.strength);
    }
  });
  it("builds overall natal promises without timing components", () => {
    const report = buildPredictionReport(result, new Date("2026-08-08T00:00:00Z"));
    expect(report.overallPromises.rows).toHaveLength(Object.keys(DOMAIN_SPECS).length);
    expect(report.overallPromises.rows.every((row) => row.layers.every((layer) => layer.key !== "timing"))).toBe(true);
    expect(report.overallPromises.specialPoints.some((point) => point.key === "AL")).toBe(true);
    expect(report.overallPromises.nodes).toHaveLength(2);
    expect(report.overallPromises.method.at(-1)).toContain("excluded");
  });
  it("evaluates D2 by Hora suitability and the combined H2/H11 carrier", () => {
    const report = buildPredictionReport(result, new Date("2026-08-08T00:00:00Z"));
    const hora=report.domains.money.confirmation.hora;
    expect(hora.secondLord).toBe("Mercury");
    expect(hora.eleventhLord).toBe("Mercury");
    expect(hora.sameLord).toBe(true);
    expect(hora.suitableCount).toBe(5);
    expect(report.domains.money.confirmation.components.find((item)=>item.key==="varga")?.score).toBeGreaterThanOrEqual(68);
    expect(report.domains.money.confirmation.components.find((item)=>item.key==="varga")?.detail).toContain("Hora suitability");
  });
  it("uses a D4-specific foreign frame including badhaka and Rahu", () => {
    const report=buildPredictionReport(result,new Date("2026-08-08T00:00:00Z"));
    const method=report.domains.foreign.confirmation.vargaAnalysis;
    expect(method.chart).toBe("D4");
    expect(method.houses.map((item)=>item.house)).toEqual(expect.arrayContaining([3,7,9,12,method.badhaka.house]));
    expect(method.karakas.map((item)=>item.planet)).toContain("Rahu");
    expect(method.method).toContain("badhaka");
  });
  it("builds foreign-spouse confirmation from D1 and the D9 spouse reference", () => {
    const report=buildPredictionReport(result,new Date("2026-08-08T00:00:00Z"));
    expect(report.foreignSpouseAnalysis.spouseLord).toBeTruthy();
    expect(report.foreignSpouseAnalysis.placements.map((item)=>item.planet)).toEqual(expect.arrayContaining(["Rahu","Ketu","Venus","Jupiter"]));
    expect(report.foreignSpouseAnalysis.method).toContain("D9 7th");
    expect(["Good","Moderate","Low"]).toContain(report.foreignSpouseAnalysis.level);
  });
});
