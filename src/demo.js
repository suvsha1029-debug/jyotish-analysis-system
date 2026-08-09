import { historicalUtcOffset, searchLocations, timezoneForCoordinates } from "./location-service.js";
import { cellsForStyle } from "./chart-layouts.js";

const DOMAIN_SPECS = Object.freeze({
  overview:{label:"Overview"}, money:{label:"Money"}, career:{label:"Career"}, fame:{label:"Fame & authority"},
  marriage:{label:"Marriage"}, foreign:{label:"Foreign"}, property:{label:"Property"}, vehicles:{label:"Vehicles"}, gains:{label:"Gains"},
});

const byId = (id) => document.getElementById(id);
const consentGate = byId("consent-gate");
const consentCheckbox = byId("consent-checkbox");
const acceptConsent = byId("accept-consent");
const declineConsent = byId("decline-consent");

function openConsentGate() { consentGate.hidden = false; document.body.classList.add("consent-locked"); }
function closeConsentGate() { consentGate.hidden = true; document.body.classList.remove("consent-locked"); }
function requireFreshConsent() {
  consentCheckbox.checked = false;
  acceptConsent.disabled = true;
  byId("declined-message").hidden = true;
  openConsentGate();
}
requireFreshConsent();
window.addEventListener("pageshow", requireFreshConsent);
consentCheckbox.addEventListener("change", () => { acceptConsent.disabled = !consentCheckbox.checked; });
acceptConsent.addEventListener("click", () => {
  if (!consentCheckbox.checked) return;
  closeConsentGate();
});
declineConsent.addEventListener("click", () => {
  consentCheckbox.checked = false; acceptConsent.disabled = true;
  byId("declined-message").hidden = false;
});
const form = byId("chart-form");
const calculateButton = form.querySelector(".calculate");
const status = byId("status");
const errorBox = byId("error");
let currentResult = null;
let selectedLocation = "Birth chart";
let selectedChartCode = "D1";
let selectedChartStyle = "north";
let currentPrediction = null;
let selectedInsight = "overview";
let timelineView = "current";
let lastCalculationInput = null;

function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
function clearError() { errorBox.hidden = true; errorBox.textContent = ""; }

function updateTimezone() {
  try {
    if (!byId("latitude").value || !byId("longitude").value) return;
    const zone = timezoneForCoordinates(byId("latitude").value, byId("longitude").value);
    byId("timezone-label").textContent = zone;
    if (!byId("date").value || !byId("time").value) return;
    byId("utcOffset").value = historicalUtcOffset(zone, byId("date").value, byId("time").value);
  } catch (error) { showError(error.message); }
}

function selectPlace(place) {
  selectedLocation = place.name;
  byId("location-query").value = place.name;
  byId("selected-location").textContent = place.name;
  byId("latitude").value = place.latitude.toFixed(6);
  byId("longitude").value = place.longitude.toFixed(6);
  byId("location-results").hidden = true;
  localStorage.setItem("jyotish-last-place", JSON.stringify({ name:place.name, latitude:place.latitude, longitude:place.longitude }));
  updateTimezone();
}

async function runLocationSearch() {
  clearError();
  const button = byId("location-search");
  const query=byId("location-query").value.trim();
  if(query.length<2) return showError("Enter at least two characters, then press Enter or Search place.");
  button.disabled = true; button.textContent = "Searching…";
  try {
    const places = await searchLocations(query);
    const container = byId("location-results");
    container.replaceChildren();
    if (!places.length) throw new Error(`No matching place was found for “${query}”. Try city, state and country.`);
    places.forEach((place) => {
      const option = document.createElement("button");
      option.type = "button"; option.className = "place-option"; option.textContent = place.name;
      option.addEventListener("click", () => selectPlace(place));
      container.append(option);
    });
    container.hidden = false;
  } catch (error) { showError(error.message); }
  finally { button.disabled = false; button.textContent = "Search place"; }
}

function renderPositions(positions) {
  const grid = byId("positions-grid"); grid.replaceChildren();
  Object.entries(positions).forEach(([name, position]) => {
    const card = document.createElement("div"); card.className = "position";
    const state = ["Rahu", "Ketu"].includes(name) ? "Mean node" : position.retrograde ? "Retrograde" : "Direct";
    card.innerHTML = `<div class="body"><span>${name}</span><i>${position.retrograde && !["Rahu", "Ketu"].includes(name) ? "℞" : ""}</i></div><div class="degree">${position.display}</div><div class="state">${state}</div>`;
    grid.append(card);
  });
  const tableBody = byId("degree-table-body"); tableBody.replaceChildren();
  Object.entries(positions).forEach(([name, position]) => {
    const row = document.createElement("tr");
    const motion = ["Rahu", "Ketu"].includes(name) ? "Mean node" : position.retrograde ? "Retrograde" : "Direct";
    row.innerHTML = `<th scope="row">${name}</th><td>${position.display}</td><td>${position.longitude.toFixed(8)}°</td><td>${motion}</td>`;
    tableBody.append(row);
  });
}

