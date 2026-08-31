import { percentOf, roundCents, type Cents } from '@/core/money';
import { periodRange, yearOf, type Period } from '@/core/dates';
import type {
	Asset,
	CreditPhase,
	Expense,
	ExpenseCategory,
	HoursEntry,
	Invoice,
	MileageEntry,
	Settings,
	TaxBracket,
	TaxYearParameters,
} from '@/domain/types';
import { expenseTotals, invoiceTotals } from './vat';
import { computeKia, totalDepreciationForYear } from './depreciation';

/**
 * Income tax (inkomstenbelasting, box 1) for a sole trader.
 *
 * The order of operations matters and is fixed by law:
 *
 *   1. profit            = revenue − deductible costs − depreciation − mileage − KIA
 *   2. entrepreneur      − zelfstandigenaftrek (needs the 1,225-hour criterion)
 *      deductions        − startersaftrek (needs the above, max 3× in 5 years)
 *   3. SME exemption     − mkb-winstvrijstelling, a % of what is left
 *   4. taxable income    + other box 1 income − personal deductions
 *   5. gross tax         via the box 1 brackets
 *   6. minus credits     general tax credit + labour tax credit
 *   7. plus Zvw          income-related healthcare contribution
 *
 * This is an estimate for planning and setting money aside. It does not model
 * loss carry-forward, the FOR, co-entrepreneur splits, or box 2/3.
 */

// ---------------------------------------------------------------------------
// Profit and loss
// ---------------------------------------------------------------------------

export interface CategoryBreakdownRow {
	categoryId: string;
	label: string;
	grossCents: Cents;
	deductibleCents: Cents;
	/** How much was lost to partial deductibility — the "you cannot deduct this" number. */
	disallowedCents: Cents;
	count: number;
}

export interface ProfitAndLoss {
	year: number;
	revenueCents: Cents;
	deductibleCostsCents: Cents;
	depreciationCents: Cents;
	mileageDeductionCents: Cents;
	mileageKm: number;
	kiaCents: Cents;
	kiaExplanation: string;
	profitCents: Cents;
	categoryBreakdown: CategoryBreakdownRow[];
	/** Total cost booked, including the non-deductible part. */
	totalCostsBookedCents: Cents;
	invoiceCount: number;
	expenseCount: number;
}

export function computeProfitAndLoss(
	year: number,
	invoices: Invoice[],
	expenses: Expense[],
	assets: Asset[],
	mileage: MileageEntry[],
	categories: ExpenseCategory[],
	params: TaxYearParameters,
): ProfitAndLoss {
	const range = periodRange({ kind: 'year', year });

	const yearInvoices = invoices.filter(
		(invoice) =>
			invoice.status !== 'draft' &&
			invoice.status !== 'cancelled' &&
			invoice.issueDate >= range.start &&
			invoice.issueDate <= range.end,
	);

	const revenueCents = yearInvoices.reduce(
		(sum, invoice) => sum + invoiceTotals(invoice).net,
		0,
	);

	const yearExpenses = expenses.filter(
		(expense) =>
			expense.status !== 'excluded' &&
			expense.assetId === null &&
			expense.date >= range.start &&
			expense.date <= range.end,
	);

	const byCategory = new Map<string, CategoryBreakdownRow>();
	let deductibleCostsCents = 0;
	let totalCostsBookedCents = 0;

	for (const expense of yearExpenses) {
		const totals = expenseTotals(expense);
		deductibleCostsCents += totals.deductibleCost;
		totalCostsBookedCents += totals.net;

		const category = categories.find(
			(candidate) => candidate.id === expense.categoryId,
		);
		const key = expense.categoryId;
		const row = byCategory.get(key) ?? {
			categoryId: key,
			label: category?.label ?? key,
			grossCents: 0,
			deductibleCents: 0,
			disallowedCents: 0,
			count: 0,
		};
		row.grossCents += totals.net;
		row.deductibleCents += totals.deductibleCost;
		row.disallowedCents += totals.net - totals.deductibleCost;
		row.count += 1;
		byCategory.set(key, row);
	}

	const depreciationCents = totalDepreciationForYear(assets, year, params);

	const businessMileage = mileage.filter(
		(entry) =>
			entry.isBusiness &&
			entry.date >= range.start &&
			entry.date <= range.end,
	);
	const mileageKm = businessMileage
		.filter((entry) => entry.vehicle === 'private_car')
		.reduce((sum, entry) => sum + entry.kilometres, 0);
	const mileageDeductionCents = roundCents(
		mileageKm * params.mileageAllowanceCentsPerKm,
	);

	const kia = computeKia(assets, year, params);

	const profitCents =
		revenueCents -
		deductibleCostsCents -
		depreciationCents -
		mileageDeductionCents -
		kia.allowanceCents;

	return {
		year,
		revenueCents,
		deductibleCostsCents,
		depreciationCents,
		mileageDeductionCents,
		mileageKm,
		kiaCents: kia.allowanceCents,
		kiaExplanation: kia.explanation,
		profitCents,
		categoryBreakdown: [...byCategory.values()].sort(
			(a, b) => b.grossCents - a.grossCents,
		),
		totalCostsBookedCents,
		invoiceCount: yearInvoices.length,
		expenseCount: yearExpenses.length,
	};
}

