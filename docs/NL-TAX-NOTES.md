# Dutch tax notes

What the app implements, and where it stops. Verify anything here against
[belastingdienst.nl](https://www.belastingdienst.nl) before you file — this is a
description of the code, not tax advice.

## The two questions

Dutch law asks separately:

1. Does the cost reduce **taxable profit** (inkomstenbelasting)?
2. Can the **BTW** on it be reclaimed (voorbelasting)?

They frequently disagree, and this is the single largest source of mis-booked
expenses:

| Cost                     | Profit | BTW                    | Why                                                                           |
| ------------------------ | ------ | ---------------------- | ----------------------------------------------------------------------------- |
| Home internet            | 0%     | 100% of business share | Counts as a home cost for IB, but the VAT stays deductible                    |
| Restaurant, entertaining | 80%    | 0%                     | Mixed-cost regime; VAT on food and drink consumed on the premises is excluded |
| Hotel on a business trip | 100%   | 100%                   | Accommodation is not food and drink                                           |
| Business insurance       | 100%   | 0%                     | Insurance is VAT-exempt, so there is no VAT to reclaim                        |
| Fines                    | 0%     | 0%                     | Explicitly excluded, including on business trips                              |
| Ordinary clothing        | 0%     | 0%                     | Unless it carries a logo of at least 70 cm²                                   |

Each expense carries a **business-use percentage** applied before both columns,
so a phone line at 60% business use in a 100/100 category deducts 60%.

## Order of operations for income tax

The sequence is fixed by law and the app follows it exactly:

```
revenue (excl. BTW)
  − deductible costs           after business-use and deductibility percentages
  − depreciation               straight-line, max 20%/year
  − mileage                    business km × the fixed rate
  − KIA                        investment allowance
= profit
  − zelfstandigenaftrek        requires the hours criterion
  − startersaftrek             requires the above, max 3× in the first 5 years
= profit after entrepreneur deductions
  − mkb-winstvrijstelling      a percentage of what is left
= taxable profit
  + other box 1 income
  − personal deductions
= taxable income
  → box 1 brackets
  − general tax credit
  − labour tax credit
= income tax
  + Zvw contribution           a percentage of taxable profit, capped
```

Two details the app gets right and that are easy to get wrong by hand:

-   The **zelfstandigenaftrek cannot create a loss** for an established business —
    it is capped at the profit. Starters may carry the excess forward, so the app
    applies it unrestricted for them.
-   The **MKB exemption applies to a loss too**, reducing it. It is a percentage of
    whatever remains after the entrepreneur deductions, positive or negative.

## The hours criterion

1,225 hours a year unlocks both the zelfstandigenaftrek and the startersaftrek.
Almost all business time counts, not just billable work: admin, acquisition,
travel and training all do.

The app assumes you will meet it if you say so in Settings, and warns while the
logged hours fall short. If it is ever questioned, a contemporaneous log is the
evidence; an estimate written at year end is not.

## Depreciation

Straight-line, capped at 20% of (cost − residual value) per year — equivalently,
nothing may be written off in under five years. The first and last years are
pro-rated by month.

Below the capitalisation threshold (€450 excl. BTW by convention, editable) an
item can be expensed in the year of purchase. Above it, it must be capitalised;
the app flags this on the expense and offers to convert it into an asset.

## The BTW return

Boxes in the Belastingdienst's own numbering:

| Box          | Contents                                                                   |
| ------------ | -------------------------------------------------------------------------- |
| 1a / 1b / 1c | Domestic supplies at 21% / 9% / other rates                                |
| 1d           | Private use of business goods — usually only the final return of the year  |
| 1e           | Supplies at 0% or not taxed at your end, including domestic reverse charge |
| 2a           | Purchases where VAT was reverse-charged **to you** by a Dutch supplier     |
| 3a           | Exports outside the EU                                                     |
| 3b           | Intra-EU supplies — must equal the ICP declaration                         |
| 3c           | Installation and distance sales within the EU                              |
| 4a / 4b      | Purchases from outside / inside the EU                                     |
| 5a           | Total VAT payable                                                          |
| 5b           | Input VAT (voorbelasting)                                                  |
| 5c           | The bottom line                                                            |

Boxes 3a/3b/3c carry turnover only — the tax is due in the customer's country.
Boxes 2a/4a/4b carry VAT _you_ owe as the buyer; where it is also deductible it
reappears in 5b and nets to zero, but both legs must still be declared.

Exempt (vrijgesteld) turnover does not appear in the return at all.

**VAT follows the invoice date**, not the payment date. Draft invoices are
excluded and the app warns when one is dated inside the period.

## ICP declaration

Every reverse-charged supply to an EU business, listed per customer VAT number
and split into goods and services. The total must reconcile with box 3b — the
Belastingdienst compares them automatically and a mismatch generates a query. The
app checks this and refuses to be quiet about it.

An intra-EU supply without a valid customer VAT ID is not a valid reverse charge:
you owe the Dutch VAT yourself. The app flags this on the invoice and in the
return.

## KOR

Under the small-business scheme you charge no BTW, reclaim no input VAT, and file
no periodic returns. The app switches the BTW page off entirely and says why.
Watch the turnover ceiling — passing it ends the exemption mid-year.

## Where the app stops

Not modelled: loss carry-forward between years, the oudedagsreserve (FOR),
co-entrepreneurs and partnerships, boxes 2 and 3, a fiscal partner's position,
provisional assessments already paid, the One Stop Shop, the KIA taper above the
ceiling, and the bijtelling calculation for a business car (the app records the
category and warns, but does not compute the add-back).
