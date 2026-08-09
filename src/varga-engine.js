export const SIGNS = Object.freeze([
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]);
import { buildPanchanga } from "./panchanga-engine.js";

export const VARGAS = Object.freeze({
  D1: "Rāśi",
  D2: "Horā",
  D3: "Drekkāṇa",
  D4: "Chaturthāṃśa",
  D5: "Pañcāṃśa",
  D9: "Navāṃśa",
  D10: "Daśāṃśa",
  D11: "Rudrāṃśa / Ekādaśāṃśa",
  D12: "Dvādaśāṃśa",
  D16: "Ṣoḍaśāṃśa / Kalāṃśa",
  D24: "Chaturviṃśāṃśa / Siddhāṃśa",
  D60: "Ṣaṣṭiāṃśa",
});

const BODY_ORDER = Object.freeze([
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
  "Rahu", "Ketu", "Asc",
]);

const D60_NAMES = [
  "Ghora","Rakshasa","Deva","Kubera","Yaksha","Kinnara","Bhrashta","Kulaghna","Garala","Vahni","Maya","Purishaka","Apampathi","Marut","Kala","Sarpa","Amrita","Indu","Mridu","Komala","Heramba","Brahma","Vishnu","Maheswara","Deva","Ardra","Kalinasa","Kshiteesa","Kamalakara","Gulika","Mrityu","Kaala","Davagni","Ghora","Yama","Kantaka","Sudha","Amrita","Purnachandra","Vishadagdha","Kulanasa","Vamsakshaya","Utpata","Kaala","Saumya","Komala","Seetala","Karala Damshtra","Chandramukhi","Praveena","Kalapavaka","Dandayudha","Nirmala","Saumya","Kroora","Atiseetala","Amrita","Payodhi","Bhramana","Chandrarekha",
];
const D60_MALEFIC = new Set([1,2,7,8,9,10,11,12,15,16,30,31,32,33,34,35,36,40,41,42,43,44,48,51,52,55,59]);
const D60_NOTABLE = new Set([3,4,5,17,21,22,23,24,25,37,38,39,45,49,53,54,57,60]);

export function shashtiamsaAmsha(longitude) {
  const { sign, degree } = signDegree(longitude);
  const forwardIndex = Math.min(59, Math.floor(degree / 0.5));
  const number = sign % 2 === 0 ? forwardIndex + 1 : 60 - forwardIndex;
  return {
    number,
    name:D60_NAMES[number - 1],
    nature:D60_MALEFIC.has(number) ? "Malefic" : "Benefic",
    emphasis:D60_NOTABLE.has(number) ? "Major benefic amsha" : "Supporting amsha",
    note:number === 27 ? "This edition marks Kalinasa benefic while noting that some authorities classify it as malefic." : "BPHS Shashtiamsa name and nature.",
  };
}

export function normalizeLongitude(value) {
  if (!Number.isFinite(value)) throw new TypeError("Longitude must be a finite number.");
  return ((value % 360) + 360) % 360;
}

export function signDegree(longitude) {
  const normalized = normalizeLongitude(longitude);
  return { sign: Math.floor(normalized / 30), degree: normalized % 30 };
}

function nthFrom(sign, n) {
  return (sign + n - 1) % 12;
}

export function vargaSign(longitude, varga) {
  const { sign, degree } = signDegree(longitude);

  if (varga === "D1") return sign;
  if (varga === "D2") {
    const firstHalf = degree < 15;
    const oddSign = sign % 2 === 0;
    return oddSign ? (firstHalf ? 4 : 3) : (firstHalf ? 3 : 4);
  }
  if (varga === "D3") {
    const part = Math.min(Math.floor(degree / 10), 2);
    return nthFrom(sign, [1, 5, 9][part]);
  }
  if (varga === "D4") {
    const part = Math.min(Math.floor(degree / 7.5), 3);
    return nthFrom(sign, [1, 4, 7, 10][part]);
  }
  if (varga === "D5") {
    const part = Math.min(Math.floor(degree / 6), 4);
    const oddSequence = [0, 10, 8, 2, 6];
    const evenSequence = [1, 5, 11, 9, 7];
    return (sign % 2 === 0 ? oddSequence : evenSequence)[part];
  }
  if (varga === "D9") {
    const part = Math.min(Math.floor(degree / (30 / 9)), 8);
    return ([0, 9, 6, 3][sign % 4] + part) % 12;
  }
  if (varga === "D10") {
    const part = Math.min(Math.floor(degree / 3), 9);
    const start = sign % 2 === 0 ? sign : nthFrom(sign, 9);
    return (start + part) % 12;
  }
  if (varga === "D11") {
    const part = Math.min(Math.floor(degree / (30 / 11)), 10);
    const start = (12 - sign) % 12;
    return (start + part) % 12;
  }
  if (varga === "D12") {
    return (sign + Math.min(Math.floor(degree / 2.5), 11)) % 12;
  }
  if (varga === "D16") {
    const part = Math.min(Math.floor(degree / 1.875), 15);
    const start = [0, 4, 8][sign % 3];
    return (start + part) % 12;
  }
  if (varga === "D24") {
    const part = Math.min(Math.floor(degree / 1.25), 23);
    const start = sign % 2 === 0 ? 4 : 3;
    return (start + part) % 12;
  }
  if (varga === "D60") {
    return (sign + Math.min(Math.floor(degree / 0.5), 59)) % 12;
  }
  throw new RangeError(`Unsupported varga: ${varga}`);
}

