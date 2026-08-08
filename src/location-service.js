import tzlookup from "tz-lookup";

export function timezoneForCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError("Invalid latitude.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError("Invalid longitude.");
  return tzlookup(lat, lon);
}

function offsetAtUtc(timeZone, utcMilliseconds) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMilliseconds));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const representedAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  return Math.round((representedAsUtc - utcMilliseconds) / 60_000);
}

export function historicalUtcOffset(timeZone, date, time) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dateMatch || !timeMatch) throw new RangeError("Enter a valid date and time first.");
  const localMilliseconds = Date.UTC(
    Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]),
    Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3] ?? 0),
  );
  let utcGuess = localMilliseconds;
  for (let index = 0; index < 3; index += 1) {
    const minutes = offsetAtUtc(timeZone, utcGuess);
    utcGuess = localMilliseconds - minutes * 60_000;
  }
  const minutes = offsetAtUtc(timeZone, utcGuess);
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

export async function searchLocations(query, fetchImpl = fetch) {
  const normalized = query.trim();
  if (normalized.length < 2) throw new RangeError("Enter at least two characters for location search.");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", normalized);
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  const response = await fetchImpl(url, { headers: { Accept: "application/json", "Accept-Language": "en" } });
  if (!response.ok) throw new Error("Location service is temporarily unavailable.");
  return (await response.json()).map((item) => ({
    name: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  }));
}