const SIGN_NAMES=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
function longitudeLabel(value){
  if(!Number.isFinite(value)) return "Unavailable";
  const normalized=((value%360)+360)%360,sign=Math.floor(normalized/30),degree=normalized%30;
  return `${degree.toFixed(2)}° ${SIGN_NAMES[sign]}`;
}
function localEventTime(iso,local){
  if(!iso) return "Unavailable";
  const match=/([+-])(\d{2}):(\d{2})$/.exec(local||"");
  const minutes=match?(match[1]==="+"?1:-1)*(Number(match[2])*60+Number(match[3])):0;
  const date=new Date(new Date(iso).getTime()+minutes*60000);
  return `${date.toISOString().slice(0,10)} ${date.toISOString().slice(11,19)}`;
}
function renderPanchanga(result){
  const p=result.panchanga;
  if(!p) return;
  const operative=p.solar?.operativeWindow;
  const cards=[
    ["Sunrise",localEventTime(operative?.sunrise?.utc,result.local),operative?.phase||"Local solar context"],
    ["Sunset",localEventTime(operative?.sunset?.utc,result.local),"Calculated apparent horizon"],
    ["Birth nakshatra",`${p.birthNakshatra.name} · Pada ${p.birthNakshatra.pada}`,`Lord ${p.birthNakshatra.lord}`],
    ["Weekday / Hora",`${p.weekdayLord} · ${p.hora?.lord||"Unavailable"}`,p.hora?`${p.hora.phase} Hora ${p.hora.number}`:"Solar window unavailable"],
    ["Birth-time check",result.birthTimeSensitivity?.level||"Not run",result.birthTimeSensitivity?`D1 ${result.birthTimeSensitivity.stability.D1?"stable":"changes"}; D60 ${result.birthTimeSensitivity.stability.D60?"stable":"changes"}`:"Perturbation service unavailable"],
  ];
  byId("panchanga-summary").innerHTML=cards.map(([label,value,note])=>`<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");
  const lagnaLabels={bhavaLagna:"Bhava Lagna",horaLagna:"Hora Lagna",ghatiLagna:"Ghati Lagna"};
  byId("special-lagna-summary").innerHTML=p.specialLagnas?`<div><span>Elapsed from operative sunrise</span><strong>${p.elapsedGhatis.toFixed(3)} ghatis</strong></div>${Object.entries(lagnaLabels).map(([key,label])=>`<article><span>${label}</span><strong>${longitudeLabel(p.specialLagnas[key])}</strong></article>`).join("")}`:`<p>Sunrise-derived special Lagnas are unavailable.</p>`;
  byId("nakshatra-table-body").innerHTML=Object.entries(p.nakshatras).map(([body,n])=>`<tr><th>${body}</th><td>${n.name}</td><td>${n.pada}</td><td>${n.lord}</td><td>${n.navamsaSign}</td><td>${n.progressPercent.toFixed(2)}%</td></tr>`).join("");
  byId("solar-limitations").textContent=p.limitations;
}

function renderChart(code) {
  selectedChartCode = code;
  const chart = currentResult.charts[code];
  byId("chart-code").textContent = code; byId("chart-name").textContent = chart.name; byId("varga-lagna").textContent = chart.ascSign;
  document.querySelectorAll(".chart-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.code === code)));
  const grid = byId("chart-grid"); grid.replaceChildren(); grid.className = `vedic-chart ${selectedChartStyle}-chart`;
  cellsForStyle(chart, selectedChartStyle).forEach((row) => {
    const cell = document.createElement("section"); cell.className = `vedic-cell ${row.slot}`;
    const bodies = row.bodyDetails.map((body) => `<span class="planet ${body.name === "Asc" ? "asc" : ""}">${body.label}<small>${body.degree}</small></span>`).join("");
    cell.innerHTML = `<div class="house-top"><span class="sign-name">${row.sign}</span><span class="house-number">H${row.house}</span></div><div class="bodies">${bodies}</div>`;
    grid.append(cell);
  });
  const degreeBody = byId("varga-degree-body"); degreeBody.replaceChildren();
  chart.rows.flatMap((row) => row.bodyDetails.map((body) => ({ ...body, sign: row.sign, house: row.house })))
    .sort((a, b) => a.name === "Asc" ? -1 : b.name === "Asc" ? 1 : a.name.localeCompare(b.name))
    .forEach((body) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<th scope="row">${body.label}</th><td>${body.degree}</td><td>${body.sign}</td><td>H${body.house}</td>`;
      degreeBody.append(tr);
    });
  const houseBody = byId("house-summary-body"); houseBody.replaceChildren();
  chart.rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<th scope="row">H${row.house}</th><td>${row.sign}</td><td>${row.bodies.join(", ") || "—"}</td>`;
    houseBody.append(tr);
  });
  const amshaPanel=byId("d60-amsha-panel");
  amshaPanel.hidden=code!=="D60";
  if(code==="D60") {
    const amshaBody=byId("d60-amsha-body"); amshaBody.replaceChildren();
    chart.rows.flatMap((row)=>row.bodyDetails).sort((a,b)=>a.name==="Asc"?-1:b.name==="Asc"?1:a.name.localeCompare(b.name)).forEach((body)=>{
      const tr=document.createElement("tr");
      const important=body.amsha.emphasis==="Major benefic amsha";
      tr.innerHTML=`<th>${body.label}</th><td><b>${body.amsha.name}</b> <small>#${body.amsha.number}</small></td><td><span class="amsha-nature ${body.amsha.nature.toLowerCase()}">${body.amsha.nature}</span></td><td>${important?"Major benefic amsha":body.amsha.nature==="Benefic"?"Supporting benefic":"Cautionary amsha"}${body.amsha.number===27?" *":""}</td>`;
      amshaBody.append(tr);
    });
  }
}

