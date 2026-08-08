import {
  CalculationFlag,
  HouseSystem,
  LunarPoint,
  Planet,
  SiderealMode,
  SwissEphemeris,
} from "@swisseph/browser";
import bundledWasmUrl from "@swisseph/browser/dist/swisseph.wasm?url";
import { normalizeLongitude } from "./varga-engine.js";

const PLANETS = Object.freeze({
  Sun: Planet.Sun,
  Moon: Planet.Moon,
  Mars: Planet.Mars,
  Mercury: Planet.Mercury,
  Jupiter: Planet.Jupiter,
  Venus: Planet.Venus,
  Saturn: Planet.Saturn,
  Rahu: LunarPoint.MeanNode,
});

export class BrowserSwissEphemerisAdapter {
  constructor() {
    this.swe = new SwissEphemeris();
    this.initialized = false;
  }

  async init(wasmPath) {
    if (!this.initialized) {
      await this.swe.init(wasmPath ?? bundledWasmUrl);
      this.swe.setSiderealMode(SiderealMode.Lahiri);
      this.initialized = true;
    }
    return this;
  }

  async calculate({ utcDate, latitude, longitude }) {
    if (!this.initialized) throw new Error("Call adapter.init() before calculating a chart.");
    const jd = this.swe.dateToJulianDay(utcDate);
    const flags = CalculationFlag.MoshierEphemeris | CalculationFlag.Sidereal | CalculationFlag.Speed;
    const positions = {};
    for (const [name, body] of Object.entries(PLANETS)) {
      const result = this.swe.calculatePosition(jd, body, flags);
      positions[name] = {
        longitude: normalizeLongitude(result.longitude),
        retrograde: result.longitudeSpeed < 0,
      };
    }
    positions.Ketu = {
      longitude: normalizeLongitude(positions.Rahu.longitude + 180),
      retrograde: true,
    };

    // calculateHouses returns the tropical angles. An ecliptic longitude is
    // converted to Lahiri sidereal longitude by subtracting the ayanāṃśa.
    const houses = this.swe.calculateHouses(jd, latitude, longitude, HouseSystem.Placidus);
    const ayanamsa = this.swe.getAyanamsaExUt(jd, CalculationFlag.MoshierEphemeris);
    positions.Asc = {
      longitude: normalizeLongitude(houses.ascendant - ayanamsa),
      retrograde: false,
    };
    return { jd, positions };
  }
}
