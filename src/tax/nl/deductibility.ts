import { formatMoney } from '@/core/money';
import type {
	Expense,
	ExpenseCategory,
	Settings,
	TaxYearParameters,
} from '@/domain/types';
import { expenseTotals } from './vat';

/**
 * A deterministic review pass over a single expense.
 *
 * This runs on every expense, offline, with no API calls. The AI advisor sits
 * on top of it and handles judgement calls; everything mechanical is caught
 * here so the app is useful without a key and without spending anything.
 */

export type FlagSeverity = 'error' | 'warning' | 'info';

export interface DeductionFlag {
	severity: FlagSeverity;
	code: string;
	message: string;
	/** What to do about it, in one line. */
	action?: string;
}

export function reviewExpense(
	expense: Expense,
	category: ExpenseCategory | undefined,
	params: TaxYearParameters,
	settings: Settings,
): DeductionFlag[] {
	const flags: DeductionFlag[] = [];
	const totals = expenseTotals(expense);

	if (!category) {
		flags.push({
			severity: 'error',
			code: 'no_category',
			message:
				'This expense has no valid category, so it counts for nothing.',
			action: 'Pick a category.',
		});
		return flags;
	}

	if (category.id === 'uncategorised') {
		flags.push({
			severity: 'warning',
			code: 'uncategorised',
			message:
				'Still uncategorised — excluded from both the BTW return and the profit figure.',
			action: 'Categorise it.',
		});
	}

	// -- Capitalisation ------------------------------------------------------

	if (
		expense.netCents >= params.capitalisationThresholdCents &&
		expense.assetId === null &&
		category.verdict !== 'capitalise' &&
		(category.group === 'Equipment' || category.id === 'website_design')
	) {
		flags.push({
			severity: 'warning',
			code: 'should_capitalise',
			message: `At ${formatMoney(
				expense.netCents,
			)} this is above the ${formatMoney(
				params.capitalisationThresholdCents,
			)} capitalisation threshold, so it cannot be written off in one year.`,
			action: 'Convert it to a fixed asset and depreciate it over at least 5 years.',
		});
	}

	if (category.verdict === 'capitalise' && expense.assetId === null) {
		flags.push({
			severity: 'error',
			code: 'capitalise_not_linked',
			message:
				'This category means the cost must be depreciated, but no asset record is linked. Right now the full amount is hitting this year’s profit.',
			action: 'Create the asset from this expense.',
		});
	}

	// -- Evidence ------------------------------------------------------------

	if (expense.attachmentIds.length === 0) {
		flags.push({
			severity: totals.reclaimableVat > 0 ? 'warning' : 'info',
			code: 'no_receipt',
			message:
				totals.reclaimableVat > 0
					? `You are reclaiming ${formatMoney(
							totals.reclaimableVat,
					  )} of VAT with no invoice attached.`
					: 'No receipt attached.',
			action: 'Attach the receipt or invoice.',
		});
	}

	if (
		category.id === 'other_business' &&
		expense.justification.trim().length < 10
	) {
		flags.push({
			severity: 'warning',
			code: 'unexplained_other',
			message:
				'"Other business costs" with no explanation is the first line an inspector asks about.',
			action: 'Write down what it was for and why it is a business cost.',
		});
	}

	// -- VAT-specific traps --------------------------------------------------

	if (
		category.vatDeductiblePercent === 0 &&
		expense.vatDeductiblePercent > 0
	) {
		flags.push({
			severity: 'error',
			code: 'vat_not_reclaimable',
			message: `VAT on ${category.label.toLowerCase()} is not reclaimable, but this expense reclaims ${
				expense.vatDeductiblePercent
			}% of it.`,
			action: 'Set the VAT-deductible percentage to 0.',
		});
	}

	if (
		category.profitDeductiblePercent === 0 &&
		expense.profitDeductiblePercent > 0
	) {
		flags.push({
			severity: 'error',
			code: 'cost_not_deductible',
			message: `${category.label} does not reduce taxable profit, but this expense deducts ${expense.profitDeductiblePercent}% of it.`,
			action: 'Set the profit-deductible percentage to 0, or change the category.',
		});
	}

	if (
		expense.vatTreatment === 'domestic' &&
		expense.vatCents === 0 &&
		expense.vatRate > 0
	) {
		flags.push({
			severity: 'warning',
			code: 'vat_rate_without_amount',
			message: `A ${expense.vatRate}% rate is set but the VAT amount is zero.`,
			action: 'Enter the VAT amount from the receipt, or set the rate to 0%.',
		});
	}

	if (
		expense.vatTreatment === 'domestic' &&
		expense.vatCents > 0 &&
		Math.abs(
			expense.vatCents -
				Math.round((expense.netCents * expense.vatRate) / 100),
		) > 200
	) {
		flags.push({
			severity: 'warning',
			code: 'vat_amount_mismatch',
			message: `The VAT amount does not match ${expense.vatRate}% of the net amount (off by more than €2).`,
			action: 'Check the figures against the receipt — mixed-rate receipts need splitting.',
		});
	}

	if (
		(expense.vatTreatment === 'eu_acquisition' ||
			expense.vatTreatment === 'import') &&
		expense.vatCents > 0
	) {
		flags.push({
			severity: 'info',
			code: 'reverse_charge_vat_entered',
			message:
				'For a reverse-charged purchase the supplier charges no VAT — the app computes the VAT you owe and deduct from the net amount.',
			action: 'The VAT amount you entered is ignored; you can clear it.',
		});
	}

	// -- Business use --------------------------------------------------------

	if (
		expense.businessUsePercent === 100 &&
		(category.id === 'phone_subscription' ||
			category.id === 'internet_home')
	) {
		flags.push({
			severity: 'info',
			code: 'full_business_use',
			message:
				'A phone or internet line claimed at 100% business use is hard to defend unless it is genuinely a second, business-only line.',
			action: 'Set a realistic business share.',
		});
	}

	if (expense.businessUsePercent === 0) {
		flags.push({
			severity: 'info',
			code: 'zero_business_use',
			message:
				'Business use is 0%, so this expense has no effect on anything.',
		});
	}

	// -- Category-specific ---------------------------------------------------

	if (category.id === 'mileage_private_car') {
		flags.push({
			severity: 'warning',
			code: 'mileage_via_log',
			message: `A privately-owned car is deducted at ${params.mileageAllowanceCentsPerKm} cents per business kilometre, not by its receipts. Booking fuel here on top of the mileage log is double-dipping.`,
			action: 'Log the trip in the Mileage section and delete this expense.',
		});
	}

	if (
		category.id === 'food_drink_business' &&
		expense.justification.trim().length < 5
	) {
		flags.push({
			severity: 'warning',
			code: 'entertainment_no_context',
			message:
				'Meals and entertaining need to show who was there and why. Without that this is private.',
			action: 'Note the client and the occasion.',
		});
	}

	if (category.id === 'workspace_home_qualifying') {
		flags.push({
			severity: 'warning',
			code: 'home_workspace_test',
			message:
				'A home workspace is only deductible if it could be rented out separately — own entrance and sanitation — and you earn most of your income there. Very few do.',
			action: 'If it is a room in your house, switch to the non-qualifying category.',
		});
	}

	// -- Timing --------------------------------------------------------------

	const expenseYear = Number(expense.date.slice(0, 4));
	if (expenseYear < settings.fiscal.firstYearOfBusiness) {
		flags.push({
			severity: 'warning',
			code: 'before_business_start',
			message: `This is dated before your first year of business (${settings.fiscal.firstYearOfBusiness}).`,
			action: 'Genuine pre-start costs are usually deductible in the first year — check the date and the treatment.',
		});
	}

	return flags;
}