function renderDomainInsight(key) {
  selectedInsight = key;
  const report = currentPrediction.domains[key];
  document.querySelectorAll(".insight-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.insight === key)));
  const dimensions = Object.entries(report.dimensions).map(([label, value]) => `<div class="dimension"><span>${label}</span><strong>${value}</strong></div>`).join("");
  const confirmationRows = report.confirmation.components.map((item) => `<div class="weight-row"><div><strong>${item.label}</strong><small>${item.detail}</small></div><b>${item.score>=68?"Good":item.score>=45?"Moderate":"Low"}</b></div>`).join("");
  const f=currentPrediction.foreignAnalysis;
  const fp=currentPrediction.foreignPropertyAnalysis;
  const foreignPropertyBlock=["foreign","property"].includes(key)&&fp?`<section class="foreign-analysis"><div class="insight-head"><div><h3>Foreign property & bhagya synthesis</h3><p>Ownership potential, foreign linkage and residential stability are judged separately.</p></div><span class="varga-badge">D1 promise + D4 confirmation</span></div><div class="foreign-status"><article><span>Foreign property potential</span><strong>${fp.foreignProperty.level}</strong><p>${fp.foreignProperty.detail}</p></article><article><span>Property acquisition</span><strong>${fp.acquisition.level}</strong><p>${fp.acquisition.detail}</p></article><article><span>Fortune / bhagya</span><strong>${fp.fortune.level}</strong><p>${fp.fortune.detail}</p></article><article><span>Residential stability</span><strong>${fp.residentialStability.level}</strong><p>${fp.residentialStability.detail}</p></article></div><div class="foreign-confirm-grid">${fp.evidence.map((item)=>`<article><span>${item.label}</span><h4>${item.value}</h4></article>`).join("")}</div><div class="theme-card"><span>Current timing relevance</span><h4>${fp.timing.activeControllers.length?fp.timing.activeControllers.join(" + "):"No direct controller"}</h4><p>${fp.timing.detail}</p><small>This is an astrological potential label, not a purchase recommendation or guarantee.</small></div></section>`:"";
  const foreignBlock=key==="foreign"?`<section class="foreign-analysis"><div class="foreign-status"><article><span>${f.movement.label}</span><strong>${f.movement.level}</strong><p>${f.movement.detail}</p></article><article><span>${f.base.label}</span><strong>${f.base.level}</strong><p>${f.base.detail}</p></article></div>${f.axis?`<div class="axis-card"><div><span>Active MD-AD axis</span><h4>${f.axis.mdLord} - ${f.axis.adLord} · ${f.axis.pair}</h4><p>${f.axis.relation}</p></div><strong>${f.axis.result}</strong></div>`:""}<div class="theme-card"><span>Main period theme</span><h4>${f.mainTheme?.label||"No active theme"}</h4><p>${f.mainTheme?`${f.mainTheme.varga} · ${f.mainTheme.support?"SAV supportive":"SAV restrained"}`:""}</p><small>Other confirmations: ${f.otherThemes.map((item)=>`${item.label} (${item.varga}, ${item.support?"SAV supportive":"SAV restrained"})`).join("; ")||"None"}</small></div><h4 class="analysis-title">D1 foundation: H1, H3, H4, H7, H9 and H12</h4><div class="analysis-scroll"><table class="analysis-table"><thead><tr><th>House</th><th>Lord</th><th>Placed</th><th>Condition</th><th>FM/FB</th><th>Dispositor</th><th>Occupants</th><th>SAV</th></tr></thead><tbody>${f.houses.map((item)=>`<tr><th>H${item.house}</th><td>${item.lord}</td><td>H${item.lordHouse}</td><td>${item.dignity}</td><td>${item.functional}</td><td>${item.dispositor}</td><td>${item.occupants.join(", ")||"—"}</td><td>${item.sav}</td></tr>`).join("")}</tbody></table></div><h4 class="analysis-title">D1 lord connections</h4><div class="foreign-confirm-grid">${f.lordConnections.map((item)=>`<article><span>${item.label} · ${item.linked?"Connected":"Not directly connected"}</span><h4>${item.a} H${item.aHouse} ↔ ${item.b} H${item.bHouse}</h4><p>${item.meaning}</p></article>`).join("")}</div><div class="foreign-confirm-grid"><article><span>Primary confirmation</span><h4>D4 · H3/H7/H9/H12</h4><p>${f.primary.houses.map((item)=>`H${item.house}: ${item.occupants.join(", ")||"—"}`).join(" · ")}</p></article>${f.supporting.map((chart)=>`<article><span>Supporting strength</span><h4>${chart.code} · H9/H12</h4><p>${chart.houses.map((item)=>`H${item.house}: ${item.occupants.join(", ")||"—"}`).join(" · ")}</p></article>`).join("")}</div><div class="ll-card"><div><span>Lagna lord relationship</span><h4>${f.lagnaLord.planet} in H${f.lagnaLord.house}</h4></div><p>Aspects foreign houses: ${f.lagnaLord.aspectHouses.map((house)=>`H${house}`).join(", ")||"none"}. Linked foreign lords: ${f.lagnaLord.linkedForeignLords.join(", ")||"none"}.</p><p>Rahu in H${f.rahu.house}; aspects ${f.rahu.aspectHouses.map((house)=>`H${house}`).join(", ")||"no focused foreign house"}.</p></div><h4 class="analysis-title">D60 confirmation for relevant and period lords</h4><div class="period-amshas">${f.d60.map((item)=>`<span><b>${item.lord}</b>${item.name} · ${item.nature}</span>`).join("")}</div></section>`:"";
  const fs=currentPrediction.foreignSpouseAnalysis;
  const foreignSpouseBlock=key==="marriage"?`<section class="foreign-analysis"><div class="theme-card"><span>D1 + D9 foreign-spouse confirmation</span><h4>${fs.level}</h4><p>${fs.detail}</p><small>${fs.method}</small></div><div class="foreign-confirm-grid"><article><span>D1 spouse foundation</span><h4>H7 lord ${fs.d1SeventhLord} in H${fs.d1SeventhLordHouse}</h4><p>D1 establishes the relationship promise before D9 adds specialization.</p></article><article><span>D9 spouse reference</span><h4>H7 lord ${fs.spouseLord} in H${fs.spouseLordHouse}</h4><p>Distance links: ${fs.links.map((item)=>`${item.planet} in relative H${item.relative}`).join(", ")||"none configured"}. Timing controllers: ${fs.timing.join(", ")||"not active now"}.</p></article></div></section>`:"";
  const method=report.confirmation.vargaAnalysis;
  const methodBlock=method&&!report.confirmation.hora?`<section class="theme-card"><span>${report.varga} reading method</span><h4>${method.lagna} Lagna · ${method.lagnaLord} in H${method.lagnaLordHouse}</h4><p>${method.method}</p>${method.badhaka?`<small>D4 badhaka: H${method.badhaka.house}, lord ${method.badhaka.lord}.</small>`:""}</section>`:"";
  const functionalBlock=key==="foreign"?`<section class="functional-section"><h4 class="analysis-title">Functional benefic / malefic roles</h4><div class="functional-grid">${f.functional.map((item)=>`<article><span>${item.code}</span><h4>${item.lord} · ${item.label}</h4><p>${item.dignity}${item.debilitation.applicable?` · ${item.debilitation.result}`:""}</p><small>${item.reasons.join(" ")}${item.debilitation.conditions?.length?` Cancellation: ${item.debilitation.conditions.join(" ")}`:""}</small></article>`).join("")}</div></section>`:"";
  const hora=report.confirmation.hora;
  const moneyBlock=key==="money"&&hora?`<section class="hora-analysis"><div class="hora-head"><div><span>BPHS HORA EVALUATION</span><h4>D2 wealth structure</h4></div><b class="promise-level ${hora.label.toLowerCase()}">${hora.label}</b></div><div class="hora-foundation"><article><span>D1 accumulation + gains</span><h4>H2 ${hora.secondLord} · H11 ${hora.eleventhLord}</h4><p>${hora.sameLord?"One planet jointly controls accumulation and gains.":hora.linked?"The two lords are structurally linked.":"The two lords require separate delivery assessment."}</p></article><article><span>D2 Lagna controller</span><h4>${hora.d2Lagna} · ${hora.d2LagnaLord} in H${hora.d2LagnaLordHouse}</h4><p>Hora Lagna and its lord set the divisional delivery frame.</p></article></div><div class="hora-planets">${hora.planets.map((item)=>`<article class="${item.suitable?"suitable":"mixed"}"><b>${item.planet}</b><span>${item.hora}</span><small>${item.rule}</small></article>`).join("")}</div><div class="hora-carriers"><strong>H2/H11 carrier check</strong>${hora.carriers.map((item)=>`<span><b>${item.planet}</b>D1 ${item.d1Sign} H${item.d1House} · D2 ${item.d2Sign} · ${item.horaSuitable?"Hora effective":"mixed Hora fit"}</span>`).join("")}</div><p class="limitations">D2 is a two-Hora wealth division. Empty-house counting is not used here. This evaluates Hora suitability and the combined H2/H11 carrier; it does not promise a specific amount of money.</p></section>`:"";
  const evidence = report.evidence.map((item) => `<div class="evidence ${item.tone}"><small>${item.source}</small><strong>${item.title}</strong><p>${item.detail}</p></div>`).join("");
  byId("insight-content").innerHTML = `<div class="insight-head"><div><h3>${report.label}</h3><p>${report.description}</p></div><span class="varga-badge">Primary chart ${report.varga}</span></div><div class="dimension-grid">${dimensions}</div>${methodBlock}${moneyBlock}${foreignPropertyBlock}${foreignBlock}${foreignSpouseBlock}${functionalBlock}<section class="confirmation-panel"><header><div><span>Final confirmation</span><h4>${report.confirmation.label}</h4></div></header>${confirmationRows}<p>${report.confirmation.methodNote}</p></section><div class="confidence-box"><strong>Evidence completeness</strong><span>${report.confidenceDetail.label}. This describes available rule layers, not event probability.</span><small>Calculated: ${report.confidenceDetail.calculatedLayers.join(", ")}. Missing: ${report.confidenceDetail.missingLayers.join(", ")}.</small></div><div class="evidence-list">${evidence}</div><p class="limitations">${report.limitations}</p><div class="source-key">Source levels: P3 = integrated computational framework; P5 = derived operational software rule. Supporting and caution evidence remain separate instead of being averaged away.</div>`;
}

function renderConfirmation() {
  selectedInsight="confirmation";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight===selectedInsight)));
  const first=Object.values(currentPrediction.domains)[0].confirmation;
  const columnLabels={d1:"D1 promise",varga:"Relevant Varga",ashtakavarga:"SAV",structure:"Structure",timing:"Timing"};
  const headers=first.components.map((item)=>`<th>${columnLabels[item.key]||item.chart}</th>`).join("");
  const level=(score)=>score>=68?"Good":score>=45?"Moderate":"Low";
  const rows=Object.values(currentPrediction.domains).map((domain)=>`<tr><th>${domain.label}<small>${domain.varga}</small></th>${domain.confirmation.components.map((item)=>`<td>${item.key==="timing"?`<button type="button" class="score-cell timing-score ${level(item.score).toLowerCase()}" data-timing-domain="${domain.key}" aria-label="Open ${domain.label} timing overview">${level(item.score)}</button>`:`<span class="score-cell ${level(item.score).toLowerCase()}">${level(item.score)}</span>`}</td>`).join("")}<td><b>${domain.confirmation.label}</b></td></tr>`).join("");
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>Divisional confirmation</h3><p>D1 governs the promise. The relevant division confirms it; MD-AD shows whether that promise is active now.</p></div><span class="varga-badge">Chart synthesis</span></div><div class="analysis-scroll"><table class="analysis-table confirmation-table"><thead><tr><th>Domain</th>${headers}<th>Final</th></tr></thead><tbody>${rows}</tbody></table></div><p class="limitations">${first.methodNote} D60 is used only with a sufficiently accurate birth time.</p>`;
  document.querySelectorAll("[data-timing-domain]").forEach((button)=>button.addEventListener("click",()=>openTimingDialog(button.dataset.timingDomain)));
}

function renderOverallPromises() {
  selectedInsight="promises";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight===selectedInsight)));
  const report=currentPrediction.overallPromises;
  const rows=report.rows.map((row)=>`<details class="promise-domain" ${row.key==="overview"?"open":""}><summary><span><b>${row.label}</b><small>${row.varga} confirmation · ${row.arudhaKey} ${row.arudha?`in H${row.arudha.house} ${row.arudha.sign}`:"unavailable"}</small></span><em class="promise-level ${row.promise.toLowerCase()}">${row.promise}</em></summary><div class="promise-domain-body"><div class="promise-layers">${row.layers.map((layer)=>`<article><span>${layer.label}</span><b class="${layer.level.toLowerCase()}">${layer.level}</b><p>${layer.detail}</p></article>`).join("")}</div><div class="promise-evidence"><section><h4>Supporting structure</h4>${row.support.map((item)=>`<p><b>${item.title}</b>${item.detail}</p>`).join("")||"<p>No configured support item.</p>"}</section><section><h4>Contradictions / cautions</h4>${row.cautions.map((item)=>`<p><b>${item.title}</b>${item.detail}</p>`).join("")||"<p>No major configured contradiction.</p>"}</section></div>${row.nodes.length?`<div class="promise-node-note"><b>Rahu-Ketu involvement</b>${row.nodes.map((node)=>`${node.node} in H${node.house} ${node.sign}; sign controller ${node.signDispositor}, nakshatra controller ${node.nakshatraLord}${node.repeatedVargas.length?`; repeated in ${node.repeatedVargas.join(", ")}`:""}.`).join(" ")}</div>`:""}</div></details>`).join("");
  const points=report.specialPoints.map((point)=>point.type==="Sunrise-derived"?`<article><b>${point.key}</b><span>${point.degree.toFixed(2)}° · ${point.sign}</span><small>Verified local-sunrise calculation</small></article>`:`<article><b>${point.key}</b><span>H${point.house} · ${point.sign}</span><small>From H${point.sourceHouse}, lord ${point.lord}</small></article>`).join("");
  const nodes=report.nodes.map((node)=>`<article><span>${node.node} · ${node.axis}</span><h4>${node.sign} in H${node.house}</h4><p>Sign lord ${node.signDispositor}; nakshatra lord ${node.nakshatraLord}. ${node.repeatedVargas.length?`House repetition: ${node.repeatedVargas.join(", ")}.`:"No same-house repetition in the configured supporting Vargas."}</p><small>${node.source}</small></article>`).join("");
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>Overall natal promises</h3><p>Stored potential before MD-AD, transit or date-based activation.</p></div><span class="varga-badge">Timing excluded</span></div><div class="promise-summary"><div><span>Overall structural picture</span><strong>${report.overall}</strong></div><p><b>${report.counts.Good}</b> good · <b>${report.counts.Moderate}</b> moderate · <b>${report.counts.Low}</b> low topic promises</p></div><div class="promise-method">${report.method.map((item,index)=>`<p><b>${index+1}</b>${item}</p>`).join("")}</div><h4 class="analysis-title">Verified special manifestation points</h4><div class="special-point-grid">${points}</div><p class="limitations">${report.unavailable.join("; ")}. These sunrise-dependent points are shown as unavailable rather than estimated. Arudha points above are calculated and used as manifestation references.</p><h4 class="analysis-title">Rahu-Ketu structural axis</h4><p class="node-interpretive-note">Some modern traditions give the nodes special prominence in Kali Yuga. This application labels that as an interpretive belief, not an empirical fact, and still judges each node through its controllers and repeated chart context.</p><div class="promise-node-grid">${nodes}</div><h4 class="analysis-title">Domain promises without timing</h4><div class="promise-domains">${rows}</div><div class="source-key"><strong>Method sources:</strong> ${report.sources.join(" · ")}. Classical and modern source rules are paraphrased; no timing component enters the promise rating.</div>`;
}

