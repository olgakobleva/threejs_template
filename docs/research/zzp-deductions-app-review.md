# ZZP deductions — review of the app against the research

A critic's pass: what in the app disagrees with the
[research report](zzp-deductions-report.md), in order of how much it would move
someone's tax bill. Checked against the code on branch
`claude/english-bookkeeper-app-lcmi8f` on 11 November 2026.

**Nothing in `categories.ts` or `years.ts` has been changed.** This document only
lists what should be changed and where.

Two key figures were spot-checked by hand against belastingdienst.nl during the
review: the 2026 mileage rate (€0.25) and the 2026 ondernemersaftrek amounts
(€1,200 / €600 AOW; €2,123 / €1,062 AOW; MKB 12.7%). Both match the report.

---

## What is already right

- **2024 and 2025 are correct throughout** — brackets, AHK, every arbeidskorting
  band, Zvw, zelfstandigenaftrek, startersaftrek, MKB-winstvrijstelling, KIA rate
  and ceiling, €450 capitalisation threshold, 20% depreciation cap, the €5,700
  gemengde-kosten drempel and the 80% option.
- **2026 entrepreneur deductions are right**: zelfstandigenaftrek €1,200,
  startersaftrek €2,123, MKB 12.7%, hours criterion 1,225.
- **The two-column model holds up.** Restaurant food at 80% / 0% BTW, hotels at
  100% / 100%, insurance 100% / 0%, fines 0% / 0%, clothing only with a ≥70 cm²
  logo, training only for the existing profession — all confirmed.
- **Gifts at 80% on the profit side** — the Belastingdienst puts relatiegeschenken
  under the same drempel/80% regime, as the app does.
- KOR ceiling €20,000 and BTW rates 21% / 9% / 0% are correct.

---

## Must fix — wrong numbers

### 1. 2026 box 1, tax credits and Zvw are 2025 values

`src/tax/nl/years.ts`, `YEAR_2026` spreads `...YEAR_2025`. Every one of these is
wrong for 2026. Official 2026 values (Belastingdienst, Fiscale informatie 2026):

| Parameter | App (copied 2025) | Correct 2026 |
| --- | --- | --- |
| Bracket 1 | 35.82% to €38,441 | **35.75% to €38,883** |
| Bracket 2 | 37.48% to €76,817 | **37.56% to €78,426** |
| Bracket 3 | 49.5% | 49.50% (unchanged) |
| AOW bracket 1 | 17.92% | **17.85%** (same limits as above) |
| AHK maximum | €3,068 | **€3,115** |
| AHK phase-out | 6.337% from €28,406 | **6.398% from €29,736**, zero at €78,426 |
| Arbeidskorting band 1 | 8.053% to €12,169 | **8.324% to €11,965** |
| Arbeidskorting band 2 | €980 + 30.03% to €26,288 | **€996 + 31.009% to €25,845** |
| Arbeidskorting band 3 | €5,220 + 2.258% to €43,071 | **€5,300 + 1.950% to €45,592** |
| Arbeidskorting band 4 | €5,599 − 6.51% to €129,078 | **€5,685 − 6.510% to €132,920** |
| Zvw rate | 5.26% | **4.85%** |
| Zvw maximum income | €75,864 | **€79,409** |

The Zvw drop alone is worth about €330 on €80k of profit. Once these are in, the
2026 `sourceNote` should stop saying "projection".

### 2. 2026 mileage is €0.25, not €0.23

`YEAR_2026.mileageAllowanceCentsPerKm` inherits 23. A beleidsbesluit
(Staatscourant 2026, 18302, May 2026) raised it to **25 cents, backdated to
1 January 2026**; the Belastingdienst cost overview now shows €0.25 for 2026 and
€0.23 for 2025. Belastingplan 2027 makes €0.25 permanent from 2027.

### 3. 2026 KIA ceiling

`YEAR_2026.kiaCeilingCents` inherits €70,602. Correct 2026 value: **€71,683**
(Bijstellingsregeling 2026, Stcrt. 2025, 40487). Threshold (€2,900) and rate (28%)
are unchanged.

### 4. AOW-age entrepreneurs get double the deductions they are entitled to

`src/tax/nl/incomeTax.ts` (lines ~305–320) switches to `box1BracketsAow` for
someone who has reached AOW age, but still applies the full
zelfstandigenaftrek and startersaftrek. From the start of the year in which you
are AOW age at 1 January, both are **halved**:

| Year | Zelfstandigenaftrek (AOW) | Startersaftrek (AOW) |
| --- | --- | --- |
| 2025 | €1,235 | €1,062 |
| 2026 | €600 | €1,062 |

