import { SIGNS, shashtiamsaAmsha } from "./varga-engine.js";
import { buildStructuralAnalysis } from "./analysis-engine.js";

export const PLANET_RULERS = Object.freeze({
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
});

export const DOMAIN_SPECS = Object.freeze({
  overview: { label: "Overview", varga: "D1", houses: [1, 5, 9, 10, 11], vargaHouses:[1,5,9,10,11], karakas:["Sun","Jupiter"], method:"D1 Lagna, Lagna lord, trines and angular/action houses establish the natal structure." ,description: "Structural promise and the strongest repeated themes." },
  money: { label: "Money", varga: "D2", houses: [2, 5, 9, 10, 11, 12], vargaHouses:[1,2,5,9,11], karakas:["Jupiter","Venus"], method:"D1 houses 2 and 11 establish accumulation and gains; Hora evaluates the condition of their carriers and planetary Hora suitability.", description: "Earning, accumulation, retention, expenses and scalability." },
  career: { label: "Career", varga: "D10", houses: [1, 2, 6, 9, 10, 11], vargaHouses:[1,6,9,10,11], karakas:["Sun","Saturn","Mercury"], method:"D10 Lagna/Lagna lord and houses 6, 9, 10 and 11 specialize work, authority, vocation and gains from activity.", description: "Professional direction, activity, achievement and status." },
  fame: { label: "Fame & authority", varga: "D5", houses: [1, 5, 9, 10, 11], vargaHouses:[1,5,9,10,11], karakas:["Sun","Jupiter"], method:"D5 is used as a focused confirmation of power and recognition through its Lagna, trines, 10th and the Sun; it does not replace D1 status combinations.", description: "Recognition, public authority, influence and power." },
  marriage: { label: "Marriage", varga: "D9", houses: [1, 2, 7, 8], vargaHouses:[1,2,7,8,9,12], karakas:["Venus","Jupiter"], method:"D9 Lagna and 7th house/lord judge partnership; the 7th is also used as a spouse reference, with 2nd/8th continuity and 9th dharma.", description: "Partnership promise, harmony, durability and maturation." },
  foreign: { label: "Foreign", varga: "D4", houses: [3,4,7,9,12], vargaHouses:[3,7,9,12], karakas:["Rahu","Moon"], supportingVargas:["D10","D9"], method:"D4 judges residence and fortune: 3rd shows leaving home, 7th/9th/12th and the D4 badhaka house show distance or foreign residence, with Rahu as the foreign-place indicator.", description: "Foreign movement, residence away from birthplace, work abroad and settlement." },
  property: { label: "Property", varga: "D4", houses: [2, 4, 8, 11, 12], vargaHouses:[1,4,5,8,9,11,12], karakas:["Mars","Moon","Venus"], method:"D4 Lagna/Lagna lord and houses 4, 5 and 9 judge residence, property and fortune; 8 indicates abrupt change and 11/12 acquisition versus outlay.", description: "Land, residence, acquisition, ownership and expenditure." },
  vehicles: { label: "Vehicles", varga: "D16", houses: [1, 4, 11], vargaHouses:[1,4,9,11,12], karakas:["Venus","Moon"], method:"D16 Lagna/Lagna lord, 4th house/lord, Venus and Moon specialize conveyances and comforts; 11/12 modify acquisition and loss/outlay.", description: "Vehicles, comforts, pleasures and visible material quality." },
  gains: { label: "Gains", varga: "D11", houses: [2, 10, 11], vargaHouses:[1,2,10,11,12], karakas:["Jupiter","Mercury"], method:"D11 is treated as a gains/fulfilment confirmation through Lagna, houses 2, 10 and 11 and their lords; the selected D11 calculation profile is explicitly school-dependent.", description: "Income conversion, networks, fulfillment and retention." },
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

const STRONG_DIGNITIES=new Set(["Exalted","Moolatrikona","Own sign"]);
function d60Reliability(result){
  const sensitivity=result.birthTimeSensitivity;
  const reliable=Boolean(sensitivity?.stability?.D60&&sensitivity?.d60AmshaStable);
  return {
    reliable,
    label:reliable?"Included as fine confirmation":"Excluded from scoring",
    reason:reliable
      ? `D60 ascendant and amsha remained stable across the configured +/-${sensitivity.rangeMinutes||10}-minute audit.`
      : sensitivity
        ? `${sensitivity.level}: D60 did not remain stable enough to affect a conclusion.`
        : "No birth-time perturbation audit is attached; D60 is displayed only and cannot affect a conclusion.",
  };
}

const MOVABLE=new Set(["Aries","Cancer","Libra","Capricorn"]), FIXED=new Set(["Taurus","Leo","Scorpio","Aquarius"]);
function badhakaHouse(ascSign){ return MOVABLE.has(ascSign)?11:FIXED.has(ascSign)?9:7; }
function vargaDomainAnalysis(result,domain){
  if(domain.key==="money") return evaluateHoraWealth(result,buildStructuralAnalysis(result));
  const chart=result.charts[domain.varga]||result.charts.D1;
  const focus=[...new Set(domain.vargaHouses||domain.houses)];
  if(domain.key==="foreign") focus.push(badhakaHouse(chart.ascSign));
  const houses=[...new Set(focus)].map((house)=>{
    const lord=houseLord(chart,house), lordHouse=bodyHouse(chart,lord), occupants=rowByHouse(chart,house)?.bodies||[];
    return {house,lord,lordHouse,occupants};
  });
  const lagnaLord=houseLord(chart,1),lagnaLordHouse=bodyHouse(chart,lagnaLord);
  const karakas=(domain.karakas||[]).map((planet)=>({planet,house:bodyHouse(chart,planet),sign:bodySign(chart,planet)}));
  const supportive=new Set([1,4,5,7,9,10,11]);
  let points=houses.reduce((n,item)=>n+(item.occupants.length?1:0)+(supportive.has(item.lordHouse)?1:0),0);
  points+=supportive.has(lagnaLordHouse)?2:0;
  points+=karakas.filter((item)=>focus.includes(item.house)||supportive.has(item.house)).length;
  if(domain.key==="foreign"){
    const bh=badhakaHouse(chart.ascSign),rahuHouse=bodyHouse(chart,"Rahu"),bhLord=houseLord(chart,bh);
    const foreignLink=[7,9,12,bh].includes(rahuHouse)||bodyHouse(chart,bhLord)===rahuHouse||bodyHouse(chart,houseLord(chart,7))===bh;
    points+=foreignLink?4:0;
  }
  const max=Math.max(8,houses.length*2+2+karakas.length+4*(domain.key==="foreign"));
  const score=Math.round(clamp(20+75*points/max,20,95));
  return {score,label:confirmationLabel(score),chart:domain.varga,method:domain.method,lagna:chart.ascSign,lagnaLord,lagnaLordHouse,houses,karakas,badhaka:domain.key==="foreign"?{house:badhakaHouse(chart.ascSign),lord:houseLord(chart,badhakaHouse(chart.ascSign))}:null,
    detail:`${domain.method} ${lagnaLord} rules ${domain.varga} Lagna and occupies H${lagnaLordHouse}; ${houses.filter((item)=>item.occupants.length).length} of ${houses.length} method-specific houses are occupied.`};
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
  const d1Score = Math.round(25 + 75 * d1Checks.filter(Boolean).length / d1Checks.length);
  const vargaAnalysis=domain.key==="money"?evaluateHoraWealth(result,structural):vargaDomainAnalysis(result,domain);
  const hora=domain.key==="money"?vargaAnalysis:null;
  const vargaScore = vargaAnalysis.score;
  const avScore = Math.round(clamp(50 + (savAverage - structural.ashtakavarga.average) * 7, 20, 90));
  const relevantYogaTypes = ["money", "gains"].includes(domain.key) ? ["wealth"] : ["career", "fame", "overview"].includes(domain.key) ? ["status", "wealth"] : [];
  const yogaCount = structural.yogas.filter((yoga) => relevantYogaTypes.includes(yoga.type)).length;
  const dignifiedLords = new Set(domain.houses.map((house) => houseLord(d1, house))).size;
  const conditionedLords = [...new Set(domain.houses.map((house) => houseLord(d1, house)))].filter((lord) => STRONG_DIGNITIES.has(structural.planets[lord]?.dignity)||structural.planets[lord]?.dignity==="Friendly sign").length;
  const structureScore = Math.round(clamp(35 + yogaCount * 15 + (conditionedLords / Math.max(1, dignifiedLords)) * 35, 20, 95));
  const periodLords = current ? [current.mdLord, current.adLord] : [];
  const activationCount = periodLords.reduce((count, lord) => {
    const planet = structural.planets[lord];
    if (!planet) return count;
    const vargaHouse = bodyHouse(varga, lord), owned=[];
    for(let house=1;house<=12;house+=1) if(houseLord(varga,house)===lord) owned.push(house);
    return count + (domain.houses.includes(planet.house) ? 1 : 0) + ((domain.vargaHouses||domain.houses).includes(vargaHouse) ? 1 : 0) + planet.housesOwned.filter((house) => domain.houses.includes(house)).length + owned.filter((house)=>(domain.vargaHouses||domain.houses).includes(house)).length;
  }, 0);
  const activationScore=current?Math.round(clamp(20+activationCount*12,20,95)):20;
  const axisAssessment=current?assessMdAdAxis(current.geometry):null;
  const timingJudgment=current?combineTimingJudgment(axisAssessment,activationScore):{score:25,label:"Low",raw:25,capped:false,axisWeight:MD_AD_AXIS_WEIGHT,activationWeight:100-MD_AD_AXIS_WEIGHT};
  const timingScore=timingJudgment.score;
  const components = [
    { key:"d1", label:"D1 structural promise", chart:"D1", weight:CONFIRMATION_WEIGHTS.d1, score:d1Score, detail:`${d1Checks.filter(Boolean).length} of ${d1Checks.length} configured house/lord checks support the topic.` },
    { key:"varga", label:`${domain.varga} method-specific confirmation`, chart:domain.varga, weight:CONFIRMATION_WEIGHTS.varga, score:vargaScore, detail:vargaAnalysis.detail },
    { key:"ashtakavarga", label:"Ashtakavarga support", chart:"SAV", weight:CONFIRMATION_WEIGHTS.ashtakavarga, score:avScore, detail:`Topic-house SAV ${savAverage.toFixed(1)} versus chart average ${structural.ashtakavarga.average.toFixed(1)}.` },
    { key:"structure", label:"Lords, dignity & yogas", chart:"Structure", weight:CONFIRMATION_WEIGHTS.structure, score:structureScore, detail:`${conditionedLords} conditioned topic lords and ${yogaCount} relevant configured yogas.` },
    { key:"timing", label:"Current MD-AD axis and activation", chart:"Timing", weight:CONFIRMATION_WEIGHTS.timing, score:timingScore, detail:current ? `${current.mdLord}-${current.adLord} is a ${axisAssessment.pair} axis (${axisAssessment.tone}). The axis contributes ${MD_AD_AXIS_WEIGHT}% of this timing grade and ${activationCount} topic-house activations contribute ${100-MD_AD_AXIS_WEIGHT}%. ${axisAssessment.detail}${timingJudgment.capped?` Delivery is capped at ${timingJudgment.label}.`:""}` : "No current MD-AD period was available." },
  ];
  const score = Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) / 100);
  return { score, label:confirmationLabel(score), components, hora, vargaAnalysis, timingJudgment, methodNote:"D1 governs the natal promise. Each relevant Varga is then judged by its own Lagna, topic houses, lords and karakas; within timing, the MD-AD placement axis controls 65% and activation/support controls 35%. MD-AD cannot manufacture an absent D1 promise." };
}