function openTimingDialog(domainKey) {
  const domain=currentPrediction.domains[domainKey];
  const timing=domain.confirmation.components.find((item)=>item.key==="timing");
  const periods=currentPrediction.timeline.periods.filter((period)=>period.theme.domains.some((item)=>item.label===domain.label));
  const current=periods.find((period)=>period.current);
  const focusedUpcoming=periods.filter((period)=>period.phase==="upcoming");
  const upcoming=(focusedUpcoming.length?focusedUpcoming:currentPrediction.timeline.periods.filter((period)=>period.phase==="upcoming"&&period.theme.delivery!=="Low")).slice(0,6);
  const usingSupportingWindows=!focusedUpcoming.length;
  const currentHtml=current?`<section class="timing-current"><span>ACTIVE NOW</span><h3>${current.mdLord}–${current.adLord}</h3><p>${current.start} to ${current.end}</p><strong>${current.theme.delivery} activation · ${current.theme.headline}</strong><small>${current.theme.summary}</small></section>`:`<section class="timing-current inactive"><span>ACTIVE NOW</span><h3>No focused ${domain.label} window</h3><p>The present MD–AD does not rank this topic among its leading activated domains.</p></section>`;
  const windows=upcoming.length?upcoming.map((period)=>`<article><div><span>${usingSupportingWindows?"Supporting":period.theme.delivery}</span><b>${period.mdLord}–${period.adLord}</b></div><strong>${period.start} → ${period.end}</strong><p>${period.theme.headline} · ${period.geometry.relation}</p></article>`).join(""):`<p class="timing-empty">No future window is available in the calculated timeline.</p>`;
  byId("timing-dialog-title").textContent=`${domain.label} timing · ${timing.score>=68?"Good":timing.score>=45?"Moderate":"Low"}`;
  byId("timing-dialog-content").innerHTML=`<p class="timing-explanation">${timing.detail}</p>${currentHtml}<h3 class="timing-subtitle">${usingSupportingWindows?"Upcoming supporting MD–AD windows":"Upcoming focused activation windows"}</h3>${usingSupportingWindows?`<p class="timing-support-note">No upcoming period ranks ${domain.label} as a leading theme, so these are broader supportive windows to review—not direct topic activation claims.</p>`:""}<div class="timing-windows">${windows}</div><p class="limitations">These windows describe astrological MD–AD emphasis, not guaranteed events. D1 promise, ${domain.varga} confirmation, SAV and D60 remain supporting layers.</p>`;
  byId("timing-dialog").showModal();
}

