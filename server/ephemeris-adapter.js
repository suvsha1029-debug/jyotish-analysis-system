import {
  CalculationFlag, HouseSystem, LunarPoint, Planet, SiderealMode,
  RiseTransitFlag, calculateHouses, calculatePosition, calculateRiseTransitSet,
  dateToJulianDay, getAyanamsaExUt, julianDayToDate, setSiderealMode,
} from "@swisseph/node";
import { normalizeLongitude } from "../src/varga-engine.js";

const PLANETS = Object.freeze({
  Sun: Planet.Sun, Moon: Planet.Moon, Mars: Planet.Mars, Mercury: Planet.Mercury,
  Jupiter: Planet.Jupiter, Venus: Planet.Venus, Saturn: Planet.Saturn, Rahu: LunarPoint.MeanNode,
});

export class ServerSwissEphemerisAdapter {
  constructor() { setSiderealMode(SiderealMode.Lahiri); }
  async calculate({ utcDate, latitude, longitude, localMidnightUtc, altitude = 0 }) {
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
    const solarEvents = localMidnightUtc ? this.calculateSolarEvents({ localMidnightUtc, latitude, longitude, altitude, flags }) : null;
    return { jd, positions, solarEvents };
  }

  calculateSolarEvents({ localMidnightUtc, latitude, longitude, altitude, flags }) {
    const baseJd = dateToJulianDay(localMidnightUtc);
    const calculateEvent = (startJd, eventType) => {
      const event = calculateRiseTransitSet(startJd, Planet.Sun, eventType, longitude, latitude, altitude, flags, 1013.25, 15);
      const sun = calculatePosition(event.time, Planet.Sun, flags);
      return {
        utc: julianDayToDate(event.time).toISOString(),
        jd: event.time,
        siderealSunLongitude: normalizeLongitude(sun.longitude),
      };
    };
    const day = (offset) => ({
      sunrise: calculateEvent(baseJd + offset, RiseTransitFlag.Rise),
      sunset: calculateEvent(baseJd + offset, RiseTransitFlag.Set),
    });
    return {
      previous: day(-1), current: day(0), next: day(1),
      assumptions: { altitudeMeters: altitude, pressureHpa: 1013.25, temperatureC: 15, horizon: "Swiss Ephemeris apparent rise/set" },
    };
  }
}