export function vimshottariTimeline(moonLongitude, birthDate, asOf = new Date()) {
  const segment = 360 / 27;
  const nakshatraIndex = Math.floor((((moonLongitude % 360) + 360) % 360) / segment);
  const lordIndex = nakshatraIndex % 9;
  const lord = DASHA_LORDS[lordIndex];
  const fractionElapsed = ((moonLongitude % segment) + segment) % segment / segment;
  let mdStart = addYears(birthDate, -fractionElapsed * DASHA_YEARS[lord]);
  const periods = [];
  const lifeEnd=addYears(birthDate,120);
  for (let cycle = 0; cycle < 18; cycle += 1) {
    const mdLord = DASHA_LORDS[(lordIndex + cycle) % 9];
    const mdEnd = addYears(mdStart, DASHA_YEARS[mdLord]);
    let adStart = mdStart;
    const mdSequenceIndex = DASHA_LORDS.indexOf(mdLord);
    for (let sub = 0; sub < 9; sub += 1) {
      const adLord = DASHA_LORDS[(mdSequenceIndex + sub) % 9];
      const adEnd = addYears(adStart, DASHA_YEARS[mdLord] * DASHA_YEARS[adLord] / 120);
      if (adEnd >= birthDate && adStart <= lifeEnd) {
        periods.push({ mdLord, adLord, start: isoDay(adStart), end: isoDay(adEnd), current: asOf >= adStart && asOf < adEnd });
      }
      adStart = adEnd;
    }
    mdStart = mdEnd;
    if (mdStart > lifeEnd) break;
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

export const MD_AD_AXIS_WEIGHT = 65;

export function assessMdAdAxis(geometry) {
  const pair = geometry?.pair;
  const rules = {
    "6/8": { score:15, cap:39, level:"Low", tone:"Severe friction", detail:"The period lords occupy a 6-8 relationship. Conflict, obstruction, adjustment and uneven delivery dominate even when the individual lords are otherwise strong." },
    "2/12": { score:34, cap:54, level:"Low", tone:"Loss / transition", detail:"The period lords occupy a 2-12 relationship. Expenditure, separation, transition or leakage can outweigh apparent strength unless the promised topic specifically requires those themes." },
    "7/7": { score:52, cap:64, level:"Moderate", tone:"Opposition / negotiation", detail:"The period lords oppose one another. Results depend on negotiation, counterparties and the ability to reconcile competing agendas." },
    "4/10": { score:76, cap:95, level:"Good", tone:"Constructive action axis", detail:"The period lords form a 4-10 relationship, supporting concrete action and restructuring when the natal promise agrees." },
    "5/9": { score:88, cap:95, level:"Good", tone:"Trinal cooperation", detail:"The period lords form a 5-9 relationship, allowing their agendas to cooperate and reinforce promised results." },
    "3/11": { score:78, cap:95, level:"Good", tone:"Effort-to-gain axis", detail:"The period lords form a 3-11 relationship, favouring results through effort, initiative, networks and fulfilment." },
    "1/1": { score:72, cap:90, level:"Good", tone:"Concentrated agenda", detail:"The period lords occupy the same house, concentrating delivery; conjunction quality and the shared house still modify the outcome." },
  };
  const rule=rules[pair]||{score:50,cap:70,level:"Moderate",tone:"Controller-dependent",detail:"No standard placement-axis rule is available, so dispositors, ownership and associations control the timing judgment."};
  return {...rule,pair:pair||"Controller route",weight:MD_AD_AXIS_WEIGHT};
}

function combineTimingJudgment(axisAssessment, activationScore) {
  const raw=Math.round(axisAssessment.score*(MD_AD_AXIS_WEIGHT/100)+activationScore*((100-MD_AD_AXIS_WEIGHT)/100));
  const score=Math.min(axisAssessment.cap,clamp(raw,15,95));
  return {score,label:confirmationLabel(score),raw,capped:score<raw,axisWeight:MD_AD_AXIS_WEIGHT,activationWeight:100-MD_AD_AXIS_WEIGHT};
}

function periodTheme(result, structural, period, asOf, geometry=periodGeometry(result.charts.D1,period.mdLord,period.adLord)) {
  const d1=result.charts.D1;
  const lords=[period.mdLord,period.adLord];
  const ranked=Object.entries(DOMAIN_SPECS).map(([key,spec])=>{
    const varga=result.charts[spec.varga]||d1, vargaHouses=spec.vargaHouses||spec.houses;
    const activations=lords.reduce((sum,lord)=>{
      const planet=structural.planets[lord];
      if(!planet) return sum;
      const owned=[]; for(let house=1;house<=12;house+=1) if(houseLord(varga,house)===lord) owned.push(house);
      return sum+(spec.houses.includes(planet.house)?1:0)+(vargaHouses.includes(bodyHouse(varga,lord))?1:0)+planet.housesOwned.filter((house)=>spec.houses.includes(house)).length+owned.filter((house)=>vargaHouses.includes(house)).length+(spec.karakas?.includes(lord)?1:0);
    },0);
    const savValues=spec.houses.map((house)=>structural.ashtakavarga.sav[rowByHouse(d1,house).sign]);
    const savAverage=savValues.reduce((sum,value)=>sum+value,0)/savValues.length;
    return {key,label:spec.label,varga:spec.varga,method:spec.method,activations,savAverage:Number(savAverage.toFixed(1)),support:savAverage>=structural.ashtakavarga.average,rank:activations*2+(savAverage>=structural.ashtakavarga.average?1:0)};
  }).sort((a,b)=>b.rank-a.rank||b.activations-a.activations);
  const leaders=ranked.slice(0,3);
  const d60Status=d60Reliability(result);
  const d60=lords.map((lord)=>{const amsha=shashtiamsaAmsha(result.positions[lord].longitude);return {lord,...amsha,rawNature:amsha.nature,nature:d60Status.reliable?amsha.nature:"Display only - not scored",included:d60Status.reliable};});
  const activationTotal=leaders[0].activations+leaders[1].activations;
  const supportCount=leaders.slice(0,2).filter((item)=>item.support).length;
  const beneficAmshas=d60.filter((item)=>item.rawNature==="Benefic").length;
  const activationScore=Math.round(clamp(20+activationTotal*7+supportCount*6,20,95));
  const axisAssessment=assessMdAdAxis(geometry);
  const timingJudgment=combineTimingJudgment(axisAssessment,activationScore);
  const delivery=timingJudgment.label;
  const directD1Load=lords.map((lord)=>{
    const planet=structural.planets[lord];
    return {lord,house:planet?.house,housesOwned:planet?.housesOwned||[],aspectedHouses:structural.aspects.filter((aspect)=>aspect.body===lord).map((aspect)=>aspect.toHouse)};
  });
  const activatedHouses=[...new Set(directD1Load.flatMap((item)=>[item.house,...item.housesOwned,...item.aspectedHouses]).filter(Boolean))].sort((a,b)=>a-b);
  const nodeControllers=lords.filter((lord)=>["Rahu","Ketu"].includes(lord)).map((lord)=>{
    const node=structural.nodes.find((item)=>item.node===lord);
    return {node:lord,signDispositor:node?.signDispositor,nakshatraLord:node?.nakshatraLord};
  });
  const d1LoadText=directD1Load.map((item)=>`${item.lord} occupies H${item.house}${item.housesOwned.length?` and owns ${item.housesOwned.map((house)=>`H${house}`).join("/")}`:""}`).join("; ");
  const controllerText=nodeControllers.length?` Node delivery is routed through ${nodeControllers.map((item)=>`${item.node}: ${item.signDispositor} (sign) and ${item.nakshatraLord} (nakshatra)`).join("; ")}.`:"";
  const start=new Date(`${period.start}T00:00:00Z`),end=new Date(`${period.end}T00:00:00Z`);
  const phase=period.current?"current":end<asOf?"past":"upcoming";
  return {
    phase,delivery,axisAssessment,timingJudgment,activationScore,
    headline:`${leaders[0].label} and ${leaders[1].label}`,
    domains:leaders,
    d60,d60Reliability:d60Status,directD1Load,activatedHouses,nodeControllers,
    summary:`MD-AD axis ${axisAssessment.pair} (${axisAssessment.tone}) controls ${MD_AD_AXIS_WEIGHT}% of the timing grade; topic activation controls ${100-MD_AD_AXIS_WEIGHT}%. ${axisAssessment.detail}${timingJudgment.capped?` The ${axisAssessment.pair} rule caps this period at ${timingJudgment.label}.`:""} ${period.mdLord} sets the period environment and ${period.adLord} executes it. Direct D1 load: ${d1LoadText}.${controllerText} ${leaders[0].label} is the strongest specialist-chart activation (${leaders[0].varga}); its house SAV is ${leaders[0].support?"supportive":"below the chart average"}. ${d60Status.reliable?`${beneficAmshas} of the 2 period lords occupy benefic D60 amshas.`:`D60 is excluded from this judgment: ${d60Status.reason}`}`,
  };
}

const COMBUSTION_ORBS=Object.freeze({Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:15});
const NATURAL_NATURE=Object.freeze({Sun:"Natural malefic / authority karaka",Moon:"Natural benefic when bright; mind/public karaka",Mars:"Natural malefic / action karaka",Mercury:"Adaptive natural benefic; changes by association",Jupiter:"Natural benefic / wisdom and expansion karaka",Venus:"Natural benefic / relationship and comfort karaka",Saturn:"Natural malefic / endurance and work karaka",Rahu:"Node; amplifies its controllers and associations",Ketu:"Node; separates, specializes and follows its controllers"});
function angleDistance(a,b){const d=Math.abs(a-b)%360;return Math.min(d,360-d);}
function buildMahadashaRankings(result,structural,timeline){
  const d1=result.charts.D1,d9=result.charts.D9,d10=result.charts.D10;
  const d60Status=d60Reliability(result);
  const windows=Object.fromEntries(DASHA_LORDS.map((lord)=>{
    const rows=timeline.periods.filter((item)=>item.mdLord===lord);
    return [lord,rows.length?{start:rows[0].start,end:rows.at(-1).end,current:rows.some((item)=>item.current)}:null];
  }));
  return DASHA_LORDS.map((lord)=>{
    const p=structural.planets[lord],house=p.house,upachaya=[3,6,10,11].includes(house),kendra=[1,4,7,10].includes(house),trikona=[1,5,9].includes(house);
    const received=structural.aspects.filter((a)=>a.toHouse===house&&a.body!==lord).map((a)=>a.body);
    const conjunctions=rowByHouse(d1,house).bodies.filter((body)=>body!==lord&&body!=="Asc");
    const orb=COMBUSTION_ORBS[lord],solarDistance=orb?angleDistance(result.positions[lord].longitude,result.positions.Sun.longitude):null;
    const combust=Boolean(orb&&solarDistance<=orb),sunStrong=STRONG_DIGNITIES.has(structural.planets.Sun.dignity)||[1,5,9,10,11].includes(structural.planets.Sun.house);
    const dispositor=p.dispositor.controller,dispositorStrong=structural.planets[dispositor]&&(STRONG_DIGNITIES.has(structural.planets[dispositor].dignity)||[1,4,5,7,9,10,11].includes(structural.planets[dispositor].house));
    const saturnSupport=combust&&received.includes("Saturn")&&(["FB","Mixed"].includes(structural.planets.Saturn.functional.code)||[3,6,10,11].includes(structural.planets.Saturn.house));
    const mitigations=[kendra||trikona?"angular/trinal placement":null,sunStrong?"supportive Sun condition":null,dispositorStrong?"supportive dispositor":null,saturnSupport?"constructive Saturn aspect":null].filter(Boolean);
    const d9House=bodyHouse(d9,lord),d10House=bodyHouse(d10,lord),d60=shashtiamsaAmsha(result.positions[lord].longitude);
    let score=45+(p.functional.code==="FB"?15:p.functional.code==="FM"?-10:0)+(STRONG_DIGNITIES.has(p.dignity)?12:p.dignity==="Debilitated"?-12:0)+(kendra?7:0)+(trikona?8:0)+(upachaya?5:0)+(received.includes("Jupiter")?5:0)+(p.debilitation.cancelled?7:0)+([1,4,5,7,9,10,11].includes(d9House)?4:0)+([1,6,9,10,11].includes(d10House)?5:0)+(d60Status.reliable?(d60.nature==="Benefic"?5:d60.nature==="Malefic"?-5:0):0)+(result.positions[lord].retrograde?0:0);
    if(combust) score-=Math.max(2,10-mitigations.length*2);
    score=Math.round(clamp(score,15,95));
    const themes=Object.values(DOMAIN_SPECS).map((spec)=>({label:spec.label,varga:spec.varga,points:(spec.houses.includes(house)?2:0)+p.housesOwned.filter((h)=>spec.houses.includes(h)).length+((spec.vargaHouses||spec.houses).includes(bodyHouse(result.charts[spec.varga]||d1,lord))?1:0)+(spec.karakas?.includes(lord)?1:0)})).sort((a,b)=>b.points-a.points).slice(0,3);
    return {lord,score,level:score>=68?"Good":score>=45?"Moderate":"Low",window:windows[lord],house,sign:p.sign,housesOwned:p.housesOwned,functional:p.functional,dignity:p.dignity,debilitation:p.debilitation,retrograde:Boolean(result.positions[lord].retrograde),upachaya,kendra,trikona,received,conjunctions,dispositor,dispositorStrong,combustion:{applicable:Boolean(orb),combust,distance:solarDistance===null?null:Number(solarDistance.toFixed(2)),orb,mitigations,statement:!orb?"Combustion is not applied to this body.":!combust?`Outside the configured ${orb}° combustion orb.`:`Combustion is a delivery modifier with ${mitigations.length} mitigating context(s); it is not treated as destruction.`},d9House,d10House,d60:{...d60,rawNature:d60.nature,nature:d60Status.reliable?d60.nature:"Display only - not scored",included:d60Status.reliable},d60Reliability:d60Status,themes,naturalNature:NATURAL_NATURE[lord]};
  }).sort((a,b)=>b.score-a.score);
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
  const methodAnalysis=key==="money"?null:vargaDomainAnalysis(result,{key,...spec});
  if(methodAnalysis){
    support+=methodAnalysis.houses.filter((item)=>item.occupants.length).length;
    evidence.push({tone:"support",source:"BPHS Ch. 7 + PVR Varga method",title:`${spec.varga} is read by its own rule set`,detail:methodAnalysis.detail});
    methodAnalysis.houses.filter((item)=>item.occupants.length).slice(0,4).forEach((item)=>evidence.push({tone:"support",source:`${spec.varga} specialized frame`,title:`${spec.varga} H${item.house}: ${item.occupants.join(", ")}`,detail:`H${item.house} lord ${item.lord} occupies H${item.lordHouse} in ${spec.varga}.`}));
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
    vargaMethod:methodAnalysis||{method:spec.method},
    evidence: evidence.slice(0, 12),
    limitations: "Shadbala, Bhavabala, Pratyantardasha and live transit triggers are not yet calculated; this result is structured confirmation, not a denial or certainty statement.",
  };
}

function buildForeignAnalysis(result,structural,current) {
  const d1=result.charts.D1,d4=result.charts.D4,d9=result.charts.D9,d10=result.charts.D10;
  const focusHouses=[1,3,4,7,9,12], d4Houses=[3,7,9,12];
  const lords=Object.fromEntries(focusHouses.map((house)=>[house,houseLord(d1,house)]));
  const lagnaLord=houseLord(d1,1), lagnaLordHouse=bodyHouse(d1,lagnaLord);
  const aspectLinks=structural.aspects.filter((aspect)=>aspect.body===lagnaLord&&focusHouses.includes(aspect.toHouse));
  const lordLinks=[...new Set(Object.values(lords))].filter((lord)=>{
    const house=bodyHouse(d1,lord);
    return house===lagnaLordHouse||structural.aspects.some((aspect)=>(aspect.body===lord&&aspect.toHouse===lagnaLordHouse)||(aspect.body===lagnaLord&&aspect.toHouse===house));
  });
  const rahuHouse=bodyHouse(d1,"Rahu"), rahuAspects=structural.aspects.filter((aspect)=>aspect.body==="Rahu"&&focusHouses.includes(aspect.toHouse)).map((aspect)=>aspect.toHouse);
  const connected=(a,b)=>{
    const pa=bodyHouse(d1,a),pb=bodyHouse(d1,b);
    return a===b||pa===pb||structural.aspects.some((aspect)=>(aspect.body===a&&aspect.toHouse===pb)||(aspect.body===b&&aspect.toHouse===pa));
  };
  const houseLayer=focusHouses.map((house)=>{
    const lord=lords[house],planet=structural.planets[lord];
    return {house,lord,lordHouse:bodyHouse(d1,lord),occupants:rowByHouse(d1,house).bodies,sav:structural.ashtakavarga.sav[rowByHouse(d1,house).sign],dignity:planet?.dignity,functional:planet?.functional?.code||"—",dispositor:planet?.dispositor};
  });
  const lordConnections=[
    {label:"1L–9L",a:lagnaLord,b:lords[9],meaning:"The native and long-distance fortune/dharma"},
    {label:"1L–12L",a:lagnaLord,b:lords[12],meaning:"The native and residence away/separation"},
    {label:"4L–9L",a:lords[4],b:lords[9],meaning:"Home base and long-distance movement"},
    {label:"4L–12L",a:lords[4],b:lords[12],meaning:"Home base and life away from birthplace"},
    {label:"9L–12L",a:lords[9],b:lords[12],meaning:"Long-distance movement and foreign residence"},
    {label:"7L–12L",a:lords[7],b:lords[12],meaning:"Distant environments/contracts and foreign residence"},
  ].map((item)=>({...item,linked:connected(item.a,item.b),aHouse:bodyHouse(d1,item.a),bHouse:bodyHouse(d1,item.b)}));
  const chartLayer=(chart,code,houses)=>({code,houses:houses.map((house)=>({house,occupants:rowByHouse(chart,house).bodies})),activations:houses.reduce((sum,house)=>sum+rowByHouse(chart,house).bodies.length,0)});
  const d4Layer=chartLayer(d4,"D4",d4Houses),d10Layer=chartLayer(d10,"D10",[9,12]),d9Layer=chartLayer(d9,"D9",[9,12]);
  const movementPoints=(rowByHouse(d1,9).bodies.length?1:0)+(rowByHouse(d1,12).bodies.length?1:0)+lordConnections.filter((item)=>item.linked).length+d4Layer.activations+(rahuAspects.length||[9,12].includes(rahuHouse)?1:0);
  const basePoints=(rowByHouse(d1,4).bodies.length?1:0)+(rowByHouse(d1,12).bodies.length?1:0)+rowByHouse(d4,12).bodies.length+(lordConnections.some((item)=>["1L–12L","4L–12L","9L–12L"].includes(item.label)&&item.linked)?1:0);
  const level=(points)=>points>=4?"Good":points>=2?"Moderate":"Low";
  const axis=current?.geometry||null;
  const axisResult=!axis?"No active MD-AD axis":axis.pair==="6/8"?"High adjustment and friction; results require saving factors.":axis.pair==="4/10"?"Strong relocation-versus-duty axis; concrete restructuring is possible.":axis.pair==="3/11"?"Effort can convert into networks and gains.":axis.pair==="5/9"?"Supportive trinal coordination.":axis.pair==="2/12"?"Movement, expenditure and transition are emphasized.":axis.relation;
  return {
    houses:houseLayer,
    lordConnections,
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
    d60Reliability:d60Reliability(result),
    d60:[...new Set([...Object.values(lords),...(current?[current.mdLord,current.adLord]:[])])].map((lord)=>{const amsha=shashtiamsaAmsha(result.positions[lord].longitude),status=d60Reliability(result);return {lord,...amsha,rawNature:amsha.nature,nature:status.reliable?amsha.nature:"Display only - not scored",included:status.reliable};}),
  };
}

function buildForeignPropertyAnalysis(result,structural,current){
  const d1=result.charts.D1,d4=result.charts.D4;
  const h4Lord=houseLord(d1,4),h9Lord=houseLord(d1,9),h12Lord=houseLord(d1,12);
  const d4LagnaLord=houseLord(d4,1),d4FourthLord=houseLord(d4,4),d4NinthLord=houseLord(d4,9);
  const connected=(first,second)=>{
    if(first===second) return true;
    const firstHouse=bodyHouse(d1,first),secondHouse=bodyHouse(d1,second);
    return firstHouse===secondHouse||structural.aspects.some((aspect)=>(aspect.body===first&&aspect.toHouse===secondHouse)||(aspect.body===second&&aspect.toHouse===firstHouse));
  };
  const nodeAxis=bodyHouse(d1,"Ketu")===4&&bodyHouse(d1,"Rahu")===10;
  const d4NodeAxis=bodyHouse(d4,"Ketu")===4&&bodyHouse(d4,"Rahu")===10;
  const moonForeignStrength=bodyHouse(d1,h12Lord)===12&&STRONG_DIGNITIES.has(structural.planets[h12Lord]?.dignity);
  const fourthNinthLink=connected(h4Lord,h9Lord);
  const fourthTwelfthLink=connected(h4Lord,h12Lord);
  const d4FourthLordHouse=bodyHouse(d4,d4FourthLord),d4NinthLordHouse=bodyHouse(d4,d4NinthLord);
  const d4LagnaLordHouse=bodyHouse(d4,d4LagnaLord);
  const wealthControllers=[...new Set([houseLord(d1,2),houseLord(d1,11)])];
  const strongWealthControllers=wealthControllers.filter((lord)=>STRONG_DIGNITIES.has(structural.planets[lord]?.dignity)).length;

  let foreignPoints=0;
  if(moonForeignStrength) foreignPoints+=2;
  if(nodeAxis) foreignPoints+=2;
  if(fourthNinthLink) foreignPoints+=2;
  if(fourthTwelfthLink) foreignPoints+=1;
  if([9,10,11,12].includes(d4FourthLordHouse)) foreignPoints+=2;
  if([9,10,12].includes(bodyHouse(d4,"Rahu"))) foreignPoints+=1;
  if([1,4,5,7,9,10,11].includes(bodyHouse(d4,"Jupiter"))) foreignPoints+=1;

  let acquisitionPoints=0;
  if(structural.planets[h4Lord]?.functional?.code==="FB") acquisitionPoints+=2;
  if([1,4,5,7,9,10,11].includes(bodyHouse(d1,h4Lord))) acquisitionPoints+=1;
  if([1,4,5,7,9,10,11].includes(d4LagnaLordHouse)) acquisitionPoints+=1;
  if([1,4,5,7,9,10,11].includes(d4FourthLordHouse)) acquisitionPoints+=2;
  acquisitionPoints+=strongWealthControllers*2;

  let fortunePoints=0;
  if(structural.planets[h9Lord]?.functional?.code==="FB") fortunePoints+=2;
  if(structural.planets[h9Lord]?.functional?.yogakaraka) fortunePoints+=1;
  if(structural.aspects.some((aspect)=>aspect.body===h9Lord&&aspect.toHouse===1)) fortunePoints+=2;
  if([1,5,9].includes(bodyHouse(d1,"Jupiter"))) fortunePoints+=1;
  if([1,4,5,7,9,10,11].includes(d4NinthLordHouse)) fortunePoints+=1;
  if([1,4,5,7,9,10,11].includes(bodyHouse(d4,"Jupiter"))) fortunePoints+=1;

  const stabilityModifiers=[bodyHouse(d1,"Ketu")===4,bodyHouse(d4,"Ketu")===4,[6,8,12].includes(d4FourthLordHouse)].filter(Boolean).length;
  const level=(points,good,moderate)=>points>=good?"Good":points>=moderate?"Moderate":"Low";
  const activationLords=current?[current.mdLord,current.adLord]:[];
  const activeControllers=activationLords.filter((lord)=>[h4Lord,h9Lord,h12Lord,d4FourthLord,d4NinthLord,...wealthControllers].includes(lord));
  return {
    foreignProperty:{level:level(foreignPoints,7,3),points:foreignPoints,detail:"Combines the D1 home/fortune/foreign structure with D4 property and residence controllers. It indicates potential, not a guaranteed country or purchase."},
    acquisition:{level:level(acquisitionPoints,6,3),points:acquisitionPoints,detail:"Separates the ability to acquire property from whether the native remains satisfied living in it."},
    fortune:{level:level(fortunePoints,6,3),points:fortunePoints,detail:"Bhagya is judged from H9/H9 lord, its Lagna contact, Jupiter and D4 repetition."},
    residentialStability:{level:stabilityModifiers>=2?"Moderate":stabilityModifiers===1?"Moderate":"Good",modifiers:stabilityModifiers,detail:stabilityModifiers?"Ketu/property-axis repetition favours changes, multiple bases or detachment from one permanent home; it does not deny ownership.":"No major configured residence-instability modifier repeats."},
    controllers:{h4Lord,h9Lord,h12Lord,d4LagnaLord,d4FourthLord,d4NinthLord,wealthControllers},
    links:{fourthNinthLink,fourthTwelfthLink,nodeAxis,d4NodeAxis,moonForeignStrength},
    timing:{activeControllers,detail:activeControllers.length?`${activeControllers.join(" and ")} ${activeControllers.length===1?"currently activates":"currently activate"} property/fortune/foreign controllers; timing still requires PD and transit narrowing.`:"The current MD-AD does not directly control the configured property/fortune/foreign lords."},
    evidence:[
      {label:"D1 property-fortune link",value:fourthNinthLink?`${h4Lord} controls or connects H4 and H9`:"No direct configured H4L-H9L link"},
      {label:"D1 foreign base",value:moonForeignStrength?`${h12Lord} is strong in H12`:"H12 controller needs additional support"},
      {label:"D1 home-career axis",value:nodeAxis?"Ketu H4 / Rahu H10 repeats relocation pressure":"No exact H4/H10 node axis"},
      {label:"D4 delivery",value:`H4 lord ${d4FourthLord} in H${d4FourthLordHouse}; H9 lord ${d4NinthLord} in H${d4NinthLordHouse}`},
      {label:"D4 home-career repetition",value:d4NodeAxis?"Ketu H4 / Rahu H10 repeats in D4":"No exact D4 H4/H10 node repetition"},
    ],
  };
}

function buildForeignSpouseAnalysis(result,structural,current){
  const d1=result.charts.D1,d9=result.charts.D9;
  const spouseHouse=7, spouseLord=houseLord(d9,spouseHouse),spouseLordHouse=bodyHouse(d9,spouseLord);
  const relativeHouse=(absolute)=>((absolute-spouseHouse+12)%12)+1;
  const placements=["Rahu","Ketu",spouseLord,"Venus","Jupiter"].map((planet)=>({planet,house:bodyHouse(d9,planet),relative:relativeHouse(bodyHouse(d9,planet)),sign:bodySign(d9,planet)}));
  const foreignRelative=[3,7,9,12], links=placements.filter((item)=>foreignRelative.includes(item.relative));
  const d1SeventhLord=houseLord(d1,7),d1SeventhLordHouse=bodyHouse(d1,d1SeventhLord);
  const d1Links=[7,9,12].includes(d1SeventhLordHouse)||[9,12].includes(bodyHouse(d1,"Rahu"));
  const periodLords=current?[current.mdLord,current.adLord]:[];
  const timing=periodLords.filter((lord)=>lord===spouseLord||[7,9,12].includes(bodyHouse(d9,lord))||houseLord(d9,7)===lord||houseLord(d9,9)===lord||houseLord(d9,12)===lord);
  const score=(d1Links?2:0)+links.length+(timing.length?1:0);
  return {level:score>=5?"Good":score>=2?"Moderate":"Low",spouseLord,spouseLordHouse,d1SeventhLord,d1SeventhLordHouse,placements,links,timing,
    method:"D1 7th house/lord establishes spouse promise. D9 Lagna and 7th judge marriage; for origin/distance, the D9 7th is used as the spouse reference and its distance houses are treated only as confirmation, with Rahu and the D1 9th/12th axis.",
    detail:`D9 7th lord ${spouseLord} is in D9 H${spouseLordHouse}. ${links.length} spouse-frame distance link(s) and ${d1Links?"a":"no direct"} D1 7L/Rahu link to H9/H12 are present.`};
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
    specialPoints:[
      ...Object.entries(structural.arudhas).filter(([key])=>["AL","A2","A4","A9","A10","A11","UL"].includes(key)).map(([key,value])=>({key,...value,type:"Arudha"})),
      ...Object.entries(structural.specialLagnas||{}).map(([key,value])=>({key:key.replace(/([A-Z])/g," $1").replace(/^./,(c)=>c.toUpperCase()),house:null,...value,type:"Sunrise-derived"})),
    ],
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
  timeline.periods = timeline.periods.map((period) => {
    const geometry=periodGeometry(result.charts.D1,period.mdLord,period.adLord);
    return {...period,geometry,theme:periodTheme(result,structural,period,asOf,geometry)};
  });
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
  const foreignPropertyAnalysis=buildForeignPropertyAnalysis(result,structural,current);
  const foreignSpouseAnalysis=buildForeignSpouseAnalysis(result,structural,current);
  const overallPromises=buildOverallPromises(result,structural,domains);
  const mahadashaRankings=buildMahadashaRankings(result,structural,timeline);
  return {
    generatedFor: isoDay(asOf),
    domains,
    structural,
    timeline,
    currentPeriod: current || null,
    foreignAnalysis,
    foreignPropertyAnalysis,
    foreignSpouseAnalysis,
    overallPromises,
    mahadashaRankings,
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
