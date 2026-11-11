# ZZP deductions — summary

One page. Details in the [research report](zzp-deductions-report.md); what to
change in the code in the [app review](zzp-deductions-app-review.md).
Researched 11 November 2026. Not tax advice.

## Bottom line

**2024 and 2025 in the app are correct.** **2026 is wrong in four places**,
because `years.ts` copies 2025 into 2026 and only the zelfstandigenaftrek was
updated. **2027 should wait** until Belastingplan 2027 passes the Eerste Kamer in
December.

## Key figures for 2026

| | 2025 | 2026 | 2027 (proposed) |
| --- | --- | --- | --- |
| Zelfstandigenaftrek | €2,470 | €1,200 | €900 |
| Startersaftrek | €2,123 | €2,123 | €10, gone from 2028 |
| MKB-winstvrijstelling | 12.7% | 12.7% | 12.7% |
| Hours criterion | 1,225 | 1,225 | 1,225 |
| Box 1 first bracket | 35.82% to €38,441 | 35.75% to €38,883 | not final |
| Top rate starts at | €76,817 | €78,426 | not final |
| Zvw for ondernemers | 5.26%, max €75,864 | 4.85%, max €79,409 | not final |
| Mileage, own car | €0.23/km | **€0.25/km** (backdated) | €0.25/km |
| KIA band | 28%, €2,900–€70,602 | 28%, €2,900–€71,683 | published late Dec |
| Gemengde kosten | €5,700 or 80% | €5,700 or 80% | not announced |
| Hotel BTW | 9% | **21%** | 21% |
| KOR ceiling | €20,000 | €20,000 | €20,000 |

## What to fix in the app, in order

1. **2026 brackets, AHK, arbeidskorting and Zvw** — replace the 2025 copy with the
   2026 values in the review.
2. **2026 mileage** 23 → 25 cents.
3. **2026 KIA ceiling** €70,602 → €71,683; threshold should be €2,900 with "more
   than"; optionally model the plateau and taper.
4. **AOW age** — halve zelfstandigenaftrek and startersaftrek, and use the AOW
   tax credits.
5. **Hotels** default to 21% BTW from 2026.
6. **Gifts** — BTW reclaimable up to €227 per recipient per year, not 0%.
7. **KOR** — warn that the invoice crossing €20,000 carries full BTW and locks
   you out for the rest of the year plus the next.

## Still open

Home internet's profit treatment, the home-workspace income tests and the full
BTW return box list could not be confirmed on an official source — check them
by hand before relying on the app's current wording.