byId("close-timing-dialog").addEventListener("click",()=>byId("timing-dialog").close());
byId("timing-dialog").addEventListener("click",(event)=>{ if(event.target===byId("timing-dialog")) byId("timing-dialog").close(); });

function renderAshtakavarga() {
  selectedInsight="ashtakavarga";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight===selectedInsight)));
  const av=currentPrediction.structural.ashtakavarga;
  const headers=Object.keys(av.sav).map((sign)=>`<th>${sign.slice(0,3)}</th>`).join("");
  const rows=Object.entries(av.bav).map(([body,values])=>`<tr><th>${body}</th>${Object.values(values).map((value)=>`<td>${value}</td>`).join("")}</tr>`).join("");
  const sav=`<tr class="sav-row"><th>SAV</th>${Object.values(av.sav).map((value)=>`<td>${value}</td>`).join("")}</tr>`;
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>Ashtakavarga</h3><p>Seven Bhinnashtakavarga rows and combined Sarvashtakavarga support.</p></div><span class="varga-badge">Total ${av.total} · Avg ${av.average.toFixed(1)}</span></div><div class="analysis-scroll"><table class="analysis-table"><thead><tr><th>Body</th>${headers}</tr></thead><tbody>${rows}${sav}</tbody></table></div><p class="limitations">BAV supports planet/sign and transit analysis. SAV supports house manifestation. Values confirm structure; one cutoff never replaces lordship, dignity or the relevant Varga.</p>`;
}

function renderStructure() {
  selectedInsight="structure";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight===selectedInsight)));
  const s=currentPrediction.structural;
  const planetRows=Object.entries(s.planets).map(([body,p])=>`<tr><th>${body}</th><td>${p.sign}</td><td>H${p.house}</td><td>${p.housesOwned.length?p.housesOwned.map(h=>`H${h}`).join(", "):"—"}</td><td>${p.functional.code}<small>${p.functional.label}</small></td><td>${p.dignity}${p.debilitation.applicable?`<small>${p.debilitation.result}</small>`:""}</td><td>${p.dispositor.chain.map(x=>x.planet).join(" → ")} (${p.dispositor.ending})</td></tr>`).join("");
  const arudhas=Object.entries(s.arudhas).map(([key,p])=>`<span class="point-chip"><b>${key}</b> H${p.house} ${p.sign}</span>`).join("");
  const yogas=s.yogas.map((y)=>`<div class="evidence support"><small>${y.source}</small><strong>${y.name}</strong><p>${y.detail} Participants: ${[...new Set(y.participants)].join(", ")}.</p></div>`).join("")||`<p>No configured yoga condition was detected.</p>`;
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>Lords, aspects & yogas</h3><p>Functional ownership, sign dignity, cancellation conditions, controller chains and formally detected linkages.</p></div><span class="varga-badge">Deterministic structure</span></div><div class="analysis-scroll"><table class="analysis-table"><thead><tr><th>Planet</th><th>Sign</th><th>House</th><th>Owns</th><th>FM / FB</th><th>Dignity & cancellation</th><th>Dispositor route</th></tr></thead><tbody>${planetRows}</tbody></table></div><h4 class="analysis-title">Arudha manifestation points</h4><div class="point-list">${arudhas}</div><h4 class="analysis-title">Configured yoga evidence</h4><div class="evidence-list">${yogas}</div><p class="limitations">Neecha-bhanga mitigates debilitation when a configured condition is present; it does not automatically make a planet exalted. Yoga names never dominate without lordship, dignity, Varga repetition and dasha activation.</p>`;
}

