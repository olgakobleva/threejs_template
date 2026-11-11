import type { ExpenseCategory } from '@/domain/types';

/**
 * The deduction rulebook for a Dutch sole trader (eenmanszaak / ZZP).
 *
 * Each category carries two independent percentages, because Dutch law treats
 * them separately and this trips people up constantly:
 *
 *   • profitDeductiblePercent — how much of the cost reduces your taxable profit
 *   • vatDeductiblePercent    — how much of the BTW you may reclaim as voorbelasting
 *
 * Home internet is the classic example: no profit deduction at all, but the VAT
 * on the business share is reclaimable. Restaurant bills are the mirror image:
 * 80% of the cost is deductible, none of the VAT is.
 *
 * Both percentages apply *after* the expense's businessUsePercent has been
 * taken off, so a 50%-business phone bill in a 100/100 category deducts half.
 *
 * These are defaults, not verdicts. Every expense can override them, and the
 * `caveats` are the questions you should be able to answer if asked.
 */

function category(input: Omit<ExpenseCategory, 'isCustom'>): ExpenseCategory {
	return { ...input, isCustom: false };
}

export const BUILT_IN_CATEGORIES: ExpenseCategory[] = [
	// -----------------------------------------------------------------------
	// Workspace
	// -----------------------------------------------------------------------
	category({
		id: 'office_rent',
		label: 'Office / studio rent',
		group: 'Workspace',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale:
			'Rent for premises outside your home is a straightforward business cost.',
		caveats: [
			'Landlords may let VAT-exempt; if no BTW is charged there is none to reclaim.',
		],
		reference: 'Wet IB 2001 art. 3.8 (winst uit onderneming)',
		typicalVatRate: 21,
	}),
	category({
		id: 'coworking',
		label: 'Coworking / flex desk',
		group: 'Workspace',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Fully business; VAT is normally charged and reclaimable.',
		caveats: [
			'Coffee and lunch billed separately fall under the food & drink rules.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),
	category({
		id: 'workspace_home_qualifying',
		label: 'Home workspace — qualifying (zelfstandige werkruimte)',
		group: 'Workspace',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'partial',
		rationale:
			'A home workspace is only deductible if it is a genuinely independent unit and you earn enough income in it.',
		caveats: [
			'The room needs its own entrance and sanitation — it must be rentable to a stranger.',
			'You must earn at least 70% of your income in it (30% if you have no other workspace).',
			'Almost no spare bedroom passes this test. If in doubt, use the non-qualifying category.',
		],
		reference: 'Wet IB 2001 art. 3.16 lid 1',
		typicalVatRate: 21,
	}),
	category({
		id: 'workspace_home_nonqualifying',
		label: 'Home workspace — non-qualifying (a room in your house)',
		group: 'Workspace',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'A study or spare room inside your own home is not deductible: rent, mortgage interest, energy and furnishing all stay private.',
		caveats: [
			'Equipment you use in the room (laptop, monitor, desk chair) is still deductible on its own merits.',
		],
		reference: 'Wet IB 2001 art. 3.16 lid 1',
		typicalVatRate: 21,
	}),
	category({
		id: 'utilities_business_premises',
		label: 'Energy & utilities (business premises)',
		group: 'Workspace',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Running costs of premises that qualify as business space.',
		caveats: ['Not applicable to a non-qualifying home workspace.'],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),

	// -----------------------------------------------------------------------
	// Communication & IT
	// -----------------------------------------------------------------------
	category({
		id: 'phone_subscription',
		label: 'Mobile phone subscription',
		group: 'Communication & IT',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale:
			'Phone subscription costs are deductible for the business share; set the business-use percentage honestly.',
		caveats: [
			'Private use must be carved out via the business-use percentage.',
			'A subscription in your personal name is fine as long as you can show business use.',
		],
		reference: 'Wet IB 2001 art. 3.8; art. 3.16 does not exclude telephony',
		typicalVatRate: 21,
	}),
	category({
		id: 'internet_home',
		label: 'Home internet subscription',
		group: 'Communication & IT',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 100,
		verdict: 'partial',
		rationale:
			'The cost is NOT deductible from profit — it counts as a home cost — but the BTW on the business share can still be reclaimed.',
		caveats: [
			'This asymmetry is deliberate and it is the single most commonly mis-booked expense.',
			'Internet at a separate business address does not fall under this rule; use utilities instead.',
		],
		reference:
			'Wet IB 2001 art. 3.16 lid 1 (kosten werkruimte); Wet OB art. 15',
		typicalVatRate: 21,
	}),
	category({
		id: 'software_subscriptions',
		label: 'Software & SaaS subscriptions',
		group: 'Communication & IT',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Tools you use to do the work.',
		caveats: [
			'Non-EU suppliers (US SaaS) usually reverse-charge the VAT to you — book it as an import/EU acquisition, not as domestic.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),
	category({
		id: 'hosting_domains',
		label: 'Hosting, domains & cloud',
		group: 'Communication & IT',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Infrastructure costs of running the business.',
		caveats: [],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),

	// -----------------------------------------------------------------------
	// Equipment
	// -----------------------------------------------------------------------
	category({
		id: 'equipment_small',
		label: 'Small equipment (under the capitalisation threshold)',
		group: 'Equipment',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale:
			'Items below the threshold (€450 excl. BTW by convention) can be written off in the year of purchase.',
		caveats: [
			'The threshold applies per item, not per invoice.',
			'Above it, the item must be capitalised and depreciated — the app will warn you.',
		],
		reference: 'Wet IB 2001 art. 3.30 (afschrijving bedrijfsmiddelen)',
		typicalVatRate: 21,
	}),
	category({
		id: 'equipment_capitalised',
		label: 'Equipment to capitalise (asset)',
		group: 'Equipment',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 100,
		verdict: 'capitalise',
		rationale:
			'The purchase price does not hit your profit in one go — it is depreciated over at least 5 years. The VAT is reclaimable immediately.',
		caveats: [
			'Straight-line, maximum 20% of (cost − residual value) per year.',
			'May qualify for the investment allowance (KIA) if your total investments pass the threshold.',
		],
		reference: 'Wet IB 2001 art. 3.30; art. 3.41 (investeringsaftrek)',
		typicalVatRate: 21,
	}),
	category({
		id: 'office_supplies',
		label: 'Office supplies & consumables',
		group: 'Equipment',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Paper, cables, printer ink and the like.',
		caveats: [],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),

	// -----------------------------------------------------------------------
	// Travel
	// -----------------------------------------------------------------------
	category({
		id: 'mileage_private_car',
		label: 'Mileage — privately-owned car',
		group: 'Travel',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 0,
		verdict: 'partial',
		rationale:
			'A car you keep in private ownership is deducted at a fixed rate per business kilometre — not by its actual costs.',
		caveats: [
			'Use the Mileage log instead of booking fuel and maintenance receipts.',
			'Booking both the per-kilometre allowance and the actual costs is double-dipping.',
			'You need a kilometre administration with dates, routes and purpose.',
		],
		reference: 'Wet IB 2001 art. 3.17 lid 1 sub b',
		typicalVatRate: 21,
	}),
	category({
		id: 'car_business_owned',
		label: 'Business car — running costs',
		group: 'Travel',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'partial',
		rationale:
			'If the car is on the business balance sheet, all costs are deductible — but private use is added back (bijtelling).',
		caveats: [
			'Private use of a business car triggers an income add-back unless you drive under 500 private km/year and can prove it.',
			'A separate BTW correction for private use is due in the final return of the year.',
		],
		reference:
			'Wet IB 2001 art. 3.20; Besluit uitsluiting aftrek omzetbelasting',
		typicalVatRate: 21,
	}),
	category({
		id: 'public_transport',
		label: 'Public transport',
		group: 'Travel',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale:
			'Business travel by train, tram, bus or metro is fully deductible.',
		caveats: ['Domestic passenger transport is taxed at 9%, not 21%.'],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 9,
	}),
	category({
		id: 'flights',
		label: 'Flights',
		group: 'Travel',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 0,
		verdict: 'deductible',
		rationale:
			'Business flights are deductible; international passenger transport carries 0% VAT.',
		caveats: ['A trip mixing business and holiday must be split.'],
		reference: 'Wet OB 1968 Tabel II post b3',
		typicalVatRate: 0,
	}),
	category({
		id: 'accommodation',
		label: 'Hotel & accommodation (business trip)',
		group: 'Travel',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale:
			'Overnight stays for work are deductible and — unlike restaurant meals — the VAT is reclaimable.',
		caveats: [
			'Breakfast and dinner on the same bill fall under the food & drink rules; split the invoice if you can.',
		],
		reference: 'Wet OB 1968; Wet IB 2001 art. 3.8',
		typicalVatRate: 9,
	}),
	category({
		id: 'parking_tolls',
		label: 'Parking & tolls',
		group: 'Travel',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Incidental costs of business travel.',
		caveats: ['Parking fines are not deductible — use the Fines category.'],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),

	// -----------------------------------------------------------------------
	// Mixed-purpose costs (the 80% regime)
	// -----------------------------------------------------------------------
	category({
		id: 'food_drink_business',
		label: 'Food & drink, entertaining clients',
		group: 'Mixed-purpose costs',
		profitDeductiblePercent: 80,
		vatDeductiblePercent: 0,
		verdict: 'partial',
		rationale:
			'Representation costs are only 80% deductible from profit, and BTW on food and drink consumed on the premises is never reclaimable.',
		caveats: [
			'The alternative to the 80% rule is deducting everything and adding back a flat amount — pick whichever is better and apply it consistently for the whole year.',
			'Catering delivered to your own office is treated differently from eating at the restaurant; keep the receipts distinguishable.',
			'A lunch with no business counterparty is private, not 80% deductible.',
		],
		reference:
			'Wet IB 2001 art. 3.15; Besluit uitsluiting aftrek omzetbelasting art. 1 lid 1c',
		typicalVatRate: 9,
	}),
	category({
		id: 'business_gifts',
		label: 'Business gifts & relationship management',
		group: 'Mixed-purpose costs',
		profitDeductiblePercent: 80,
		vatDeductiblePercent: 0,
		verdict: 'partial',
		rationale:
			'Same 80% regime as entertaining, with a separate VAT exclusion above €227 per recipient per year.',
		caveats: [
			'VAT on gifts is excluded once you give one recipient more than €227 (excl. BTW) in a year.',
		],
		reference: 'Wet IB 2001 art. 3.15; BUA art. 1 lid 1b',
		typicalVatRate: 21,
	}),
	category({
		id: 'conferences_events',
		label: 'Conferences, seminars & networking events',
		group: 'Mixed-purpose costs',
		profitDeductiblePercent: 80,
		vatDeductiblePercent: 100,
		verdict: 'partial',
		rationale:
			'Congress and seminar attendance falls under the mixed-costs regime for profit, but the VAT on the ticket is normally reclaimable.',
		caveats: [
			'Travel to the event is a normal travel cost and stays 100% deductible.',
			'If the event is genuinely training rather than networking, book it as training instead.',
		],
		reference: 'Wet IB 2001 art. 3.15 lid 1',
		typicalVatRate: 21,
	}),

	// -----------------------------------------------------------------------
	// Professional services & knowledge
	// -----------------------------------------------------------------------
	category({
		id: 'accountancy_legal',
		label: 'Accountancy, bookkeeping & legal fees',
		group: 'Professional services',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Advice bought for the business.',
		caveats: [
			'Help with your *private* tax return is not a business cost.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),
	category({
		id: 'subcontractors',
		label: 'Subcontractors & freelancers hired',
		group: 'Professional services',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Work you bought in to deliver your own work.',
		caveats: [
			'In construction and similar sectors the VAT may be reverse-charged to you — book it as reverse charge, not domestic.',
			'Keep the agreement; a relationship that looks like employment carries its own risks.',
		],
		reference: 'Wet IB 2001 art. 3.8; Wet OB art. 12 lid 5',
		typicalVatRate: 21,
	}),
	category({
		id: 'training_maintaining',
		label: 'Training that maintains existing skills',
		group: 'Professional services',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale:
			'Courses that keep your current expertise current are a business cost.',
		caveats: [
			'Training to enter a *new* profession is not a business cost — see the separate category.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),
	category({
		id: 'training_new_field',
		label: 'Training for a new profession',
		group: 'Professional services',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Studying towards a new career is a private investment, not a cost of your current business.',
		caveats: [
			'Separate personal schemes may apply; they are outside the profit calculation.',
		],
		reference: 'Wet IB 2001 art. 3.8 (causaal verband met de onderneming)',
		typicalVatRate: 21,
	}),
	category({
		id: 'professional_literature',
		label: 'Professional literature & industry media',
		group: 'Professional services',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Trade journals and technical books tied to your field.',
		caveats: ['General newspapers and lifestyle magazines are private.'],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 9,
	}),
	category({
		id: 'memberships',
		label: 'Professional memberships & unions',
		group: 'Professional services',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Membership of a trade body or professional association.',
		caveats: [
			'A gym or hobby club membership is private, whatever the networking argument.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),

	// -----------------------------------------------------------------------
	// Marketing
	// -----------------------------------------------------------------------
	category({
		id: 'marketing_advertising',
		label: 'Advertising & marketing',
		group: 'Marketing',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale: 'Ads, campaigns and promotional material.',
		caveats: [
			'Ads bought from non-EU platforms are usually reverse-charged — check the treatment.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),
	category({
		id: 'website_design',
		label: 'Website design & build',
		group: 'Marketing',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'partial',
		rationale:
			'Deductible, but a substantial build may have to be capitalised and depreciated.',
		caveats: [
			'Above the capitalisation threshold, treat the build as an asset.',
		],
		reference: 'Wet IB 2001 art. 3.30',
		typicalVatRate: 21,
	}),
	category({
		id: 'work_clothing_logo',
		label: 'Work clothing with a company logo',
		group: 'Marketing',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'partial',
		rationale:
			'Clothing is only deductible when it is unmistakably work clothing — in practice, a logo of at least 70 cm².',
		caveats: [
			'The logo must be per item of clothing, not per outfit.',
			'Protective gear (safety boots, helmets) qualifies on its own merits.',
		],
		reference: 'Wet IB 2001 art. 3.16 lid 2 sub c',
		typicalVatRate: 21,
	}),
	category({
		id: 'clothing_general',
		label: 'Clothing (ordinary)',
		group: 'Marketing',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'A suit you could wear outside work is private, however strictly your clients expect it.',
		caveats: [],
		reference: 'Wet IB 2001 art. 3.16 lid 2 sub c',
		typicalVatRate: 21,
	}),

	// -----------------------------------------------------------------------
	// Financial & insurance
	// -----------------------------------------------------------------------
	category({
		id: 'insurance_business',
		label: 'Business insurance (liability, legal, equipment)',
		group: 'Financial',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 0,
		verdict: 'deductible',
		rationale:
			'Business insurance premiums are deductible. Insurance is VAT-exempt, so there is no BTW to reclaim.',
		caveats: ['Insurance premium tax is not VAT and cannot be reclaimed.'],
		reference: 'Wet IB 2001 art. 3.8; Wet OB art. 11 lid 1k',
		typicalVatRate: 0,
	}),
	category({
		id: 'insurance_disability',
		label: 'Disability insurance (AOV)',
		group: 'Financial',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'partial',
		rationale:
			'AOV premiums are not a business cost, but they are deductible from your income as a personal deduction.',
		caveats: [
			'Enter the annual premium under Settings → Fiscal → personal deductions, not as an expense.',
			'Any payout is taxed as income.',
		],
		reference: 'Wet IB 2001 art. 3.124 lid 1 sub c',
		typicalVatRate: 0,
	}),
	category({
		id: 'pension_annuity',
		label: 'Pension / annuity contributions (lijfrente)',
		group: 'Financial',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'partial',
		rationale:
			'Not a business cost. Deductible personally, capped by your annual room (jaarruimte).',
		caveats: [
			'Enter it under personal deductions; exceeding the jaarruimte is not deductible.',
		],
		reference: 'Wet IB 2001 art. 3.127',
		typicalVatRate: 0,
	}),
	category({
		id: 'bank_charges',
		label: 'Business bank charges',
		group: 'Financial',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 0,
		verdict: 'deductible',
		rationale:
			'Costs of the business account. Banking services are VAT-exempt.',
		caveats: [
			'Charges on a private account are not deductible; open a separate business account.',
		],
		reference: 'Wet OB art. 11 lid 1i',
		typicalVatRate: 0,
	}),
	category({
		id: 'interest_business_loan',
		label: 'Interest on business borrowing',
		group: 'Financial',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 0,
		verdict: 'deductible',
		rationale: 'Interest on a loan taken out for the business.',
		caveats: [
			'Repayment of the principal is not a cost — only the interest is.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 0,
	}),

	// -----------------------------------------------------------------------
	// Never deductible
	// -----------------------------------------------------------------------
	category({
		id: 'fines',
		label: 'Fines & penalties',
		group: 'Not deductible',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Fines are explicitly excluded, including speeding and parking tickets on business trips.',
		caveats: [],
		reference: 'Wet IB 2001 art. 3.14 lid 1 sub c',
		typicalVatRate: 0,
	}),
	category({
		id: 'personal_care',
		label: 'Personal care & appearance',
		group: 'Not deductible',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Haircuts, glasses and grooming are private, even before a client meeting.',
		caveats: [],
		reference: 'Wet IB 2001 art. 3.16',
		typicalVatRate: 21,
	}),
	category({
		id: 'income_tax_paid',
		label: 'Income tax paid',
		group: 'Not deductible',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Your own income tax is a private payment, not a business cost.',
		caveats: [],
		reference: 'Wet IB 2001 art. 3.14 lid 1 sub a',
		typicalVatRate: 0,
	}),
	category({
		id: 'zvw_contribution',
		label: 'Health insurance & Zvw contribution',
		group: 'Not deductible',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Neither your health insurance premium nor the income-related Zvw contribution reduces profit.',
		caveats: [],
		reference: 'Wet IB 2001 art. 3.14',
		typicalVatRate: 0,
	}),
	category({
		id: 'private_withdrawal',
		label: 'Private withdrawal (privé-opname)',
		group: 'Not deductible',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Money you pay yourself is not a cost — a sole trader has no salary.',
		caveats: [
			'Use this to label bank transactions so they stop showing up as unmatched.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 0,
	}),
	category({
		id: 'donations',
		label: 'Charitable donations',
		group: 'Not deductible',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Gifts to charity are not a business cost for a sole trader; they may qualify as a personal gift deduction.',
		caveats: [
			'Sponsorship with a genuine advertising return is different — book that as marketing.',
		],
		reference: 'Wet IB 2001 art. 6.32 e.v.',
		typicalVatRate: 0,
	}),
	category({
		id: 'general_media',
		label: 'General newspapers & subscriptions',
		group: 'Not deductible',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale: 'Broad-interest media is private consumption.',
		caveats: [
			'A trade-specific publication belongs under professional literature.',
		],
		reference: 'Wet IB 2001 art. 3.16',
		typicalVatRate: 9,
	}),

	// -----------------------------------------------------------------------
	// Catch-all
	// -----------------------------------------------------------------------
	category({
		id: 'other_business',
		label: 'Other business costs',
		group: 'Other',
		profitDeductiblePercent: 100,
		vatDeductiblePercent: 100,
		verdict: 'deductible',
		rationale:
			'Use sparingly, and write down why in the justification field.',
		caveats: [
			'An unexplained "other" line is the first thing an inspector asks about.',
		],
		reference: 'Wet IB 2001 art. 3.8',
		typicalVatRate: 21,
	}),
	category({
		id: 'uncategorised',
		label: 'Uncategorised — needs review',
		group: 'Other',
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		verdict: 'not_deductible',
		rationale:
			'Parked until you decide. Counts as nothing until categorised.',
		caveats: [
			'Anything left here is excluded from both the BTW return and the profit figure.',
		],
		reference: '—',
		typicalVatRate: 21,
	}),
];

export const CATEGORY_GROUPS = [
	'Workspace',
	'Communication & IT',
	'Equipment',
	'Travel',
	'Mixed-purpose costs',
	'Professional services',
	'Marketing',
	'Financial',
	'Not deductible',
	'Other',
];

export function findCategory(
	categories: ExpenseCategory[],
	id: string,
): ExpenseCategory | undefined {
	return categories.find((candidate) => candidate.id === id);
}

export const DEFAULT_CATEGORY_ID = 'uncategorised';
