import { historicalUtcOffset, searchLocations, timezoneForCoordinates } from "./location-service.js";
import { cellsForStyle } from "./chart-layouts.js";

const DOMAIN_SPECS = Object.freeze({
  overview:{label:"Overview"}, money:{label:"Money"}, career:{label:"Career"}, fame:{label:"Fame & authority"},
  marriage:{label:"Marriage"}, foreign:{label:"Foreign"}, property:{label:"Property"}, vehicles:{label:"Vehicles"}, gains:{label:"Gains"},
});

const byId = (id) => document.getElementById(id);
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
  byId("selected-location").textContent = place.name;
  byId("latitude").value = place.latitude.toFixed(6);
  byId("longitude").value = place.longitude.toFixed(6);
  byId("location-results").hidden = true;
  updateTimezone();
}

async function runLocationSearch() {
  clearError();
  const button = byId("location-search");
  button.disabled = true; button.textContent = "Searching…";
  try {
    const places = await searchLocations(byId("location-query").value);
    const container = byId("location-results");
    container.replaceChildren();
    if (!places.length) throw new Error("No matching place was found.");
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
  const foreignBlock=key==="foreign"?`<section class="foreign-analysis"><div class="foreign-status"><article><span>${f.movement.label}</span><strong>${f.movement.level}</strong><p>${f.movement.detail}</p></article><article><span>${f.base.label}</span><strong>${f.base.level}</strong><p>${f.base.detail}</p></article></div>${f.axis?`<div class="axis-card"><div><span>Active MD-AD axis</span><h4>${f.axis.mdLord} - ${f.axis.adLord} · ${f.axis.pair}</h4><p>${f.axis.relation}</p></div><strong>${f.axis.result}</strong></div>`:""}<div class="theme-card"><span>Main period theme</span><h4>${f.mainTheme?.label||"No active theme"}</h4><p>${f.mainTheme?`${f.mainTheme.varga} · ${f.mainTheme.support?"SAV supportive":"SAV restrained"}`:""}</p><small>Other confirmations: ${f.otherThemes.map((item)=>`${item.label} (${item.varga}, ${item.support?"SAV supportive":"SAV restrained"})`).join("; ")||"None"}</small></div><h4 class="analysis-title">D1 foundation: houses 4, 9 and 12</h4><div class="analysis-scroll"><table class="analysis-table"><thead><tr><th>House</th><th>Lord</th><th>Lord placed</th><th>Occupants</th><th>SAV</th></tr></thead><tbody>${f.houses.map((item)=>`<tr><th>H${item.house}</th><td>${item.lord}</td><td>H${item.lordHouse}</td><td>${item.occupants.join(", ")||"—"}</td><td>${item.sav}</td></tr>`).join("")}</tbody></table></div><div class="foreign-confirm-grid"><article><span>Primary confirmation</span><h4>D4 · H9/H12</h4><p>${f.primary.houses.map((item)=>`H${item.house}: ${item.occupants.join(", ")||"—"}`).join(" · ")}</p></article>${f.supporting.map((chart)=>`<article><span>Supporting strength</span><h4>${chart.code} · H9/H12</h4><p>${chart.houses.map((item)=>`H${item.house}: ${item.occupants.join(", ")||"—"}`).join(" · ")}</p></article>`).join("")}</div><div class="ll-card"><div><span>Lagna lord relationship</span><h4>${f.lagnaLord.planet} in H${f.lagnaLord.house}</h4></div><p>Aspects foreign houses: ${f.lagnaLord.aspectHouses.map((house)=>`H${house}`).join(", ")||"none"}. Linked 4L/9L/12L: ${f.lagnaLord.linkedForeignLords.join(", ")||"none"}.</p><p>Rahu in H${f.rahu.house}; aspects ${f.rahu.aspectHouses.map((house)=>`H${house}`).join(", ")||"no focused foreign house"}.</p></div><h4 class="analysis-title">D60 confirmation for relevant and period lords</h4><div class="period-amshas">${f.d60.map((item)=>`<span><b>${item.lord}</b>${item.name} · ${item.nature}</span>`).join("")}</div></section>`:"";
  const functionalBlock=key==="foreign"?`<section class="functional-section"><h4 class="analysis-title">Functional benefic / malefic roles</h4><div class="functional-grid">${f.functional.map((item)=>`<article><span>${item.code}</span><h4>${item.lord} · ${item.label}</h4><p>${item.dignity}${item.debilitation.applicable?` · ${item.debilitation.result}`:""}</p><small>${item.reasons.join(" ")}${item.debilitation.conditions?.length?` Cancellation: ${item.debilitation.conditions.join(" ")}`:""}</small></article>`).join("")}</div></section>`:"";
  const evidence = report.evidence.map((item) => `<div class="evidence ${item.tone}"><small>${item.source}</small><strong>${item.title}</strong><p>${item.detail}</p></div>`).join("");
  byId("insight-content").innerHTML = `<div class="insight-head"><div><h3>${report.label}</h3><p>${report.description}</p></div><span class="varga-badge">Primary chart ${report.varga}</span></div><div class="dimension-grid">${dimensions}</div>${foreignBlock}${functionalBlock}<section class="confirmation-panel"><header><div><span>Final confirmation</span><h4>${report.confirmation.label}</h4></div></header>${confirmationRows}<p>${report.confirmation.methodNote}</p></section><div class="confidence-box"><strong>Evidence completeness</strong><span>${report.confidenceDetail.label}. This describes available rule layers, not event probability.</span><small>Calculated: ${report.confidenceDetail.calculatedLayers.join(", ")}. Missing: ${report.confidenceDetail.missingLayers.join(", ")}.</small></div><div class="evidence-list">${evidence}</div><p class="limitations">${report.limitations}</p><div class="source-key">Source levels: P3 = integrated computational framework; P5 = derived operational software rule. Supporting and caution evidence remain separate instead of being averaged away.</div>`;
}

function renderConfirmation() {
  selectedInsight="confirmation";
  document.querySelectorAll(".insight-tab").forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.insight===selectedInsight)));
  const first=Object.values(currentPrediction.domains)[0].confirmation;
  const headers=first.components.map((item)=>`<th>${item.chart}</th>`).join("");
  const level=(score)=>score>=68?"Good":score>=45?"Moderate":"Low";
  const rows=Object.values(currentPrediction.domains).map((domain)=>`<tr><th>${domain.label}<small>${domain.varga}</small></th>${domain.confirmation.components.map((item)=>`<td><span class="score-cell ${level(item.score).toLowerCase()}">${level(item.score)}</span></td>`).join("")}<td><b>${domain.confirmation.label}</b></td></tr>`).join("");
  byId("insight-content").innerHTML=`<div class="insight-head"><div><h3>Divisional confirmation</h3><p>D1 governs the promise. The relevant division confirms it; MD-AD shows whether that promise is active now.</p></div><span class="varga-badge">Chart synthesis</span></div><div class="analysis-scroll"><table class="analysis-table confirmation-table"><thead><tr><th>Domain</th>${headers}<th>Final</th></tr></thead><tbody>${rows}</tbody></table></div><p class="limitations">${first.methodNote} D60 is used only with a sufficiently accurate birth time.</p>`;
}

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

