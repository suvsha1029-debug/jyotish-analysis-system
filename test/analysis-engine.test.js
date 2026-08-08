import { describe,expect,it } from "vitest";
import { buildCharts } from "../src/varga-engine.js";
import { buildStructuralAnalysis, calculateAshtakavarga, debilitationCancellation, dignityFor, functionalNature } from "../src/analysis-engine.js";

const raw={Sun:{longitude:128.476},Moon:{longitude:106.848},Mars:{longitude:311.845,retrograde:true},Mercury:{longitude:152.116},Jupiter:{longitude:125.795},Venus:{longitude:130.472},Saturn:{longitude:76.156},Rahu:{longitude:30.574},Ketu:{longitude:210.574},Asc:{longitude:125.846}};
const result={...buildCharts(raw),utc:"2003-08-26T00:23:34.000Z"};

describe("structural engine",()=>{
  it("classifies classical dignity",()=>{ expect(dignityFor("Sun",128)).toBe("Own sign"); expect(dignityFor("Mercury",152)).toBe("Exalted"); });
  it("builds seven BAV rows and a 337-point SAV",()=>{ const av=calculateAshtakavarga(result.positions); expect(Object.keys(av.bav)).toHaveLength(7); expect(av.total).toBe(337); });
  it("builds lords, aspects, arudhas, yogas and node chains",()=>{ const a=buildStructuralAnalysis(result); expect(a.planets.Mercury.housesOwned).toEqual([2,11]); expect(a.aspects.length).toBeGreaterThan(8); expect(a.arudhas).toHaveProperty("AL"); expect(a.nodes[0].signDispositor).toBe("Venus"); expect(a.yogas.length).toBeGreaterThan(0); });
  it("classifies functional roles from ascendant lordship",()=>{ expect(functionalNature(result,"Mars").code).toBe("FB"); expect(functionalNature(result,"Mercury").code).toBe("FM"); });
  it("records explicit debilitation-cancellation conditions",()=>{ const altered={...raw,Asc:{longitude:5},Jupiter:{longitude:275},Saturn:{longitude:5},Moon:{longitude:40}}; const chart={...buildCharts(altered)}; const cancellation=debilitationCancellation(chart,"Jupiter"); expect(cancellation.applicable).toBe(true); expect(cancellation.cancelled).toBe(true); expect(cancellation.conditions.length).toBeGreaterThan(0); });
});
