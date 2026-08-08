import {
  CalculationFlag, HouseSystem, LunarPoint, Planet, SiderealMode,
  calculateHouses, calculatePosition, dateToJulianDay, getAyanamsaExUt, setSiderealMode,
} from "@swisseph/node";
import { normalizeLongitude } from "../src/varga-engine.js";

const PLANETS = Object.freeze({
  Sun: Planet.Sun, Moon: Planet.Moon, Mars: Planet.Mars, Mercury: Planet.Mercury,
  Jupiter: Planet.Jupiter, Venus: Planet.Venus, Saturn: Planet.Saturn, Rahu: LunarPoint.MeanNode,
});

export class ServerSwissEphemerisAdapter {
  constructor() { setSiderealMode(SiderealMode.Lahiri); }
  async calculate({ utcDate, latitude, longitude }) {
    const jd = dateToJulianDay(utcDate);
    const flags = CalculationFlag.MoshierEphemeris | CalculationFlag.Sidereal | CalculationFlag.Speed;
    const positions = {};
    for (const [name, body] of Object.entries(PLANETS)) {
      const result = calculatePosition(jd, body, flags);
      positions[name] = { longitude: normalizeLongitude(result.longitude), retrograde: result.longitudeSpeed < 0 };
    }
    positions.Ketu = { longitude: normalizeLongitude(positions.Rahu.longitude + 180), retrograde: true };
    const houses = calculateHouses(jd, latitude, longitude, HouseSystem.Placidus);
    const ayanamsa = getAyanamsaExUt(jd, CalculationFlag.MoshierEphemeris);
    positions.Asc = { longitude: normalizeLongitude(houses.ascendant - ayanamsa), retrograde: false };
    return { jd, positions };
  }
}