function renderReadingGuide() {
  selectedInsight = "guide";
  document.querySelectorAll(".insight-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.insight === "guide")));
  byId("insight-content").innerHTML = `<div class="insight-head"><div><h3>How to read the charts</h3><p>The rulebook's required evaluation order, kept separate from prediction claims.</p></div><span class="varga-badge">Reading guide</span></div><div class="reading-steps">${currentPrediction.readingOrder.map((step) => `<div class="reading-step">${step}</div>`).join("")}</div><div class="source-key"><strong>Output dimensions:</strong> Promise asks whether a result is structurally available. Strength asks whether relevant factors can deliver. Ease describes friction. Stability describes consolidation. Confidence reflects independent evidence, not certainty.</div>`;
}

function renderPredictionWorkspace(result) {
  currentPrediction = result.prediction;
  const tabs = byId("insight-tabs"); tabs.replaceChildren();
  [...Object.entries(DOMAIN_SPECS).map(([key, spec]) => ({ key, label: spec.label })), {key:"confirmation",label:"Confirmation"},{key:"ashtakavarga",label:"Ashtakavarga"},{key:"structure",label:"Lords & yogas"},{key:"nodes",label:"Rahu-Ketu"}, { key: "timeline", label: "Timeline" }, { key: "guide", label: "How to read" }].forEach(({ key, label }) => {
    const tab = document.createElement("button"); tab.type = "button"; tab.role = "tab"; tab.className = "insight-tab"; tab.dataset.insight = key; tab.textContent = label; tab.setAttribute("aria-selected", String(key === selectedInsight));
    tab.addEventListener("click", () => key === "timeline" ? renderTimelineThemes() : key === "guide" ? renderReadingGuide() : key === "confirmation" ? renderConfirmation() : key === "ashtakavarga" ? renderAshtakavarga() : key === "structure" ? renderStructure() : key === "nodes" ? renderNodes() : renderDomainInsight(key));
    tabs.append(tab);
  });
  renderDomainInsight(DOMAIN_SPECS[selectedInsight] ? selectedInsight : "overview");
}

document.querySelectorAll("#style-tabs button").forEach((button) => button.addEventListener("click", () => {
  selectedChartStyle = button.dataset.style;
  document.querySelectorAll("#style-tabs button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  if (currentResult) renderChart(selectedChartCode);
}));

function renderResult(result) {
  currentResult = result;
  byId("results").hidden = false;
  byId("result-title").textContent = selectedLocation.split(",")[0] || "Varga overview";
  byId("result-meta").textContent = `${result.local}  ·  UTC ${result.utc.replace(".000Z", "Z")}  ·  JD ${result.jd.toFixed(6)}`;
  byId("rasi-lagna").textContent = result.charts.D1.ascSign;
  renderPositions(result.positions);
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
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/chart`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Calculation failed.");
    renderResult(payload);
  }
  catch (error) { showError(error.message); }
  finally { calculateButton.disabled = false; calculateButton.querySelector("span").textContent = "Calculate charts"; }
});

status.textContent = "Secure calculation service ready"; calculateButton.disabled = false;
