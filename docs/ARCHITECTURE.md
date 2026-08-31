# Architecture

## The one decision everything else follows from

All persistence goes through `DataStore` (`src/storage/DataStore.ts`). Nothing
else in the app knows whether the data is in IndexedDB, in a file, or behind
HTTP. That is why phase 2 is a swap rather than a rewrite, and it is why every
method on the interface is async even where IndexedDB could answer synchronously
— the networked version cannot.

```
pages/ ──▶ StoreProvider (in-memory mirror) ──▶ DataStore ──▶ IdbDataStore
                                                         └──▶ HttpDataStore (skeleton)
```

`StoreProvider` loads the entire dataset into React state at startup and writes
through on every mutation. That is a deliberate simplification: a sole trader's
books are a few thousand records over a decade, so holding them in memory keeps
every page and every calculation synchronous. Pages never await a query; they
read arrays and compute.

Swapping to a server means constructing `HttpDataStore` in `StoreProvider`
instead of `IdbDataStore`. The load becomes a set of HTTP calls, the write-through
becomes requests, and no page, calculation or export changes.

## Layers

**`core/`** — no domain knowledge. Integer-cent money arithmetic, plain-string
dates and reporting periods, a CSV reader/writer, id generation.

**`domain/`** — types and factory functions. No behaviour beyond defaults.

**`tax/nl/`** — every rule, in pure functions over plain data. Nothing here
imports React or touches storage, which is what makes the calculations testable
and inspectable:

| File               | Responsibility                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `years.ts`         | Per-year rates, deductions, thresholds. Ships unverified; user-overridable.                             |
| `categories.ts`    | The deduction rulebook — ~45 categories with two independent percentages, caveats and legal references. |
| `vat.ts`           | Invoice and expense arithmetic; VAT treatments and what they imply.                                     |
| `vatReturn.ts`     | Maps records onto the Belastingdienst's boxes 1a–4b, 5a–5c.                                             |
| `icp.ts`           | Intra-EU sales listing, reconciled against box 3b.                                                      |
| `incomeTax.ts`     | Profit → deductions → exemption → brackets → credits → Zvw.                                             |
| `depreciation.ts`  | Straight-line schedules with the 20% cap; KIA.                                                          |
| `deductibility.ts` | The offline checks that run on every expense.                                                           |

**`ai/`** — the only code that talks to Anthropic. Isolated so the app is fully
functional without a key, and so the boundary of what leaves the device is one
directory you can read.

**`ui/` and `pages/`** — presentation. Pages compute from store arrays and call
into `tax/nl/`; they hold no rules of their own.

## Two design rules worth keeping

**The model transcribes; the rulebook decides.** Receipt scanning returns what is
printed on the document plus a category suggestion. Deductibility is then applied
from `categories.ts`, deterministically. If the model's reading is wrong you can
see it in the form before saving; if the rules are wrong you can find them in one
file with their legal references. Neither failure mode hides inside the other.

**Two columns, never one.** Profit-deductibility and VAT-reclaimability are
separate fields on every expense and every category, because Dutch law treats
them separately. Collapsing them into a single "deductible?" flag would be
simpler and wrong — home internet (0% profit, 100% VAT) and restaurant bills
(80% profit, 0% VAT) are both common and both would break.

## Money and dates

Amounts are integer cents everywhere, named `...Cents`. Rounding is half away
from zero, applied once per computation, in `core/money.ts`. Floats never touch a
monetary value.

Dates are `YYYY-MM-DD` strings with no timezone component. A period is
`{kind, year, index}` and everything — VAT periods, filing deadlines, fiscal
years — derives from `core/dates.ts`.

VAT follows the **invoice date**, not the payment date. An invoice sent in March
and paid in May belongs to Q1. This trips people up constantly and the app says
so on the BTW page.

## What is deliberately not modelled

Loss carry-forward between years, the oudedagsreserve, co-entrepreneurs and
partnerships, boxes 2 and 3, a fiscal partner's position, provisional assessments
already paid, the One Stop Shop for EU distance selling, and the KIA taper above
the ceiling. Where one of these is likely to matter, the relevant page says so
rather than quietly producing a number.
