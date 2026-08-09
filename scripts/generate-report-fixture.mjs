import { mkdir, writeFile } from "node:fs/promises";
import { calculateFullChart } from "../server/chart-service.js";
import { buildLifeReportPdf } from "../server/pdf-report.js";

const input = { date:"2003-08-26", time:"05:53:34", utcOffset:"+05:30", latitude:31.635666, longitude:74.87875, altitude:0 };
const result = await calculateFullChart(input);
const bytes = await buildLifeReportPdf(result, { locationName:"Amritsar, Punjab, India" });
await mkdir(new URL("../output/pdf/", import.meta.url), { recursive:true });
const target = new URL("../output/pdf/jyotish-life-report-sample.pdf", import.meta.url);
await writeFile(target, bytes);
console.log(target.pathname);
