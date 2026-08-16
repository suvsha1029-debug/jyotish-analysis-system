import {
  CalculationFlag, HouseSystem, LunarPoint, Planet, SiderealMode,
  RiseTransitFlag, calculateHouses, calculatePosition, calculateRiseTransitSet,
  dateToJulianDay, getAyanamsaExUt, julianDayToDate, setSiderealMode,
} from "@swisseph/node";
import { normalizeLongitude } from "../src/varga-engine.js";
import { JHORA_REFERENCE } from "../src/calculation-profiles.js";

const PLANETS = Object.freeze({
  Sun: Planet.Sun, Moon: Planet.Moon, Mars: Planet.Mars, Mercury: Planet.Mercury,
  Jupiter: Planet.Jupiter, Venus: Planet.Venus, Saturn: Planet.Saturn, Rahu: LunarPoint.MeanNode,
});

function shiftedPositions(positions, longitudeShift) {
  return Object.fromEntries(Object.entries(positions).map(([name, position]) => [name, {
    ...position,
    longitude: normalizeLongitude(position.longitude + longitudeShift),
  }]));
}

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
    const jhoraAyanamsa = ayanamsa + JHORA_REFERENCE.lahiriOffset;
    const jhoraPositions = shiftedPositions(positions, ayanamsa - jhoraAyanamsa);
    const jhoraCusps = Array.from({ length: 12 }, (_, index) => normalizeLongitude(jhoraPositions.Asc.longitude + index * 30));
    setSiderealMode(SiderealMode.Krishnamurti);
    const kpAyanamsa = getAyanamsaExUt(jd, CalculationFlag.MoshierEphemeris);
    const kpPositions = {};
    for (const [name, body] of Object.entries(PLANETS)) {
      const result = calculatePosition(jd, body, flags);
      kpPositions[name] = { longitude:normalizeLongitude(result.longitude), retrograde:result.longitudeSpeed < 0 };
    }
    kpPositions.Ketu = { longitude:normalizeLongitude(kpPositions.Rahu.longitude + 180), retrograde:true };
    kpPositions.Asc = { longitude:normalizeLongitude(houses.ascendant - kpAyanamsa), retrograde:false };
    const kp = { ayanamsa:kpAyanamsa, positions:kpPositions, cusps:houses.cusps.slice(1).map((cusp)=>normalizeLongitude(cusp-kpAyanamsa)) };
    const jhora = { ayanamsa:jhoraAyanamsa, positions:jhoraPositions, cusps:jhoraCusps };
    setSiderealMode(SiderealMode.Lahiri);
    const solarEvents = localMidnightUtc ? this.calculateSolarEvents({ localMidnightUtc, latitude, longitude, altitude, flags }) : null;
    return { jd, positions, solarEvents, kp, jhora, lahiriAyanamsa:ayanamsa };
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
