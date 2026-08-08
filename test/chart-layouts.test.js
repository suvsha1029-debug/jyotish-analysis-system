import { describe, expect, it } from "vitest";
import { cellsForStyle } from "../src/chart-layouts.js";

const chart = {
  rows: Array.from({ length: 12 }, (_, index) => ({
    sign: ["Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer"][index],
    house: index + 1, bodies: [], bodyDetails: [],
  })),
};

describe("regional chart layouts", () => {
  it.each(["north", "south", "east"])("places all twelve cells in %s style", (style) => {
    const cells = cellsForStyle(chart, style);
    expect(cells).toHaveLength(12);
    expect(new Set(cells.map((cell) => cell.slot)).size).toBe(12);
    expect(new Set(cells.map((cell) => cell.sign)).size).toBe(12);
  });

  it("keeps houses fixed in North Indian style", () => {
    expect(cellsForStyle(chart, "north")[0].slot).toBe("n-h1");
    expect(cellsForStyle(chart, "north")[11].slot).toBe("n-h12");
  });

  it("keeps Aries in the fixed top row for South and East styles", () => {
    expect(cellsForStyle(chart, "south").find((cell) => cell.sign === "Aries").slot).toBe("s-r0-c1");
    expect(cellsForStyle(chart, "east").find((cell) => cell.sign === "Aries").slot).toBe("e-s1");
  });
});
