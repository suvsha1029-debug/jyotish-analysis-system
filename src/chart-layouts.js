export const CHART_STYLES = Object.freeze({ north: "North Indian", south: "South Indian", east: "East Indian" });

const SOUTH_POSITIONS = Object.freeze([
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3],
  [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
]);

export function cellsForStyle(chart, style) {
  if (!CHART_STYLES[style]) throw new RangeError(`Unknown chart style: ${style}`);
  if (style === "north") {
    return chart.rows.map((row) => ({ ...row, slot: `n-h${row.house}` }));
  }
  const bySign = new Map(chart.rows.map((row, sign) => [row.sign, { ...row, signIndex: sign }]));
  const naturalSignOrder = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  if (style === "south") {
    return naturalSignOrder.map((sign, signIndex) => ({
      ...bySign.get(sign), slot: `s-r${SOUTH_POSITIONS[signIndex][0]}-c${SOUTH_POSITIONS[signIndex][1]}`,
    }));
  }
  return naturalSignOrder.map((sign, signIndex) => ({ ...bySign.get(sign), slot: `e-s${signIndex + 1}` }));
}
