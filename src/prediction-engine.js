import { SIGNS, shashtiamsaAmsha } from "./varga-engine.js";
import { buildStructuralAnalysis } from "./analysis-engine.js";

export const PLANET_RULERS = Object.freeze({
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
});

export const DOMAIN_SPECS = Object.freeze({
  overview: { label: "Overview", varga: "D1", houses: [1, 5, 9, 10, 11], description: "Structural promise and the strongest repeated themes." },
  money: { label: "Money", varga: "D2", houses: [2, 5, 9, 10, 11, 12], description: "Earning, accumulation, retention, expenses and scalability." },
  career: { label: "Career", varga: "D10", houses: [1, 2, 6, 9, 10, 11], description: "Professional direction, activity, achievement and status." },
  fame: { label: "Fame & authority", varga: "D5", houses: [1, 5, 9, 10, 11], description: "Recognition, public authority, influence and power." },
  marriage: { label: "Marriage", varga: "D9", houses: [1, 2, 7, 8], description: "Partnership promise, harmony, durability and maturation." },
  foreign: { label: "Foreign", varga: "D4", houses: [4, 9, 12], vargaHouses:[9,12], supportingVargas:["D10","D9"], description: "Foreign movement, residence away from birthplace, work abroad and settlement." },
  property: { label: "Property", varga: "D4", houses: [2, 4, 8, 11, 12], description: "Land, residence, acquisition, ownership and expenditure." },
  vehicles: { label: "Vehicles", varga: "D16", houses: [1, 4, 11], description: "Vehicles, comforts, pleasures and visible material quality." },
  gains: { label: "Gains", varga: "D11", houses: [2, 10, 11], description: "Income conversion, networks, fulfillment and retention." },
});