// ---------------------------------------------------------------------------
// Brackets and credits
// ---------------------------------------------------------------------------

export interface BracketCharge {
	ratePercent: number;
	amountInBracketCents: Cents;
	taxCents: Cents;
}

export function applyBrackets(
	taxableCents: Cents,
	brackets: TaxBracket[],
): { totalCents: Cents; charges: BracketCharge[] } {
	let remaining = Math.max(0, taxableCents);
	let previousCeiling = 0;
	let total = 0;
	const charges: BracketCharge[] = [];

	for (const bracket of brackets) {
		if (remaining <= 0) break;
		const ceiling = bracket.upToCents ?? Number.POSITIVE_INFINITY;
		const width = ceiling - previousCeiling;
		const amount = Math.min(remaining, width);
		const tax = percentOf(amount, bracket.ratePercent);

		charges.push({
			ratePercent: bracket.ratePercent,
			amountInBracketCents: amount,
			taxCents: tax,
		});
		total += tax;
		remaining -= amount;
		previousCeiling = ceiling;
	}

	return { totalCents: total, charges };
}

export function evaluateCredit(
	incomeCents: Cents,
	phases: CreditPhase[],
): Cents {
	const income = Math.max(0, incomeCents);
	let active: CreditPhase | undefined;
	for (const phase of phases) {
		if (income >= phase.fromCents) active = phase;
		else break;
	}
	if (!active) return 0;
	const value =
		active.baseCents +
		(income - active.fromCents) * (active.ratePercent / 100);
	return Math.max(0, roundCents(value));
}

// ---------------------------------------------------------------------------
// The estimate
// ---------------------------------------------------------------------------

export interface IncomeTaxEstimate {
	year: number;
	params: TaxYearParameters;
	pnl: ProfitAndLoss;

	hoursLogged: number;
	hoursCriterion: number;
	meetsHoursCriterion: boolean;

	zelfstandigenaftrekCents: Cents;
	startersaftrekCents: Cents;
	entrepreneurDeductionsCents: Cents;
	profitAfterEntrepreneurDeductionsCents: Cents;

	mkbExemptionCents: Cents;
	taxableProfitCents: Cents;

	otherBox1IncomeCents: Cents;
	personalDeductionsCents: Cents;
	taxableIncomeCents: Cents;

	grossTaxCents: Cents;
	bracketCharges: BracketCharge[];
	generalTaxCreditCents: Cents;
	labourTaxCreditCents: Cents;
	incomeTaxDueCents: Cents;

	zvwContributionCents: Cents;
	totalLiabilityCents: Cents;

	effectiveRatePercent: number;
	marginalRatePercent: number;
	/** What to hold back from every euro of new revenue. */
	recommendedSetAsidePercent: number;

	notes: string[];
	warnings: string[];
}

interface EstimateInput {
	year: number;
	invoices: Invoice[];
	expenses: Expense[];
	assets: Asset[];
	mileage: MileageEntry[];
	hours: HoursEntry[];
	categories: ExpenseCategory[];
	settings: Settings;
	params: TaxYearParameters;
}