export function formatDegrees(longitude) {
  const { sign, degree } = signDegree(longitude);
  let degrees = Math.floor(degree);
  const minutesFloat = (degree - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 60);
  if (seconds === 60) { seconds = 0; minutes += 1; }
  if (minutes === 60) { minutes = 0; degrees += 1; }
  return `${String(degrees).padStart(2, "0")}°${String(minutes).padStart(2, "0")}′${String(seconds).padStart(2, "0")}″ ${SIGNS[sign]}`;
}

export function parseBirthDateTime(date, time, utcOffset) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  const offsetMatch = /^([+-])(\d{2}):(\d{2})$/.exec(utcOffset);
  if (!dateMatch) throw new RangeError("Date must use YYYY-MM-DD.");
  if (!timeMatch) throw new RangeError("Time must use HH:MM or HH:MM:SS.");
  if (!offsetMatch) throw new RangeError("UTC offset must use +05:30 or -04:00.");

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText, secondText = "0"] = timeMatch;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  const offsetHour = Number(offsetMatch[2]), offsetMinute = Number(offsetMatch[3]);
  if (hour > 23 || minute > 59 || second > 59) throw new RangeError("Birth time is outside the valid clock range.");
  if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
    throw new RangeError("UTC offset must be between -14:00 and +14:00.");
  }
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (calendarCheck.getUTCFullYear() !== year || calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) {
    throw new RangeError("Birth date is not a valid calendar date.");
  }
  const sign = offsetMatch[1] === "+" ? 1 : -1;
  const offsetMilliseconds = sign * (offsetHour * 60 + offsetMinute) * 60_000;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offsetMilliseconds);
}

function validateCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError("Latitude must be between -90 and 90 degrees.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError("Longitude must be between -180 and 180 degrees.");
  }
}

export function buildCharts(rawPositions) {
  const positions = {};
  for (const name of BODY_ORDER) {
    const body = rawPositions[name];
    if (!body || !Number.isFinite(body.longitude)) throw new TypeError(`Missing position: ${name}`);
    const longitude = normalizeLongitude(body.longitude);
    positions[name] = {
      longitude,
      display: formatDegrees(longitude),
      retrograde: Boolean(body.retrograde),
    };
  }

  const charts = {};
  for (const [code, name] of Object.entries(VARGAS)) {
    const houses = Array.from({ length: 12 }, () => []);
    const bodyDetails = Array.from({ length: 12 }, () => []);
    const ascSign = vargaSign(positions.Asc.longitude, code);
    const division = Number(code.slice(1));
    for (const [bodyName, body] of Object.entries(positions)) {
      const sign = vargaSign(body.longitude, code);
      const marker = body.retrograde && !["Rahu", "Ketu"].includes(bodyName) ? " ℞" : "";
      houses[sign].push(bodyName === "Asc" ? "Asc" : bodyName + marker);
      bodyDetails[sign].push({
        name: bodyName,
        label: bodyName === "Asc" ? "Asc" : bodyName + marker,
        degree: `${(((body.longitude % 30) * division) % 30).toFixed(2).padStart(5, "0")}°`,
      });
      if (code === "D60") bodyDetails[sign][bodyDetails[sign].length - 1].amsha = shashtiamsaAmsha(body.longitude);
    }
    charts[code] = {
      name,
      ascSign: SIGNS[ascSign],
      rows: SIGNS.map((signName, sign) => ({
        sign: signName,
        house: ((sign - ascSign + 12) % 12) + 1,
        bodies: houses[sign],
        bodyDetails: bodyDetails[sign],
      })).sort((a, b) => a.house - b.house),
    };
  }
  return { positions, charts };
}

export async function calculateChart(input, ephemeris) {
  if (!ephemeris || typeof ephemeris.calculate !== "function") {
    throw new TypeError("An initialized ephemeris adapter is required.");
  }
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  validateCoordinates(latitude, longitude);
  const utcDate = parseBirthDateTime(input.date, input.time, input.utcOffset);
  const localMidnightUtc = parseBirthDateTime(input.date, "00:00:00", input.utcOffset);
  const astronomical = await ephemeris.calculate({ utcDate, latitude, longitude, localMidnightUtc, altitude:Number(input.altitude || 0) });
  const built = buildCharts(astronomical.positions);
  const panchanga = buildPanchanga({ positions:built.positions, birthUtc:utcDate, localDate:input.date, solarEvents:astronomical.solarEvents });
  return {
    local: `${input.date}T${input.time}${input.utcOffset}`,
    utc: utcDate.toISOString(),
    jd: astronomical.jd,
    location: { latitude, longitude, altitude:Number(input.altitude || 0) },
    panchanga,
    ...built,
  };
}
