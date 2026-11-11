import { add, type Cents } from '@/core/money';
import {
	inRange,
	periodLabel,
	periodRange,
	vatFilingDeadline,
	type Period,
} from '@/core/dates';
import type { Expense, Invoice, Settings } from '@/domain/types';
import { expenseTotals, invoiceTotals, purchaseShiftsVatToBuyer } from './vat';

/**
 * Builds the Dutch BTW-aangifte ("omzetbelasting") for a period, box by box,
 * in the same order and with the same numbering as the Belastingdienst form.
 *
 * Boxes 3a/3b/3c carry turnover only — no VAT — because the tax is due in the
 * customer's country. Boxes 2a/4a/4b carry VAT the *buyer* owes; when that VAT
 * is also deductible it appears again in box 5b, netting to zero. Both legs
 * still have to be declared.
 */

export interface VatBox {
	code: string;
	label: string;
	/** Turnover (omzet) reported in the box, if any. */
	turnover: Cents | null;
	/** VAT (omzetbelasting) reported in the box, if any. */
	vat: Cents | null;
	/** Source records, so every figure can be drilled into. */
	sourceIds: string[];
}

export interface VatReturnAdjustments {
	/** Box 1d — VAT on private use of business goods, computed at year end. */
	privateUseVat: Cents;
	privateUseTurnover: Cents;
	/** Box 5b additions the app cannot derive (e.g. a correction from last period). */
	extraInputVat: Cents;
	extraInputVatNote: string;
}

export const EMPTY_ADJUSTMENTS: VatReturnAdjustments = {
	privateUseVat: 0,
	privateUseTurnover: 0,
	extraInputVat: 0,
	extraInputVatNote: '',
};

export interface VatReturnResult {
	period: Period;
	periodLabel: string;
	deadline: string;
	/** True when the KOR or an exempt scheme means no return is filed. */
	notApplicable: boolean;
	notApplicableReason: string;
	boxes: VatBox[];
	/** Box 5a — total VAT payable. */
	totalDue: Cents;
	/** Box 5b — deductible input VAT. */
	totalInputVat: Cents;
	/** Box 5c — the bottom line. Positive means you pay, negative means you reclaim. */
	balance: Cents;
	warnings: string[];
	invoiceCount: number;
	expenseCount: number;
}

function emptyBox(
	code: string,
	label: string,
	hasTurnover: boolean,
	hasVat: boolean,
): VatBox {
	return {
		code,
		label,
		turnover: hasTurnover ? 0 : null,
		vat: hasVat ? 0 : null,
		sourceIds: [],
	};
}

function credit(
	box: VatBox,
	turnover: Cents,
	vat: Cents,
	sourceId: string,
): void {
	if (box.turnover !== null) box.turnover += turnover;
	if (box.vat !== null) box.vat += vat;
	if (turnover !== 0 || vat !== 0) box.sourceIds.push(sourceId);
}