export interface ExpenseReview {
	expense: Expense;
	flags: DeductionFlag[];
	worstSeverity: FlagSeverity | null;
}

const SEVERITY_ORDER: Record<FlagSeverity, number> = {
	info: 0,
	warning: 1,
	error: 2,
};

export function reviewAll(
	expenses: Expense[],
	categories: ExpenseCategory[],
	params: TaxYearParameters,
	settings: Settings,
): ExpenseReview[] {
	return expenses.map((expense) => {
		const category = categories.find(
			(candidate) => candidate.id === expense.categoryId,
		);
		const flags = reviewExpense(expense, category, params, settings);
		const worstSeverity = flags.reduce<FlagSeverity | null>(
			(worst, flag) => {
				if (!worst) return flag.severity;
				return SEVERITY_ORDER[flag.severity] > SEVERITY_ORDER[worst]
					? flag.severity
					: worst;
			},
			null,
		);
		return { expense, flags, worstSeverity };
	});
}

/** Suggest a category from free text — used by the receipt scanner and quick entry. */
export function suggestCategory(
	text: string,
	categories: ExpenseCategory[],
): ExpenseCategory | undefined {
	const haystack = text.toLowerCase();

	const keywords: Array<[string, string[]]> = [
		[
			'food_drink_business',
			[
				'restaurant',
				'cafe',
				'café',
				'lunch',
				'diner',
				'bar',
				'eetcafe',
				'catering',
				'starbucks',
				'coffee',
			],
		],
		[
			'public_transport',
			[
				'ns.nl',
				'ns groep',
				'ov-chipkaart',
				'gvb',
				'ret',
				'htm',
				'arriva',
				'train',
				'trein',
			],
		],
		[
			'flights',
			[
				'klm',
				'transavia',
				'easyjet',
				'ryanair',
				'airlines',
				'vueling',
				'lufthansa',
			],
		],
		['accommodation', ['hotel', 'booking.com', 'airbnb', 'hostel', 'b&b']],
		[
			'parking_tolls',
			['parking', 'parkeren', 'q-park', 'parkmobile', 'toll'],
		],
		[
			'software_subscriptions',
			[
				'adobe',
				'figma',
				'notion',
				'slack',
				'github',
				'jetbrains',
				'microsoft 365',
				'google workspace',
				'subscription',
				'saas',
			],
		],
		[
			'hosting_domains',
			[
				'aws',
				'amazon web services',
				'digitalocean',
				'hetzner',
				'transip',
				'vercel',
				'netlify',
				'cloudflare',
				'hosting',
				'domain',
			],
		],
		[
			'phone_subscription',
			[
				'kpn',
				'vodafone',
				't-mobile',
				'odido',
				'simyo',
				'lebara',
				'mobile',
				'telefoon',
			],
		],
		['internet_home', ['ziggo', 'internet', 'breedband', 'glasvezel']],
		[
			'office_supplies',
			['staples', 'bruna', 'office', 'kantoor', 'hema', 'action'],
		],
		[
			'equipment_small',
			[
				'coolblue',
				'mediamarkt',
				'bol.com',
				'apple',
				'laptop',
				'monitor',
				'keyboard',
				'toetsenbord',
			],
		],
		[
			'marketing_advertising',
			[
				'google ads',
				'meta platforms',
				'facebook',
				'linkedin ads',
				'advertis',
				'reclame',
			],
		],
		[
			'insurance_business',
			[
				'verzekering',
				'insurance',
				'aansprakelijkheid',
				'centraal beheer',
				'interpolis',
			],
		],
		[
			'bank_charges',
			['bunq', 'knab', 'rabobank', 'ing bank', 'abn amro', 'bankkosten'],
		],
		[
			'accountancy_legal',
			['accountant', 'boekhouder', 'notaris', 'advocaat', 'jurist'],
		],
		[
			'memberships',
			[
				'kvk',
				'kamer van koophandel',
				'lidmaatschap',
				'membership',
				'vereniging',
			],
		],
		[
			'professional_literature',
			['vakblad', 'o’reilly', 'manning', 'boekhandel', 'book'],
		],
		['fines', ['boete', 'fine', 'cjib', 'naheffing']],
	];

	for (const [categoryId, needles] of keywords) {
		if (needles.some((needle) => haystack.includes(needle))) {
			const match = categories.find(
				(candidate) => candidate.id === categoryId,
			);
			if (match) return match;
		}
	}

	return categories.find((candidate) => candidate.id === 'uncategorised');
}
