import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { calculateFullChart } from "../server/chart-service.js";
import { buildLifeReportPdf } from "../server/pdf-report.js";

describe("server-generated life report",()=>{
  it("recalculates and creates the indexed fourteen-page PDF",async()=>{
    const result=await calculateFullChart({date:"2003-08-26",time:"05:53:34",utcOffset:"+05:30",latitude:31.635666,longitude:74.87875,altitude:0});
    const bytes=await buildLifeReportPdf(result,{locationName:"Amritsar, Punjab, India"});
    const pdf=await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(14);
    expect(pdf.getTitle()).toBe("Jyotish Analysis System - Life Report");
    expect(bytes.length).toBeGreaterThan(25000);
  },30000);
});