/** Core chain, isolated so the marginal rate can re-run it on a nudged profit. */
function liabilityForProfit(
	profitCents: Cents,
	input: EstimateInput,
	meetsHoursCriterion: boolean,
	isStarter: boolean,
): {
	zelfstandigenaftrek: Cents;
	startersaftrek: Cents;
	profitAfterDeductions: Cents;
	mkb: Cents;
	taxableProfit: Cents;
	taxableIncome: Cents;
	grossTax: Cents;
	charges: BracketCharge[];
	generalCredit: Cents;
	labourCredit: Cents;
	incomeTax: Cents;
	zvw: Cents;
	total: Cents;
} {
	const { params, settings } = input;

	// Step 2 — entrepreneur deductions.
	let zelfstandigenaftrek = 0;
	let startersaftrek = 0;

	if (meetsHoursCriterion) {
		// The self-employed deduction cannot create a loss, except for starters,
		// who may carry the excess forward.
		zelfstandigenaftrek = isStarter
			? params.zelfstandigenaftrekCents
			: Math.min(
					params.zelfstandigenaftrekCents,
					Math.max(0, profitCents),
			  );

		if (isStarter && settings.fiscal.startersaftrekYearsClaimed < 3) {
			startersaftrek = params.startersaftrekCents;
		}
	}

	const entrepreneurDeductions = zelfstandigenaftrek + startersaftrek;
	const profitAfterDeductions = profitCents - entrepreneurDeductions;

	// Step 3 — SME profit exemption, applied to whatever is left (including a loss).
	const mkb = percentOf(
		profitAfterDeductions,
		params.mkbProfitExemptionPercent,
	);
	const taxableProfit = profitAfterDeductions - mkb;

	// Step 4 — box 1 income.
	const taxableIncome = Math.max(
		0,
		taxableProfit +
			settings.fiscal.otherBox1IncomeCents -
			settings.fiscal.personalDeductionsCents,
	);

	// Step 5 — brackets.
	const brackets = settings.fiscal.reachedStatePensionAge
		? params.box1BracketsAow
		: params.box1Brackets;
	const { totalCents: grossTax, charges } = applyBrackets(
		taxableIncome,
		brackets,
	);

	// Step 6 — credits.
	const labourIncome = Math.max(
		0,
		taxableProfit + settings.fiscal.otherBox1IncomeCents,
	);
	const generalCredit = evaluateCredit(
		taxableIncome,
		params.generalTaxCredit,
	);
	const labourCredit = evaluateCredit(labourIncome, params.labourTaxCredit);
	const incomeTax = Math.max(0, grossTax - generalCredit - labourCredit);

	// Step 7 — healthcare contribution over the profit, capped.
	const zvwBase = Math.min(
		Math.max(0, taxableProfit),
		params.zvwMaxIncomeCents,
	);
	const zvw = percentOf(zvwBase, params.zvwRatePercent);

	return {
		zelfstandigenaftrek,
		startersaftrek,
		profitAfterDeductions,
		mkb,
		taxableProfit,
		taxableIncome,
		grossTax,
		charges,
		generalCredit,
		labourCredit,
		incomeTax,
		zvw,
		total: incomeTax + zvw,
	};
}

