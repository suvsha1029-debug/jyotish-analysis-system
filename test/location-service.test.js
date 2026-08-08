import { describe, expect, it, vi } from "vitest";
import { historicalUtcOffset, searchLocations, timezoneForCoordinates } from "../src/location-service.js";

describe("location and timezone helpers", () => {
  it("maps coordinates to IANA timezones", () => {
    expect(timezoneForCoordinates(31.634, 74.8723)).toBe("Asia/Kolkata");
    expect(timezoneForCoordinates(40.7128, -74.006)).toBe("America/New_York");
  });

  it("calculates historical offsets for the birth date", () => {
    expect(historicalUtcOffset("Asia/Kolkata", "2003-08-26", "05:53:34")).toBe("+05:30");
    expect(historicalUtcOffset("America/New_York", "1985-06-15", "23:45:00")).toBe("-04:00");
    expect(historicalUtcOffset("America/New_York", "1985-12-15", "23:45:00")).toBe("-05:00");
  });

  it("normalizes geocoder results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ places:[{ name: "Amritsar, Punjab, India", latitude: 31.634, longitude: 74.8723 }] }),
    });
    await expect(searchLocations("Amritsar", fetchMock)).resolves.toEqual([
      { name: "Amritsar, Punjab, India", latitude: 31.634, longitude: 74.8723 },
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/api/locations?q=Amritsar");
  });

  it("rejects invalid coordinates and short searches", async () => {
    expect(() => timezoneForCoordinates(91, 0)).toThrow("latitude");
    await expect(searchLocations("a")).rejects.toThrow("two characters");
  });
});