const DASHA_LORDS = Object.freeze(["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]);
const DASHA_YEARS = Object.freeze({ Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 });
const YEAR_MS = 365.2425 * 86400000;

export const CONFIRMATION_WEIGHTS = Object.freeze({
  d1: 45,
  varga: 10,
  ashtakavarga: 10,
  structure: 10,
  timing: 25,
});

function rowByHouse(chart, house) { return chart.rows.find((row) => row.house === house); }
function bodyHouse(chart, bodyName) { return chart.rows.find((row) => row.bodyDetails.some((body) => body.name === bodyName))?.house; }
function bodySign(chart, bodyName) { return chart.rows.find((row) => row.bodyDetails.some((body) => body.name === bodyName))?.sign; }
function houseLord(chart, house) { return PLANET_RULERS[rowByHouse(chart, house).sign]; }
function qualitative(value) { return value >= 4 ? "High" : value >= 2 ? "Moderate" : value >= 1 ? "Mixed" : "Low"; }
function addYears(date, years) { return new Date(date.getTime() + years * YEAR_MS); }
function isoDay(date) { return date.toISOString().slice(0, 10); }
function clamp(value, low = 0, high = 100) { return Math.min(high, Math.max(low, value)); }
function confirmationLabel(score) {
  if (score >= 68) return "Good";
  if (score >= 45) return "Moderate";
  return "Low";
}

function evaluateHoraWealth(result, structural) {
  const d1=result.charts.D1,d2=result.charts.D2;
  const preferred={Sun:"Leo",Mars:"Leo",Jupiter:"Leo",Moon:"Cancer",Venus:"Cancer",Saturn:"Cancer"};
  const classical=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  const planets=classical.map((planet)=>{
    const sign=bodySign(d2,planet);
    const suitable=planet==="Mercury"||preferred[planet]===sign;
    return {planet,sign,hora:sign==="Leo"?"Sun's Hora":"Moon's Hora",suitable,rule:planet==="Mercury"?"Effective in either Hora":`${planet} is more expressive in ${preferred[planet]==="Leo"?"Sun's":"Moon's"} Hora`};
  });
  const secondLord=houseLord(d1,2),eleventhLord=houseLord(d1,11),sameLord=secondLord===eleventhLord;
  const secondHouse=bodyHouse(d1,secondLord),eleventhHouse=bodyHouse(d1,eleventhLord);
  const linked=sameLord||secondHouse===eleventhHouse||structural.aspects.some((aspect)=>(aspect.body===secondLord&&aspect.toHouse===eleventhHouse)||(aspect.body===eleventhLord&&aspect.toHouse===secondHouse));
  const carriers=[...new Set([secondLord,eleventhLord])].map((planet)=>({planet,d1House:bodyHouse(d1,planet),d1Sign:bodySign(d1,planet),dignity:structural.planets[planet].dignity,d2Sign:bodySign(d2,planet),horaSuitable:planets.find((item)=>item.planet===planet)?.suitable}));
  const d2LagnaLord=PLANET_RULERS[d2.ascSign],d2LagnaLordHouse=bodyHouse(d2,d2LagnaLord);
  const suitableCount=planets.filter((item)=>item.suitable).length;
  const carrierSupport=carriers.filter((item)=>item.horaSuitable).length;
  const score=Math.round(clamp(30+(suitableCount/classical.length)*40+(sameLord?10:linked?7:0)+(carrierSupport/carriers.length)*10+([1,4,5,7,9,10,11].includes(d2LagnaLordHouse)?8:0),20,95));
  return {score,label:confirmationLabel(score),d2Lagna:d2.ascSign,d2LagnaLord,d2LagnaLordHouse,planets,suitableCount,secondLord,eleventhLord,sameLord,linked,carriers,
    detail:`Hora suitability supports ${suitableCount} of ${classical.length} classical planets. D1 H2 lord ${secondLord} and H11 lord ${eleventhLord} are ${sameLord?"the same wealth-and-gains controller":linked?"structurally linked":"not directly linked"}; ${carrierSupport} of ${carriers.length} unique carrier(s) are effective in their D2 Hora.`};
}

function buildConfirmation(result, domain, structural, current, savAverage) {
  const d1 = result.charts.D1;
  const varga = result.charts[domain.varga] || d1;
  const positiveHouses = [1, 4, 5, 7, 9, 10, 11];
  const d1Checks = domain.houses.flatMap((house) => {
    const row = rowByHouse(d1, house);
    const placement = bodyHouse(d1, houseLord(d1, house));
    return [row.bodies.length > 0, positiveHouses.includes(placement)];
  });
  const vargaHouses=domain.vargaHouses||domain.houses;
  const vargaChecks = vargaHouses.map((house) => rowByHouse(varga, house)?.bodies.length > 0);
  const d1Score = Math.round(25 + 75 * d1Checks.filter(Boolean).length / d1Checks.length);
  const hora=domain.key==="money"?evaluateHoraWealth(result,structural):null;
  const vargaScore = hora?.score??Math.round(20 + 80 * vargaChecks.filter(Boolean).length / vargaChecks.length);
  const avScore = Math.round(clamp(50 + (savAverage - structural.ashtakavarga.average) * 7, 20, 90));
  const relevantYogaTypes = ["money", "gains"].includes(domain.key) ? ["wealth"] : ["career", "fame", "overview"].includes(domain.key) ? ["status", "wealth"] : [];
  const yogaCount = structural.yogas.filter((yoga) => relevantYogaTypes.includes(yoga.type)).length;
  const dignifiedLords = new Set(domain.houses.map((house) => houseLord(d1, house))).size;
  const conditionedLords = [...new Set(domain.houses.map((house) => houseLord(d1, house)))].filter((lord) => ["Own sign", "Exalted", "Moolatrikona", "Friendly sign"].includes(structural.planets[lord]?.dignity)).length;
  const structureScore = Math.round(clamp(35 + yogaCount * 15 + (conditionedLords / Math.max(1, dignifiedLords)) * 35, 20, 95));
  const periodLords = current ? [current.mdLord, current.adLord] : [];
  const activationCount = periodLords.reduce((count, lord) => {
    const planet = structural.planets[lord];
    if (!planet) return count;
    const vargaHouse = bodyHouse(varga, lord);
    return count + (domain.houses.includes(planet.house) ? 1 : 0) + (domain.houses.includes(vargaHouse) ? 1 : 0) + planet.housesOwned.filter((house) => domain.houses.includes(house)).length;
  }, 0);
  const timingScore = current ? Math.round(clamp(25 + activationCount * 15, 20, 95)) : 25;
  const components = [
    { key:"d1", label:"D1 structural promise", chart:"D1", weight:CONFIRMATION_WEIGHTS.d1, score:d1Score, detail:`${d1Checks.filter(Boolean).length} of ${d1Checks.length} configured house/lord checks support the topic.` },
    { key:"varga", label:`${domain.varga} divisional confirmation`, chart:domain.varga, weight:CONFIRMATION_WEIGHTS.varga, score:vargaScore, detail:hora?.detail??`${vargaChecks.filter(Boolean).length} of ${vargaChecks.length} topic houses are occupied in the relevant Varga.` },
    { key:"ashtakavarga", label:"Ashtakavarga support", chart:"SAV", weight:CONFIRMATION_WEIGHTS.ashtakavarga, score:avScore, detail:`Topic-house SAV ${savAverage.toFixed(1)} versus chart average ${structural.ashtakavarga.average.toFixed(1)}.` },
    { key:"structure", label:"Lords, dignity & yogas", chart:"Structure", weight:CONFIRMATION_WEIGHTS.structure, score:structureScore, detail:`${conditionedLords} conditioned topic lords and ${yogaCount} relevant configured yogas.` },
    { key:"timing", label:"Current MD-AD activation", chart:"Timing", weight:CONFIRMATION_WEIGHTS.timing, score:timingScore, detail:current ? `${current.mdLord}-${current.adLord} produces ${activationCount} topic-house activations across ${domain.varga === "D1" ? "D1 placements and natal ownership" : `D1, ${domain.varga} and natal ownership`}.` : "No current MD-AD period was available." },
  ];
  const score = Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) / 100);
  return { score, label:confirmationLabel(score), components, hora, methodNote:"D1 governs promise. The relevant Varga and Ashtakavarga confirm it; MD-AD determines whether the promise is presently activated across D1 and the relevant division." };
}

