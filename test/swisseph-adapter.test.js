import { describe, expect, it } from "vitest";
import { BrowserSwissEphemerisAdapter } from "../src/swisseph-adapter.js";

describe("BrowserSwissEphemerisAdapter", () => {
  it("refuses calculations until its WASM module is initialized", async () => {
    const adapter = new BrowserSwissEphemerisAdapter();
    await expect(adapter.calculate({
      utcDate: new Date("2000-01-01T12:00:00Z"), latitude: 0, longitude: 0,
    })).rejects.toThrow("adapter.init");
  });
});