function renderNodes() {
  selectedInsight="nodes";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight===selectedInsight)));
  const cards=currentPrediction.structural.nodes.map((n)=>`<div class="node-card"><div><span>${n.source}</span><h4>${n.node} · ${n.axis}</h4><p>${n.sign}, house ${n.house}</p></div><dl><dt>Sign dispositor</dt><dd>${n.signDispositor}</dd><dt>Nakshatra lord</dt><dd>${n.nakshatraLord}</dd><dt>Controller route</dt><dd>${n.dispositorChain.chain.map(x=>x.planet).join(" → ")}</dd><dt>Same-house Varga repeats</dt><dd>${n.repeatedVargas.join(", ")||"None"}</dd></dl></div>`).join("");
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>Rahu-Ketu controller chain</h3><p>Node → sign dispositor → nakshatra lord → associations → Varga repetition → dasha activation.</p></div><span class="varga-badge">Mean-node profile</span></div><div class="node-grid">${cards}</div><p class="limitations">Node dignity is not a standalone verdict. Trivedi-specific rules are tagged P4 and cannot override stronger structural evidence.</p>`;
}

function renderTimeline() {
  selectedInsight = "timeline";
  document.querySelectorAll(".insight-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.insight === "timeline")));
  const current = currentPrediction.currentPeriod;
  const currentBlock = current ? `<div><span>Current MD-AD</span><h3>${current.mdLord} - ${current.adLord}</h3><p>${current.start} to ${current.end}</p></div><div><strong>${current.geometry.pair || "Dispositor route"}</strong><br>${current.geometry.relation}</div>` : `<div><h3>No current period found</h3></div>`;
  const periods = currentPrediction.timeline.periods.map((period) => `<div class="timeline-period ${period.current ? "current" : ""}"><strong>${period.mdLord} - ${period.adLord}</strong><span>${period.start} → ${period.end}</span><span>${period.geometry.relation}${period.geometry.mdHouse ? ` · H${period.geometry.mdHouse}/H${period.geometry.adHouse}` : ""}</span></div>`).join("");
  byId("insight-content").innerHTML = `<div class="insight-head"><div><h3>MD-AD timeline</h3><p>Mahadasha sets the environment; Antardasha executes the sub-theme. Geometry indicates interaction, not automatic good or bad.</p></div><span class="varga-badge">As of ${currentPrediction.generatedFor}</span></div><div class="timeline-now">${currentBlock}</div><div class="timeline-list">${periods}</div><p class="limitations">Transit triggers, BAV/SAV and PD narrowing are intentionally not claimed yet. A 6/8 relationship is labeled friction first; severity requires stacked natal, varga, dispositor and transit evidence.</p>`;
}

function renderTimelineThemes() {
  selectedInsight="timeline";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight==="timeline")));
  const current=currentPrediction.currentPeriod;
  const currentBlock=current?`<div><span>Current MD-AD</span><h3>${current.mdLord} - ${current.adLord}</h3><p>${current.start} to ${current.end}</p></div><div><strong>${current.theme.headline} · ${current.theme.delivery}</strong><br>${current.geometry.relation}</div>`:`<div><h3>No current period found</h3></div>`;
  const filtered=currentPrediction.timeline.periods.filter((period)=>timelineView==="all"||period.theme.phase===timelineView);
  const periods=filtered.map((period)=>`<details class="timeline-period ${period.current?"current":""}" ${period.current?"open":""}><summary><span><strong>${period.mdLord} - ${period.adLord}</strong><small>${period.start} → ${period.end}</small></span><span><b>${period.theme.headline}</b><small>${period.geometry.relation}${period.geometry.mdHouse?` · H${period.geometry.mdHouse}/H${period.geometry.adHouse}`:""}</small></span><em class="period-level ${period.theme.delivery.toLowerCase()}">${period.theme.delivery}</em></summary><div class="period-analysis"><p>${period.theme.summary}</p><div class="period-domains">${period.theme.domains.map((item)=>`<span><b>${item.label}</b>${item.varga} · ${item.support?"SAV supportive":"SAV restrained"}</span>`).join("")}</div><div class="period-amshas">${period.theme.d60.map((item)=>`<span><b>${item.lord}</b>${item.name} · ${item.nature}</span>`).join("")}</div></div></details>`).join("")||`<p class="timeline-empty">No periods are available in this view.</p>`;
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>MD-AD timeline</h3><p>Browse past and future periods. Each theme combines D1, the relevant Varga, house SAV and the period lords' D60 amshas.</p></div><span class="varga-badge">As of ${currentPrediction.generatedFor}</span></div><div class="timeline-now">${currentBlock}</div><div class="timeline-filters" aria-label="Timeline range">${[["past","Previous"],["current","Current"],["upcoming","Upcoming"],["all","All periods"]].map(([key,label])=>`<button type="button" data-view="${key}" aria-pressed="${timelineView===key}">${label}</button>`).join("")}</div><div class="timeline-list">${periods}</div><p class="limitations">SAV describes house-level manifestation support; BAV is planet-specific and especially useful when judging transits. Neither replaces house lord condition, D1 promise or dasha activation. D60 remains birth-time sensitive.</p>`;
  document.querySelectorAll(".timeline-filters button").forEach((button)=>button.addEventListener("click",()=>{timelineView=button.dataset.view;renderTimelineThemes();}));
}