export function vimshottariTimeline(moonLongitude, birthDate, asOf = new Date()) {
  const segment = 360 / 27;
  const nakshatraIndex = Math.floor((((moonLongitude % 360) + 360) % 360) / segment);
  const lordIndex = nakshatraIndex % 9;
  const lord = DASHA_LORDS[lordIndex];
  const fractionElapsed = ((moonLongitude % segment) + segment) % segment / segment;
  let mdStart = addYears(birthDate, -fractionElapsed * DASHA_YEARS[lord]);
  const periods = [];
  for (let cycle = 0; cycle < 18; cycle += 1) {
    const mdLord = DASHA_LORDS[(lordIndex + cycle) % 9];
    const mdEnd = addYears(mdStart, DASHA_YEARS[mdLord]);
    let adStart = mdStart;
    const mdSequenceIndex = DASHA_LORDS.indexOf(mdLord);
    for (let sub = 0; sub < 9; sub += 1) {
      const adLord = DASHA_LORDS[(mdSequenceIndex + sub) % 9];
      const adEnd = addYears(adStart, DASHA_YEARS[mdLord] * DASHA_YEARS[adLord] / 120);
      if (adEnd >= birthDate && adStart <= addYears(asOf, 15)) {
        periods.push({ mdLord, adLord, start: isoDay(adStart), end: isoDay(adEnd), current: asOf >= adStart && asOf < adEnd });
      }
      adStart = adEnd;
    }
    mdStart = mdEnd;
    if (mdStart > addYears(asOf, 16)) break;
  }
  return { nakshatraIndex, birthDashaLord: lord, periods };
}

function periodGeometry(d1, mdLord, adLord) {
  const mdHouse = bodyHouse(d1, mdLord);
  const adHouse = bodyHouse(d1, adLord);
  if (!mdHouse || !adHouse) return { mdHouse, adHouse, relation: "Node/dispositor route" };
  const distance = ((adHouse - mdHouse + 12) % 12) + 1;
  const reverse = ((mdHouse - adHouse + 12) % 12) + 1;
  const pair = [Math.min(distance, reverse), Math.max(distance, reverse)].join("/");
  const relation = ({ "1/1": "Concentrated", "2/12": "Transition / expenditure", "3/11": "Effort to gain", "4/10": "Concrete responsibility", "5/9": "Trinal cooperation", "6/8": "High friction / transformation", "7/7": "Opposition / contracts" })[pair] || pair;
  return { mdHouse, adHouse, pair, relation };
}