The tax credits also differ at AOW age (2026 AHK maximum €1,556, phase-out
3.195%; the arbeidskorting has its own lower table). The app has a single
`generalTaxCredit` and `labourTaxCredit` per year, so AOW-age users currently get
the under-AOW credits. Either add AOW variants to `TaxYearParameters` or show a
warning that AOW-age results are approximate.

---

## Should fix — rules modelled too strictly or too loosely

### 5. Hotels moved to 21% BTW on 1 January 2026

`categories.ts`, `accommodation` has `typicalVatRate: 9`. Since 1 January 2026
accommodation is **21%** (also for 2025 payments or vouchers for stays in 2026).
Culture, media and sport stayed at 9% — that planned increase was cancelled by
law. Only the receipt-scanner default is affected, because the actual rate comes
from the receipt, but it will mis-suggest on every 2026 hotel bill.

### 6. BTW on gifts: 0% is too strict

`business_gifts` has `vatDeductiblePercent: 0`. The rule is the other way round:
BTW on gifts **is** reclaimable while the total to one recipient stays within
€227 (excl. BTW) per year; only above that is it excluded (and then, per the
research, an end-of-year correction is made). Small gifts — the common case —
are currently losing their BTW. The research could not confirm on an official
source whether the correction covers the whole amount or only the excess; check
before coding it. Food and drink *consumed in a restaurant* is a separate,
absolute exclusion and is not part of the €227 rule.

### 7. KIA threshold off by one euro, and no plateau/taper

`src/tax/nl/depreciation.ts`, `computeKia`: the law says investment **above
€2,900** qualifies; the app stores €2,901 and tests `qualifying <= threshold`,
so €2,900.01–€2,901.00 is wrongly excluded. Store €2,900 and keep `<=`.

The function also returns 28% × ceiling for everything above the ceiling. The
real table is a fixed amount, then a taper:

| Year | Fixed amount | Applies up to | Then | Zero at |
| --- | --- | --- | --- | --- |
| 2025 | €19,769 | €130,744 | − 7.56% of the excess | €392,230 |
| 2026 | €20,072 | €132,746 | − 7.56% of the excess | €398,236 |

The app already warns above the ceiling, so this matters only for large
investors — but the table is small enough to implement exactly.

### 8. KOR exit mid-year

Since 2025: the invoice that takes turnover over €20,000 carries BTW **on its
full amount**, the business leaves the KOR immediately, and cannot rejoin for
the rest of that year and the whole next year. Registration must reach the
Belastingdienst at least four weeks before the start of a filing period. The old
three-year minimum participation no longer applies. `NL-TAX-NOTES.md` only says
"passing it ends the exemption mid-year" — the invoice-level consequence should
be surfaced on the invoice page when the running total approaches €20,000.

---

## Check by hand — the research could not confirm officially

- **Home internet at 0% profit / 100% BTW** (`internet_home`). The official
  Belastingdienst cost overview does not mention internet; it lists a home
  phone subscription at 0% and business calls at 100%. Bank and adviser sources
  say the business share of internet *is* deductible from profit. The app's
  stance is the stricter one and is presented as settled ("the single most
  commonly mis-booked expense"); soften the wording or find the source.
- **Home workspace income tests (30% / 70%)** come from an adviser source; the
  official page covers only the independence test.
- **BTW return box list.** Boxes 1a, 1e, 3b and 5a–5b are confirmed; the full
  1a–5g list came from accounting-software documentation. Compare `vatReturn.ts`
  against the 2026 *Toelichting bij de btw-aangifte* PDF, which could not be
  downloaded during the research. Box 5d (old KOR reduction) is no longer used.
- **Restaurant BTW legal reference.** `food_drink_business` cites BUA art. 1
  lid 1c; the research points to a separate article of the Wet OB. The outcome
  (0% reclaim) is the same; only the citation may need updating.

---

## When Belastingplan 2027 passes (Eerste Kamer, December 2026)

Do not add `YEAR_2027` with hard figures before the law is final — the
4 November nota van wijziging already moved the inflation correction from 48% to
59.8%, which invalidates the Prinsjesdag bracket limits and credits. Known
direction of travel for ZZP:

- zelfstandigenaftrek **€900** (already law);
- startersaftrek **€10** in 2027, abolished from 2028, no transition rule — the
  app's "3 times in the first 5 years" logic will need a cut-off;
- stakingsaftrek €3,630 → €908, abolished 2030; meewerkaftrek cut ~75%;
- willekeurige afschrijving for starters ends 2028;
- mileage €0.25 made permanent; MKB 12.7% and 1,225 hours unchanged;
- EV bijtelling 20% on the first €30,000 in 2027 (18% in 2026), 22% from 2028;
- no BTW rate changes in 2027;
- e-invoicing for domestic and EU B2B planned from 1 July 2030 (KOR exempt).

Re-check belastingdienst.nl Fiscale informatie 2027 in late December or
January, then add the year.