function renderBestPeriods(){
  selectedInsight="best-periods";
  setActiveInsightTab("best-periods");
  const rows=currentPrediction.mahadashaRankings.map((item,index)=>`<details class="timeline-period ${item.window?.current?"current":""}" ${index<3||item.window?.current?"open":""}><summary><span><strong>${index+1}. ${item.lord} Mahadasha</strong><small>${item.window?`${item.window.start} → ${item.window.end}`:"Outside displayed timeline"}</small></span><span><b>${item.themes.map((x)=>x.label).join(" · ")}</b><small>D1 H${item.house} · D9 H${item.d9House} · D10 H${item.d10House}</small></span><em class="period-level ${item.level.toLowerCase()}">${item.level}</em></summary><div class="period-analysis"><p><b>Integrated condition:</b> ${item.functional.label}; ${item.dignity}; ${item.retrograde?"retrograde":"direct"}; ${item.upachaya?"in an upachaya":"not in an upachaya"}. Natural role: ${item.naturalNature}.</p><div class="period-domains"><span><b>D1 ownership</b>${item.housesOwned.map((h)=>`H${h}`).join(", ")||"None"}</span><span><b>Connections received</b>${item.received.join(", ")||"None configured"}</span><span><b>Conjunctions</b>${item.conjunctions.join(", ")||"None"}</span><span><b>Dispositor</b>${item.dispositor} · ${item.dispositorStrong?"supportive condition":"requires caution"}</span></div><div class="theme-card"><span>Combustion context</span><h4>${item.combustion.combust?`Within ${item.combustion.distance}° of Sun`:item.combustion.statement}</h4><p>${item.combustion.statement}</p><small>Mitigation: ${item.combustion.mitigations.join(", ")||"none required/configured"}. Combustion is never scored alone.</small></div><div class="period-amshas"><span><b>D60</b>${item.d60.name} · ${item.d60.nature}</span>${item.themes.map((x)=>`<span><b>${x.label}</b>${x.varga} theme · ${x.points} activation points</span>`).join("")}</div></div></details>`).join("");
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>Best Mahadasha periods</h3><p>Comparative MD delivery potential—not a guarantee that every event in a high-ranked period is favorable.</p></div><span class="varga-badge">Integrated ranking</span></div><p class="limitations">Ranking order: D1 functional lordship, ownership, house placement, dignity, conjunctions, aspects and dispositor first; D9/D10 theme repetition and D60 amsha confirm. Retrogression and combustion modify delivery contextually. Antardasha, transit and the promised domain still decide the actual event.</p><div class="timeline-list">${rows}</div>`;
}

function renderReadingGuide() {
  selectedInsight = "guide";
  document.querySelectorAll(".insight-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.insight === "guide")));
  byId("insight-content").innerHTML = `<div class="insight-head"><div><h3>How to read the charts</h3><p>The rulebook's required evaluation order, kept separate from prediction claims.</p></div><span class="varga-badge">Reading guide</span></div><div class="reading-steps">${currentPrediction.readingOrder.map((step) => `<div class="reading-step">${step}</div>`).join("")}</div><div class="source-key"><strong>Output dimensions:</strong> Promise asks whether a result is structurally available. Strength asks whether relevant factors can deliver. Ease describes friction. Stability describes consolidation. Confidence reflects independent evidence, not certainty.</div>`;
}

function renderLifeReport(){
  selectedInsight="life-report";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight===selectedInsight)));
  const promise=currentPrediction.overallPromises;
  const domainRows=promise.rows.map((row)=>`<tr><th>${row.label}</th><td>${row.varga}</td><td><b class="promise-level ${row.promise.toLowerCase()}">${row.promise}</b></td><td>${row.layers.map((layer)=>`${layer.label}: ${layer.level}`).join(" · ")}</td></tr>`).join("");
  const now=currentPrediction.currentPeriod;
  const next=currentPrediction.timeline.periods.filter((period)=>period.theme.phase==="upcoming").slice(0,3);
  const periods=[...(now?[now]:[]),...next].map((period,index)=>`<article><span>${index===0&&period.current?"CURRENT PERIOD":`NEXT WINDOW ${index+(now?0:1)}`}</span><h4>${period.mdLord}–${period.adLord} · ${period.theme.delivery}</h4><p>${period.start} → ${period.end} · ${period.geometry.relation}</p><small>${period.theme.summary}</small></article>`).join("");
  const vargas=Object.entries(currentResult.charts).map(([code,chart])=>`<span><b>${code}</b>${chart.ascSign}</span>`).join("");
  const birthNak=currentResult.panchanga?.birthNakshatra;
  byId("insight-content").innerHTML=`<div class="life-report"><div class="insight-head"><div><h3>Integrated Life Report</h3><p>D1-led natal architecture, specialist Vargas, Ashtakavarga and MD–AD activation.</p></div><span class="varga-badge">Beta interpretive report</span></div><section class="report-cover"><span>STRUCTURAL OVERVIEW</span><h4>${promise.overall}</h4><p>${promise.counts.Good} good · ${promise.counts.Moderate} moderate · ${promise.counts.Low} low domain promises. This is an astrological evidence label, not a probability or a real-life guarantee.</p></section><div class="report-facts"><span><b>Birth record</b>${currentResult.local}</span><span><b>Rasi Lagna</b>${currentResult.charts.D1.ascSign}</span><span><b>Moon nakshatra</b>${birthNak?`${birthNak.name}, pada ${birthNak.pada}, lord ${birthNak.lord}`:"Unavailable"}</span><span><b>Birth-time sensitivity</b>${currentResult.birthTimeSensitivity?.level||"Not run"}</span><span><b>Evidence scope</b>D1 + relevant Varga + SAV/BAV + structure + MD–AD</span></div><h4 class="analysis-title">Overall promises before timing</h4><div class="analysis-scroll"><table class="analysis-table"><thead><tr><th>Domain</th><th>Specialist chart</th><th>Promise</th><th>Evidence layers</th></tr></thead><tbody>${domainRows}</tbody></table></div><h4 class="analysis-title">Divisional ascendants</h4><div class="report-vargas">${vargas}</div><h4 class="analysis-title">Current and next three MD–AD windows</h4><div class="report-periods">${periods||"<p>No displayed periods.</p>"}</div><p class="limitations">Method order: D1 promise first; functional lordship, dignity, dispositors, aspects and yoga context next; the topic-specific divisional chart and Ashtakavarga confirm; MD–AD times what is already promised. D60 is fine-grained and birth-time sensitive. Shadbala, Bhavabala, live transits and Pratyantardasha are not calculated in this version.</p><div class="report-disclaimer"><b>BETA HOBBY PROJECT — NOT REAL-LIFE ADVICE.</b> Interpretive astrology can be inaccurate. Do not use this report for medical, legal, financial, safety, relationship, career or other important decisions.</div></div>`;
}