function periodTheme(result, structural, period, asOf) {
  const d1=result.charts.D1;
  const lords=[period.mdLord,period.adLord];
  const ranked=Object.entries(DOMAIN_SPECS).map(([key,spec])=>{
    const varga=result.charts[spec.varga]||d1, vargaHouses=spec.vargaHouses||spec.houses;
    const activations=lords.reduce((sum,lord)=>{
      const planet=structural.planets[lord];
      if(!planet) return sum;
      return sum+(spec.houses.includes(planet.house)?1:0)+(vargaHouses.includes(bodyHouse(varga,lord))?1:0)+planet.housesOwned.filter((house)=>spec.houses.includes(house)).length;
    },0);
    const savValues=spec.houses.map((house)=>structural.ashtakavarga.sav[rowByHouse(d1,house).sign]);
    const savAverage=savValues.reduce((sum,value)=>sum+value,0)/savValues.length;
    return {key,label:spec.label,varga:spec.varga,activations,savAverage:Number(savAverage.toFixed(1)),support:savAverage>=structural.ashtakavarga.average,rank:activations*2+(savAverage>=structural.ashtakavarga.average?1:0)};
  }).sort((a,b)=>b.rank-a.rank||b.activations-a.activations);
  const leaders=ranked.slice(0,3);
  const d60=lords.map((lord)=>({lord,...shashtiamsaAmsha(result.positions[lord].longitude)}));
  const activationTotal=leaders[0].activations+leaders[1].activations;
  const supportCount=leaders.slice(0,2).filter((item)=>item.support).length;
  const beneficAmshas=d60.filter((item)=>item.nature==="Benefic").length;
  const delivery=activationTotal>=7&&supportCount>=1?"Good":activationTotal>=3?"Moderate":"Low";
  const start=new Date(`${period.start}T00:00:00Z`),end=new Date(`${period.end}T00:00:00Z`);
  const phase=period.current?"current":end<asOf?"past":"upcoming";
  return {
    phase,delivery,
    headline:`${leaders[0].label} and ${leaders[1].label}`,
    domains:leaders,
    d60,
    summary:`${period.mdLord} sets the period environment and ${period.adLord} executes it. ${leaders[0].label} leads through ${leaders[0].activations} D1/${leaders[0].varga} activations; its house SAV is ${leaders[0].support?"supportive":"below the chart average"}. ${beneficAmshas} of the 2 period lords occupy benefic D60 amshas.`,
  };
}

