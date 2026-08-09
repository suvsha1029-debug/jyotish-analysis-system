import { describe, expect, it } from "vitest";
import { buildPanchanga, nakshatraFor } from "../src/panchanga-engine.js";

describe("nakshatra calculations",()=>{
  it("calculates nakshatra, pada, lord and navamsa",()=>{
    expect(nakshatraFor(0)).toMatchObject({name:"Ashwini",pada:1,lord:"Ketu",navamsaSign:"Aries"});
    expect(nakshatraFor(13.5)).toMatchObject({name:"Bharani",pada:1,lord:"Venus"});
    expect(nakshatraFor(359.9)).toMatchObject({name:"Revati",pada:4,lord:"Mercury",navamsaSign:"Pisces"});
  });
});

describe("solar Panchanga context",()=>{
  it("uses the operative sunrise for Hora and special Lagnas",()=>{
    const positions={Moon:{longitude:106.848},Asc:{longitude:125.846},Sun:{longitude:128.477}};
    const solarEvents={
      previous:{sunrise:{utc:"2003-08-25T00:31:00.000Z",siderealSunLongitude:127.5},sunset:{utc:"2003-08-25T13:24:00.000Z",siderealSunLongitude:128}},
      current:{sunrise:{utc:"2003-08-26T00:32:00.000Z",siderealSunLongitude:128.48},sunset:{utc:"2003-08-26T13:23:00.000Z",siderealSunLongitude:129}},
      next:{sunrise:{utc:"2003-08-27T00:33:00.000Z",siderealSunLongitude:129.45},sunset:{utc:"2003-08-27T13:22:00.000Z",siderealSunLongitude:130}},
    };
    const result=buildPanchanga({positions,birthUtc:new Date("2003-08-26T00:53:34.000Z"),localDate:"2003-08-26",solarEvents});
    expect(result.solar.operativeWindow.phase).toBe("Daylight");
    expect(result.birthNakshatra.name).toBe("Ashlesha");
    expect(result.hora).toMatchObject({phase:"day",number:1,lord:"Mars"});
    expect(result.specialLagnas.bhavaLagna).toBeGreaterThan(128.48);
  });
});
