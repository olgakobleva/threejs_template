# ZZP deductions — research report (2025 · 2026 · 2027)

Researched 11 November 2026 against official sources (belastingdienst.nl,
rijksoverheid.nl, Staatscourant, Belastingplan 2027 Kamerstukken), with
secondary sources marked as such. Figures not found on an official source are
marked **UNCONFIRMED**.

This is research for the app, not tax advice. 2027 figures come from the
Belastingplan 2027, which was still before parliament on the research date
(Tweede Kamer vote 12 Nov 2026, Eerste Kamer in December); the 4 Nov 2026 third
nota van wijziging already changed several of them.

Companion documents: [app review](zzp-deductions-app-review.md) ·
[summary](zzp-deductions-summary.md).

Each chapter has its own numbered source list; `[S3]` refers to the list at the
end of the same chapter.

## Contents

1. Entrepreneur deductions and investment allowance
2. Box 1 rates, tax credits and Zvw
3. Business costs (profit side)
4. BTW and KOR


---

## Chapter 1 — Ondernemersaftrek & investment rules (IB-ondernemer / ZZP) — 2025, 2026, 2027

Research date: 2026-11-11. Official sources preferred; source numbers [S#] refer to the list at the end.
Status legend for app check: **CORRECT** / **WRONG** (correct value given) / **UNCONFIRMED**.

---

### 1. Verdict on the app's current values

| Year | App field | App value | Verdict | Correct value / note | Source |
|---|---|---|---|---|---|
| 2025 | Zelfstandigenaftrek | €2,470 | **CORRECT** | €2,470 (AOW-age: €1,235 — app should add this) | [S1] |
| 2025 | Startersaftrek | €2,123 | **CORRECT** | €2,123 (AOW-age: €1,062) | [S1] |
| 2025 | MKB-winstvrijstelling | 12.7% | **CORRECT** | 12.70% | [S1] |
| 2025 | KIA lower threshold | €2,901 | **CORRECT** (in effect) | Law: investment **more than €2,900**; so €2,901 works for whole-euro inputs. Better to code as `> 2900`. | [S3] |
| 2025 | KIA 28% ceiling | €70,602 | **CORRECT** | 28% band runs to €70,602 | [S3] |
| 2025 | KIA rate | 28% | **CORRECT** | 28% | [S3] |
| 2025 | KIA plateau / taper | (not stated) | — | Plateau **€19,769** (not €19,768) from €70,602–€130,744; then €19,769 − 7.56% × (inv − €130,744) up to €392,230; €0 above | [S3] |
| 2026 | Zelfstandigenaftrek | €1,200 | **CORRECT** | €1,200 (AOW-age: €600) | [S2], [S5] |
| 2026 | Startersaftrek (copied) | €2,123 | **CORRECT** | €2,123 (AOW-age: €1,062) — not indexed | [S2] |
| 2026 | MKB (copied) | 12.7% | **CORRECT** | 12.70% | [S2], [S6] |
| 2026 | KIA threshold (copied) | €2,901 | **CORRECT** (in effect) | Still "more than €2,900" (threshold not indexed in 2026) | [S4], [S7] |
| 2026 | KIA ceiling (copied) | €70,602 | **WRONG** | **€71,683** | [S4], [S7] |
| 2026 | KIA rate (copied) | 28% | **CORRECT** | 28% | [S4] |
| 2026 | KIA plateau / taper (copied) | 2025 values | **WRONG** | Plateau **€20,072** for €71,683–€132,746; then €20,072 − 7.56% × (inv − €132,746) up to **€398,236**; €0 above | [S4], [S7] |

**Missing in the app:** AOW-age halved amounts; limit-to-profit rule with starter exception and 9-year carry-forward; €450 per-asset KIA minimum; 2027 values.

---

### 2. Tax year 2025 (final)

| Item | Value | Source |
|---|---|---|
| Zelfstandigenaftrek | €2,470 | [S1] |
| Zelfstandigenaftrek, AOW-age reached on 1 Jan | €1,235 (50%) | [S1] |
| Startersaftrek | €2,123 | [S1] |
| Startersaftrek, AOW-age | €1,062 | [S1] |
| Startersaftrek conditions | Not an entrepreneur in ≥1 of the 5 preceding years, and zelfstandigenaftrek used ≤2 times in those 5 years; must qualify for zelfstandigenaftrek (urencriterium). Effectively max 3× in first 5 years. | [S1], [S8] |
| Limit to profit | Zelfstandigenaftrek ≤ winst vóór ondernemersaftrek, **unless** startersaftrek applies (then it can create a loss). Unused part ("niet-gerealiseerde zelfstandigenaftrek") carried forward 9 years. | [S1], [S5] |
| Urencriterium | ≥1,225 hours/year actually running the business, AND more time on business than other work. The "more time" test does **not** apply if not an entrepreneur in any of 2020–2024 (starter exception). Not prorated when starting mid-year. Pregnancy: up to 16 weeks of non-worked hours count. | [S1] |
| S&O-aftrek | €15,738 base; +€7,875 starter increase. Requires urencriterium, RVO S&O-verklaring, ≥500 S&O hours. | [S1] |
| Meewerkaftrek (partner hours, % of profit) | <525: 0; 525–875: 1.25%; 875–1,225: 2%; 1,225–1,750: 3%; ≥1,750: 4% | [S1] |
| Stakingsaftrek | Equal to stakingswinst, max €3,630 | [S1] |
| MKB-winstvrijstelling | 12.70% of profit after ondernemersaftrek (no urencriterium needed) | [S1], [S6] |
| Oudedagsreserve (FOR) | **Abolished as of 2023** — no additions allowed; existing reserve may remain (must be released on staking, AOW-age, or failing urencriterium in current+previous year) | [S9] |
| KIA per-asset minimum | Assets < €450 do not count | [S1], [S10] |
| EIA / MIA | EIA 40%; MIA 45/36/27%; min €2,500 per asset | [S1] |

#### KIA 2025 (art. 3.41 Wet IB 2001, Bijstellingsregeling 2025)

| Total investment in year | KIA |
|---|---|
| ≤ €2,900 | €0 |
| > €2,900 – €70,602 | 28% of investment |
| > €70,602 – €130,744 | €19,769 |
| > €130,744 – €392,230 | €19,769 − 7.56% of the part above €130,744 |
| > €392,230 | €0 |

Source: [S3]. (Note: €19,769 per Staatscourant; some secondary sites print €19,768.)

---

### 3. Tax year 2026 (current)

| Item | Value | Source |
|---|---|---|
| Zelfstandigenaftrek | €1,200 | [S2], [S5] |
| Zelfstandigenaftrek, AOW-age | €600 | [S2] |
| Startersaftrek | €2,123 | [S2] |
| Startersaftrek, AOW-age | €1,062 | [S2] |
| Startersaftrek bij arbeidsongeschiktheid | €12,000 / €8,000 / €4,000 (0/1/2 prior uses); verlaagd urencriterium 800 h; max = profit | [S2] |
| Limit to profit | Same rule as 2025; 9-year carry-forward | [S2], [S5] |
| Urencriterium | 1,225 h; "more time than other work" test waived if not an entrepreneur in any of 2021–2025; pregnancy 16 weeks rule | [S2] |
| S&O-aftrek | €15,979 base; +€7,996 starter increase | [S2], [S4] |
| Meewerkaftrek | Same % table as 2025 (1.25/2/3/4%) | [S2] |
| Stakingsaftrek | Max €3,630 | [S2] |
| MKB-winstvrijstelling | 12.70% | [S2], [S6] |
| Oudedagsreserve | Still abolished (no additions) | [S11] |
| KIA per-asset minimum | €450 | [S2] |
| EIA / MIA | EIA 40% (max €153m); MIA 45/36/27% | [S2] |
| Desinvesteringsbijtelling | Disposals within 5 years; none if disposals ≤ €2,900 in the year | [S2] |

#### KIA 2026 (Bijstellingsregeling directe belastingen 2026, Stcrt. 2025, 40487)

| Total investment in year | KIA |
|---|---|
| ≤ €2,900 | €0 |
| > €2,900 – €71,683 | 28% of investment |
| > €71,683 – €132,746 | €20,072 |
| > €132,746 – €398,236 | €20,072 − 7.56% of the part above €132,746 |
| > €398,236 | €0 |

Sources: [S4], [S7].

---

### 4. Tax year 2027 (Belastingplan 2027 package, Prinsjesdag 15 Sept 2026 — proposals, still subject to parliamentary approval as of 2026-11-11)

| Item | 2027 value | Status | Source |
|---|---|---|---|
| Zelfstandigenaftrek | €900 | Already in the legislated phase-down path; also shown in BP2027 MvT table | [S5], [S12] |
| Zelfstandigenaftrek, AOW-age | €450 | Derived from 50% rule; stated by SRA, not seen on an official page → **UNCONFIRMED** (official) | [S14] |
| Startersaftrek | **€10** (from €2,123) | BP2027 proposal; full abolition 1 Jan 2028; no transitional rule for existing starters | [S12], [S13], [S15] |
| Startersaftrek, AOW-age | €5 | SRA only → **UNCONFIRMED** (official) | [S14] |
| Willekeurige afschrijving starters | Still available 2027; abolished 1 Jan 2028 (via Eindejaarsregeling 2026) | Proposal | [S12], [S16] |
| Startersaftrek bij arbeidsongeschiktheid | Unchanged in 2027; abolished 1 Jan 2029 | Proposal | [S12], [S13] |
| Meewerkaftrek | Cut by 75%: 0.3125% / 0.5% / 0.75% / 1% (for 525–875 / 875–1,225 / 1,225–1,750 / ≥1,750 h); abolished 1 Jan 2030 | In BP2027 package (ramingstoelichting); exact percentages per SRA | [S15], [S14] |
| Stakingsaftrek | **€908** (from €3,630); abolished 1 Jan 2030 | In BP2027 package | [S15], [S16] |
| MKB-winstvrijstelling | 12.70% (unchanged) | MvT BP2027 | [S12] |
| Urencriterium (1,225 h) | No change announced | MvT BP2027 | [S12] |
| EIA | 45.5% (from 40%) | Proposal | [S12] |
| KIA 2027 brackets | Indexed amounts **UNCONFIRMED** — set by Bijstellingsregeling directe belastingen 2027 (normally published late Dec 2026). No structural KIA change found in BP2027. €450 per-asset rule unchanged (not indexed). | — | — |
| S&O-aftrek 2027 | Indexed amounts **UNCONFIRMED** (Bijstellingsregeling 2027) | — | — |

Practical note: build 2027 into the app as a "provisional" set flagged as proposal until the Eerste Kamer vote (expected December 2026) and the Bijstellingsregeling 2027 is published.

---

### 5. Depreciation rules (confirmed, 2025 and 2026)

| Rule | Value | Source |
|---|---|---|
| Max depreciation business assets | 20% per year of original acquisition/production cost | [S9], [S11] |
| Purchased goodwill | Max 10% per year | [S9], [S11] |
| Assets < €450 | May be expensed immediately | [S9], [S11] |
| Buildings | Depreciate only down to bodemwaarde = 100% of WOZ-value (since 2024; was 50% for own-use buildings up to 2023). Useful life assumed 30–50 years. Own-use building with book value already below 100% WOZ need not be revalued up. Land not depreciated. | [S9], [S11] |
| Willekeurige afschrijving starters | Available 2025–2027 for those entitled to startersaftrek; abolished 2028 (proposal) | [S12] |

---

### 6. Other confirmations requested

- **Oudedagsreserve abolished from 2023:** CONFIRMED [S9], [S11].
- **Zelfstandigenaftrek capped at profit except for starters:** CONFIRMED [S1], [S2], [S5]. Excess carried forward 9 years.
- **Urencriterium starter exception:** CONFIRMED — only the "more time than other work" condition is waived for starters; the 1,225 hours still apply and are not prorated [S1], [S2].
- **MKB-winstvrijstelling does not require urencriterium:** CONFIRMED (secondary [S6]; official fisin page lists it without hours requirement).

---

### Sources

- [S1] Belastingdienst, Fiscale informatie 2025 – Ondernemersaftrek en investeringsaftrek: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2025/ondernemersaftrek_en_investeringsaftrek
- [S2] Belastingdienst, Fiscale informatie 2026 – Ondernemersaftrek en investeringsaftrek: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/ondernemersaftrek_en_investeringsaftrek
- [S3] Bijstellingsregeling directe belastingen 2025, Staatscourant 2024, 38492 (art. I, onderdeel F, art. 3.41 lid 2): https://zoek.officielebekendmakingen.nl/stcrt-2024-38492.pdf
- [S4] Bijstellingsregeling directe belastingen 2026, Staatscourant 2025, 40487: https://zoek.officielebekendmakingen.nl/stcrt-2025-40487.pdf
- [S5] Ondernemersplein (KVK/overheid) – Zelfstandigenaftrek: https://ondernemersplein.overheid.nl/subsidies-en-regelingen/zelfstandigenaftrek/
- [S6] Rendement infographic ondernemersaftrek 2026 (secondary, consistent with S2): https://www.rendement.nl/ondernemersaftrek/infographics/ondernemersaftrek-voor-de-inkomstenbelasting-2026.html
- [S7] Belastingdienst – Veranderingen vennootschapsbelasting 2026 (same KIA table): https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/vennootschapsbelasting/veranderingen-vennootschapsbelasting-2026
- [S8] Ondernemersplein – Startersaftrek: https://ondernemersplein.overheid.nl/subsidies-en-regelingen/startersaftrek/
- [S9] Belastingdienst, Fiscale informatie 2025 – Winst- en verliesrekening en balans: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2025/winst_en_verliesrekening_en_balans
- [S10] Belastingdienst – KIA: https://belastingdienst.nl/wps/wcm/connect/nl/ondernemers/content/ik-heb-een-investering-gedaan-heb-ik-recht-op-de-kleinschaligheidsinvesteringsaftrek-kia
- [S11] Belastingdienst, Fiscale informatie 2026 – Winst- en verliesrekening en balans: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/winst_en_verliesrekening_en_balans
- [S12] Memorie van toelichting Belastingplan 2027 (Kamerstuk 37 022, nr. 3): https://www.eerstekamer.nl/behandeling/20260915/memorie_van_toelichting_55/document3/f=/vn0zihug3yui.pdf
- [S13] Ondernemersplein – Startersaftrek gaat omlaag en verdwijnt: https://ondernemersplein.overheid.nl/wetswijzigingen/startersaftrek-gaat-omlaag-en-verdwijnt/
- [S14] SRA – Belastingplannen 2027: wat staat nog overeind in de IB (secondary; updated to nota's van wijziging 3 Nov 2026): https://www.sra.nl/nieuws/121502/2026/11/belastingplannen-2027-wat-staat-nog-overeind-in-de-inkomstenbelasting
- [S15] Ramingstoelichtingen en certificering pakket Belastingplan 2027 (Tweede Kamer): https://www.tweedekamer.nl/downloads/document?id=2026D43323
- [S16] Rijksoverheid nieuws – Belastingplan 2027 (15 Sept 2026): https://www.rijksoverheid.nl/actueel/nieuws/2026/09/15/belastingplan-2027-voorstellen-voor-beter-werkend-belastingstelsel-en-gezonde-overheidsfinancien
- [S17] KVK – Belastingplannen 2027 voor eenmanszaak (secondary, consistent with S12/S15): https://www.kvk.nl/wetten-en-regels/plannen-voor-je-eenmanszaak-vof-maatschap-of-cv/

---

## Chapter 2 — Box 1 rates, heffingskortingen and Zvw for ZZP: 2024 to 2027 check

Research date: 2026-11-11. Official sources: Belastingdienst "Fiscale informatie" (fisin) pages per year, the Belastingdienst voorlopige aanslag 2026 page, and the Belastingplan 2027 package (rijksfinancien.nl / eerstekamer.nl / officielebekendmakingen.nl).
Each verdict says CORRECT, WRONG (with the correct value) or UNCONFIRMED.

---

### 2024: checking the app values

| Parameter | App value | Verdict | Official value | Source |
|---|---|---|---|---|
| Box 1 schijf 1 (below AOW age) | 36.97% to €75,518 | CORRECT | 36.97% up to and including €75,518 | [S1] |
| Box 1 schijf 2 | 49.5% above | CORRECT | 49.50% above €75,518 | [S1] |
| AHK max | €3,362 | CORRECT | €3,362 | [S2] |
| AHK phase-out (not in app) | — | — | 6.630% above €24,812, zero from €75,518 | [S2] |
| Zvw ondernemer (via aanslag) | 5.32% | CORRECT | 5.32% | [S3] |
| Zvw max bijdrage-inkomen | €71,628 | CORRECT | €71,628 | [S3] |

Other 2024 values, for completeness:
- AOW age, born on or after 1-1-1946: 19.07% to €38,098, then 36.97% to €75,518, then 49.50% [S1].
- Arbeidskorting 2024 [S2]: 8.425% up to €11,490; €968 + 31.433% to €24,820; €5,158 + 2.471% to €39,957; €5,532 − 6.510% to €124,934; €0 above.
- Zvw werkgeversheffing 2024: 6.57% [S3].

---

### 2025: checking the app values

#### Box 1 (below AOW age) [S4]
| Schijf | App | Verdict | Official |
|---|---|---|---|
| 1 | 35.82% to €38,441 | CORRECT | 35.82% up to €38,441 |
| 2 | 37.48% to €76,817 | CORRECT | 37.48% from €38,441 up to and including €76,817 |
| 3 | 49.5% above | CORRECT | 49.50% above €76,817 |

AOW age, born on or after 1-1-1946 (2025) [S4]: 17.92% / 37.48% / 49.50%, with the same limits (€38,441 and €76,817). For people born before 1946, schijf 1 runs to €40,502 at 17.92%. In the year someone reaches AOW age, schijf 1 depends on the month. It runs from 17.92% (January) to 34.32% (December).

#### Algemene heffingskorting 2025 [S5]
| Item | App | Verdict | Official |
|---|---|---|---|
| Max | €3,068 | CORRECT | €3,068 |
| Phase-out start | €28,406 | CORRECT | €28,406 (verzamelinkomen) |
| Phase-out % | 6.337% | CORRECT | 6.337% |
| Zero at | €76,817 | CORRECT | €76,817 |
| AOW age (whole year) | — | — | max €1,536, 3.170% above €28,406, zero at €76,817 |

#### Arbeidskorting 2025 (below AOW age) [S5]
| Arbeidsinkomen | App | Verdict |
|---|---|---|
| up to €12,169 | 8.053% × income | CORRECT |
| €12,169 – €26,288 | €980 + 30.03% × (income − 12,169) | CORRECT (official 30.030%) |
| €26,288 – €43,071 | €5,220 + 2.258% × (income − 26,288) | CORRECT |
| €43,071 – €129,078 | €5,599 − 6.51% × (income − 43,071) | CORRECT (official 6.510%) |
| from €129,078 | €0 | CORRECT |

#### Zvw 2025 [S6]
| Item | App | Verdict | Official |
|---|---|---|---|
| Rate for ondernemers (bijdrage via aanslag) | 5.26% | CORRECT | 5.26% |
| Max bijdrage-inkomen | €75,864 | CORRECT | €75,864 |
| Werkgeversheffing (reference) | — | — | 6.51% |

#### IACK 2025 (brief) [S5]
11.45% of arbeidsinkomen above €6,145, up to a maximum of €2,986, which is reached at €32,223. At AOW age the rate is 5.73%, with a maximum of €1,495.

---

### 2026: the app placeholder is WRONG. Here is the full correct set

Every 2026 value in the app (copied from 2025) is **WRONG**. The correct values follow.

#### Box 1, 2026: below AOW age [S7][S8]
| Schijf | Taxable income | Rate |
|---|---|---|
| 1 | up to €38,883 | 35.75% |
| 2 | €38,883 – €78,426 | 37.56% |
| 3 | above €78,426 | 49.50% |

#### Box 1, 2026: AOW age, born on or after 1-1-1946 [S7]
| Schijf | Taxable income | Rate |
|---|---|---|
| 1 | up to €38,883 | 17.85% |
| 2 | €38,883 – €78,426 | 37.56% |
| 3 | above €78,426 | 49.50% |

Notes:
- For people born before 1-1-1946, schijf 1 runs to €41,123 at 17.85% [S7][S8].
- In the year someone reaches AOW age, schijf 1 runs from 17.85% (January) to 34.25% (December) [S8].
- One AI-extracted reading of [S8] gave 35.75% in the born-after-1945 table. That reading is probably wrong. The voorlopige aanslag page [S7] shows 17.85%, which matches the 2025 pattern.

#### Algemene heffingskorting 2026 [S7][S9]
| Item | Below AOW age | AOW age (whole year) |
|---|---|---|
| Max | €3,115 | €1,556 |
| Phase-out start (verzamelinkomen) | €29,736 | €29,736 |
| Phase-out % | 6.398% | 3.195% |
| Zero at | €78,426 | €78,426 |

#### Arbeidskorting 2026 (below AOW age) [S7][S9]
| Arbeidsinkomen | Arbeidskorting |
|---|---|
| up to €11,965 | 8.324% × income |
| €11,965 – €25,845 | €996 + 31.009% × (income − €11,965) |
| €25,845 – €45,592 | €5,300 + 1.950% × (income − €25,845) |
| €45,592 – €132,920 | €5,685 − 6.510% × (income − €45,592) |
| from €132,920 | €0 |

Maximum: €5,685. I recomputed the knikpunten and they match: €996, €5,300, €5,685, and zero at about €132,919.

#### Zvw 2026 [S10]
| Item | Value |
|---|---|
| Inkomensafhankelijke bijdrage, ondernemer (winst, via aanslag) | **4.85%** |
| Max bijdrage-inkomen | **€79,409** |
| Werkgeversheffing (reference) | 6.10% |

A secondary source [S16] quotes €79,412 from the MEV. Use the Belastingdienst figure, €79,409.

#### IACK 2026 (brief) [S9]
11.45% of arbeidsinkomen above €6,239, with a maximum of €3,032. The [S9] page puts the point where the maximum is reached at €32,719, while [S7] shows €32,710. The arithmetic (6,239 + 3,032 / 0.1145 = about 32,719) supports **€32,719**. At AOW age the rate is 5.72%, with a maximum of €1,514. The child must be born after 31-12-2013.

---

### 2027: announced and proposed figures (all PROVISIONAL)

Status: the Belastingplan 2027 (Kamerstuk 37 022) was presented on 15-09-2026 and has **not been passed**. Several nota's van wijziging have since changed the indexation and the bracket limits. One was dated 20-10-2026 (cited by a secondary source). The third (nr. 29) was received on 04-11-2026 [S13].

- The Prinsjesdag version indexed at 48% of the tabelcorrectiefactor (factor 1.01248) [S12][S14].
- Nota van wijziging nr. 29 raises this to 59.8%, so the factor becomes **1.015548** [S13]. This means **every Prinsjesdag bracket limit and credit amount below is out of date**. The amended amounts were not published on any official page I could reach.
- Treat all 2027 figures as provisional. Re-check them on belastingdienst.nl (fisin2027) or in the Staatsblad in December 2026 or January 2027.

#### Box 1, 2027: Prinsjesdag version (Fiscale sleuteltabel 2027) [S11][S12]
| Item | Value | Status |
|---|---|---|
| Schijf 1 rate (combined, below AOW age) | 36.23% | Official proposal. Amended rate UNCONFIRMED |
| Schijf 2 rate | 38.16% | Official proposal. Amended rate UNCONFIRMED |
| Top rate | 49.50% | Official proposal |
| Limit of schijf 1 (premiegrens) | €39,247 (€41,637 if born before 1946) | Prinsjesdag figure. Superseded by the new indexation, so the new value is UNCONFIRMED |
| Start of top rate | €78,426 (frozen) | Prinsjesdag. **Amended to €80,578** according to secondary sources (SRA, Holdwise). UNCONFIRMED on an official source |
| AOW-age schijf 1 rate | not published | UNCONFIRMED |

- The rijksoverheid.nl news item of 15-09-2026 [S15] also mentions a 0.06 cut to the schijf 1 and 2 rates. It does not say what the cut is measured against. Treat it as UNCONFIRMED until it is reconciled with 36.23% and 38.16%.
- TaxLive (secondary) confirms that 36.23% and 38.16% are increases from 35.75% and 37.56%.

#### Algemene heffingskorting 2027: Prinsjesdag version [S11][S12]
| Item | Value | Status |
|---|---|---|
| Max | €3,154 | Official proposal. Superseded by the new indexation |
| Phase-out start | €30,910 | Official proposal. Superseded |
| Phase-out % | not stated | UNCONFIRMED. If the end point were €78,426 it would be about 6.638%, but that is my own calculation |
| Zero at | not stated (likely tied to the top-rate start: €78,426 originally, €80,578 after amendment) | UNCONFIRMED |

#### Arbeidskorting 2027: Prinsjesdag version [S11][S12]
| Item | Value | Status |
|---|---|---|
| Amounts at the knikpunten | €1,182 / €5,540 / €5,929 | Official proposal (the Prinsjesdag increase was €173 per knikpunt) |
| Max | €5,929 | Official proposal |
| Phase-out start | €47,834 | Official proposal |
| Phase-out % | 6.51% | Official proposal |
| Income knikpunten (1st, 2nd) and build-up percentages | not published | UNCONFIRMED |
| End income | about €138,900 (my calculation: 47,834 + 5,929 / 0.0651) | UNCONFIRMED |

The amended bill raises the arbeidskorting by €133 instead of €173, according to secondary sources (SRA). UNCONFIRMED.

#### Zvw 2027
| Item | Value | Status |
|---|---|---|
| Ondernemer rate (verlaagde bijdrage) | 5.02% (+0.17 points) | UNCONFIRMED. Secondary source quoting the VWS begroting 2027 [S16] |
| Werkgeversheffing | 6.27% | UNCONFIRMED [S16] |
| Max bijdrage-inkomen | €82,547 | UNCONFIRMED. Secondary source quoting MEV 2027 [S16]. The final Staatscourant regulation was not found |

#### IACK 2027 (brief) [S11][S12]
Max €2,918 at 11.45%, a cut from €3,032. Official proposal, with the inkomensgrens not published and the amount superseded by the new indexation. Zelfstandigenaftrek 2027: the corrected sleuteltabel shows €900 [S11], but an earlier version showed €1,200 [S12]. Out of scope here, but the corrected version suggests €900.

---

### Summary of corrections to the app
- **2024 and 2025: all checked values are CORRECT.**
- **2026: the placeholder is WRONG for every value.** Replace it with:
  - Box 1: 35.75% to €38,883; 37.56% to €78,426; 49.50% above
  - AHK: €3,115, phasing out at 6.398% from €29,736, zero at €78,426
  - Arbeidskorting: as in the table above (max €5,685, zero at €132,920)
  - Zvw: 4.85%, max €79,409
- **2027: do not hard-code yet.** The bill is still being amended, and the indexation changed from 48% to 59.8% on 04-11-2026.

---

### Sources
- [S1] Belastingdienst, Fiscale informatie 2024 – belastingberekening: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2024/belastingberekening
- [S2] Belastingdienst, Fiscale informatie 2024 – heffingskortingen: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2024/heffingskortingen
- [S3] Belastingdienst, Fiscale informatie 2024 – inkomensafhankelijke bijdrage Zvw: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2024/inkomensafhankelijke_bijdrage_zorgverzekeringswet
- [S4] Belastingdienst, Fiscale informatie 2025 – belastingberekening: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2025/belastingberekening
- [S5] Belastingdienst, Fiscale informatie 2025 – heffingskortingen: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2025/heffingskortingen
- [S6] Belastingdienst, Fiscale informatie 2025 – inkomensafhankelijke bijdrage Zvw: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2025/inkomensafhankelijke_bijdrage_zorgverzekeringswet
- [S7] Belastingdienst, Voorlopige aanslag 2026 – tarieven en heffingskortingen: https://www.belastingdienst.nl/wps/wcm/connect/nl/voorlopige-aanslag/content/voorlopige-aanslag-tarieven-en-heffingskortingen
- [S8] Belastingdienst, Fiscale informatie 2026 – belastingberekening: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/belastingberekening
- [S9] Belastingdienst, Fiscale informatie 2026 – heffingskortingen: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/heffingskortingen
- [S10] Belastingdienst, Fiscale informatie 2026 – inkomensafhankelijke bijdrage Zvw: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/inkomensafhankelijke_bijdrage_zorgverzekeringswet
- [S11] Rijksfinancien, Fiscale sleuteltabel 2027 (incl. correctie energiebelasting en zelfstandigenaftrek): https://www.rijksfinancien.nl/sites/default/files/bestanden/belastingplan-2027/pakket-belastingplan-2027/Fiscale-sleuteltabel-2027-incl-correctie-tarieven-energiebelasting-zelfstandigenaftrek.pdf
- [S12] Eerste Kamer, Fiscale sleuteltabel 2027 (15-09-2026): https://www.eerstekamer.nl/overig/20260915/fiscale_sleuteltabel_2027/document
- [S13] Derde nota van wijziging Belastingplan 2027 (Kamerstuk 37 022 nr. 29, received 04-11-2026): https://zoek.officielebekendmakingen.nl/kst-1278332.pdf
- [S14] Rijksfinancien, Tabellen marginale druk 2027: https://www.rijksfinancien.nl/sites/default/files/bestanden/belastingplan-2027/pakket-belastingplan-2027/tabellen-marginale-druk.pdf
- [S15] Rijksoverheid news item, Belastingplan 2027 (15-09-2026): https://www.rijksoverheid.nl/actueel/nieuws/2026/09/15/belastingplan-2027-voorstellen-voor-beter-werkend-belastingstelsel-en-gezonde-overheidsfinancien
- [S16] (secondary) Salaris van Morgen, Zvw 2027: https://www.salarisvanmorgen.nl/?p=84780
- (secondary) SRA, Belastingplannen 2027 – wat staat nog overeind in de IB: https://www.sra.nl/nieuws/004501/2026/11/belastingplannen-2027-wat-staat-nog-overeind-in-de-inkomstenbelasting
- (secondary) TaxLive, Prinsjesdag 2026 – wijzigingen in de inkomstenbelasting: https://www.taxlive.nl/nl/documenten/nieuws/prinsjesdag-2026-wijzigingen-in-de-inkomstenbelasting/
- (secondary) Holdwise, Tabelcorrectiefactor 2027: https://holdwise.nl/kennisbank/tabelcorrectiefactor-2027

---

## Chapter 3 — Business cost deduction for IB-ondernemers (ZZP): profit side + BTW notes

Research date: 2026-11-11. Status labels:
- **CONFIRMED (official)** = stated on belastingdienst.nl, ondernemersplein.overheid.nl, officielebekendmakingen/Staatscourant or a parliamentary document.
- **UNCONFIRMED** = only found on non-official sources (advisers, banks, trade press) or derived; verify before hard-coding.

Note on access: wetten.overheid.nl and several belastingdienst.nl deep links were blocked for fetching in this session; legal article text was read via a mirror (inview.nl) where possible.

---

### 1. Gemengde kosten (food/drink, representation, congresses, study trips)

| Item | 2025 | 2026 | 2027 | Status |
|---|---|---|---|---|
| Drempel (first part not deductible) – IB | €5,700 | €5,700 | not announced | CONFIRMED (official) [S1] |
| Alternative: deduct 80% of the costs (IB-ondernemer) | 80% | 80% | no change announced | CONFIRMED (official) [S1] |
| Vpb percentage (for reference, not ZZP) | – | 73.5% | – | CONFIRMED (official) [S1] |
| Travel + lodging cap for representation/congress category | €1,500 unless attendance was necessary for the work | same | – | CONFIRMED (official) [S1] |

Details (paraphrased from the Belastingdienst overview [S1]):
- Category "relatiegeschenken in the form of food, drink and genotmiddelen" falls under the drempel/80% rule. Food includes business lunches/dinners incl. tips; drink includes coffee, tea, soft drinks.
- Category "representatie, congressen, seminars, studiereizen (incl. travel and lodging)" also falls under the drempel/80% rule. The page treats general (non-food) relatiegeschenken as representatie, so they are also limited.
- Choice is per year: either the drempel or 80%. A trade source notes the drempel only beats 80% when these costs exceed €28,500/year (= 5,700 / 0.20) [S12, UNCONFIRMED but arithmetically follows].
- The official page explicitly says the 2025 drempel was "also €5,700", i.e. **€5,700 applies to 2026 as well** → the app's copy of €5,700 to 2026 is correct.
- No change to gemengde kosten for IB found in Belastingplan 2027 factsheets [S7, S9]. (Belastingplan 2026 changed the Vpb side only – not relevant for ZZP [S13, UNCONFIRMED].)

Business travel (non-representation): public transport, taxi and plane are 100% deductible at actual, provable cost [S1, CONFIRMED].

**BTW side**
- Relatiegeschenken / gifts: input VAT deductible only if total spend per recipient per year is max **€227 excl. VAT** (BUA threshold); above that no deduction unless the recipient could itself have deducted ≥30% VAT. Year-independent page [S10, CONFIRMED official]. KvK adds that a company counts as one recipient [S14].
- Food and drink consumed in horeca (restaurant/café): input VAT generally **not** deductible, even for a purely business meal [S12, UNCONFIRMED – not found on an accessible official page; the statutory basis is understood to be art. 15 lid 6 Wet OB 1968, also UNCONFIRMED in this session]. For IB the 80%/drempel is applied to the amount incl. the non-deductible VAT [S12, UNCONFIRMED].

### 2. Private car used for business – km deduction

| Year | Rate per business km | Legal status | Status |
|---|---|---|---|
| 2025 | **€0.23** | art. 3.17 lid 1 letter b Wet IB 2001 | CONFIRMED (official) [S1, S3] |
| 2026 | **€0.25** (retroactive to 1 Jan 2026) | Beleidsbesluit (goedkeuring vooruitlopend op wetgeving), Stcrt. 2026, 18302, dated 17 May 2026, published 21 May 2026 | CONFIRMED (official) [S1, S2] |
| 2027 | **€0.25**, structural | Included in Belastingplan 2027 (factsheet: from 1-1-2026 with retroactive effect, structural). Law text art. 3.17 has a new version from 1-1-2027. BP2027 vote in Tweede Kamer scheduled 12 Nov 2026, Eerste Kamer in December 2026 → not yet enacted | Announced (official factsheet) [S7, S8]; final enactment PENDING |

- The Belastingdienst overview now reads: fixed €0.25 per km, €0.23 in 2025 [S1].
- The Staatscourant besluit explicitly raises the IB-ondernemer/resultaatgenieter deduction for business km from €0.23 to €0.25, alongside the employee tax-free allowance; it expires 1 Jan 2027 and is to be codified via Belastingplan 2027 [S2].
- No indexation mentioned for later years.
- **Discrepancy with app:** app uses €0.23 for 2026 → should be **€0.25** for 2026 (and €0.25 for 2027 once BP2027 passes).
- BTW: the fixed km rate has no VAT. VAT on actual costs of a private car can be reclaimed for the business share (UNCONFIRMED – not verified on official page this session).

### 3. Capitalisation threshold and depreciation

| Rule | Value | Status |
|---|---|---|
| Assets costing < €450 may be expensed in year of purchase; ≥ €450 must be depreciated | €450 | CONFIRMED (official) [S4] – page not year-specific; no change found for 2025–2027 |
| Max depreciation per year, most business assets | 20% of acquisition cost | CONFIRMED (official) [S4] |
| Goodwill | max 10%/yr | CONFIRMED (official) [S4] |
| Formula | (cost − residual value) / useful life; pro rata by months in first year | CONFIRMED (official) [S4] |
| KIA: assets < €450 don't count | €450 per asset (2026) | CONFIRMED (official) [S5] |

- App's €450 / 20% assumptions are correct.
- Related 2027 change: willekeurige afschrijving for starters remains in 2027, ends from 2028 [S9, S15 – BP2027; UNCONFIRMED on belastingdienst.nl].

### 4. Home workspace (werkruimte in de woning)

**Official (Belastingdienst, year-independent page, last modified 27 Oct 2023) [S6]:**
- Default: costs of a home workspace are usually **not** deductible ("Werkruimte thuis: 0%, with exceptions" [S1]).
- Zelfstandige werkruimte (independent room) test – indicators: own entrance/access, own sanitary facilities, could be rented out to a third party; must be clearly distinguishable from the rest of the home and used intensively. A desk in the living room or an office in a bedroom does not qualify.
- If not independent: deduction only possible if you **own** the home **and** the home is part of business assets (ondernemingsvermogen).

**Income tests (30%/70%) – UNCONFIRMED on official page** (Belastingdienst page does not mention them; statutory basis art. 3.16 Wet IB not readable in this session). Per SRA Advieswijzer Kantoor aan huis 2026 [S11]:
- Independent room is your only workspace → at least 30% of income earned **in** the room AND at least 70% earned **in or from** the room.
- You also have a workspace elsewhere → at least 70% of income earned **in** the room.
- For a rented home with a qualifying room, a proportional share of rent and tenant costs is deductible.
- SRA mentions further 2026 figures (deduction for qualifying room in own home capped at a % of WOZ; 1.10% eigenwoningforfait 2026) – UNCONFIRMED, treat as out of scope unless needed.

**Non-qualifying room – what is / isn't deductible:**
- Not deductible: rent, energy, maintenance, insurance and other running costs of the room [S1, S6, S11].
- Furnishing (desk, chair etc.): per SRA not deductible as room costs, but may qualify for KIA and VAT reclaim [S11, UNCONFIRMED]. Common practice: business inventory items (desk, chair, computer, monitor) are business assets you depreciate/expense normally – they are not "werkruimte" costs (UNCONFIRMED on official page).
- "Apparatuur en instrumenten die niet tot het ondernemingsvermogen horen": 0% [S1, CONFIRMED].

**Home internet / phone:**
- Profit side (official overview [S1]): "Telefoonabonnement thuis" = 0%; "Zakelijke telefoongesprekken thuis" = 100%. Internet is **not listed** on the official overview.
- Internet subscription: trade sources say the business share is deductible if reasonably substantiated (no fixed %) [S16, UNCONFIRMED].
- BTW: input VAT on the business share of internet/phone is reclaimable if used for VAT-taxed turnover; not under KOR [S16, UNCONFIRMED]. For VAT, a sole trader may treat a home room used for VAT-taxed business as business and reclaim VAT on energy/maintenance/furnishing proportionally [S11, UNCONFIRMED]. Note: profit side and BTW side can differ (e.g. room costs 0% for IB but VAT partly reclaimable).

### 5. Other cost categories

| Category | Rule | Status |
|---|---|---|
| Phone/laptop mixed use | Not on official overview. General principle: if the asset is a business asset, deduct costs/depreciation and correct for private use (private share not deductible); BTW on business share reclaimable. | UNCONFIRMED (no official page found this session) |
| Mobile phone calls | Business calls 100%; home (landline) subscription 0% | CONFIRMED [S1] |
| Work clothing | 100% if (almost) only wearable for work (uniform, overall) or – if also wearable outside work – it carries a logo of **≥ 70 cm²** referring to your business. Ordinary clothing 0%. | CONFIRMED [S1, S17] |
| Personal care | 0% | CONFIRMED [S1] |
| Fines (geldboetes) | 0% | CONFIRMED [S1] |
| Studiekosten ondernemer | Deductible if business-related **and** maintaining existing professional knowledge; costs to acquire new knowledge (new profession) not deductible. No amount cap. Page modified 11 Aug 2025, year-independent. | CONFIRMED [S1, S18] |
| Vakliteratuur | 100%; general literature 0% | CONFIRMED [S1] |
| Briefcases etc. | 100% | CONFIRMED [S1] |
| Gifts (relatiegeschenken) | Food/drink gifts + general relatiegeschenken: drempel/80% (see §1). Gifts aimed at promotion (e.g. to journalists/influencers) count as promotion costs, fully deductible per KvK [S14, KvK – semi-official]. BTW €227 rule (§1). | CONFIRMED [S1, S10] / KvK |
| Donations (giften to charities) | Not a business cost; not covered on pages read | UNCONFIRMED |
| Moving / dual housing | Limited ("beperkt"); law art. 3.17 lid 1 a: moving costs + fixed €7,750 | CONFIRMED [S1, S3] |
| Boats for representation | 0% | CONFIRMED [S1] |

### 6. Auto van de zaak – bijtelling (IB-ondernemer) and private vs business choice

**Asset classification (IB)** [S19, ondernemersplein, updated 20 Feb 2026 – CONFIRMED]:
- ≥ 90% business use → must be business asset; ≥ 90% private → private asset; otherwise free choice.
- Bijtelling applies if private use > 500 km/year.
- BTW choice is separate from IB choice.

**Bijtelling percentages (new cars, by year of first admission – DET):**

| DET year | Standard (fossil/hybrid) | Zero-emission (EV) reduced rate | EV cap (catalogue value) | Status |
|---|---|---|---|---|
| 2025 | 22% | 17% | first €30,000; excess at 22% | UNCONFIRMED (trade press [S20]; not on accessible official page) |
| 2026 | 22% | **18%** (korting 4%) | first €30,000 | CONFIRMED (official) [S19]; detail [S20] |
| 2027 | 22% | **20%** (korting 2%) | €30,000 per ondernemersplein wording | CONFIRMED (official) [S19] |
| 2028 | 22% | 22% (no reduction) | – | CONFIRMED (official) [S19] |

- Reduced rate applies for max 60 months from DET; cars made available before 1-1-2026 keep their earlier rate/cap for the remainder of 60 months [S20, UNCONFIRMED official].
- Youngtimer (bijtelling 35% of dagwaarde): currently age ≥ 16 years [S19, CONFIRMED]. BP2027: threshold 17 years in 2027, 20 years from 2028 (earlier plan for 25 dropped) [S7 official factsheet; S9]. Note: one trade article still lists 25 for 2027 – superseded.
- BP2027 pseudo-eindheffing 12% on fossil cars applies to employers/employees, not to IB-ondernemers' own cars [S9] – likely not relevant to the app.

**BTW on private use of a business car** [S19, CONFIRMED]: private km (incl. commuting) is VAT-taxed, declared in the last return of the year; methods: full logbook, other evidence, or flat **2.7% of catalogue value** (incl. VAT/BPM). The reduced 1.5% flat rate after the 5th year following first use is UNCONFIRMED this session.

**Private car vs business car (choice):**
- Private car → deduct €0.23 (2025) / €0.25 (2026, 2027) per business km; no bijtelling; no actual cost deduction.
- Business car → all actual costs + depreciation deductible, minus bijtelling (if private use > 500 km), plus BTW correction for private use.

### 7. Announced changes 2026/2027 that touch ZZP cost deduction / profit

| Change | Year | Status |
|---|---|---|
| Km rate €0.23 → €0.25 | 2026 (retro via besluit), structural from 2027 via BP2027 | Official [S2, S7] |
| Zelfstandigenaftrek €1,200 (2026) → €900 (2027) | 2027 | Existing law/BP; reported by KvK and SRA [S9, S15]; official 2026 €1,200 [S5] |
| Startersaftrek €2,123 → €10 (2027), abolished 2028 | 2027/2028 | Official factsheet [S7] |
| Willekeurige afschrijving starters ends | from 2028 | [S9, S15] UNCONFIRMED official |
| Stakingsaftrek €3,630 → €908 | 2027 | [S9, S15] |
| Meewerkaftrek cut ~75% (2027), abolished 2030 | 2027 | [S9, S15] |
| EIA 40% → 45.5% | 2027 | Official factsheet [S7] |
| Youngtimer age 17 (2027), 20 (2028) | 2027/2028 | Official factsheet [S7] |
| EV bijtelling 18% (2026) → 20% (2027) → 22% (2028) | 2026–2028 | Official [S19] |
| Gemengde kosten IB, €450 threshold, 20% depreciation, werkruimte rules | no change found | – |

BP2027 status: amended bill sent to Tweede Kamer early November 2026, TK vote planned 12 Nov 2026, Eerste Kamer December 2026 [S8]. Treat 2027 figures as provisional until enacted.

---

### Sources

- [S1] Belastingdienst – Overzicht mogelijk aftrekbare zakelijke kosten: https://www.belastingdienst.nl/wps/wcm/connect/nl/ondernemers/content/welke-kosten-van-winst-aftrekken
- [S2] Staatscourant 2026, 18302 – Beleidsbesluit fiscale maatregelen n.a.v. de energieschok (17 May 2026): https://zoek.officielebekendmakingen.nl/stcrt-2026-18302.odt (PDF copy read: https://www.awvn.nl/app/uploads/2026/05/stcrt-2026-18302.pdf)
- [S3] Wet IB 2001 art. 3.17 (mirror; version 1-1-2024 to 1-1-2027, €0.23): https://inview.nl/openCitation/id50a68b1de1cac58af21e885a956608f7/wet-inkomstenbelasting-2001-artikel-3-17
- [S4] Ondernemersplein – Afschrijven: https://ondernemersplein.overheid.nl/afschrijven/
- [S5] Belastingdienst – Ondernemersaftrek en investeringsaftrek 2026: https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/ondernemersaftrek%5Fen%5Finvesteringsaftrek
- [S6] Belastingdienst – Werkruimte in de woning: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/inkomstenbelasting_voor_ondernemers/werkruimte_in_de_woning
- [S7] Eerste Kamer – Factsheetbundel Belastingplan 2027 (15 Sep 2026): https://www.eerstekamer.nl/overig/20260915/factsheetbundel_belastingplan_2027/document
- [S8] Rijksoverheid – Plannen kabinet brandstof, vliegbelasting en reiskostenvergoeding: https://www.rijksoverheid.nl/themas/belastingen-uitkeringen-en-toeslagen/belastingplan/plannen-kabinet-voor-belasting-op-brandstof-vliegbelasting-en-reiskostenvergoeding
- [S9] SRA – Prinsjesdag 2026: tien belangrijke fiscale wijzigingen voor ondernemers: https://www.sra.nl/nieuws/259001/2026/09/prinsjesdag-2026-tien-belangrijke-fiscale-wijzigingen-voor-ondernemers
- [S10] Belastingdienst – Btw aftrekken bij giften, relatiegeschenken en personeelsvoorzieningen: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aftrekken/personeelsvoorzieningen_en_relatiegeschenken
- [S11] SRA – Advieswijzer Kantoor aan huis 2026: https://www.sra.nl/nieuws/121502/advieswijzers/advieswijzer-kantoor-aan-huis-2026
- [S12] Knab – Zakelijke lunch of diner aftrekbaar als zzp'er?: https://bieb.knab.nl/ondernemen/zakelijke-lunch-aftrekbaar-zzp
- [S13] SRA – Soms meer aftrek gemengde kosten in Vpb vanaf 2026: https://www.sra.nl/nieuws/004501/2025/10/soms-meer-aftrek-gemengde-kosten-in-vpb-vanaf-2026
- [S14] KvK – Relatiegeschenken en belasting: https://www.kvk.nl/runnen-en-groeien/relatiegeschenken-en-belasting-dit-zijn-de-regels/
- [S15] KvK – Belastingplannen 2027 voor eenmanszaak, vof, maatschap of cv: https://www.kvk.nl/wetten-en-regels/plannen-voor-je-eenmanszaak-vof-maatschap-of-cv/
- [S16] Knab – Internet thuis aftrekbaar als zzp'er?: https://bieb.knab.nl/ondernemen/internet-aftrekbaar-zzp
- [S17] Belastingdienst – Kosten voor werkkleding: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/inkomstenbelasting_voor_ondernemers/zakelijke_kosten/kosten-voor-werkkleding
- [S18] Belastingdienst – Studiekosten voor ondernemers: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/inkomstenbelasting_voor_ondernemers/zakelijke_kosten/studiekosten-voor-ondernemers
- [S19] Ondernemersplein – Auto van de zaak (updated 20 Feb 2026): https://ondernemersplein.overheid.nl/auto-van-de-zaak/
- [S20] Accountancy Vanmorgen – Korting op bijtelling voor auto's zonder CO2-uitstoot gewijzigd per 2026: https://www.accountancyvanmorgen.nl/2026/01/14/korting-op-bijtelling-voor-autos-zonder-co2-uitstoot-gewijzigd-per-2026/
- [S21] ZZP Nederland – Kilometeraftrek voor ondernemers stijgt naar €0,25: https://www.zzp-nederland.nl/nieuws/kilometeraftrek-voor-ondernemers-stijgt-naar-eur-025
- [S22] Rendement – Vrijgestelde kilometervergoeding niet maar 1 jaar €0,25: https://www.rendement.nl/reiskosten/tools/vrijgestelde-kilometervergoeding-niet-maar-1-jaar-eur-025.html

---

## Chapter 4 — Dutch BTW rules for ZZP bookkeeping app (verified 2026-11-11)

Legend: **[OFFICIAL]** = confirmed on belastingdienst.nl / rijksoverheid.nl / ondernemersplein.overheid.nl / kvk.nl / eerstekamer.nl / officielebekendmakingen.nl. **UNCONFIRMED** = only from secondary sources (advisers, software docs) or my own knowledge. Source numbers [S#] refer to the list at the end.

---

### 1. KOR (kleineondernemersregeling)

| Rule | Value | Year | Status / source |
|---|---|---|---|
| Turnover ceiling | **€20,000 excl. BTW per calendar year**. You must stay under it in the current year *and* the previous year | 2025, 2026 (unchanged; no 2027 change found) | [OFFICIAL] [S1][S2] |
| What counts toward the €20,000 | Dutch-taxed supplies at 21%/9%/0% (incl. exports and intra-EU supplies), domestic reverse-charge supplies **you make**, and some exempt supplies (real estate, financial, insurance). **Excluded:** private use, sale of business assets, supplies taxed abroad, other exempt turnover | 2025+ | [OFFICIAL] [S2] |
| Exceeding mid-year (new 2025 rule) | Deregister **straight away**. The supply that takes you over €20,000 is **fully taxed**. Belastingdienst example: a €500 advance received once turnover is at €19,750 carries BTW on the whole €500. Earlier supplies that year stay exempt. Regular returns and bookkeeping start from that point | from 1 Jan 2025 | [OFFICIAL] [S4][S7] |
| Re-entry ban after leaving | No KOR for the rest of the calendar year in which you leave **plus the whole following calendar year** | 2025+ | [OFFICIAL] [S4][S5] |
| Minimum participation period | **None since 2025.** KVK says there has been no minimum term since 2025. The old **3-year** minimum (2020–2024) is not mentioned on Belastingdienst pages | 2025+ | No minimum: [OFFICIAL] (KVK) [S7]. "Old rule was 3 years": UNCONFIRMED on an official page; secondary sources agree [S20] |
| Registration lead time | Your application must **reach the Belastingdienst ≥ 4 weeks before** the start date. The start date is the first day of a return period (for quarterly filers: 1 Jan/Apr/Jul/Oct). Latest dates: 3 Dec → 1 Jan, 3 Mar → 1 Apr, 2 Jun → 1 Jul, 2 Sep → 1 Oct. If late, you start the next quarter. Starters need a BTW number first | 2025+ | [OFFICIAL] [S3][S6] |
| Voluntary exit | Apply ≥ 4 weeks before the date you want. It takes effect on the first day of a return period | 2025+ | [OFFICIAL] [S4] |
| Still file BTW returns? | **No regular returns.** An **incidental return** (incidentele aangifte) is still needed in some cases, e.g. EU purchases where BTW is shifted to you | 2025+ | [OFFICIAL] [S1][S5][S6] |
| Input VAT | **Not deductible** while in the KOR, including foreign EU VAT. You may have to make a herziening (revision) of BTW deducted earlier | 2025+ | [OFFICIAL] [S5][S6] |
| Invoices | Don't charge or show BTW. Invoicing isn't required for BTW purposes. If you do issue an invoice, state that an exemption applies | 2025+ | [OFFICIAL] [S5] |
| Records | Keep purchase invoices | 2025+ | [OFFICIAL] [S5] |
| Registration threshold | Turnover under **€2,200/yr** and **not** registered at KVK: no need to register as a BTW entrepreneur; the KOR applies automatically | 2025+ | [OFFICIAL] [S6] |
| Foreign businesses | Since 1 Jan 2025, non-NL businesses with a Dutch fixed establishment can't use the NL KOR | 2025 | [OFFICIAL] [S6] |
| EU-KOR | New 2025. You must be established in NL. Total EU turnover, NL included, must be **≤ €100,000** in the current and previous year. You must also stay under each member state's own threshold. Over €100,000: deregister straight away. File a **quarterly turnover report (opgaaf kwartaalomzet)**. No VAT returns in participating countries. Register via Mijn Belastingdienst Zakelijk | from 1 Jan 2025 | [OFFICIAL] [S8][S6] |
| EU-KOR quarterly report deadline / EX number | Not stated on the official page | — | UNCONFIRMED |

**E-invoicing interaction:** KOR businesses are excluded from the planned 2031 digital reporting obligation (see §6) [S27][S28].

---

### 2. BTW rates 2025 / 2026 / 2027 (+ announced 2028)

| Rate / item | 2025 | 2026 | 2027 | Status / source |
|---|---|---|---|---|
| General rate | 21% | 21% | 21% (no change announced) | [OFFICIAL] [S2] |
| Reduced rate | 9% | 9% | 9% | [OFFICIAL] [S2] |
| Zero rate (exports, intra-EU supplies) | 0% | 0% | 0% | [OFFICIAL] [S2] |
| **Logies** (hotels, B&B/pensions, furnished holiday homes, stacaravans, pipowagens, boat cabins; related services such as parking, laundry, utilities) | 9% | **21% from 1 Jan 2026** | 21% | [OFFICIAL] [S9][S10] |
| Logies transition rule | — | Payments received or single-purpose vouchers issued in 2025 for stays in 2026 or later are taxed at **21%** | — | [OFFICIAL] [S10] |
| Camping pitch (guest brings own tent/caravan) | 9% | 9% (stays reduced) | 9% | UNCONFIRMED. Grant Thornton says so [S11]; the Belastingdienst logies page doesn't say |
| Breakfast/food served with a hotel stay | 9% | 9% (split out from the 21% room) | 9% | UNCONFIRMED (KHN/Rendement) [S12] |
| **Culture, media, sport** (museums, theatre, cinema, concerts, sport facilities, newspapers/magazines etc.) | 9% | **stays 9%**. The planned move to 21% was **cancelled** by the *Wet behoud verlaagd btw-tarief cultuur, media en sport* (Kamerstuk 36814, Stb. 2025, 339). TK passed it 2 Oct 2025, EK on 28 Oct 2025; in force 1 Jan 2026 | 9% | [OFFICIAL] [S13]; Stb. no. from [S14] |
| **Books** (incl. e-books) | 9% | 9% | 9% | UNCONFIRMED. No official page found naming books. Books were left out of the original increase plan, and media stays 9% under 36814 |
| Hot-air balloon rides (ballonvaarten) | 9% | 9% | 9% | **21% planned from 1 Jan 2028** (Belastingplan 2027, not yet law: TK vote 12 Nov 2026, EK in Dec 2026) — [OFFICIAL] [S15] |
| Ornamental horticulture (sierteelt: flowers, plants, bulbs) | 9% | 9% | 9% | 21% from 1 Jan 2028 was proposed on Prinsjesdag 2026 [S16]. The **amended Belastingplan 2027 (Nov 2026) drops or postpones** it — UNCONFIRMED (Taxlive [S17]; the rijksoverheid page body doesn't say [S15]) |

**Bottom line for the app:** On 1 Jan 2026, only **logies** moved 9% → 21%. Culture, media, sport and books stayed at 9%. **No rate change takes effect on 1 Jan 2027.** The next announced change is ballonvaarten (and possibly sierteelt) on 1 Jan 2028.

---

### 3. BTW return (aangifte omzetbelasting) — boxes and filing frequency

#### Box numbering (current digital return)
The Belastingdienst's step-by-step page confirms only 1a, 5a and 5b by name [S18]. The full 2026 *Toelichting bij de btw-aangifte* PDF exists (versions 2024, 2025, 2026 listed [S19]) but could not be fetched from this environment. The full list below therefore comes from software documentation (AFAS [S21]), cross-checked against official mentions:

| Box | Description | Official confirmation |
|---|---|---|
| 1a | Supplies/services taxed at high rate (21%) | [OFFICIAL] [S18] |
| 1b | Supplies/services taxed at low rate (9%) | UNCONFIRMED (AFAS still labels it "6%") |
| 1c | Supplies/services at other rates, except 0% | UNCONFIRMED |
| 1d | Private use (privégebruik) — e.g. car private-use BTW, private use of goods/services | Exists: [OFFICIAL] (Ondernemersplein mentions a "rubriek privégebruik" [S22]); "1d" label per SRA [S23] |
| 1e | Supplies/services at 0% or not taxed with you. Also used for B2B services to EU customers who have no VAT ID because of their own country's small-business scheme | [OFFICIAL] (Staatscourant 2025, 15981 [S24]) |
| 2a | Domestic supplies/services where BTW is shifted to you (verlegd) | UNCONFIRMED |
| 3a | Supplies to non-EU countries (export) | UNCONFIRMED |
| 3b | Supplies to / services in EU countries (intra-EU B2B, reverse charge) | [OFFICIAL] [S24] |
| 3c | Installation / distance sales within the EU | UNCONFIRMED |
| 4a | Supplies/services from non-EU countries | UNCONFIRMED |
| 4b | Supplies/services from EU countries (acquisitions, reverse-charged services received) | UNCONFIRMED |
| 5a | BTW due (subtotal of sections 1–4) | [OFFICIAL] [S18] |
| 5b | Input VAT (voorbelasting). BUA corrections are also entered here | [OFFICIAL] [S18]; BUA in 5b per SRA [S23] |
| 5c | Subtotal | UNCONFIRMED |
| 5d | KOR reduction — **no longer used** (old KOR ended 2020) | UNCONFIRMED (AFAS marks "not in use") |
| 5e / 5f | Estimate of previous return(s) / estimate this return | UNCONFIRMED (in AFAS list; probably not shown in the standard online return) |
| 5g | Total to pay / reclaim | UNCONFIRMED |

No official source shows a change to the box numbering in 2025 or 2026. AFAS also marks 1d "not in use", which conflicts with official mentions; that is likely just an AFAS config note.

#### Filing frequency and deadlines
- **Default: quarterly.** [OFFICIAL] [S25]
- **Monthly:** on request, or imposed by the Belastingdienst after late filing or payment. [OFFICIAL] [S25]
- **Yearly:** on request, and only if **all** of these apply: BTW payable **< €1,883/yr**; natural person or partnership of natural persons; no article 23 permit; intra-EU supplies, services provided, acquisitions and services received **each < €10,000/yr**. [OFFICIAL] [S25]
- **Deadline:** monthly/quarterly returns by the **last day of the month after the period**; yearly returns **before 1 April** of the next year. A nil return is still required. [OFFICIAL] [S26]
- **Corrections:** errors **≤ €1,000** go in the next return, in the normal box. Errors **> €1,000** need the *Suppletie btw* form, filed within **8 weeks** of discovery. Corrections are possible up to 5 years back. [OFFICIAL] [S29]

---

### 4. Input VAT exclusions and corrections

| Rule | Value | Status / source |
|---|---|---|
| **Food & drink in horeca** (restaurant, café, hotel catering) | **Never deductible.** This is a statutory exclusion in **art. 15 lid 5 Wet OB 1968**, not part of the BUA. Exception: you resell the same meal or service to someone else for payment. Example: BTW on a business lunch at a restaurant is not deductible | [OFFICIAL] (Eerste Kamer document [S30]); article number confirmed by Taxlive [S31] (lid 5 since Fiscale verzamelwet 2024) |
| **BUA threshold** (gifts to relations, staff provisions, business gifts) | **€227 excl. BTW per recipient per year.** At or under the threshold the BTW is deductible. Above it, the BTW is not deductible and you correct it in the **last return of the year** | [OFFICIAL] [S32][S33] |
| BUA: gifts to businesses | Excluded only if the recipient can deduct less than 30% BTW **and** the €227 threshold is exceeded | [OFFICIAL] [S32] |
| BUA: food & drink for staff | Has its own rules (not covered by the €227 test as stated) | [OFFICIAL] [S32] |
| BUA: box | 5b (reduce voorbelasting) | UNCONFIRMED (SRA [S23]) |
| BUA: full vs excess-only correction | Not stated on the official page. Practice is that the whole amount for that recipient is excluded once over €227 | UNCONFIRMED |
| **Private use of business goods/services** (mixed-use phone, laptop etc.) | Pay back previously deducted BTW for the private share, in the **last return of the year** (box 1d) | [OFFICIAL] [S33]; box per SRA [S23] |
| **Company car private use** | Choose (1) full trip log, (2) other records, or (3) **2.7% of catalogue price** as a flat rate (capped). Declare in the last return, in the private-use box | [OFFICIAL] [S22] |
| Car flat rate 1.5% after 5th year | Not on the official page found | UNCONFIRMED |
| Moving a private car into the business | No retroactive deduction of BTW on the purchase | [OFFICIAL] [S22] |
| Mixed taxable/exempt turnover | Pro-rata estimate during the year, corrected in the last return | [OFFICIAL] [S33] |

---

### 5. ICP declaration and EU B2B services (reverse charge)

| Rule | Value | Status / source |
|---|---|---|
| Place of supply, B2B services to an EU business | Usually **taxed in the customer's country**: no Dutch BTW, BTW shifted (verlegd) to the customer | [OFFICIAL] [S34] |
| Invoice | Put **"btw verlegd"** on the invoice, include the **customer's VAT ID**, and check it in **VIES** (an invalid ID risks a naheffingsaanslag) | [OFFICIAL] [S34] |
| Return box | **3b** (supplies/services to EU countries) | [OFFICIAL] [S24] |
| EU customer without a VAT ID because of their own country's small-business scheme | Report in **1e** instead of 3b; no ICP entry possible | [OFFICIAL] [S24] |
| ICP obligation | File an **opgaaf ICP** when the customer is in the EU, has a VAT ID, and the service is taxed in the customer's country | [OFFICIAL] [S34][S24] |
| ICP frequency/deadline | Due by the **last day of the month after the period**. The Staatscourant describes monthly as the base rule, with other periods allowed under art. 37a lid 3–4 | [OFFICIAL] [S24] |
| ICP quarterly for services / monthly when intra-EU **goods** > €50,000 per quarter (since 2016) | Common practice | UNCONFIRMED (Taxlive 2016 [S35]) |
| **Yearly ICP** | Only with a yearly BTW return and inspector approval: turnover ≤ €200,000, ICP ≤ €15,000, no new vehicles, written request, no fraud risk | [OFFICIAL] [S24] |
| Non-EU B2B services | Usually taxed in the customer's country. No Dutch BTW and **not** reported in the NL return | [OFFICIAL] [S34] |
| B2C services (EU consumer, no VAT ID) | Usually Dutch BTW (other place-of-supply rules exist; OSS for e-services etc.) | [OFFICIAL] [S34] |
| Services **received** from EU suppliers (reverse charge to you) | Report in 4b (BTW due) and deduct in 5b | UNCONFIRMED box numbers [S21]. KOR participants must use an incidental return [S1] |

---

### 6. E-invoicing / ViDA

| Item | Value | Year | Status / source |
|---|---|---|---|
| ViDA adopted by the EU Council | 11 March 2025 | 2025 | [OFFICIAL] (EU Commission [S36]) |
| EU intra-EU e-invoicing + digital reporting (DRR) | Mandatory from **1 July 2030** | 2030 | [OFFICIAL] [S36][S27] |
| **NL domestic B2B e-invoicing** | Cabinet decision of **11 Sep 2026**: mandatory e-invoicing for **domestic and intra-EU B2B** from **1 July 2030** | 2030 | [OFFICIAL] [S27] (plan; bill not yet submitted) |
| NL domestic digital transaction reporting | From **1 July 2031** | 2031 | [OFFICIAL] [S27][S28] |
| KOR businesses | **Exempt**, and the exemption continues after July 2030 per rijksoverheid. KVK only clearly states the exemption from the 2031 reporting obligation | 2030/31 | [OFFICIAL] [S27][S28]. Exact scope will be set by the bill — monitor |
| Legislative timeline | Internet consultation **autumn 2026**; bill to the Tweede Kamer **before summer 2027** | 2026–27 | [OFFICIAL] [S27] |
| PDF invoices | A PDF is **not** an e-invoice under the coming rules. Structured format required; KVK advises checking Peppol support | 2030 | [OFFICIAL] (KVK [S28]) |
| B2G | E-invoicing already required for invoices to the central government (Rijksoverheid) | now | [OFFICIAL] [S28] |
| Changes in 2026 or 2027 affecting ZZP invoicing | **None found.** No e-invoicing obligation takes effect before 1 July 2030 | — | [OFFICIAL] (nothing earlier mentioned in [S27][S28]) |
| ViDA lets member states mandate domestic e-invoicing without EU derogation | — | 2025+ | UNCONFIRMED (not on the EC page fetched) |

---

### Sources
- [S1] https://www.belastingdienst.nl/kleineondernemersregeling
- [S2] https://belastingdienst.nl/wps/wcm/connect/nl/btw/content/kor-voorwaarden
- [S3] https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/aanmelden-kor
- [S4] https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/afmelden-kor
- [S5] https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/hoe_werkt_de_btw/kleineondernemersregeling/wat-betekent-meedoen-met-de-kleineondernemersregeling and …/wel-of-niet-meedoen-aan-de-kleineondernemersregeling
- [S6] https://ondernemersplein.overheid.nl/kleineondernemersregeling/
- [S7] https://www.kvk.nl/advies-en-informatie/wetten-en-regels/kleineondernemersregeling-gebruiken/
- [S8] https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/kleineondernemersregeling-in-de-europese-unie-eu-kor
- [S9] https://www.eerstekamer.nl/nonav/wetsvoorstel/36814_wet_behoud_verlaagd_btw
- [S10] https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/btw-logies
- [S11] https://www.grantthornton.nl/insights/tax/verlaagd-btw-tarief-voor-logies-vervalt-per-1-januari-2026/ (secondary)
- [S12] https://www.rendement.nl/btw-aangifte/nieuws/overnachten-in-2026-hotelbed-21-btw-ontbijt-9-btw.html (secondary, title only)
- [S13] https://www.eerstekamer.nl/nonav/wetsvoorstel/36814_wet_behoud_verlaagd_btw
- [S14] https://www.taxence.nl/nieuws/wet-behoud-verlaagd-btw-tarief-op-cultuur-media-en-sport-gepubliceerd/ (secondary)
- [S15] https://www.rijksoverheid.nl/themas/belastingen-uitkeringen-en-toeslagen/belastingplan/plannen-kabinet-voor-hogere-btw-op-sierteelt-en-ballonvaart
- [S16] https://www.grantthornton.nl/insights/themas/prinsjesdag/2026/belastingplan-2027-maatregelen-voor-btw-en-accijnzen/ (secondary)
- [S17] https://www.taxlive.nl/nl/documenten/nieuws/aangepast-belastingplan-2027-btw-verhoging-sierteelt-uitgesteld-koopkrachtmaatregelen-uitgebreid/ (secondary)
- [S18] https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/ik-moet-btw-aangifte-doen-hoe-vul-ik-die-in
- [S19] https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/themaoverstijgend/brochures_en_publicaties/toelichting_bij_de_digitale_aangifte_omzetbelasting (2026 PDF: https://download.belastingdienst.nl/belastingdienst/docs/toelichting_bij_btw_aangifte_ob0731t63fd.pdf — not fetchable here; **recommend manual check of the box list**)
- [S20] https://www.zzp-nederland.nl/nieuws/kleineondernemersregeling-versoepelt-1-januari-2025 (secondary, not fetched)
- [S21] https://help.afas.nl/help/EN/SE/Fin_Config_VatIct_Sction_Ship.htm (secondary)
- [S22] https://ondernemersplein.overheid.nl/auto-van-de-zaak/
- [S23] https://www.sra.nl/nieuws/004501/2025/01/aanwijzingen-bij-uw-laatste-btw-aangifte-2024 (secondary)
- [S24] https://zoek.officielebekendmakingen.nl/stcrt-2025-15981.pdf (Besluit administratieve verplichtingen omzetbelasting, 1 May 2025)
- [S25] https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/wijziging-aangiftetijdvak-btw
- [S26] https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen_en_betalen/btw-aangifte-waar-moet-u-aan-denken
- [S27] https://www.rijksoverheid.nl/actueel/nieuws/2026/09/11/kabinet-kiest-voor-invoering-e-facturatie-en-rapportage-voor-bedrijven
- [S28] https://www.kvk.nl/geldzaken/e-facturatie-komt-eraan/
- [S29] https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen_en_betalen/aangifte_corrigeren
- [S30] https://eerstekamer.nl/overig/20250218/fiscale_regelingen_verhoging/document
- [S31] https://www.taxlive.nl/nl/documenten/vn-vandaag/wijziging-beleidsbesluit-aftrek-omzetbelasting-na-codificatie-goedkeuring-voor-horeca/ (secondary)
- [S32] https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aftrekken/personeelsvoorzieningen_en_relatiegeschenken
- [S33] https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen_en_betalen/btw-aangifte-waar-moet-u-aan-denken/laatste-btw-aangifte-van-het-jaar
- [S34] https://ondernemersplein.overheid.nl/btw-bij-diensten-in-het-buitenland/
- [S35] https://www.taxlive.nl/nl/documenten/nieuws/vanaf-1-januari-2016-opgaaf-icp-per-maand-bij-meer-dan-50000-aan-intracommunautaire-leveringen-in-1-kwartaal/ (secondary)
- [S36] https://ec.europa.eu/newsroom/digital/items/877702