export function evaluateDomain(result, key) {
  const spec = DOMAIN_SPECS[key];
  if (!spec) throw new RangeError(`Unknown prediction domain: ${key}`);
  const d1 = result.charts.D1;
  const domain = result.charts[spec.varga] || d1;
  const evidence = [];
  let support = 0; let friction = 0;
  if(key==="money") {
    const secondLord=houseLord(d1,2),eleventhLord=houseLord(d1,11);
    if(secondLord===eleventhLord) {
      support+=2;
      evidence.push({tone:"support",source:"P0/P1 BPHS + P5 synthesis",title:`${secondLord} jointly carries H2 and H11`,detail:`Accumulation (H2) and gains (H11) share one controller placed in D1 house ${bodyHouse(d1,secondLord)}. Its condition must be checked in both D1 and D2.`});
    } else if(bodyHouse(d1,secondLord)===bodyHouse(d1,eleventhLord)) {
      support+=2;
      evidence.push({tone:"support",source:"P1/P5",title:"H2 and H11 lords are conjoined",detail:`${secondLord} and ${eleventhLord} combine accumulation and gains in D1 house ${bodyHouse(d1,secondLord)}.`});
    }
  }
  for (const house of spec.houses) {
    const natalRow = rowByHouse(d1, house);
    const lord = houseLord(d1, house);
    const lordPlacement = bodyHouse(d1, lord);
    if (natalRow.bodies.length) {
      support += 1;
      evidence.push({ tone: "support", source: "P3/P5", title: `D1 house ${house} is occupied`, detail: natalRow.bodies.join(", ") });
    }
    if ([1, 4, 5, 7, 9, 10, 11].includes(lordPlacement)) {
      support += 1;
      evidence.push({ tone: "support", source: "P3/P5", title: `${lord} carries house ${house}`, detail: `Placed in D1 house ${lordPlacement}.` });
    }
    if ([6, 8, 12].includes(lordPlacement)) {
      friction += 1;
      evidence.push({ tone: "caution", source: "P3/P5", title: `${lord} adds delivery friction`, detail: `House ${house} lord is placed in D1 house ${lordPlacement}; this is a modifier, not denial.` });
    }
  }
  for (const house of spec.vargaHouses||spec.houses) {
    const domainRow=rowByHouse(domain,house);
    if(domainRow?.bodies.length) { support+=1; evidence.push({tone:"support",source:"P3",title:`${spec.varga} house ${house} is activated`,detail:domainRow.bodies.join(", ")}); }
  }
  const confidence = Math.min(5, Math.max(1, Math.ceil((support + friction) / 3)));
  return {
    key, ...spec, support, friction,
    dimensions: {
      promise: qualitative(support - friction),
      strength: qualitative(support),
      ease: friction >= 3 ? "Low" : friction >= 1 ? "Mixed" : "High",
      stability: qualitative(Math.max(0, support - Math.ceil(friction / 2))),
      confidence: ["", "Preliminary", "Developing", "Moderate", "Good", "High"][confidence],
    },
    evidence: evidence.slice(0, 12),
    limitations: "Shadbala, Bhavabala, Pratyantardasha and live transit triggers are not yet calculated; this result is structured confirmation, not a denial or certainty statement.",
  };
}

function buildForeignAnalysis(result,structural,current) {
  const d1=result.charts.D1,d4=result.charts.D4,d9=result.charts.D9,d10=result.charts.D10;
  const focusHouses=[4,9,12], d4Houses=[9,12];
  const lords=Object.fromEntries(focusHouses.map((house)=>[house,houseLord(d1,house)]));
  const lagnaLord=houseLord(d1,1), lagnaLordHouse=bodyHouse(d1,lagnaLord);
  const aspectLinks=structural.aspects.filter((aspect)=>aspect.body===lagnaLord&&focusHouses.includes(aspect.toHouse));
  const lordLinks=[...new Set(Object.values(lords))].filter((lord)=>{
    const house=bodyHouse(d1,lord);
    return house===lagnaLordHouse||structural.aspects.some((aspect)=>(aspect.body===lord&&aspect.toHouse===lagnaLordHouse)||(aspect.body===lagnaLord&&aspect.toHouse===house));
  });
  const rahuHouse=bodyHouse(d1,"Rahu"), rahuAspects=structural.aspects.filter((aspect)=>aspect.body==="Rahu"&&focusHouses.includes(aspect.toHouse)).map((aspect)=>aspect.toHouse);
  const houseLayer=focusHouses.map((house)=>({house,lord:lords[house],lordHouse:bodyHouse(d1,lords[house]),occupants:rowByHouse(d1,house).bodies,sav:structural.ashtakavarga.sav[rowByHouse(d1,house).sign]}));
  const chartLayer=(chart,code,houses)=>({code,houses:houses.map((house)=>({house,occupants:rowByHouse(chart,house).bodies})),activations:houses.reduce((sum,house)=>sum+rowByHouse(chart,house).bodies.length,0)});
  const d4Layer=chartLayer(d4,"D4",d4Houses),d10Layer=chartLayer(d10,"D10",[9,12]),d9Layer=chartLayer(d9,"D9",[9,12]);
  const movementPoints=(rowByHouse(d1,9).bodies.length?1:0)+(rowByHouse(d1,12).bodies.length?1:0)+d4Layer.activations+(rahuAspects.length||[9,12].includes(rahuHouse)?1:0);
  const basePoints=(rowByHouse(d1,4).bodies.length?1:0)+(rowByHouse(d1,12).bodies.length?1:0)+rowByHouse(d4,12).bodies.length+(lordLinks.length?1:0);
  const level=(points)=>points>=4?"Good":points>=2?"Moderate":"Low";
  const axis=current?.geometry||null;
  const axisResult=!axis?"No active MD-AD axis":axis.pair==="6/8"?"High adjustment and friction; results require saving factors.":axis.pair==="4/10"?"Strong relocation-versus-duty axis; concrete restructuring is possible.":axis.pair==="3/11"?"Effort can convert into networks and gains.":axis.pair==="5/9"?"Supportive trinal coordination.":axis.pair==="2/12"?"Movement, expenditure and transition are emphasized.":axis.relation;
  return {
    houses:houseLayer,
    primary:d4Layer,
    supporting:[d10Layer,d9Layer],
    movement:{label:"Foreign movement indication",level:level(movementPoints),detail:"Long-distance movement from D1 9H/12H, D4 9H/12H and Rahu links."},
    base:{label:"Foreign residence indication",level:level(basePoints),detail:"Residence shift from D1 4H/12H, D4 residence evidence and Lagna-lord linkage."},
    functional:[...new Set([...Object.values(lords),...(current?[current.mdLord,current.adLord]:[])])].map((lord)=>({lord,...structural.planets[lord].functional,dignity:structural.planets[lord].dignity,debilitation:structural.planets[lord].debilitation})),
    lagnaLord:{planet:lagnaLord,house:lagnaLordHouse,aspectHouses:aspectLinks.map((item)=>item.toHouse),linkedForeignLords:lordLinks},
    rahu:{house:rahuHouse,aspectHouses:rahuAspects},
    axis:axis?{pair:axis.pair||"Controller route",relation:axis.relation,result:axisResult,mdLord:current.mdLord,adLord:current.adLord}:null,
    mainTheme:current?.theme?.domains?.[0]||null,
    otherThemes:current?.theme?.domains?.slice(1)||[],
    d60:[...new Set([...Object.values(lords),...(current?[current.mdLord,current.adLord]:[])])].map((lord)=>({lord,...shashtiamsaAmsha(result.positions[lord].longitude)})),
  };
}

