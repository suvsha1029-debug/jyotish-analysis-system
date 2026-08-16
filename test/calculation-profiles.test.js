import { describe, expect, it } from "vitest";
import { calculateFullChart } from "../server/chart-service.js";
import { JHORA_REFERENCE, matchesJHoraReference } from "../src/calculation-profiles.js";

const suppliedCase={
  date:"2003-08-26",time:"05:53:55",utcOffset:"+05:30",
  latitude:31+37/60,longitude:74+51/60,altitude:0,d60Verified:true,
};

describe("separated calculation profiles",()=>{
  it("recognizes only the supplied JHora reference input",()=>{
    expect(matchesJHoraReference(suppliedCase)).toBe(true);
    expect(matchesJHoraReference({...suppliedCase,time:"05:53:38"})).toBe(false);
  });

  it("reproduces the supplied ayanamsa and equal-house Ascendant without blending grades",async()=>{
    const result=await calculateFullChart(suppliedCase,{includeSensitivity:false});
    const profiles=Object.fromEntries(result.calculationProfiles.map((profile)=>[profile.id,profile]));
    expect(profiles.parashari.houses).toContain("Whole-sign");
    expect(profiles.kp.houses).toContain("Placidus");
    expect(profiles.jhora.referenceMatch).toBe(true);
    expect(profiles.jhora.ayanamsa.degrees).toBeCloseTo(JHORA_REFERENCE.ayanamsa,7);
    expect(result.jhora.houseSystem).toContain("Equal houses");
    expect(result.jhora.cusps[0].longitude).toBeCloseTo(125.90949,4);
    expect(result.jhora.planets.Moon).toMatchObject({nakshatra:"Ashlesha",starLord:"Mercury",subLord:"Mercury"});
    expect(result.prediction.domains.overview.systemComparison.combined).toBe(false);
    expect(result.prediction.domains.overview.dimensions.promise).toBe(result.prediction.domains.overview.confirmation.label);
  });
});
