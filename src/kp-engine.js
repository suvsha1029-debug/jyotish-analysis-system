import { SIGNS, normalizeLongitude } from "./varga-engine.js";

const LORDS = Object.freeze(["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]);
const YEARS = Object.freeze({ Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 });
const NAKSHATRAS = Object.freeze([
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
  "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati",
]);
const SIGN_LORDS = Object.freeze({
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun", Virgo:"Mercury",
  Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
});
const KP_DOMAINS = Object.freeze({
  overview:{label:"Overall structure",primary:[1],group:[1,5,9,10,11]},
  money:{label:"Money and accumulation",primary:[2,11],group:[2,6,10,11]},
  career:{label:"Career and professional delivery",primary:[10],group:[2,6,10,11]},
  fame:{label:"Recognition and authority",primary:[10],group:[1,5,10,11]},
  marriage:{label:"Marriage",primary:[7],group:[2,7,11]},
  foreign:{label:"Foreign travel or residence",primary:[12],group:[3,9,12]},
  inheritance:{label:"Inheritance receipt",primary:[8],group:[2,8,11]},
  property:{label:"Property acquisition",primary:[4],group:[2,4,11,12]},
  vehicles:{label:"Vehicles and conveyances",primary:[4],group:[4,11,12]},
  gains:{label:"Gains and fulfilment",primary:[11],group:[2,6,10,11]},
});

const unique = (values) => [...new Set(values.filter((value) => Number.isInteger(value)))].sort((a,b) => a-b);
const distance = (from, to) => normalizeLongitude(to - from);
const signName = (longitude) => SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];

export function kpDivision(longitude) {
  const value = normalizeLongitude(longitude);
  const starSpan = 360 / 27;
  const nakshatraIndex = Math.min(26, Math.floor(value / starSpan));
  const starLord = LORDS[nakshatraIndex % LORDS.length];
  const progress = value - nakshatraIndex * starSpan;
  const startIndex = LORDS.indexOf(starLord);
  let boundary = 0;
  let subLord = starLord;
  for (let offset = 0; offset < LORDS.length; offset += 1) {
    const candidate = LORDS[(startIndex + offset) % LORDS.length];
    boundary += starSpan * YEARS[candidate] / 120;
    if (progress < boundary + 1e-9) { subLord = candidate; break; }
  }
  return { nakshatraIndex, nakshatra:NAKSHATRAS[nakshatraIndex], starLord, subLord };
}

export function placidusHouse(longitude, cusps) {
  const value = normalizeLongitude(longitude);
  for (let index = 0; index < 12; index += 1) {
    const start = normalizeLongitude(cusps[index]);
    const end = normalizeLongitude(cusps[(index + 1) % 12]);
    if (distance(start, value) < distance(start, end) || Math.abs(distance(start, value)) < 1e-9) return index + 1;
  }
  return 12;
}

function pointProfile(name, longitude, cusps) {
  const division = kpDivision(longitude);
  const sign = signName(longitude);
  return { name, longitude:normalizeLongitude(longitude), sign, signLord:SIGN_LORDS[sign], house:placidusHouse(longitude,cusps), ...division };
}

function planetSignifications(profile, profiles, cuspProfiles) {
  const starLord = profiles[profile.starLord];
  const housesOwnedBy = (lord) => cuspProfiles.filter((cusp) => cusp.signLord === lord).map((cusp) => cusp.house);
  const levels = [
    {level:1,label:"Star lord occupies",houses:starLord ? [starLord.house] : []},
    {level:2,label:"Planet occupies",houses:[profile.house]},
    {level:3,label:"Star lord owns",houses:housesOwnedBy(profile.starLord)},
    {level:4,label:"Planet owns",houses:housesOwnedBy(profile.name)},
  ];
  if (["Rahu","Ketu"].includes(profile.name)) {
    const agent = profiles[profile.signLord];
    levels.push({level:5,label:`Node acts through ${profile.signLord}`,houses:agent ? [agent.house,...housesOwnedBy(profile.signLord)] : housesOwnedBy(profile.signLord)});
  }
  return { ...profile, levels, signifiedHouses:unique(levels.flatMap((item) => item.houses)) };
}

function evaluateDomain(cuspProfiles, planets, spec) {
  const primaryCusps = spec.primary.map((house) => cuspProfiles[house - 1]);
  const evidence = primaryCusps.map((cusp) => {
    const controller = planets[cusp.subLord];
    const matches = controller ? controller.signifiedHouses.filter((house) => spec.group.includes(house)) : [];
    return {house:cusp.house,subLord:cusp.subLord,starLord:cusp.starLord,controllerHouses:controller?.signifiedHouses || [],matches};
  });
  const matchedPrimary = evidence.filter((item) => item.matches.length).length;
  const coverage = unique(evidence.flatMap((item) => item.matches));
  const good = matchedPrimary === evidence.length && (coverage.length >= 2 || spec.group.length === 1);
  return {
    label:spec.label, primaryHouses:spec.primary, eventHouses:spec.group, evidence, coverage,
    level:good ? "Good" : matchedPrimary ? "Moderate" : "Low",
    explanation:good
      ? `The primary cusp sub-lord route repeats ${coverage.map((house)=>`H${house}`).join(", ")} from the KP event group.`
      : matchedPrimary
        ? `The primary cusp route reaches ${coverage.map((house)=>`H${house}`).join(", ")}, but the full event group is not repeated cleanly.`
        : "The primary cusp sub-lord route does not directly repeat the configured KP event houses.",
  };
}

export function buildKPAnalysis(raw, options = {}) {
  if (!raw?.cusps || raw.cusps.length !== 12 || !raw.positions) return null;
  const cusps = raw.cusps.map((longitude,index) => ({house:index+1,longitude:normalizeLongitude(longitude),sign:signName(longitude),signLord:SIGN_LORDS[signName(longitude)],...kpDivision(longitude)}));
  const baseProfiles = Object.fromEntries(Object.entries(raw.positions)
    .filter(([name]) => name !== "Asc")
    .map(([name,position]) => [name,pointProfile(name,position.longitude,raw.cusps)]));
  const planets = Object.fromEntries(Object.entries(baseProfiles).map(([name,profile]) => [name,planetSignifications(profile,baseProfiles,cusps)]));
  const domains = Object.fromEntries(Object.entries(KP_DOMAINS).map(([key,spec]) => [key,evaluateDomain(cusps,planets,spec)]));
  domains.money.facets = [
    {key:"accumulation",...evaluateDomain(cusps,planets,{label:"Accumulation and retention",primary:[2],group:[2,6,10,11]})},
    {key:"gains",...evaluateDomain(cusps,planets,{label:"Gains and profit realization",primary:[11],group:[2,6,10,11]})},
    {key:"careerIncome",...evaluateDomain(cusps,planets,{label:"Career-linked income",primary:[10],group:[2,6,10,11]})},
    {key:"businessIncome",...evaluateDomain(cusps,planets,{label:"Business and client income",primary:[10],group:[2,7,10,11]})},
  ];
  return {
    profileId:options.profileId || "kp",
    system:options.system || "Krishnamurti ayanamsa + Placidus cusps",
    houseSystem:options.houseSystem || "Placidus",
    ayanamsa:raw.ayanamsa,
    cusps,
    planets,
    domains,
    methodNote:options.methodNote || "KP is retained as an independent cusp/sub-lord confirmation. It does not alter the Parashari D1, Varga, Ashtakavarga or MD-AD scores.",
    timingNote:"Natal promise uses the primary cusp sub-lord. Event timing additionally requires matching Dasha-Bhukti-Antara significators, ruling planets and transit; those last three are not inferred from natal cusps alone.",
    limitations:options.limitations || "Node agency through conjunctions and received aspects, ruling planets, Pratyantardasha and live transit are not yet calculated in this layer.",
    sources:[
      {label:"KP fundamental principles: cusps, subs and significator hierarchy",url:"https://kpastrology.astrosage.com/kp-learning-home/tutorial/chapter-2-fundamental-principles"},
      {label:"KP primer: Placidus, KP ayanamsa and DBA timing",url:"https://astrouser.com/wp-content/uploads/Primer-on-KP.pdf"},
    ],
  };
}

export function addKPTiming(kp, currentPeriod) {
  if (!kp || !currentPeriod) return kp;
  const controllers = [currentPeriod.mdLord,currentPeriod.adLord].map((lord) => ({lord,houses:kp.planets[lord]?.signifiedHouses || []}));
  const domains = Object.fromEntries(Object.entries(kp.domains).map(([key,domain]) => {
    const activation = controllers.map((item) => ({...item,matches:item.houses.filter((house)=>domain.eventHouses.includes(house))}));
    const activeCount = activation.filter((item)=>item.matches.length).length;
    return [key,{...domain,timing:{level:activeCount===2?"Good":activeCount===1?"Moderate":"Low",controllers:activation,detail:activeCount===2?"Both MD and AD signify houses in this KP event group.":activeCount===1?"Only one period controller directly signifies this KP event group.":"Neither current period controller directly signifies this KP event group."}}];
  }));
  return {...kp,domains,currentPeriod:{mdLord:currentPeriod.mdLord,adLord:currentPeriod.adLord}};
}