function buildOverallPromises(result, structural, domains) {
  const arudhaMap={overview:"AL",money:"A2",career:"A10",fame:"AL",marriage:"UL",foreign:"A9",property:"A4",vehicles:"A4",gains:"A11"};
  const rows=Object.values(domains).map((domain)=>{
    const natal=domain.confirmation.components.filter((item)=>item.key!=="timing");
    const totalWeight=natal.reduce((sum,item)=>sum+item.weight,0);
    const natalScore=natal.reduce((sum,item)=>sum+item.score*item.weight,0)/totalWeight;
    const promise=natalScore>=68?"Good":natalScore>=45?"Moderate":"Low";
    const arudhaKey=arudhaMap[domain.key], arudha=structural.arudhas[arudhaKey];
    const nodes=structural.nodes.filter((node)=>domain.houses.includes(node.house)||domain.houses.includes(structural.planets[node.signDispositor]?.house));
    const support=domain.evidence.filter((item)=>item.tone==="support").slice(0,3);
    const cautions=domain.evidence.filter((item)=>item.tone==="caution").slice(0,2);
    return {key:domain.key,label:domain.label,varga:domain.varga,promise,arudhaKey,arudha,nodes,support,cautions,
      layers:natal.map((item)=>({key:item.key,label:item.label,level:item.score>=68?"Good":item.score>=45?"Moderate":"Low",detail:item.detail}))};
  });
  const counts={Good:rows.filter((row)=>row.promise==="Good").length,Moderate:rows.filter((row)=>row.promise==="Moderate").length,Low:rows.filter((row)=>row.promise==="Low").length};
  const overall=counts.Good>=Math.ceil(rows.length/2)?"Good":counts.Low>=Math.ceil(rows.length/2)?"Low":"Moderate";
  return {
    overall,counts,rows,
    specialPoints:Object.entries(structural.arudhas).filter(([key])=>["AL","A2","A4","A9","A10","A11","UL"].includes(key)).map(([key,value])=>({key,...value})),
    nodes:structural.nodes,
    unavailable:structural.unavailable.filter((item)=>/Lagna/.test(item)),
    method:[
      "D1 establishes stored structural promise and receives priority over every confirming layer.",
      "Functional lordship, dignity, dispositors, aspects and configured yogas describe delivery quality.",
      "BAV/SAV confirm manifestation support; they do not replace the house lord or D1 promise.",
      "The relevant divisional chart specializes the topic; independent repetition raises confidence.",
      "Arudha Lagna and topic Arudhas describe visible or material manifestation.",
      "Rahu and Ketu are interpreted through house, sign lord, nakshatra lord and cross-Varga reinforcement.",
      "MD-AD, transits and current dates are deliberately excluded from this tab.",
    ],
    sources:["Master Rulebook V2 §§11-21 (hierarchy, AV, Arudha and Varga repetition)","Master Rulebook V2 §§42-46 (Trivedi-style nodal chain)","BPHS-derived dignity, lordship, Varga and yoga framework; paraphrased operationally"],
  };
}

