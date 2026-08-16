import { describe, expect, it } from "vitest";
import { addKPTiming, buildKPAnalysis, kpDivision, placidusHouse } from "../src/kp-engine.js";

describe("KP calculation layer",()=>{
  it("uses Vimshottari-proportional subs beginning with the star lord",()=>{
    expect(kpDivision(0)).toMatchObject({nakshatra:"Ashwini",starLord:"Ketu",subLord:"Ketu"});
    expect(kpDivision(1)).toMatchObject({nakshatra:"Ashwini",starLord:"Ketu",subLord:"Venus"});
    expect(kpDivision(13.5)).toMatchObject({nakshatra:"Bharani",starLord:"Venus",subLord:"Venus"});
  });
  it("assigns planets through unequal cusp arcs including the zodiac wrap",()=>{
    const cusps=[350,20,50,80,110,140,170,200,230,260,290,320];
    expect(placidusHouse(5,cusps)).toBe(1);
    expect(placidusHouse(75,cusps)).toBe(3);
    expect(placidusHouse(340,cusps)).toBe(12);
  });
  it("keeps natal promise and current timing as separate KP findings",()=>{
    const cusps=Array.from({length:12},(_,index)=>index*30);
    const degrees={Sun:125,Moon:106,Mars:311,Mercury:152,Jupiter:126,Venus:130,Saturn:76,Rahu:30,Ketu:210,Asc:0};
    const raw={ayanamsa:23.8,cusps,positions:Object.fromEntries(Object.entries(degrees).map(([name,longitude])=>[name,{longitude,retrograde:false}]))};
    const kp=buildKPAnalysis(raw);
    expect(kp.system).toContain("Placidus");
    expect(kp.cusps).toHaveLength(12);
    expect(kp.planets.Mercury.signifiedHouses.length).toBeGreaterThan(0);
    expect(Object.keys(kp.domains)).toContain("foreign");
    expect(kp.domains.money.facets.map((item)=>item.key)).toEqual(["accumulation","gains","careerIncome","businessIncome"]);
    const timed=addKPTiming(kp,{mdLord:"Venus",adLord:"Mercury"});
    expect(timed.domains.money.timing.controllers).toHaveLength(2);
    expect(["Good","Moderate","Low"]).toContain(timed.domains.money.timing.level);
  });
});
