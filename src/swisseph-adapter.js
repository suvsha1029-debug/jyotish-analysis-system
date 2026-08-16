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
import { JHORA_REFERENCE } from "./calculation-profiles.js";

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

function shiftedPositions(positions, longitudeShift) {
  return Object.fromEntries(Object.entries(positions).map(([name, position]) => [name, {
    ...position,
    longitude: normalizeLongitude(position.longitude + longitudeShift),
  }]));
}

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
    const jhoraAyanamsa = ayanamsa + JHORA_REFERENCE.lahiriOffset;
    const jhoraPositions = shiftedPositions(positions, ayanamsa - jhoraAyanamsa);
    const jhoraCusps = Array.from({ length: 12 }, (_, index) => normalizeLongitude(jhoraPositions.Asc.longitude + index * 30));
    this.swe.setSiderealMode(SiderealMode.Krishnamurti);
    const kpAyanamsa = this.swe.getAyanamsaExUt(jd, CalculationFlag.MoshierEphemeris);
    const kpPositions = {};
    for (const [name, body] of Object.entries(PLANETS)) {
      const result = this.swe.calculatePosition(jd, body, flags);
      kpPositions[name] = { longitude:normalizeLongitude(result.longitude), retrograde:result.longitudeSpeed < 0 };
    }
    kpPositions.Ketu = { longitude:normalizeLongitude(kpPositions.Rahu.longitude + 180), retrograde:true };
    kpPositions.Asc = { longitude:normalizeLongitude(houses.ascendant - kpAyanamsa), retrograde:false };
    const kp = { ayanamsa:kpAyanamsa, positions:kpPositions, cusps:houses.cusps.slice(1).map((cusp)=>normalizeLongitude(cusp-kpAyanamsa)) };
    const jhora = { ayanamsa:jhoraAyanamsa, positions:jhoraPositions, cusps:jhoraCusps };
    this.swe.setSiderealMode(SiderealMode.Lahiri);
    return { jd, positions, kp, jhora, lahiriAyanamsa:ayanamsa };
  }
}
