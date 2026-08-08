import { SIGNS } from "./varga-engine.js";
const PLANET_RULERS = Object.freeze({ Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter" });

const CLASSICAL = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const SOURCES = [...CLASSICAL, "Asc"];
const NAKSHATRA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const OWN_SIGNS = { Sun:[4], Moon:[3], Mars:[0,7], Mercury:[2,5], Jupiter:[8,11], Venus:[1,6], Saturn:[9,10] };
const EXALTATION = { Sun:0, Moon:1, Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6 };
const DEBILITATION = { Sun:6, Moon:7, Mars:3, Mercury:11, Jupiter:9, Venus:5, Saturn:0 };
const SPECIAL_ASPECTS = { Mars:[4,7,8], Jupiter:[5,7,9], Saturn:[3,7,10], Rahu:[5,7,9], Ketu:[5,7,9] };

// Target BAV -> contributions counted from Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn and Ascendant.
const AV_RULES = [
  [[1,2,4,7,8,9,10,11],[3,6,10,11],[1,2,4,7,8,9,10,11],[3,5,6,9,10,11,12],[5,6,9,11],[6,7,12],[1,2,4,7,8,9,10,11],[3,4,6,10,11,12]],
  [[3,6,7,8,10,11],[1,3,6,7,9,10,11],[2,3,5,6,10,11],[1,3,4,5,7,8,10,11],[1,2,4,7,8,10,11],[3,4,5,7,9,10,11],[3,5,6,11],[3,6,10,11]],
  [[3,5,6,10,11],[3,6,11],[1,2,4,7,8,10,11],[3,5,6,11],[6,10,11,12],[6,8,11,12],[1,4,7,8,9,10,11],[1,3,6,10,11]],
  [[5,6,9,11,12],[2,4,6,8,10,11],[1,2,4,7,8,9,10,11],[1,3,5,6,9,10,11,12],[6,8,11,12],[1,2,3,4,5,8,9,11],[1,2,4,7,8,9,10,11],[1,2,4,6,8,10,11]],
  [[1,2,3,4,7,8,9,10,11],[2,5,7,9,11],[1,2,4,7,8,10,11],[1,2,4,5,6,9,10,11],[1,2,3,4,7,8,10,11],[2,5,6,9,10,11],[3,5,6,12],[1,2,4,5,6,7,9,10,11]],
  [[8,11,12],[1,2,3,4,5,8,9,11,12],[3,4,6,9,11,12],[3,5,6,9,11],[5,8,9,10,11],[1,2,3,4,5,8,9,10,11],[3,4,5,8,9,10,11],[1,2,3,4,5,8,9,11]],
  [[1,2,4,7,8,10,11],[3,6,11],[3,5,6,10,11,12],[6,8,9,10,11,12],[5,6,11,12],[6,11,12],[3,5,6,11],[1,3,4,6,10,11]],
];

function signIndex(longitude) { return Math.floor((((longitude % 360) + 360) % 360) / 30); }
function d1House(result, body) { return result.charts.D1.rows.find((row) => row.bodyDetails.some((item) => item.name === body))?.house; }
function signFor(result, body) { return signIndex(result.positions[body].longitude); }
function distance(from, to) { return ((to - from + 12) % 12) + 1; }
function lordHouses(result, planet) {
  return result.charts.D1.rows.filter((row) => PLANET_RULERS[row.sign] === planet).map((row) => row.house);
}
function relativeHouse(fromHouse,toHouse) { return ((toHouse-fromHouse+12)%12)+1; }

export function functionalNature(result,body) {
  if(!CLASSICAL.includes(body)) return {label:"Node / controller-dependent",code:"Node",reasons:["Judge through sign lord, nakshatra lord, associations and dasha context."]};
  const owned=lordHouses(result,body), benefic=owned.filter((house)=>[1,5,9].includes(house)), difficult=owned.filter((house)=>[3,6,8,11].includes(house));
  const kendra=owned.filter((house)=>[1,4,7,10].includes(house)), trine=owned.filter((house)=>[1,5,9].includes(house));
  const reasons=[];
  if(trine.length) reasons.push(`Trinal ownership: ${trine.map((h)=>`H${h}`).join(", ")}`);
  if(kendra.length) reasons.push(`Angular ownership: ${kendra.map((h)=>`H${h}`).join(", ")}`);
  if(difficult.length) reasons.push(`Difficult-house ownership: ${difficult.map((h)=>`H${h}`).join(", ")}`);
  if(owned.some((house)=>[2,7].includes(house))) reasons.push("Maraka-house ownership modifies delivery; it is not automatic harm.");
  if(kendra.length&&trine.length) return {label:"Functional benefic / yogakaraka",code:"FB",reasons};
  const score=benefic.length*2-difficult.length*1.5;
  if(score>0) return {label:"Functional benefic",code:"FB",reasons};
  if(score<0) return {label:"Functional malefic",code:"FM",reasons};
  return {label:"Functionally mixed",code:"Mixed",reasons};
}

export function debilitationCancellation(result,body) {
  if(!CLASSICAL.includes(body)||dignityFor(body,result.positions[body].longitude)!=="Debilitated") return {applicable:false,cancelled:false,conditions:[]};
  const planetHouse=d1House(result,body), moonHouse=d1House(result,"Moon");
  const debilityLord=PLANET_RULERS[SIGNS[DEBILITATION[body]]], exaltationLord=PLANET_RULERS[SIGNS[EXALTATION[body]]];
  const candidates=[{planet:debilityLord,rule:"Lord of the debilitation sign"},{planet:exaltationLord,rule:"Lord of the planet's exaltation sign"}];
  const conditions=[];
  for(const candidate of candidates) {
    const house=d1House(result,candidate.planet);
    if([1,4,7,10].includes(house)) conditions.push(`${candidate.rule} (${candidate.planet}) is angular from Lagna.`);
    if([1,4,7,10].includes(relativeHouse(moonHouse,house))) conditions.push(`${candidate.rule} (${candidate.planet}) is angular from the Moon.`);
  }
  if([1,4,7,10].includes(planetHouse)) conditions.push(`${body} itself is angular from Lagna; cancellation support is present but still requires delivery strength.`);
  return {applicable:true,cancelled:conditions.length>0,conditions:[...new Set(conditions)],result:conditions.length?"Debilitation mitigated / Neecha-bhanga conditions present":"No configured cancellation condition found"};
}

export function dignityFor(body, longitude) {
  const sign = signIndex(longitude);
  if (!CLASSICAL.includes(body)) return "Node / point";
  if (EXALTATION[body] === sign) return "Exalted";
  if (DEBILITATION[body] === sign) return "Debilitated";
  if (OWN_SIGNS[body].includes(sign)) return "Own sign";
  return "Other sign";
}

export function calculateAshtakavarga(positions) {
  const sourceSigns = SOURCES.map((body) => signIndex(positions[body].longitude));
  const bav = {};
  CLASSICAL.forEach((target, targetIndex) => {
    const values = Array(12).fill(0);
    AV_RULES[targetIndex].forEach((beneficHouses, sourceIndex) => {
      beneficHouses.forEach((house) => { values[(sourceSigns[sourceIndex] + house - 1) % 12] += 1; });
    });
    bav[target] = Object.fromEntries(SIGNS.map((sign, index) => [sign, values[index]]));
  });
  const sav = Object.fromEntries(SIGNS.map((sign) => [sign, CLASSICAL.reduce((sum, body) => sum + bav[body][sign], 0)]));
  return { bav, sav, total: Object.values(sav).reduce((a,b) => a+b,0), average: Object.values(sav).reduce((a,b) => a+b,0) / 12 };
}

export function calculateAspects(result) {
  const bodies = [...CLASSICAL, "Rahu", "Ketu"];
  return bodies.flatMap((body) => {
    const fromHouse = d1House(result, body);
    const aspectDistances = SPECIAL_ASPECTS[body] || [7];
    return aspectDistances.map((aspect) => ({ body, fromHouse, aspect, toHouse: ((fromHouse + aspect - 2) % 12) + 1, profile: ["Rahu","Ketu"].includes(body) ? "P4 node profile" : "P0/P1 Parāśari" }));
  });
}

export function dispositorChain(result, body) {
  const chain = []; const seen = new Set(); let current = body;
  for (let depth = 0; depth < 8; depth += 1) {
    if (!result.positions[current]) break;
    const sign = SIGNS[signFor(result, current)];
    const dispositor = PLANET_RULERS[sign];
    chain.push({ planet: current, sign, dispositor });
    if (dispositor === current) return { chain, ending: "self-dispositor", controller: current };
    if (seen.has(dispositor)) return { chain, ending: "exchange / loop", controller: dispositor };
    seen.add(current); current = dispositor;
  }
  return { chain, ending: "chain limit", controller: current };
}

export function calculateArudhas(result) {
  const d1 = result.charts.D1;
  const points = {};
  for (const house of [1,2,4,7,9,10,11,12]) {
    const houseSign = d1.rows.find((row) => row.house === house).sign;
    const lord = PLANET_RULERS[houseSign];
    const lordHouse = d1House(result, lord);
    const count = distance(house, lordHouse);
    let padaHouse = ((lordHouse + count - 2) % 12) + 1;
    if (padaHouse === house || distance(house, padaHouse) === 7) padaHouse = ((lordHouse + 8) % 12) + 1;
    const key = house === 1 ? "AL" : house === 12 ? "UL" : `A${house}`;
    points[key] = { house: padaHouse, sign: d1.rows.find((row) => row.house === padaHouse).sign, lord, sourceHouse: house };
  }
  return points;
}

function linked(result, first, second, aspects) {
  const h1=d1House(result,first), h2=d1House(result,second);
  return h1 === h2 || aspects.some((a) => a.body === first && a.toHouse === h2) || aspects.some((a) => a.body === second && a.toHouse === h1);
}

export function detectYogas(result, aspects = calculateAspects(result)) {
  const lord = (house) => PLANET_RULERS[result.charts.D1.rows.find((row) => row.house === house).sign];
  const yogas=[];
  const l2=lord(2), l5=lord(5), l9=lord(9), l10=lord(10), l11=lord(11);
  if (linked(result,l2,l11,aspects)) yogas.push({name:"Dhana linkage",type:"wealth",participants:[l2,l11],detail:"2nd and 11th lords are conjoined or mutually connected by a configured graha aspect.",source:"P1/P5"});
  for (const fortuneLord of new Set([l5,l9])) if (linked(result,l2,fortuneLord,aspects) || linked(result,l11,fortuneLord,aspects)) yogas.push({name:"Wealth-fortune linkage",type:"wealth",participants:[fortuneLord,l2,l11],detail:"A 2nd/11th wealth lord connects with the 5th or 9th lord.",source:"P1/P5"});
  if (linked(result,l9,l10,aspects)) yogas.push({name:"Dharma-karma linkage",type:"status",participants:[l9,l10],detail:"9th and 10th lords are conjoined or aspect-linked.",source:"P1/P5"});
  return yogas.filter((yoga,index,array)=>array.findIndex((item)=>item.name===yoga.name&&item.participants.join()===yoga.participants.join())===index);
}

export function analyzeNodes(result) {
  return ["Rahu","Ketu"].map((node) => {
    const longitude=result.positions[node].longitude, sign=SIGNS[signFor(result,node)], house=d1House(result,node);
    const nakshatraIndex=Math.floor((((longitude%360)+360)%360)/(360/27));
    const signDispositor=PLANET_RULERS[sign], nakshatraLord=NAKSHATRA_LORDS[nakshatraIndex%9];
    const opposite=node==="Rahu"?"Ketu":"Rahu";
    const repeated=Object.entries(result.charts).filter(([code])=>["D9","D10","D4","D5","D16"].includes(code)).filter(([,chart])=>chart.rows.find((row)=>row.bodyDetails.some((b)=>b.name===node))?.house===house).map(([code])=>code);
    return { node, sign, house, opposite, axis:`H${house}/H${d1House(result,opposite)}`, signDispositor, nakshatraIndex, nakshatraLord, dispositorChain:dispositorChain(result,signDispositor), repeatedVargas:repeated, source:"P4 Trivedi framework" };
  });
}

export function buildStructuralAnalysis(result) {
  const ashtakavarga=calculateAshtakavarga(result.positions), aspects=calculateAspects(result);
  return {
    planets:Object.fromEntries(Object.keys(result.positions).map((body)=>[body,{house:d1House(result,body),sign:SIGNS[signFor(result,body)],dignity:dignityFor(body,result.positions[body].longitude),housesOwned:lordHouses(result,body),functional:functionalNature(result,body),debilitation:debilitationCancellation(result,body),dispositor:dispositorChain(result,body)}])),
    ashtakavarga, aspects, arudhas:calculateArudhas(result), yogas:detectYogas(result,aspects), nodes:analyzeNodes(result),
    unavailable:["Hora Lagna (needs verified sunrise)","Ghati Lagna (needs verified sunrise)","Shadbala/Bhavabala","Live transit trigger"],
  };
}
