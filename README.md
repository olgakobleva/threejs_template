# Ledgerly

Bookkeeping for a Dutch sole trader (ZZP / eenmanszaak), in English.

A Tellow-shaped app: invoices, receipts with their justifications, a BTW return
worked out box by box, and an income-tax estimate that follows the order the law
actually applies. It runs entirely in your browser — no account, no server, no
upload — with an optional Claude integration that reads receipts and answers
"can I put this through the business?".

## Read this first

**The tax figures shipped with this app are unverified.** Dutch rates,
deductions and credits change every year. Every parameter is editable in
Settings → Tax years, and the tax pages show a warning banner until you tick
"I checked these against belastingdienst.nl" for that year.

Nothing is filed for you. The BTW page produces a worksheet you copy into Mijn
Belastingdienst Zakelijk yourself. The income-tax page produces an estimate for
planning and for knowing what to set aside — not a return. For a first year, or
any year with something unusual in it, have a bookkeeper check the numbers.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the built bundle
npm run typecheck
```

Any static host will serve `dist/`. There is no backend to deploy.

## What it does

**Invoices** — line items, discounts, the eight VAT treatments a Dutch business
needs (domestic, reverse charge, intra-EU goods and services, distance sales,
export, exempt, KOR), sequential numbering, payment tracking, and a printable
invoice that carries the reverse-charge wording the rules require. Sent invoices
lock, because the audit trail is the point.

**Expenses** — drop a photo or PDF and Claude fills in the supplier, date,
amounts, VAT rate and a category; you review before anything is saved.
Deductibility comes from a rulebook of ~45 Dutch categories, not from the
model's opinion. Each expense carries a business-use share, a profit-deductible
share, a VAT-reclaimable share and a free-text justification — the note you want
to have when someone asks about that line three years from now.

**The two-column rule.** Dutch law asks separately whether a cost reduces your
profit and whether you can reclaim the BTW on it, and the answers often differ.
Home internet deducts nothing but reclaims VAT on the business share. A
restaurant bill deducts 80% and reclaims nothing. The app models both columns
everywhere, and the rulebook tab explains each one with its legal reference.

**Checks** — a deterministic pass over every expense, with no API calls: costs
above the capitalisation threshold that should be depreciated instead, VAT
reclaimed where it cannot be, reclaims with no receipt attached, mileage booked
twice, entertaining with no context, home-workspace claims that will not survive
the independence test.

**BTW return** — boxes 1a through 4b in the Belastingdienst's own order and
numbering, plus 5a/5b/5c, with private-use and correction adjustments, CSV
export, and warnings for the things that generate queries: draft invoices dated
inside the period, EU sales missing a customer VAT ID, unreviewed expenses.

**ICP declaration** — intra-EU supplies per customer VAT number, split into
goods and services, reconciled against box 3b.

**Income tax** — profit, then zelfstandigenaftrek and startersaftrek (gated on
the hours criterion), then the MKB profit exemption, then the box 1 brackets,
then the general and labour tax credits, then the Zvw contribution. It also
computes your marginal rate numerically and tells you what percentage of each
new invoice to hold back.

**Assets** — straight-line depreciation with the 20%-per-year cap, first and
last years pro-rated by month, and the KIA investment allowance.

**Mileage and hours** — the two administrations the Belastingdienst asks for by
name: a kilometre log for a privately-owned car at the fixed rate, and an hours
log for the 1,225-hour criterion that unlocks the self-employed deduction.

**Bank** — CSV import with column mapping (handles unsigned amounts with a
separate Af/Bij column), duplicate detection, and one-click matching to invoices
or new expenses. What stays unmatched is what your books are missing.

**Deduction advisor** — a chat that answers against the same rulebook the app
calculates with, told to say when a case is genuinely borderline rather than
manufacture confidence.

**Which model** — the default is Claude Fable 5, the most capable option and the
one that copes best with a creased receipt photographed at an angle. It is also
the most expensive ($10/$50 per million input/output tokens), so Settings → AI
assistance lets you drop to Opus 5, Sonnet 5 or Haiku 4.5 and shows the price of
whichever you pick. Receipt scanning runs at low effort because transcription
does not need deep reasoning; the advisor runs at medium.

Two Fable-specific details the code handles for you: thinking is always on and
cannot be configured, so the request omits the parameter entirely rather than
setting it; and Fable can decline a request outright — returning a successful
response with `stop_reason: "refusal"` rather than raising — so server-side
refusal fallbacks are enabled, and a scan rescued by the fallback model is
flagged for a closer look. Fable is not available to organisations configured
for zero data retention; if scans come back rejected, that is the likely reason
and Opus 5 has no such requirement.

## Where your data lives

In this browser's IndexedDB, including the receipt files. Nothing is uploaded.

That has a consequence worth stating plainly: **clearing site data deletes your
bookkeeping**, and you are required to keep these records for seven years.
Settings → Data exports a single JSON file with every record and every receipt.
Take one regularly and store it where you keep your tax documents.

The Claude API key, if you add one, is stored the same way — unencrypted, in
this browser — and is sent directly from the page to api.anthropic.com. There is
no server in between to leak it, and equally, anything that can run script in
this browser can read it. Use a key you can rotate cheaply.

## Moving to a server later

Every read and write goes through one interface, `DataStore`
(`src/storage/DataStore.ts`). The browser implementation is `IdbDataStore`; a
skeleton HTTP implementation listing the expected routes is in
`HttpDataStore.ts`. Point `StoreProvider` at the second one and every page,
calculation and export keeps working — the swap is one line.

A backup export doubles as the migration file: it is the full dataset, receipts
included, in the shape a server would import.

Before that is real it needs the things a browser-only app does not: proper
authentication, per-user scoping on every route, encryption at rest for the
receipt files, and the API key moved server-side.

## Layout

```
src/
  core/         money (integer cents), dates and periods, CSV, ids
  domain/       types and factory defaults
  storage/      DataStore interface, IndexedDB and HTTP implementations
  tax/nl/       years.ts (editable parameters), categories.ts (the rulebook),
                vat.ts, vatReturn.ts, icp.ts, incomeTax.ts, depreciation.ts,
                deductibility.ts (the offline checks)
  ai/           Claude client, receipt scanning, advisor
  ui/           design tokens and shared components
  pages/        one file per screen
  app/          shell and hash router
docs/           architecture and tax notes
```

Money is integer cents throughout. Dates are plain `YYYY-MM-DD` strings. Neither
decision is negotiable in a bookkeeping app: a VAT return that is one cent off is
a VAT return that has to be corrected.

## Licence

ISC.