export function computeIncomeTax(input: EstimateInput): IncomeTaxEstimate {
	const {
		year,
		invoices,
		expenses,
		assets,
		mileage,
		hours,
		categories,
		settings,
		params,
	} = input;

	const pnl = computeProfitAndLoss(
		year,
		invoices,
		expenses,
		assets,
		mileage,
		categories,
		params,
	);

	const hoursLogged = hours
		.filter(
			(entry) => entry.countsForCriterion && yearOf(entry.date) === year,
		)
		.reduce((sum, entry) => sum + entry.hours, 0);

	const meetsHoursCriterion =
		hoursLogged >= params.hoursCriterion ||
		settings.fiscal.expectsToMeetHoursCriterion;

	const yearsInBusiness = year - settings.fiscal.firstYearOfBusiness;
	const isStarter =
		yearsInBusiness >= 0 &&
		yearsInBusiness < 5 &&
		settings.fiscal.startersaftrekYearsClaimed < 3;

	const base = liabilityForProfit(
		pnl.profitCents,
		input,
		meetsHoursCriterion,
		isStarter,
	);

	// Marginal rate by finite difference: €1,000 more profit, how much more tax?
	const step = 100_000; // €1,000 in cents
	const bumped = liabilityForProfit(
		pnl.profitCents + step,
		input,
		meetsHoursCriterion,
		isStarter,
	);
	const marginalRatePercent = ((bumped.total - base.total) / step) * 100;

	const effectiveRatePercent =
		pnl.profitCents > 0 ? (base.total / pnl.profitCents) * 100 : 0;

	const notes: string[] = [];
	const warnings: string[] = [];

	if (!params.verifiedByUser) {
		warnings.push(
			`The ${year} tax figures in this app have not been verified by you. Open Settings → Tax years, check them against belastingdienst.nl and tick the box.`,
		);
	}

	if (!meetsHoursCriterion) {
		warnings.push(
			`You have logged ${Math.round(hoursLogged)} of the ${
				params.hoursCriterion
			} hours needed for the self-employed deduction. Without the hours criterion you lose both the zelfstandigenaftrek and the startersaftrek — roughly ${(
				(params.zelfstandigenaftrekCents + params.startersaftrekCents) /
				100
			).toFixed(0)} euro of deduction.`,
		);
	} else if (hoursLogged < params.hoursCriterion) {
		notes.push(
			`The hours criterion is being assumed rather than proven: ${Math.round(
				hoursLogged,
			)} of ${
				params.hoursCriterion
			} hours are logged. Keep the hours administration up to date — it is the first thing asked for.`,
		);
	}

	if (isStarter) {
		notes.push(
			`Starter status applies (year ${
				yearsInBusiness + 1
			} of the business, startersaftrek claimed ${
				settings.fiscal.startersaftrekYearsClaimed
			} of 3 times).`,
		);
	}

	if (base.taxableProfit <= 0) {
		notes.push(
			'Taxable profit is zero or negative. A loss can usually be offset against other years, which this estimate does not model.',
		);
	}

	if (pnl.profitCents > 0 && settings.fiscal.otherBox1IncomeCents > 0) {
		notes.push(
			'Other box 1 income is included, so the marginal rate reflects your combined income, not the business alone.',
		);
	}

	// Rounded up to a sane planning number.
	const recommendedSetAsidePercent = Math.min(
		50,
		Math.max(0, Math.ceil(marginalRatePercent / 5) * 5),
	);

	return {
		year,
		params,
		pnl,
		hoursLogged,
		hoursCriterion: params.hoursCriterion,
		meetsHoursCriterion,
		zelfstandigenaftrekCents: base.zelfstandigenaftrek,
		startersaftrekCents: base.startersaftrek,
		entrepreneurDeductionsCents:
			base.zelfstandigenaftrek + base.startersaftrek,
		profitAfterEntrepreneurDeductionsCents: base.profitAfterDeductions,
		mkbExemptionCents: base.mkb,
		taxableProfitCents: base.taxableProfit,
		otherBox1IncomeCents: settings.fiscal.otherBox1IncomeCents,
		personalDeductionsCents: settings.fiscal.personalDeductionsCents,
		taxableIncomeCents: base.taxableIncome,
		grossTaxCents: base.grossTax,
		bracketCharges: base.charges,
		generalTaxCreditCents: base.generalCredit,
		labourTaxCreditCents: base.labourCredit,
		incomeTaxDueCents: base.incomeTax,
		zvwContributionCents: base.zvw,
		totalLiabilityCents: base.total,
		effectiveRatePercent,
		marginalRatePercent,
		recommendedSetAsidePercent,
		notes,
		warnings,
	};
}

/** Money to hold back right now, given what has already been invoiced this year. */
export function setAsideAdvice(
	estimate: IncomeTaxEstimate,
	vatBalanceCents: Cents,
): {
	incomeTaxCents: Cents;
	vatCents: Cents;
	totalCents: Cents;
} {
	return {
		incomeTaxCents: Math.max(0, estimate.totalLiabilityCents),
		vatCents: Math.max(0, vatBalanceCents),
		totalCents:
			Math.max(0, estimate.totalLiabilityCents) +
			Math.max(0, vatBalanceCents),
	};
}

export function periodYear(period: Period): number {
	return period.year;
}
