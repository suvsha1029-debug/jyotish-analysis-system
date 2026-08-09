import { PDFDocument, StandardFonts, grayscale, rgb } from "pdf-lib";
import { PLANET_RULERS } from "../src/prediction-engine.js";

const A4 = [595.28, 841.89];
const MARGIN = 42;
const INK = grayscale(0.12);
const MUTED = grayscale(0.38);
const LINE = grayscale(0.74);
const LIGHT = grayscale(0.94);

function clean(value) {
  return String(value ?? "")
    .replace(/[\u2010-\u2015]/g, "-").replace(/→/g, "->").replace(/↔/g, "<->")
    .replace(/·/g, " | ").replace(/′/g, "'").replace(/″/g, '"').replace(/℞/g, " Rx").replace(/ā|á|à|â|ä/g, "a")
    .replace(/ī|í|ì|î|ï/g, "i").replace(/ū|ú|ù|û|ü/g, "u")
    .replace(/ṃ|ṁ/g, "m").replace(/ś|ṣ/g, "s").replace(/ṇ/g, "n")
    .replace(/ṭ/g, "t").replace(/ḍ/g, "d").replace(/ñ/g, "n")
    .replace(/[^\x20-\x7E°]/g, "");
}

function wrap(text, font, size, maxWidth) {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function text(page, value, x, y, { font, size = 9, color = INK, maxWidth, lineHeight = size * 1.35 } = {}) {
  const lines = maxWidth ? wrap(value, font, size, maxWidth) : [clean(value)];
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, font, size, color }));
  return y - lines.length * lineHeight;
}

function header(page, title, kicker, fonts) {
  page.drawText(clean(kicker).toUpperCase(), { x: MARGIN, y: 793, font: fonts.bold, size: 8, color: MUTED });
  page.drawText(clean(title), { x: MARGIN, y: 766, font: fonts.serifBold, size: 22, color: INK });
  page.drawLine({ start: { x: MARGIN, y: 751 }, end: { x: A4[0] - MARGIN, y: 751 }, thickness: 1.2, color: INK });
}

function section(page, title, y, fonts) {
  page.drawRectangle({ x: MARGIN, y: y - 4, width: A4[0] - MARGIN * 2, height: 23, color: LIGHT });
  page.drawText(clean(title), { x: MARGIN + 8, y: y + 3, font: fonts.bold, size: 10, color: INK });
  return y - 18;
}

function rowsTable(page, rows, columns, top, fonts, { rowHeight = 24, fontSize = 7.6 } = {}) {
  const totalWidth = A4[0] - MARGIN * 2;
  const widths = columns.map((column) => totalWidth * column.width);
  let y = top;
  page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: totalWidth, height: rowHeight, color: grayscale(0.18) });
  let x = MARGIN;
  columns.forEach((column, index) => { page.drawText(clean(column.label), { x: x + 5, y: y - 15, font: fonts.bold, size: 7, color: grayscale(1) }); x += widths[index]; });
  y -= rowHeight;
  rows.forEach((row, rowIndex) => {
    page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: totalWidth, height: rowHeight, color: rowIndex % 2 ? grayscale(0.98) : grayscale(1), borderColor: LINE, borderWidth: 0.4 });
    let cellX = MARGIN;
    columns.forEach((column, index) => {
      const value = clean(typeof column.value === "function" ? column.value(row) : row[column.value]);
      const lines = wrap(value, column.bold ? fonts.bold : fonts.regular, fontSize, widths[index] - 10).slice(0, 2);
      lines.forEach((line, lineIndex) => page.drawText(line, { x: cellX + 5, y: y - 11 - lineIndex * 8, font: column.bold ? fonts.bold : fonts.regular, size: fontSize, color: INK }));
      cellX += widths[index];
    });
    y -= rowHeight;
  });
  return y;
}