export function computeVatReturn(
	period: Period,
	invoices: Invoice[],
	expenses: Expense[],
	settings: Settings,
	adjustments: VatReturnAdjustments = EMPTY_ADJUSTMENTS,
): VatReturnResult {
	const range = periodRange(period);
	const warnings: string[] = [];

	const boxes: Record<string, VatBox> = {
		'1a': emptyBox(
			'1a',
			'Supplies/services taxed at the standard rate (21%)',
			true,
			true,
		),
		'1b': emptyBox(
			'1b',
			'Supplies/services taxed at the reduced rate (9%)',
			true,
			true,
		),
		'1c': emptyBox(
			'1c',
			'Supplies/services taxed at other rates, excluding 0%',
			true,
			true,
		),
		'1d': emptyBox(
			'1d',
			'Private use of business goods and services',
			true,
			true,
		),
		'1e': emptyBox(
			'1e',
			'Supplies/services taxed at 0% or not taxed at your end',
			true,
			false,
		),
		'2a': emptyBox(
			'2a',
			'Supplies/services where VAT was reverse-charged to you',
			true,
			true,
		),
		'3a': emptyBox(
			'3a',
			'Supplies to countries outside the EU (export)',
			true,
			false,
		),
		'3b': emptyBox(
			'3b',
			'Supplies to / services in countries inside the EU',
			true,
			false,
		),
		'3c': emptyBox(
			'3c',
			'Installation / distance sales within the EU',
			true,
			false,
		),
		'4a': emptyBox(
			'4a',
			'Supplies/services from countries outside the EU',
			true,
			true,
		),
		'4b': emptyBox(
			'4b',
			'Supplies/services from countries inside the EU',
			true,
			true,
		),
	};

	if (settings.fiscal.vatScheme === 'kor') {
		return {
			period,
			periodLabel: periodLabel(period),
			deadline: vatFilingDeadline(period),
			notApplicable: true,
			notApplicableReason:
				'You are registered under the small-business scheme (KOR). You do not charge BTW, ' +
				'you cannot reclaim input VAT, and you do not file periodic returns. ' +
				'Watch your turnover: passing the ceiling ends the exemption mid-year.',
			boxes: Object.values(boxes),
			totalDue: 0,
			totalInputVat: 0,
			balance: 0,
			warnings: [],
			invoiceCount: 0,
			expenseCount: 0,
		};
	}

	// -- Sales ---------------------------------------------------------------

	const periodInvoices = invoices.filter(
		(invoice) =>
			invoice.status !== 'draft' &&
			invoice.status !== 'cancelled' &&
			inRange(invoice.issueDate, range),
	);

	for (const invoice of periodInvoices) {
		const totals = invoiceTotals(invoice);

		switch (invoice.vatTreatment) {
			case 'domestic': {
				for (const [rateKey, net] of Object.entries(totals.netByRate)) {
					const rate = Number(rateKey);
					const vat = totals.vatByRate[rate] ?? 0;
					if (rate === 21)
						credit(boxes['1a'] as VatBox, net, vat, invoice.id);
					else if (rate === 9)
						credit(boxes['1b'] as VatBox, net, vat, invoice.id);
					else if (rate === 0)
						credit(boxes['1e'] as VatBox, net, 0, invoice.id);
					else credit(boxes['1c'] as VatBox, net, vat, invoice.id);
				}
				break;
			}
			case 'reverse_charge_domestic':
				credit(boxes['1e'] as VatBox, totals.net, 0, invoice.id);
				break;
			case 'eu_goods':
			case 'eu_services':
				credit(boxes['3b'] as VatBox, totals.net, 0, invoice.id);
				if (!invoice.contactSnapshot.vatId.trim()) {
					warnings.push(
						`Invoice ${invoice.number} is reverse-charged to an EU business but has no customer VAT ID. Without one the reverse charge does not hold and you owe the Dutch VAT yourself.`,
					);
				}
				break;
			case 'eu_distance_sale':
				credit(boxes['3c'] as VatBox, totals.net, 0, invoice.id);
				warnings.push(
					`Invoice ${invoice.number} is a distance sale within the EU. Above the EU-wide threshold this is normally reported through the One Stop Shop, not this return.`,
				);
				break;
			case 'export':
				credit(boxes['3a'] as VatBox, totals.net, 0, invoice.id);
				break;
			case 'exempt':
				// Exempt turnover is not reported in the return at all.
				break;
			case 'kor':
				warnings.push(
					`Invoice ${invoice.number} is marked as KOR but your business is not on the KOR scheme.`,
				);
				break;
			default:
				break;
		}
	}

	// -- Purchases -----------------------------------------------------------

	const periodExpenses = expenses.filter(
		(expense) =>
			expense.status !== 'excluded' && inRange(expense.date, range),
	);

	let inputVat = 0;

	for (const expense of periodExpenses) {
		const totals = expenseTotals(expense);
		inputVat += totals.reclaimableVat;

		if (!purchaseShiftsVatToBuyer(expense.vatTreatment)) continue;

		const box =
			expense.vatTreatment === 'reverse_charge_domestic'
				? boxes['2a']
				: expense.vatTreatment === 'eu_acquisition'
				? boxes['4b']
				: boxes['4a'];
		credit(box as VatBox, totals.net, totals.dueVat, expense.id);
	}

	// -- Adjustments ---------------------------------------------------------

	credit(
		boxes['1d'] as VatBox,
		adjustments.privateUseTurnover,
		adjustments.privateUseVat,
		'adjustment',
	);
	inputVat += adjustments.extraInputVat;

	// -- Totals --------------------------------------------------------------

	const ordered = [
		'1a',
		'1b',
		'1c',
		'1d',
		'1e',
		'2a',
		'3a',
		'3b',
		'3c',
		'4a',
		'4b',
	].map((code) => boxes[code] as VatBox);

	const totalDue = add(...ordered.map((box) => box.vat ?? 0));
	const balance = totalDue - inputVat;

	// -- Sanity checks -------------------------------------------------------

	const unreviewed = periodExpenses.filter(
		(expense) => expense.status === 'unreviewed',
	);
	if (unreviewed.length > 0) {
		warnings.push(
			`${unreviewed.length} expense${
				unreviewed.length === 1 ? '' : 's'
			} in this period ${
				unreviewed.length === 1 ? 'is' : 'are'
			} still unreviewed. They are included in the figures above — check them before you file.`,
		);
	}

	const missingAttachments = periodExpenses.filter(
		(expense) => expense.attachmentIds.length === 0 && expense.vatCents > 0,
	);
	if (missingAttachments.length > 0) {
		warnings.push(
			`${missingAttachments.length} expense${
				missingAttachments.length === 1 ? '' : 's'
			} with reclaimed VAT ${
				missingAttachments.length === 1 ? 'has' : 'have'
			} no receipt attached. You need the invoice to support the deduction.`,
		);
	}

	const drafts = invoices.filter(
		(invoice) =>
			invoice.status === 'draft' && inRange(invoice.issueDate, range),
	);
	if (drafts.length > 0) {
		warnings.push(
			`${drafts.length} invoice${
				drafts.length === 1 ? '' : 's'
			} dated in this period ${
				drafts.length === 1 ? 'is' : 'are'
			} still a draft and ${
				drafts.length === 1 ? 'is' : 'are'
			} excluded. VAT is due on the invoice date, not the payment date.`,
		);
	}

	return {
		period,
		periodLabel: periodLabel(period),
		deadline: vatFilingDeadline(period),
		notApplicable: false,
		notApplicableReason: '',
		boxes: ordered,
		totalDue,
		totalInputVat: inputVat,
		balance,
		warnings,
		invoiceCount: periodInvoices.length,
		expenseCount: periodExpenses.length,
	};
}
