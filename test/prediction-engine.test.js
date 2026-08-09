import { describe, expect, it } from "vitest";
import { buildCharts } from "../src/varga-engine.js";
import { CONFIRMATION_WEIGHTS, DOMAIN_SPECS, MD_AD_AXIS_WEIGHT, assessMdAdAxis, buildPredictionReport, evaluateDomain, vimshottariTimeline } from "../src/prediction-engine.js";

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
    expect(report.currentPeriod.theme.d60Reliability.reliable).toBe(false);
    expect(report.currentPeriod.theme.summary).toContain("D60 is excluded");
    expect(report.currentPeriod.theme.activatedHouses).toEqual(expect.arrayContaining([2,4,11]));
    expect(report.currentPeriod.theme.nodeControllers).toEqual([{node:"Ketu",signDispositor:"Mars",nakshatraLord:"Jupiter"}]);
    expect(report.currentPeriod.theme.summary).toContain("Direct D1 load");
    expect(report.foreignAnalysis.houses.map((item)=>item.house)).toEqual([1,3,4,7,9,12]);
    expect(report.foreignAnalysis.primary.houses.map((item)=>item.house)).toEqual([3,7,9,12]);
    expect(report.foreignAnalysis.lordConnections.map((item)=>item.label)).toEqual(expect.arrayContaining(["1L–9L","1L–12L","4L–9L","4L–12L","9L–12L","7L–12L"]));
    expect(report.foreignAnalysis.houses.every((item)=>item.dignity&&item.dispositor)).toBe(true);
    expect(report.foreignAnalysis.supporting.map((item)=>item.code)).toEqual(["D10","D9"]);
    expect(report.foreignAnalysis.functional.every((item)=>["FB","FM","Mixed","Node"].includes(item.code))).toBe(true);
    expect(report.timeline.periods.some((period) => period.theme.phase === "past")).toBe(true);
    expect(report.timeline.periods.some((period) => period.theme.phase === "upcoming")).toBe(true);
    expect(report.readingOrder).toHaveLength(6);
  });
  it("gives the MD-AD axis primary authority and hard-caps a 6/8 delivery",()=>{
    const severe=assessMdAdAxis({pair:"6/8"});
    const supportive=assessMdAdAxis({pair:"5/9"});
    expect(MD_AD_AXIS_WEIGHT).toBe(65);
    expect(severe.cap).toBeLessThan(45);
    expect(severe.score).toBeLessThan(supportive.score);
    const report=buildPredictionReport(result,new Date("2026-08-08T00:00:00Z"));
    const sixEight=report.timeline.periods.filter((period)=>period.geometry.pair==="6/8");
    expect(sixEight.length).toBeGreaterThan(0);
    expect(sixEight.every((period)=>period.theme.delivery==="Low")).toBe(true);
    expect(sixEight.every((period)=>period.theme.timingJudgment.axisWeight===65)).toBe(true);
    expect(sixEight.every((period)=>period.theme.summary.includes("controls 65%"))).toBe(true);
  });
  it("separates foreign-property promise, acquisition, fortune and residence stability",()=>{
    const report=buildPredictionReport(result,new Date("2026-08-08T00:00:00Z"));
    expect(report.foreignPropertyAnalysis.foreignProperty.level).toBe("Good");
    expect(report.foreignPropertyAnalysis.acquisition.level).toBe("Good");
    expect(report.foreignPropertyAnalysis.fortune.level).toBe("Good");
    expect(report.foreignPropertyAnalysis.residentialStability.level).toBe("Moderate");
    expect(report.foreignPropertyAnalysis.links).toMatchObject({fourthNinthLink:true,nodeAxis:true,d4NodeAxis:true,moonForeignStrength:true});
    expect(report.foreignPropertyAnalysis.evidence).toHaveLength(5);
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
  it("ranks all Mahadashas with contextual combustion and cross-Varga evidence",()=>{
    const report=buildPredictionReport(result,new Date("2026-08-08T00:00:00Z"));
    expect(report.mahadashaRankings).toHaveLength(9);
    expect(report.mahadashaRankings.map((item)=>item.lord).sort()).toEqual([...new Set(["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"])].sort());
    const mars=report.mahadashaRankings.find((item)=>item.lord==="Mars");
    expect(mars.retrograde).toBe(true);
    expect(mars).toHaveProperty("d9House");
    expect(mars).toHaveProperty("d10House");
    const venus=report.mahadashaRankings.find((item)=>item.lord==="Venus");
    expect(venus.combustion.statement).toContain(venus.combustion.combust?"modifier":"Outside");
    expect(report.mahadashaRankings.every((item)=>item.d60?.name&&item.themes.length===3)).toBe(true);
    expect(report.mahadashaRankings.every((item)=>item.d60.included===false&&item.d60.nature.includes("not scored"))).toBe(true);
  });
  it("allows D60 to affect ranking only after a stable perturbation audit",()=>{
    const unverified=buildPredictionReport(result,new Date("2026-08-08T00:00:00Z"));
    const stableResult={...result,birthTimeSensitivity:{level:"Stable within +/-10 minutes",rangeMinutes:10,stability:{D60:true},d60AmshaStable:true}};
    const stable=buildPredictionReport(stableResult,new Date("2026-08-08T00:00:00Z"));
    expect(stable.mahadashaRankings.every((item)=>item.d60.included)).toBe(true);
    expect(stable.currentPeriod.theme.d60Reliability.reliable).toBe(true);
    expect(stable.mahadashaRankings.some((item)=>item.score!==unverified.mahadashaRankings.find((base)=>base.lord===item.lord).score)).toBe(true);
  });
});