export function buildPredictionReport(result, asOf = new Date()) {
  const structural = buildStructuralAnalysis(result);
  const birthDate = new Date(result.utc);
  const timeline = vimshottariTimeline(result.positions.Moon.longitude, birthDate, asOf);
  timeline.periods = timeline.periods.map((period) => ({ ...period, geometry: periodGeometry(result.charts.D1, period.mdLord, period.adLord), theme:periodTheme(result,structural,period,asOf) }));
  const current = timeline.periods.find((period) => period.current);
  const domains = Object.fromEntries(Object.keys(DOMAIN_SPECS).map((key) => {
    const domain = evaluateDomain(result, key);
    const savValues = domain.houses.map((house) => {
      const sign = result.charts.D1.rows.find((row) => row.house === house).sign;
      return structural.ashtakavarga.sav[sign];
    });
    const savAverage = savValues.reduce((a,b)=>a+b,0)/savValues.length;
    const calculatedLayers = ["D1 promise","relevant Varga","functional lordship","sign dignity","graha aspects","dispositor chains","BAV/SAV","Arudha","configured yogas","node controllers","MD-AD"];
    const missingLayers = ["Shadbala/Bhavabala","live transit","Pratyantardasha"];
    const coverage = Math.round(100 * calculatedLayers.length / (calculatedLayers.length + missingLayers.length));
    const label = domain.evidence.length >= 8 ? "Good" : domain.evidence.length >= 5 ? "Moderate" : "Preliminary";
    domain.dimensions.confidence = label;
    domain.confidenceDetail = { label, coverage, meaning:"Evidence coverage, not probability of an event.", calculatedLayers, missingLayers, savAverage:Number(savAverage.toFixed(1)) };
    domain.confirmation = buildConfirmation(result, domain, structural, current, savAverage);
    domain.dimensions.promise = domain.confirmation.label;
    domain.dimensions.strength = domain.confirmation.label;
    domain.evidence.unshift({ tone:savAverage >= structural.ashtakavarga.average ? "support" : "caution", source:"P3 Ashtakavarga", title:`Topic-house SAV averages ${savAverage.toFixed(1)}`, detail:`Chart average is ${structural.ashtakavarga.average.toFixed(1)}. SAV confirms environmental support; it does not replace lordship.` });
    return [key,domain];
  }));
  const foreignAnalysis=buildForeignAnalysis(result,structural,current);
  const overallPromises=buildOverallPromises(result,structural,domains);
  return {
    generatedFor: isoDay(asOf),
    domains,
    structural,
    timeline,
    currentPeriod: current || null,
    foreignAnalysis,
    overallPromises,
    readingOrder: [
      "Start with D1 structural promise and functional house lords.",
      "Open the relevant domain Varga; repetition is stronger than one isolated indication.",
      "Read Promise, Strength, Ease and Stability separately.",
      "Use MD as the environment and AD as the event executor; inspect their geometry and activated houses.",
      "Treat nodes through their sign and nakshatra dispositors, not ordinary dignity alone.",
      "Use transit last as a trigger; it cannot create an event absent from promise and dasha activation.",
    ],
  };
}
