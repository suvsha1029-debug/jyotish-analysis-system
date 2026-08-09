import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source=readFileSync(new URL("../src/demo.js",import.meta.url),"utf8");

describe("prediction workspace UI wiring",()=>{
  it("defines the shared tab-state helper used by Best Mahadashas",()=>{
    expect(source).toMatch(/function\s+setActiveInsightTab\s*\(/);
    expect(source).toContain('setActiveInsightTab("best-periods")');
  });
});
