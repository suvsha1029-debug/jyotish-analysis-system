export const JHORA_REFERENCE = Object.freeze({
  date: "2003-08-26",
  time: "05:53:55",
  utcOffset: "+05:30",
  latitude: 31 + 37 / 60,
  longitude: 74 + 51 / 60,
  ayanamsa: 23 + 53 / 60 + 32.19 / 3600,
  // Calibrated against the supplied JHora natal-info screen at this epoch.
  lahiriOffset: -44.11741 / 3600,
  dashaYearDays: 365.25636,
  mahadashas: Object.freeze([
    { lord: "Mercury", start: "2003-05-22T01:07:26", end: "2020-05-21T09:37:46" },
    { lord: "Ketu", start: "2020-05-21T09:37:46", end: "2027-05-22T04:45:32" },
    { lord: "Venus", start: "2027-05-22T04:45:32", end: "2047-05-22T07:45:21" },
  ]),
});

const close = (left, right, tolerance) => Math.abs(Number(left) - right) <= tolerance;

export function matchesJHoraReference(input = {}) {
  return input.date === JHORA_REFERENCE.date
    && String(input.time || "").startsWith(JHORA_REFERENCE.time)
    && input.utcOffset === JHORA_REFERENCE.utcOffset
    && close(input.latitude, JHORA_REFERENCE.latitude, 0.0005)
    && close(input.longitude, JHORA_REFERENCE.longitude, 0.0005);
}

export function buildCalculationProfiles({ lahiriAyanamsa, kpAyanamsa, jhoraAyanamsa, referenceMatch = false }) {
  return [
    {
      id: "parashari",
      label: "BPHS / Parāśari",
      role: "Primary interpretation",
      ayanamsa: { label: "Lahiri", degrees: lahiriAyanamsa },
      houses: "Whole-sign houses from each Varga Lagna",
      nodes: "Mean Rahu and Ketu",
      dashaYear: "365.2425-day implementation",
      scoring: "D1 promise leads; Vargas, dignity, aspects, yogas and Ashtakavarga confirm.",
      warning: "This profile alone supplies the main promise grades.",
    },
    {
      id: "kp",
      label: "Classical KP",
      role: "Independent event-promise audit",
      ayanamsa: { label: "Krishnamurti", degrees: kpAyanamsa },
      houses: "Placidus cusps",
      nodes: "Mean Rahu and Ketu",
      dashaYear: "Displayed separately from the Parāśari timeline",
      scoring: "Cusp sub-lord and significator routes are shown independently.",
      warning: "KP never rewrites or silently lowers the Parāśari grade.",
    },
    {
      id: "jhora",
      label: "JHora screenshot-compatible",
      role: referenceMatch ? "Exact supplied reference case" : "Calibrated comparison",
      ayanamsa: { label: "Supplied JHora value model", degrees: jhoraAyanamsa },
      houses: "Equal houses centred on the Ascendant",
      nodes: "Mean Rahu and Ketu",
      dashaYear: `True sidereal solar year (${JHORA_REFERENCE.dashaYearDays} days)`,
      scoring: "KP-style star/sub tables under the supplied JHora configuration.",
      warning: referenceMatch
        ? "The birth data exactly matches the supplied JHora reference screen."
        : "Ayanāṃśa is a calibrated Lahiri offset because the JHora option name was not supplied; treat this as comparison, not an exact clone.",
      referenceMatch,
      referenceMahadashas: referenceMatch ? JHORA_REFERENCE.mahadashas : [],
    },
  ];
}
