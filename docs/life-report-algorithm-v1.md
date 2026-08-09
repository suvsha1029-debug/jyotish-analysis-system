# Life Report and Prediction Algorithm - Design V1

Status: research design only. Do not implement until the calculation gaps and test fixtures in section 12 are complete.

## 1. Governing principles

1. D1 is the promise gate. No Varga, dasha, transit, yoga or LLM narration may create a major result absent from the D1 structure.
2. A relevant Varga specializes a domain; it does not inherit a generic D1 house list.
3. MD is the operating environment. AD is the active sub-theme/executor. Their relationship, controllers and common activated houses must be computed before prose.
4. Material result, ease, stability, public manifestation and subjective experience are separate outputs.
5. Repeated independent evidence is stronger than an isolated yoga or modifier.
6. Combustion, retrogression, debilitation, nodes and dusthana ownership are contextual modifiers, not deletion rules.
7. D60 is a deep confirmation only when birth-time sensitivity is acceptable. It never overrides D1.
8. Astrology output is interpretive and non-empirical. Confidence means evidence completeness/consistency, not event probability.

## 2. Source authority and rule storage

Each executable rule is stored as a RuleCard:

```text
RuleCard {
  id, topic, sourceTier, sourceTitle, chapter, pageLocator,
  paraphrase, prerequisites[], positiveEvidence[], cautionEvidence[],
  exceptions[], calculationProfile, confidenceClass
}
```

Source tiers:

- P0: direct BPHS verse/rule.
- P1: BPHS translator commentary.
- P2: other classical text.
- P3: P.V.R. Narasimha Rao integrated/computational method.
- P4: named modern specialized framework, such as P. Trivedi for nodes.
- P5: derived software synthesis.
- P6: LLM narration only; never changes calculations.

Reddit and X posts may reveal test cases, terminology problems and possible exceptions. They cannot become executable rules without an independently verifiable P0-P4 source.

## 3. Data-integrity and birth-time gate

Before interpretation:

- Validate timezone history, coordinates, local-to-UTC conversion, ayanamsha, node profile and ephemeris version.
- Calculate a sensitivity ensemble at birth time -10, -5, -2, -1, +1, +2, +5 and +10 minutes.
- Record which Lagnas, Varga Lagnas, Arudhas, amshas and house placements change.
- Assign each layer a stability class: stable, sensitive or unsafe.
- Suppress D60 conclusions when the relevant D60 factor changes in the small perturbation window.
- Special Lagnas that require sunrise are unavailable until verified sunrise/local apparent time calculations exist.

The report may show a full 120-year Vimshottari cycle. It must never describe that range as the person's lifespan or predict a death date.

## 4. Deterministic chart object

For every planet/node and supported chart store:

```text
PlanetCondition {
  sign, house, exactLongitude, degreeInSign, motion,
  naturalNature, functionalRole, housesOwned,
  dignity, exactDignityDistance, combustionContext,
  planetaryWar, conjunctions, aspectsGiven, aspectsReceived,
  dispositorChain, finalDispositor, exchangeOrLoop,
  nakshatra, nakshatraLord, avasthaIfVerified,
  shadbalaIfAvailable, BAV, vargaPositions, amshaNature
}
```

For every house store sign, lord, occupants, aspects received, lord condition, dispositor route, Bhavabala, SAV, Arudha and domain meanings.

## 5. D1 promise engine

For a domain, evaluate in this order:

1. Lagna and Lagna lord capacity.
2. Topic house condition.
3. Topic lord ownership, placement, dignity and exact-degree state.
4. Topic lord dispositor chain and final controller.
5. Occupants and aspects to the house and lord.
6. Topic karakas, judged with functional role and chart context.
7. Formal yogas, accepted only after participant and controller validation.
8. Upachaya conversion for H3/H6/H10/H11.
9. Shadbala/Bhavabala and BAV/SAV.
10. Arudha/special-Lagna manifestation.
11. Supporting and contradicting evidence preserved separately.

The D1 output is not one number. It is a vector:

```text
PromiseVector { availability, capacity, ease, stability, scale, visibility, satisfaction }
```

## 6. Modifier engine

### Combustion

Calculate exact solar distance and use an explicit configurable orb profile. Then evaluate:

- Planet's D1 house, ownership and functional role.
- Sun's dignity, functional role, house and associations.
- Whether the planet is in a kendra, trikona or productive upachaya.
- Dispositor and final-dispositor support.
- Benefic/yogakaraka protection and pressure aspects.
- Constructive Saturn support only when Saturn is functionally capable and its aspect is relevant; never use "Saturn saves combustion" as a universal rule.
- D9/relevant-Varga repetition, Shadbala and yoga activation.

Output: delivery altered, visibility absorbed by Sun, pressured competence, mixed or materially preserved. Never output "destroyed" from combustion alone.

### Retrogression

Store one natal astronomical flag and display it in Vargas without recalculating a Varga-specific motion state. Treat it as intensified/reworked/nonlinear delivery. Direction of outcome comes from lordship, house, dignity, dispositors, aspects and dasha context.

### Upachaya

H3/H6/H10/H11 may convert pressure into effort, competition, persistence, institutional growth or scale. Natural malefics are not automatically harmful there. Ease and output remain separate.

### Nodes

Use node -> house -> sign lord -> nakshatra lord -> conjunction/aspect -> important lord/luminary -> D9/relevant Varga -> MD/AD. Node periods require both sign and nakshatra controller condition.

## 7. Domain-Varga contracts

- Money: D1 H2/H11, support H5/H9/H10, leakage H12, A2/A11/HL; D2 uses its verified Hora method.
- Career: D1 H1/H2/H6/H9/H10/H11; D10 Lagna/LL, H10/10L, H2/H6/H9/H11, A10/AL/GL, professional karakas.
- Authority/fame: D1 prominence and Raja-yoga promise; D10 achievement plus D5 authority/recognition; GL/AL/A10 manifestation.
- Marriage: D1 H7/7L and family/continuity; D9 Lagna/LL and H7/7L; UL and its continuity houses.
- Foreign: D1 H1/H3/H4/H7/H9/H12 and their lords, especially 1L-9L and 4L/9L/12L links; D4 residence/fortune/foreign frame; D10 only for foreign work; D9 only for foreign-spouse/dharma context.
- Property: D1 H4/4L with H2/H8/H11/H12; D4 Lagna/LL, H4/4L and acquisition/fortune/outlay houses.
- Vehicles/comfort: D1 H4/4L and Venus; D16 Lagna/LL, H4/4L, Venus/Moon and A4 if verified.
- Education: D1 H4/H5/H9, Mercury/Jupiter; D24 specialized frame.

Each contract has its own activation houses, lords, karakas, Arudhas and contradiction rules.

## 8. MD-AD relationship engine

For every MD-AD pair compute:

```text
PeriodMatrix {
  mdCondition, adCondition,
  mdActivated = owned + occupied + stronglyAspected + yogaLinked,
  adActivated = owned + occupied + stronglyAspected + yogaLinked,
  commonActivatedHouses,
  mdAdGeometry, conjunctionOrAspect,
  mdDispositorChain, adDispositorChain,
  controllerRelationship, commonFinalDispositor, exchangesOrLoops,
  functionalLoad, dusthanaMarakaLoad, upachayaLoad,
  yogaActivation, nodeControllerActivation,
  fromMoonGeometry, MoonAndH4Pressure,
  domainVargaActivation, D9Maturation, D10CareerStrength,
  specialLagnaActivation, AVSupport, D60Confirmation
}
```

Evaluation order:

1. Apply D1 promise gate for every domain.
2. Evaluate MD lord as environment using complete D1 condition.
3. Evaluate AD lord as executor using complete D1 condition.
4. Evaluate their geometry in both directions and direct aspect/conjunction.
5. Compare dispositor chains and common/final controllers.
6. Rank common activated houses above non-common houses.
7. Activate only yogas whose participants/controllers include MD or AD.
8. Re-run the same lords through the relevant Varga contract.
9. Use D9 as maturation/context, D10 for career, and D60 only as stable deep confirmation.
10. Evaluate Moon/4H separately for subjective load.
11. Use BAV/SAV and then transit only for manifestation/window refinement.

No geometry is intrinsically good or bad. A 6/8 pair can be productive but exhausting when planets/controllers are strong; it becomes high-risk only when weak delivery, dusthana load, repeated Varga stress and trigger pressure converge.

## 9. Special-Lagna layer

Core manifestation references:

- AL: visible identity/public perception.
- A2/A4/A9/A10/A11: topic manifestation.
- UL: marriage manifestation.
- HL: wealth-oriented reference, only after verified sunrise calculation.
- GL: power/authority reference, only after verified sunrise calculation.

Optional research references (Sree Lagna, Indu Lagna, Karakamsha and others) remain disabled until their calculation profile and interpretive rules are independently verified. They may confirm; they may not override D1.

## 10. Qualitative synthesis and confidence

Do not average everything into a 0-100 astrology score. Use an evidence ledger:

```text
Evidence { layer, ruleId, sourceTier, supportsOrContradicts, independenceGroup, strength, explanation }
```

Final labels are produced from a decision table:

- Strong promise: D1 gate open with multiple independent structural confirmations.
- Moderate promise: D1 gate open but delivery/controllers or relevant Varga are mixed.
- Limited promise: D1 gate weak and no strong independent rescue.
- Timing active: MD and AD jointly activate the domain with controller support.
- Timing partial: only one period lord or only a secondary confirmation activates it.
- Timing inactive: no meaningful common activation.

Confidence dimensions:

- Source confidence.
- Birth-time stability.
- Calculation coverage.
- Independent confirmation count.
- Contradiction load.
- Missing-data penalty.

Never present confidence as the probability that an event will happen.

## 11. Life-report structure

1. Method, disclaimer and birth-data audit.
2. All supported divisional charts with exact degrees and calculation profile.
3. Birth-time sensitivity table.
4. D1 life architecture: Lagna, lords, aspects, dispositors, yogas, strength, AV and manifestation points.
5. Domain chapters: money, career, authority, marriage, foreign, property, vehicles, education and gains.
6. Rahu-Ketu controller chapter.
7. D9 maturation, D10 professional and D60 stable-deep themes.
8. Lifetime Vimshottari overview for the full mathematical cycle, clearly not lifespan prediction.
9. Detailed current MD plus next three AD windows by default; optionally expand any MD.
10. For each detailed window: main theme, secondary themes, material output, ease, stability, mental load, relevant-Varga evidence, D60 caveat, supporting/contradicting rules and source citations.
11. Best periods reported per domain, not one universal "best dasha."
12. Limitations and unavailable calculations.

## 12. Required work before implementation confidence

1. Add verified friendship/enmity and moolatrikona degree profiles.
2. Add exact combustion profiles, planetary war and conjunction/aspect exactness.
3. Implement Shadbala and Bhavabala or label them unavailable everywhere.
4. Add verified sunrise, HL and GL calculations with tests.
5. Add Varga-specific lordship, aspects, Arudhas and yoga evaluation.
6. Replace generic Varga scores with qualitative evidence ledgers.
7. Add MD/AD activated-house intersections and complete dispositor relationship graphs.
8. Add Moon-reference and mental-load engine.
9. Add birth-time perturbation/sensitivity tests, especially D9/D10/D60.
10. Create at least 25 worked regression charts with known event dates and blind hold-out tests.
11. Curate source-tagged RuleCards; do not send whole copyrighted books to an LLM.
12. Generate the PDF server-side, render every page to images and visually verify it before delivery.

## 13. Hosting-safe RAG architecture

- Keep astronomy and rule evaluation deterministic on the private server.
- Pre-curate paraphrased RuleCards and small compliant source excerpts.
- Embed only the RuleCards, not entire copyrighted PDFs.
- Retrieve by domain, chart, rule prerequisites and source tier.
- Send structured evidence plus retrieved RuleCards to the LLM.
- Require the LLM to emit a schema with citations, supporting evidence, contradictions and limitations.
- Reject narration that introduces a fact/rule absent from the supplied evidence.
- Cache calculations by a salted chart fingerprint; never expose birth data in URLs, logs or client bundles.
- Generate life-report PDFs in an authenticated server function with short-lived download URLs and deletion policy.

## 14. Confidence decision

Confidence to implement the architecture: high.

Confidence to publish refined deterministic predictions immediately: moderate, because Shadbala/Bhavabala, special-Lagna sunrise calculations, exact modifier profiles, full Varga-specific condition engines and event-based calibration are still incomplete.

Recommendation: implement in gated milestones and do not produce the final life-report PDF until sections 12.1-12.10 pass tests.
