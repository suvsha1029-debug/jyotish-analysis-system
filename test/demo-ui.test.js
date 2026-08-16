import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source=readFileSync(new URL("../src/demo.js",import.meta.url),"utf8");

describe("prediction workspace UI wiring",()=>{
  it("defines the shared tab-state helper used by Best Mahadashas",()=>{
    expect(source).toMatch(/function\s+setActiveInsightTab\s*\(/);
    expect(source).toContain('setActiveInsightTab("best-periods")');
  });
  it("wires separate but connected inheritance views",()=>{
    expect(source).toMatch(/inheritance:\{label:"Inheritance"\}/);
    expect(source).toMatch(/function\s+renderSpouseInheritance\s*\(/);
    expect(source).toContain('key:"spouse-inheritance",label:"Spouse inheritance"');
    expect(source).toContain("data-open-spouse-inheritance");
    expect(source).toContain("data-open-marriage");
  });
  it("exposes KP as a separate confirmation tab",()=>{
    expect(source).toMatch(/function\s+renderKP\s*\(/);
    expect(source).toContain('key:"kp",label:"KP confirmation"');
    expect(source).toContain('key === "kp" ? renderKP()');
  });
  it("shows auditable profiles and never labels a blended promise",()=>{
    expect(source).toMatch(/function\s+renderCalculationProfiles\s*\(/);
    expect(source).toContain('key:"profiles",label:"Calculation profiles"');
    expect(source).toContain("No cross-system averaging");
    expect(source).not.toContain("Synced promise");
  });
});