function domainBlock(page, domain, x, top, width, height, fonts) {
  page.drawRectangle({ x, y: top - height, width, height, borderColor: LINE, borderWidth: 0.8 });
  page.drawRectangle({ x, y: top - 38, width, height: 38, color: grayscale(0.18) });
  page.drawText(clean(domain.label), { x: x + 10, y: top - 17, font: fonts.serifBold, size: 13, color: grayscale(1) });
  page.drawText(clean(`${domain.varga} | ${domain.confirmation.label}`), { x: x + 10, y: top - 31, font: fonts.bold, size: 7, color: grayscale(0.9) });
  let y = top - 53;
  y = text(page, domain.description, x + 10, y, { font: fonts.regular, size: 7.6, color: MUTED, maxWidth: width - 20, lineHeight: 9.5 }) - 4;
  domain.confirmation.components.forEach((item) => {
    const level = item.score >= 68 ? "Good" : item.score >= 45 ? "Moderate" : "Low";
    page.drawText(clean(item.label), { x: x + 10, y, font: fonts.bold, size: 7.2, color: INK });
    page.drawText(level, { x: x + width - 52, y, font: fonts.bold, size: 7.2, color: INK });
    y -= 11;
  });
  y -= 3;
  y=text(page, domain.method || domain.confirmation.methodNote, x + 10, y, { font: fonts.regular, size: 6.8, color: MUTED, maxWidth: width - 20, lineHeight: 8.5 })-8;
  if(height>=250){
    page.drawText("KEY EVIDENCE",{x:x+10,y,font:fonts.bold,size:6.5,color:INK});y-=10;
    domain.evidence.slice(0,4).forEach((item)=>{y=text(page,`${item.tone==="caution"?"Caution":"Support"}: ${item.title}. ${item.detail}`,x+10,y,{font:fonts.regular,size:6.3,color:MUTED,maxWidth:width-20,lineHeight:7.7})-4;});
  }
}

function drawNorthChart(page, chart, code, x, top, size, fonts) {
  const y = top - size;
  let chartTitle=clean(`${code}  ${String(chart.name).split("/")[0].trim()}`);
  while(chartTitle.length>8&&fonts.bold.widthOfTextAtSize(chartTitle,8.5)>size) chartTitle=chartTitle.slice(0,-1);
  page.drawText(chartTitle, { x, y: top + 16, font: fonts.bold, size: 8.5, color: INK });
  page.drawText(clean(`Lagna: ${chart.ascSign}`), { x, y: top + 5, font: fonts.regular, size: 6.5, color: MUTED });
  const cx = x + size / 2, cy = y + size / 2;
  const line = (x1, y1, x2, y2, thickness = 0.8) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: INK });
  page.drawRectangle({ x, y, width: size, height: size, borderColor: INK, borderWidth: 1.2 });
  line(x, y + size / 2, cx, top); line(cx, top, x + size, y + size / 2); line(x + size, y + size / 2, cx, y); line(cx, y, x, y + size / 2);
  line(x, top, cx, cy); line(x + size, top, cx, cy); line(x + size, y, cx, cy); line(x, y, cx, cy);
  const centers = [
    [0.50,0.77],[0.25,0.86],[0.13,0.68],[0.25,0.50],[0.13,0.30],[0.25,0.13],
    [0.50,0.23],[0.75,0.13],[0.87,0.30],[0.75,0.50],[0.87,0.68],[0.75,0.86],
  ];
  chart.rows.forEach((row) => {
    const [px, py] = centers[row.house - 1];
    const centerX = x + size * px, centerY = y + size * py;
    const label = `H${row.house} ${row.sign.slice(0,3)}`;
    const bodies = row.bodyDetails.filter((body) => body.name !== "Asc").map((body) => `${body.name.slice(0,3)} ${body.degree.replace("°","")}`).join(" ");
    const labelWidth = fonts.bold.widthOfTextAtSize(label, 5.8);
    page.drawText(label, { x: centerX - labelWidth / 2, y: centerY + 5, font: fonts.bold, size: 5.8, color: INK });
    wrap(bodies || "-", fonts.regular, 5.1, size * 0.21).slice(0, 2).forEach((value, index) => {
      const width = fonts.regular.widthOfTextAtSize(value, 5.1);
      page.drawText(value, { x: centerX - width / 2, y: centerY - 3 - index * 6, font: fonts.regular, size: 5.1, color: MUTED });
    });
  });
}

function houseDetail(result, house) {
  const row = result.charts.D1.rows.find((item) => item.house === house);
  const lord = PLANET_RULERS[row.sign];
  const planet = result.prediction.structural.planets[lord];
  return { house: `H${house}`, sign: row.sign, lord, placement: `H${planet.house} ${planet.sign}`, occupants: row.bodies.join(", ") || "None", sav: result.prediction.structural.ashtakavarga.sav[row.sign], dignity: planet.dignity };
}

