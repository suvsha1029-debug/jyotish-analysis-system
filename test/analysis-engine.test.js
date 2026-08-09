import { describe,expect,it } from "vitest";
import { buildCharts } from "../src/varga-engine.js";
import { buildStructuralAnalysis, calculateAshtakavarga, debilitationCancellation, dignityFor, functionalNature } from "../src/analysis-engine.js";

const raw={Sun:{longitude:128.476},Moon:{longitude:106.848},Mars:{longitude:311.845,retrograde:true},Mercury:{longitude:152.116},Jupiter:{longitude:125.795},Venus:{longitude:130.472},Saturn:{longitude:76.156},Rahu:{longitude:30.574},Ketu:{longitude:210.574},Asc:{longitude:125.846}};
const result={...buildCharts(raw),utc:"2003-08-26T00:23:34.000Z"};

describe("structural engine",()=>{
  it("classifies degree-sensitive classical dignity",()=>{
    expect(dignityFor("Sun",128)).toBe("Moolatrikona");
    expect(dignityFor("Sun",149)).toBe("Own sign");
    expect(dignityFor("Mercury",152)).toBe("Exalted");
    expect(dignityFor("Mercury",167)).toBe("Moolatrikona");
    expect(dignityFor("Mercury",175)).toBe("Own sign");
  });
  it("builds seven BAV rows and a 337-point SAV",()=>{ const av=calculateAshtakavarga(result.positions); expect(Object.keys(av.bav)).toHaveLength(7); expect(av.total).toBe(337); });
  it("builds lords, aspects, arudhas, yogas and node chains",()=>{ const a=buildStructuralAnalysis(result); expect(a.planets.Mercury.housesOwned).toEqual([2,11]); expect(a.aspects.length).toBeGreaterThan(8); expect(a.arudhas).toHaveProperty("AL"); expect(a.nodes[0].signDispositor).toBe("Venus"); expect(a.yogas.length).toBeGreaterThan(0); });
  it("reserves yogakaraka for distinct angular and trinal ownership",()=>{
    expect(functionalNature(result,"Mars")).toMatchObject({code:"FB",yogakaraka:true});
    expect(functionalNature(result,"Sun")).toMatchObject({code:"FB",yogakaraka:false,label:"Functional benefic"});
    expect(functionalNature(result,"Mercury")).toMatchObject({code:"FM",yogakaraka:false});
  });
  it("records explicit debilitation-cancellation conditions",()=>{ const altered={...raw,Asc:{longitude:5},Jupiter:{longitude:275},Saturn:{longitude:5},Moon:{longitude:40}}; const chart={...buildCharts(altered)}; const cancellation=debilitationCancellation(chart,"Jupiter"); expect(cancellation.applicable).toBe(true); expect(cancellation.cancelled).toBe(true); expect(cancellation.conditions.length).toBeGreaterThan(0); });
});
