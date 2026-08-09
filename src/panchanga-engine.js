const SIGNS = Object.freeze(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]);
function normalizeLongitude(value) { return ((value % 360) + 360) % 360; }
function navamsaSign(longitude) {
  const normalized = normalizeLongitude(longitude);
  const sign = Math.floor(normalized / 30);
  const degree = normalized % 30;
  const part = Math.min(Math.floor(degree / (30 / 9)), 8);
  return ([0, 9, 6, 3][sign % 4] + part) % 12;
}

export const NAKSHATRAS = Object.freeze([
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
  "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
  "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]);

const NAKSHATRA_LORDS = Object.freeze([
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
]);
const WEEKDAY_LORDS = Object.freeze(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]);
const HORA_SEQUENCE = Object.freeze(["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]);
const SEGMENT = 360 / 27;

export function nakshatraFor(longitude) {
  const normalized = normalizeLongitude(longitude);
  const index = Math.min(26, Math.floor(normalized / SEGMENT));
  const within = normalized - index * SEGMENT;
  const pada = Math.min(4, Math.floor(within / (SEGMENT / 4)) + 1);
  return {
    index: index + 1,
    name: NAKSHATRAS[index],
    lord: NAKSHATRA_LORDS[index % 9],
    pada,
    progressPercent: Number((within / SEGMENT * 100).toFixed(2)),
    degreesElapsed: Number(within.toFixed(6)),
    degreesRemaining: Number((SEGMENT - within).toFixed(6)),
    navamsaSign: SIGNS[navamsaSign(normalized)],
  };
}

function isoToMs(value) { return value ? new Date(value).getTime() : NaN; }

function eventSummary(event) {
  if (!event?.utc) return null;
  return { ...event, utc: new Date(event.utc).toISOString() };
}

function relevantSolarWindow(birthUtc, solarEvents) {
  const birth = birthUtc.getTime();
  const previous = solarEvents?.previous || {};
  const current = solarEvents?.current || {};
  const next = solarEvents?.next || {};
  const currentRise = isoToMs(current.sunrise?.utc);
  const currentSet = isoToMs(current.sunset?.utc);
  if (![currentRise, currentSet].every(Number.isFinite)) return null;
  if (birth < currentRise) {
    return {
      phase: "Night before sunrise",
      sunrise: eventSummary(previous.sunrise),
      sunset: eventSummary(previous.sunset),
      nextBoundary: eventSummary(current.sunrise),
      dayOffset: -1,
    };
  }
  if (birth < currentSet) {
    return {
      phase: "Daylight",
      sunrise: eventSummary(current.sunrise),
      sunset: eventSummary(current.sunset),
      nextBoundary: eventSummary(current.sunset),
      dayOffset: 0,
    };
  }
  return {
    phase: "Night after sunset",
    sunrise: eventSummary(current.sunrise),
    sunset: eventSummary(current.sunset),
    nextBoundary: eventSummary(next.sunrise),
    dayOffset: 0,
  };
}

function horaAtBirth(birthUtc, window, weekday) {
  if (!window?.sunrise || !window?.sunset || !window?.nextBoundary) return null;
  const birth = birthUtc.getTime();
  const rise = isoToMs(window.sunrise.utc);
  const set = isoToMs(window.sunset.utc);
  const next = isoToMs(window.nextBoundary.utc);
  const daylight = window.phase === "Daylight";
  const periodStart = daylight ? rise : set;
  const periodEnd = daylight ? set : next;
  if (![periodStart, periodEnd].every(Number.isFinite) || periodEnd <= periodStart) return null;
  const hourLength = (periodEnd - periodStart) / 12;
  const hourNumber = Math.max(1, Math.min(12, Math.floor((birth - periodStart) / hourLength) + 1));
  const dayLord = WEEKDAY_LORDS[weekday];
  const dayStart = HORA_SEQUENCE.indexOf(dayLord);
  const sequenceOffset = daylight ? hourNumber - 1 : 12 + hourNumber - 1;
  return {
    lord: HORA_SEQUENCE[(dayStart + sequenceOffset) % 7],
    number: hourNumber,
    phase: daylight ? "day" : "night",
    durationMinutes: Number((hourLength / 60000).toFixed(2)),
  };
}

export function buildPanchanga({ positions, birthUtc, localDate, solarEvents }) {
  const nakshatras = Object.fromEntries(Object.entries(positions).map(([body, position]) => [body, nakshatraFor(position.longitude)]));
  const window = relevantSolarWindow(birthUtc, solarEvents);
  const localWeekday = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  const operativeWeekday=(localWeekday+(window?.dayOffset||0)+7)%7;
  const weekdayLord = WEEKDAY_LORDS[operativeWeekday];
  let specialLagnas = null;
  let elapsedGhatis = null;
  if (window?.sunrise?.utc && Number.isFinite(window.sunrise.siderealSunLongitude)) {
    const elapsedHours = (birthUtc.getTime() - isoToMs(window.sunrise.utc)) / 3600000;
    elapsedGhatis = elapsedHours * 2.5;
    const sunAtRise = window.sunrise.siderealSunLongitude;
    specialLagnas = {
      bhavaLagna: normalizeLongitude(sunAtRise + elapsedGhatis * 6),
      horaLagna: normalizeLongitude(sunAtRise + elapsedGhatis * 12),
      ghatiLagna: normalizeLongitude(sunAtRise + elapsedGhatis * 30),
      method: "Sun at the operative sunrise advanced by elapsed ghatis; classical special-Lagna convention.",
    };
  }
  return {
    solar: solarEvents ? { ...solarEvents, operativeWindow: window } : null,
    weekdayLord,
    hora: horaAtBirth(birthUtc, window, operativeWeekday),
    elapsedGhatis: elapsedGhatis === null ? null : Number(elapsedGhatis.toFixed(4)),
    birthNakshatra: nakshatras.Moon,
    ascendantNakshatra: nakshatras.Asc,
    nakshatras,
    specialLagnas,
    limitations: solarEvents ? "Rise/set times are astronomical calculations for the entered coordinates and atmospheric assumptions; terrain and observed horizon can shift visible times." : "Sunrise-dependent values are unavailable from this ephemeris adapter.",
  };
}
