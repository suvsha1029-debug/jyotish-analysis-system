import { describe, expect, it } from "vitest";
import {
  VARGAS,
  buildCharts,
  calculateChart,
  formatDegrees,
  normalizeLongitude,
  parseBirthDateTime,
  shashtiamsaAmsha,
  signDegree,
  vargaSign,
} from "../src/varga-engine.js";

const PYTHON_FIXTURE = Object.freeze({
  jd: 2452877.516365741,
  positions: {
    Sun: { longitude: 128.47695043276636, retrograde: false },
    Moon: { longitude: 106.84813314245234, retrograde: false },
    Mars: { longitude: 311.8452685588157, retrograde: true },
    Mercury: { longitude: 152.11652453755948, retrograde: false },
    Jupiter: { longitude: 125.79527876543033, retrograde: false },
    Venus: { longitude: 130.47217042028643, retrograde: false },
    Saturn: { longitude: 76.1566931492468, retrograde: false },
    Rahu: { longitude: 30.574703505709795, retrograde: true },
    Ketu: { longitude: 210.5747035057098, retrograde: true },
    Asc: { longitude: 125.84606731008604, retrograde: false },
  },
});

describe("coordinate helpers", () => {
  it("normalizes longitudes in either direction", () => {
    expect(normalizeLongitude(-1)).toBe(359);
    expect(normalizeLongitude(721)).toBe(1);
    expect(signDegree(359.5)).toEqual({ sign: 11, degree: 29.5 });
  });

  it("formats degree rollover correctly", () => {
    expect(formatDegrees(29.9999999)).toBe("30°00′00″ Aries");
    expect(formatDegrees(30)).toBe("00°00′00″ Taurus");
  });
});

describe("varga mappings", () => {
  it("supports exactly the same vargas as the Python engine", () => {
    expect(Object.keys(VARGAS)).toEqual(["D1", "D2", "D3", "D4", "D5", "D9", "D10", "D11", "D12", "D16", "D24", "D60"]);
  });

  it.each([
    ["D1", 0, 0], ["D1", 359.999, 11],
    ["D2", 10, 4], ["D2", 20, 3], ["D2", 40, 3], ["D2", 50, 4],
    ["D3", 9.999, 0], ["D3", 10, 4], ["D3", 20, 8], ["D3", 40, 5],
    ["D4", 7.499, 0], ["D4", 7.5, 3], ["D4", 29.999, 9],
    ["D5", 0, 0], ["D5", 6, 10], ["D5", 29.999, 6],
    ["D5", 30, 1], ["D5", 36, 5], ["D5", 59.999, 7],
    ["D9", 0, 0], ["D9", 29.999, 8], ["D9", 30, 9],
    ["D10", 29.999, 9], ["D10", 30, 9],
    ["D11", 0, 0], ["D11", 29.999, 10], ["D11", 30, 11],
    ["D11", 71, 2], ["D11", 229, 11],
    ["D12", 29.999, 11], ["D12", 30, 1],
    ["D16", 0, 0], ["D16", 1.875, 1], ["D16", 29.999, 3],
    ["D16", 30, 4], ["D16", 60, 8],
    ["D24", 0, 4], ["D24", 29.999, 3], ["D24", 30, 3],
    ["D60", 0, 0], ["D60", 29.999, 11], ["D60", 30, 1],
  ])("maps %s longitude %f to sign %i", (varga, longitude, expected) => {
    expect(vargaSign(longitude, varga)).toBe(expected);
  });

  it("rejects an unknown varga", () => {
    expect(() => vargaSign(0, "D99")).toThrow("Unsupported varga");
  });
});

describe("birth time parsing and validation", () => {
  it("converts positive and negative fixed offsets to UTC", () => {
    expect(parseBirthDateTime("2003-08-26", "05:53:34", "+05:30").toISOString())
      .toBe("2003-08-26T00:23:34.000Z");
    expect(parseBirthDateTime("1985-06-15", "23:45:00", "-04:00").toISOString())
      .toBe("1985-06-16T03:45:00.000Z");
  });

  it.each([
    ["2023-02-29", "12:00", "+00:00"],
    ["2024-01-01", "24:00", "+00:00"],
    ["2024-01-01", "12:00", "+14:01"],
    ["2024-01-01", "12:00", "05:30"],
  ])("rejects invalid input %s %s %s", (date, time, offset) => {
    expect(() => parseBirthDateTime(date, time, offset)).toThrow();
  });
});

describe("chart construction", () => {
  it("matches the Python Swiss Ephemeris fixture", async () => {
    const ephemeris = { calculate: async () => PYTHON_FIXTURE };
    const result = await calculateChart({
      date: "2003-08-26", time: "05:53:34", utcOffset: "+05:30",
      latitude: 31.634, longitude: 74.8723,
    }, ephemeris);
    expect(result.jd).toBe(PYTHON_FIXTURE.jd);
    expect(Object.fromEntries(Object.entries(result.charts).map(([code, chart]) => [code, chart.ascSign])))
      .toEqual({
        D1: "Leo", D2: "Leo", D3: "Leo", D4: "Leo", D5: "Aries", D9: "Taurus",
        D10: "Virgo", D11: "Aquarius", D12: "Libra", D16: "Scorpio",
        D24: "Sagittarius", D60: "Cancer",
      });
    expect(result.positions.Mars.display).toBe("11°50′43″ Aquarius");
    expect(result.charts.D1.rows).toHaveLength(12);
    expect(result.charts.D1.rows[0].house).toBe(1);
    expect(result.charts.D1.rows.flatMap((row) => row.bodies)).toHaveLength(10);
  });

  it("validates coordinates before calling the adapter", async () => {
    const ephemeris = { calculate: async () => { throw new Error("must not run"); } };
    await expect(calculateChart({ date: "2024-01-01", time: "12:00", utcOffset: "+00:00", latitude: 91, longitude: 0 }, ephemeris))
      .rejects.toThrow("Latitude");
  });

  it("requires all ten chart bodies", () => {
    expect(() => buildCharts({ Sun: { longitude: 0 } })).toThrow("Missing position: Moon");
  });

  it("assigns BPHS D60 amshas forward in odd signs and reverse in even signs", () => {
    expect(shashtiamsaAmsha(1.1)).toMatchObject({ number:3, name:"Deva", nature:"Benefic" });
    expect(shashtiamsaAmsha(31.1)).toMatchObject({ number:58, name:"Payodhi", nature:"Benefic" });
    expect(shashtiamsaAmsha(0.1).name).toBe("Ghora");
  });
});