function renderPredictionWorkspace(result) {
  currentPrediction = result.prediction;
  const tabs = byId("insight-tabs"); tabs.replaceChildren();
  [...Object.entries(DOMAIN_SPECS).map(([key, spec]) => ({ key, label: spec.label })), {key:"promises",label:"Overall promises"},{key:"confirmation",label:"Confirmation"},{key:"ashtakavarga",label:"Ashtakavarga"},{key:"structure",label:"Lords & yogas"},{key:"nodes",label:"Rahu-Ketu"},{key:"best-periods",label:"Best Mahadashas"}, { key: "timeline", label: "Timeline" }, { key: "guide", label: "How to read" }].forEach(({ key, label }) => {
    const tab = document.createElement("button"); tab.type = "button"; tab.role = "tab"; tab.className = "insight-tab"; tab.dataset.insight = key; tab.textContent = label; tab.setAttribute("aria-selected", String(key === selectedInsight));
    tab.addEventListener("click", () => key === "timeline" ? renderTimelineThemes() : key === "best-periods" ? renderBestPeriods() : key === "guide" ? renderReadingGuide() : key === "promises" ? renderOverallPromises() : key === "confirmation" ? renderConfirmation() : key === "ashtakavarga" ? renderAshtakavarga() : key === "structure" ? renderStructure() : key === "nodes" ? renderNodes() : renderDomainInsight(key));
    tabs.append(tab);
  });
  renderDomainInsight(DOMAIN_SPECS[selectedInsight] ? selectedInsight : "overview");
}

document.querySelectorAll("#style-tabs button").forEach((button) => button.addEventListener("click", () => {
  selectedChartStyle = button.dataset.style;
  document.querySelectorAll("#style-tabs button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  if (currentResult) renderChart(selectedChartCode);
}));
byId("print-life-report").addEventListener("click",async()=>{
  if(!lastCalculationInput) return showError("Calculate a chart before generating its PDF report.");
  const button=byId("print-life-report"),original=button.textContent;
  clearError();button.disabled=true;button.textContent="Building PDF...";
  try{
    const response=await fetch(`${import.meta.env.VITE_API_BASE_URL||""}/api/report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...lastCalculationInput,locationName:selectedLocation})});
    if(!response.ok){const problem=await response.json().catch(()=>({}));throw new Error(problem.error||"The report service could not generate this PDF.");}
    const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement("a");
    const disposition=response.headers.get("content-disposition")||"",match=/filename="?([^";]+)"?/i.exec(disposition);
    anchor.href=url;anchor.download=match?.[1]||"jyotish-life-report.pdf";document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(error){showError(error.message);}
  finally{button.disabled=false;button.textContent=original;}
});

function renderResult(result) {
  currentResult = result;
  byId("results").hidden = false;
  byId("result-title").textContent = selectedLocation.split(",")[0] || "Varga overview";
  byId("result-meta").textContent = `${result.local}  ·  UTC ${result.utc.replace(".000Z", "Z")}  ·  JD ${result.jd.toFixed(6)}`;
  byId("rasi-lagna").textContent = result.charts.D1.ascSign;
  renderPositions(result.positions);
  renderPanchanga(result);
  const tabs = byId("chart-tabs"); tabs.replaceChildren();
  Object.entries(result.charts).forEach(([code, chart], index) => {
    const tab = document.createElement("button");
    tab.type = "button"; tab.className = "chart-tab"; tab.dataset.code = code; tab.role = "tab";
    tab.setAttribute("aria-selected", String(index === 0)); tab.title = chart.name; tab.textContent = code;
    tab.addEventListener("click", () => renderChart(code)); tabs.append(tab);
  });
  renderChart("D1");
  renderPredictionWorkspace(result);
  byId("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

byId("location-search").addEventListener("click", runLocationSearch);
byId("location-query").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); runLocationSearch(); } });
try {
  const savedPlace=JSON.parse(localStorage.getItem("jyotish-last-place")||"null");
  if(savedPlace?.name&&Number.isFinite(savedPlace.latitude)&&Number.isFinite(savedPlace.longitude)) selectPlace(savedPlace);
} catch { localStorage.removeItem("jyotish-last-place"); }
byId("use-location").addEventListener("click", () => {
  clearError();
  if (!navigator.geolocation) return showError("Location is not available in this browser.");
  navigator.geolocation.getCurrentPosition((position) => selectPlace({ name: "Current device location", latitude: position.coords.latitude, longitude: position.coords.longitude }), (error) => showError(`Could not use device location: ${error.message}`));
});
["date", "time"].forEach((id) => byId(id).addEventListener("change", updateTimezone));
["latitude", "longitude"].forEach((id) => byId(id).addEventListener("change", updateTimezone));

form.addEventListener("submit", async (event) => {
  event.preventDefault(); clearError(); calculateButton.disabled = true;
  calculateButton.querySelector("span").textContent = "Calculating…";
  try {
    const requestData=Object.fromEntries(new FormData(form));
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/chart`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestData),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Calculation failed.");
    lastCalculationInput=requestData;renderResult(payload);
  }
  catch (error) { showError(error.message); }
  finally { calculateButton.disabled = false; calculateButton.querySelector("span").textContent = "Calculate charts"; }
});

status.textContent = "Secure calculation service ready"; calculateButton.disabled = false;