function addFooter(page, pageNumber, totalPages, fonts) {
  page.drawLine({ start: { x: MARGIN, y: 31 }, end: { x: A4[0] - MARGIN, y: 31 }, thickness: 0.5, color: LINE });
  page.drawText("JYOTISH ANALYSIS SYSTEM | BETA HOBBY REPORT | NOT PROFESSIONAL ADVICE", { x: MARGIN, y: 17, font: fonts.bold, size: 6.3, color: MUTED });
  page.drawText(`${pageNumber} / ${totalPages}`, { x: A4[0] - MARGIN - 39, y: 17, font: fonts.regular, size: 7, color: MUTED });
}

export async function buildLifeReportPdf(result, { locationName = "Birthplace" } = {}) {
  const pdf = await PDFDocument.create();
  const fonts = { regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold), serif: await pdf.embedFont(StandardFonts.TimesRoman), serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold) };
  pdf.setTitle("Jyotish Analysis System - Life Report"); pdf.setAuthor("Jyotish Analysis System"); pdf.setSubject("Beta interpretive astrology report");
  const add = () => pdf.addPage(A4);

  let page = add();
  page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: grayscale(0.97) });
  page.drawRectangle({ x: 0, y: 560, width: A4[0], height: 282, color: grayscale(0.16) });
  page.drawText("JYOTISH ANALYSIS SYSTEM", { x: MARGIN, y: 785, font: fonts.bold, size: 9, color: grayscale(0.8) });
  page.drawText("Integrated", { x: MARGIN, y: 704, font: fonts.serifBold, size: 36, color: grayscale(1) });
  page.drawText("Life Report", { x: MARGIN, y: 660, font: fonts.serifBold, size: 36, color: grayscale(1) });
  page.drawText("DETERMINISTIC CHART CALCULATION AND EVIDENCE SYNTHESIS", { x: MARGIN, y: 613, font: fonts.bold, size: 8, color: grayscale(0.72) });
  let y = 505;
  y = text(page, clean(locationName), MARGIN, y, { font: fonts.serifBold, size: 20, maxWidth: 510 }) - 12;
  y = text(page, `${result.local} | UTC ${result.utc} | ${result.location.latitude.toFixed(5)}, ${result.location.longitude.toFixed(5)}`, MARGIN, y, { font: fonts.regular, size: 9, color: MUTED, maxWidth: 510 }) - 28;
  text(page, `Rasi Lagna: ${result.charts.D1.ascSign}`, MARGIN, y, { font: fonts.bold, size: 12 });
  text(page, `Moon Nakshatra: ${result.panchanga.birthNakshatra.name}, Pada ${result.panchanga.birthNakshatra.pada}, Lord ${result.panchanga.birthNakshatra.lord}`, MARGIN, y - 24, { font: fonts.regular, size: 10 });
  text(page, `Birth-time audit: ${result.birthTimeSensitivity?.level || "Not calculated"}`, MARGIN, y - 45, { font: fonts.regular, size: 10 });
  page.drawRectangle({ x: MARGIN, y: 88, width: 511, height: 102, color: grayscale(1), borderColor: grayscale(0.35), borderWidth: 1 });
  page.drawText("BETA TESTING - INTERPRETIVE ASTROLOGY ONLY", { x: MARGIN + 15, y: 163, font: fonts.bold, size: 10, color: INK });
  text(page, "This hobby report can be incomplete or inaccurate. It does not predict real-life events with certainty and is not medical, legal, financial, safety, relationship, career or other professional advice. Do not make important decisions from it.", MARGIN + 15, 143, { font: fonts.regular, size: 8.5, color: MUTED, maxWidth: 481, lineHeight: 12 });

  page = add(); header(page, "Index and evaluation order", "Report navigation", fonts);
  const indexRows = [
    ["Birth record and disclaimer",1],["Index and evaluation order",2],["Exact degrees and Panchanga",3],["D1, D2, D3 and D4 charts",4],["D5, D9, D10 and D11 charts",5],["D12, D16, D24 and D60 charts",6],["Overall promises",7],["Money and career",8],["Marriage and foreign themes",9],["Property, vehicles and gains",10],["Astrological vitality cautions",11],["MD-AD timeline",12],["Sources, limits and terminology",13],
  ];
  rowsTable(page, indexRows.map(([name,pageNumber])=>({name,pageNumber})), [{label:"Section",width:.84,value:"name",bold:true},{label:"Page",width:.16,value:"pageNumber"}], 724, fonts, {rowHeight:29,fontSize:8.5});
  let methodY=section(page,"Evaluation order",316,fonts);
  ["1. D1 establishes natal promise and carries the highest interpretive priority.","2. Functional lordship, dignity, dispositors, aspects, conjunctions and configured yogas modify delivery.","3. The topic-specific divisional chart confirms; it does not manufacture an absent D1 promise.","4. BAV/SAV describes support for manifestation and timing context, never a verdict by itself.","5. MD is the environment and AD is the executor. Their ownership, placement, relationship and repetitions define timing themes.","6. D60 is a fine confirmation layer only when birth time is sufficiently accurate."].forEach((line)=>{methodY=text(page,line,MARGIN,methodY,{font:fonts.regular,size:8.4,maxWidth:511,lineHeight:11})-6;});

  page = add(); header(page,"Exact degrees and Panchanga","Astronomical record",fonts);
  const positionRows=Object.entries(result.positions).map(([body,p])=>({body,position:p.display,longitude:`${p.longitude.toFixed(8)}°`,motion:["Rahu","Ketu"].includes(body)?"Mean node":p.retrograde?"Retrograde":"Direct",nakshatra:`${result.panchanga.nakshatras[body].name} P${result.panchanga.nakshatras[body].pada}`}));
  let tableY=rowsTable(page,positionRows,[{label:"Body",width:.12,value:"body",bold:true},{label:"Sidereal position",width:.28,value:"position"},{label:"Longitude",width:.19,value:"longitude"},{label:"Motion",width:.16,value:"motion"},{label:"Nakshatra",width:.25,value:"nakshatra"}],724,fonts,{rowHeight:29,fontSize:7.5});
  tableY=section(page,"Solar and special-Lagna context",tableY-10,fonts);
  const operative=result.panchanga.solar?.operativeWindow;
  const facts=[`Operative sunrise (UTC): ${operative?.sunrise?.utc||"Unavailable"}`,`Operative sunset (UTC): ${operative?.sunset?.utc||"Unavailable"}`,`Solar phase: ${operative?.phase||"Unavailable"}`,`Weekday lord / Hora lord: ${result.panchanga.weekdayLord} / ${result.panchanga.hora?.lord||"Unavailable"}`,`Elapsed ghatis: ${result.panchanga.elapsedGhatis??"Unavailable"}`,`Bhava Lagna: ${result.panchanga.specialLagnas?.bhavaLagna?.toFixed(4)??"Unavailable"}° | Hora Lagna: ${result.panchanga.specialLagnas?.horaLagna?.toFixed(4)??"Unavailable"}° | Ghati Lagna: ${result.panchanga.specialLagnas?.ghatiLagna?.toFixed(4)??"Unavailable"}°`];
  facts.forEach((fact)=>{tableY=text(page,fact,MARGIN,tableY,{font:fonts.regular,size:8,maxWidth:511,lineHeight:10})-4;});

  const chartCodes=Object.keys(result.charts);
  for(let group=0;group<3;group+=1){
    page=add(); header(page,group===0?"Foundational divisional charts":group===1?"Specialist divisional charts":"Supporting and fine charts",`Compact North Indian format | Charts ${group*4+1}-${group*4+4}`,fonts);
    chartCodes.slice(group*4,group*4+4).forEach((code,index)=>{
      const col=index%2,row=Math.floor(index/2); drawNorthChart(page,result.charts[code],code,MARGIN+col*263,714-row*333,238,fonts);
    });
    text(page,"Each chart is read from its own Lagna and house structure. Degrees shown inside a Varga are divisional degrees; use the exact sidereal table on page 3 for natal longitudes.",MARGIN,66,{font:fonts.regular,size:7.2,color:MUTED,maxWidth:511,lineHeight:9});
  }

  page=add(); header(page,"Overall natal promises","Timing excluded",fonts);
  const promises=result.prediction.overallPromises;
  page.drawRectangle({x:MARGIN,y:684,width:511,height:42,color:grayscale(0.18)});
  page.drawText(clean(`Structural picture: ${promises.overall}`),{x:MARGIN+12,y:702,font:fonts.serifBold,size:16,color:grayscale(1)});
  page.drawText(clean(`${promises.counts.Good} Good | ${promises.counts.Moderate} Moderate | ${promises.counts.Low} Low domains`),{x:MARGIN+300,y:703,font:fonts.bold,size:8,color:grayscale(.9)});
  const promiseRows=promises.rows.map((row)=>({domain:row.label,varga:row.varga,promise:row.promise,layers:row.layers.map((layer)=>`${layer.key}:${layer.level}`).join(" | ")}));
  let promiseY=rowsTable(page,promiseRows,[{label:"Domain",width:.22,value:"domain",bold:true},{label:"Varga",width:.12,value:"varga"},{label:"Promise",width:.14,value:"promise",bold:true},{label:"Evidence layers",width:.52,value:"layers"}],664,fonts,{rowHeight:32,fontSize:7.2});
  promiseY=section(page,"Interpretive rule",promiseY-10,fonts);
  text(page,"These labels describe stored astrological structure before timing. Supporting and contradictory evidence remain visible; no domain rating is a certainty statement or a probability of an event.",MARGIN,promiseY,{font:fonts.regular,size:8.5,color:MUTED,maxWidth:511,lineHeight:12});

  const pairedPages=[["Money and career","Economic and professional themes",["money","career"]],["Marriage and foreign themes","Partnership and distance",["marriage","foreign"]],["Property, vehicles and gains","Material manifestation",["property","vehicles","gains"]]];
  pairedPages.forEach(([title,kicker,keys],pageIndex)=>{
    page=add();header(page,title,kicker,fonts);
    const domains=keys.map((key)=>result.prediction.domains[key]);
    if(domains.length===2){domainBlock(page,domains[0],MARGIN,724,511,292,fonts);domainBlock(page,domains[1],MARGIN,408,511,292,fonts);}
    else {domainBlock(page,domains[0],MARGIN,724,511,190,fonts);domainBlock(page,domains[1],MARGIN,516,511,190,fonts);domainBlock(page,domains[2],MARGIN,308,511,190,fonts);}
    if(pageIndex===0) text(page,"Money prioritizes the D1 H2/H11 carrier and Hora suitability. Career prioritizes D1 work/status structure and D10 Lagna, H6, H9, H10 and H11.",MARGIN,73,{font:fonts.regular,size:7.5,color:MUTED,maxWidth:511,lineHeight:9});
  });

  page=add();header(page,"Astrological vitality cautions","Not a health diagnosis",fonts);
  let healthY=text(page,"This page only summarizes traditional chart symbolism for vitality, strain and recovery themes. It cannot assess illness, diagnose a condition, estimate lifespan or replace a qualified clinician.",MARGIN,720,{font:fonts.bold,size:9,maxWidth:511,lineHeight:13})-16;
  const healthRows=[1,6,8,12].map((house)=>houseDetail(result,house));
  healthY=rowsTable(page,healthRows,[{label:"House",width:.09,value:"house",bold:true},{label:"Sign",width:.15,value:"sign"},{label:"Lord",width:.13,value:"lord",bold:true},{label:"Lord placement",width:.18,value:"placement"},{label:"Dignity",width:.18,value:"dignity"},{label:"Occupants",width:.19,value:"occupants"},{label:"SAV",width:.08,value:"sav"}],healthY,fonts,{rowHeight:35,fontSize:7.1});
  healthY=section(page,"Contextual indicators",healthY-18,fonts);
  const sun=result.prediction.structural.planets.Sun,moon=result.prediction.structural.planets.Moon;
  const context=[`Sun: ${sun.sign}, H${sun.house}, ${sun.dignity}. Moon: ${moon.sign}, H${moon.house}, ${moon.dignity}.`,`H1 describes constitutional presentation; H6 relates to strain and routines; H8 to vulnerability and transformation; H12 to rest, withdrawal and expenditure. None is judged in isolation.`,`Combustion, retrogression, nodes or low SAV are modifiers only. Benefic support, dispositors, house ownership, upachaya placement, cancellation and repeated Varga evidence must be considered together.`];
  context.forEach((line)=>{healthY=text(page,line,MARGIN,healthY,{font:fonts.regular,size:8.3,maxWidth:511,lineHeight:11})-9;});
  page.drawRectangle({x:MARGIN,y:79,width:511,height:75,borderColor:INK,borderWidth:1.3,color:grayscale(.97)});
  text(page,"IMPORTANT: If you have a health concern, seek evidence-based medical care. This report intentionally makes no diagnosis, treatment recommendation or longevity claim.",MARGIN+14,128,{font:fonts.bold,size:8.5,maxWidth:483,lineHeight:12});

  page=add();header(page,"MD-AD timeline","Current and next three windows",fonts);
  const current=result.prediction.currentPeriod;
  const next=result.prediction.timeline.periods.filter((period)=>period.theme.phase==="upcoming").slice(0,3);
  const periods=[...(current?[current]:[]),...next];
  let periodY=724;
  periods.forEach((period,index)=>{
    page.drawRectangle({x:MARGIN,y:periodY-126,width:511,height:116,borderColor:LINE,borderWidth:.8,color:index===0&&period.current?grayscale(.94):grayscale(1)});
    page.drawText(clean(index===0&&period.current?"CURRENT PERIOD":`NEXT WINDOW ${index+(current?0:1)}`),{x:MARGIN+12,y:periodY-28,font:fonts.bold,size:7,color:MUTED});
    page.drawText(clean(`${period.mdLord}-${period.adLord} | ${period.theme.delivery}`),{x:MARGIN+12,y:periodY-49,font:fonts.serifBold,size:14,color:INK});
    page.drawText(clean(`${period.start} to ${period.end} | ${period.geometry.relation}`),{x:MARGIN+265,y:periodY-47,font:fonts.bold,size:7.5,color:INK});
    text(page,period.theme.summary,MARGIN+12,periodY-67,{font:fonts.regular,size:7.2,color:MUTED,maxWidth:487,lineHeight:9});
    periodY-=137;
  });
  const best=result.prediction.mahadashaRankings.slice(0,5).map((item)=>`${item.lord} (${item.level})`).join(" | ");
  section(page,"Comparative Mahadasha delivery",159,fonts);text(page,best,MARGIN,133,{font:fonts.bold,size:8.5,maxWidth:511,lineHeight:11});
  text(page,"MD-AD describes activation themes, not guaranteed events. Transits and Pratyantardasha are not calculated in this report.",MARGIN,103,{font:fonts.regular,size:7.5,color:MUTED,maxWidth:511,lineHeight:9});

  page=add();header(page,"Sources, limits and terminology","Audit notes",fonts);
  let sourceY=section(page,"Calculated layers",724,fonts);
  sourceY=text(page,"Swiss Ephemeris positions; Lahiri sidereal zodiac; mean nodes; D1/D2/D3/D4/D5/D9/D10/D11/D12/D16/D24/D60; functional lordship; dignity; configured aspects and yogas; dispositors; BAV/SAV; Arudhas; node controllers; Vimshottari MD-AD; sunrise-derived Bhava, Hora and Ghati Lagnas; birth-time perturbation.",MARGIN,sourceY,{font:fonts.regular,size:8.2,maxWidth:511,lineHeight:11})-16;
  sourceY=section(page,"Source hierarchy",sourceY,fonts);
  ["BPHS-derived lordship, dignity, Varga, special-Lagna and yoga framework, paraphrased operationally.","P. V. R. Narasimha Rao integrated Varga-reading approach: every divisional chart is judged through its own Lagna, houses and lords.","Supplied Master Rulebook and worked examples: evidence hierarchy, Ashtakavarga, Arudha, node-controller and timing synthesis.","Rahu-Ketu Experience by P. Trivedi: node-controller observations used only as tagged supporting interpretation."].forEach((line)=>{sourceY=text(page,line,MARGIN,sourceY,{font:fonts.regular,size:8,maxWidth:511,lineHeight:11})-8;});
  sourceY=section(page,"Unavailable or intentionally excluded",sourceY-4,fonts);
  sourceY=text(page,"Shadbala, Bhavabala, planetary war, live transits, Pratyantardasha, event calibration and medical/longevity prediction are not calculated. Evidence completeness is not event probability. D60 and sunrise-derived factors require an accurate birth time.",MARGIN,sourceY,{font:fonts.regular,size:8.2,maxWidth:511,lineHeight:11})-18;
  sourceY=section(page,"Labels",sourceY,fonts);
  text(page,"Good = stronger configured support. Moderate = mixed or conditional support. Low = limited configured support or substantial cautions. These are qualitative software labels, not promises, certainty, diagnosis or fate.",MARGIN,sourceY,{font:fonts.regular,size:8.2,maxWidth:511,lineHeight:11});
  page.drawRectangle({x:MARGIN,y:79,width:511,height:86,color:grayscale(.18)});
  text(page,"BETA HOBBY PROJECT. Read this report as an experimental astrology exercise only. Use considerate judgment and real-world evidence for every important decision.",MARGIN+15,137,{font:fonts.bold,size:9,color:grayscale(1),maxWidth:481,lineHeight:13});

  const pages=pdf.getPages();pages.forEach((item,index)=>addFooter(item,index+1,pages.length,fonts));
  return pdf.save();
}
