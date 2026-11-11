import { add, multiply, percentOf, roundCents, type Cents } from '@/core/money';
import type {
	Invoice,
	InvoiceLine,
	Expense,
	SalesVatTreatment,
	PurchaseVatTreatment,
	VatRate,
} from '@/domain/types';

// ---------------------------------------------------------------------------
// Invoice arithmetic
// ---------------------------------------------------------------------------

export interface LineTotals {
	net: Cents;
	vat: Cents;
	gross: Cents;
	vatRate: VatRate;
}

/**
 * A line's own net amount, before the invoice-level VAT treatment is applied.
 * Quantity is a float (hours, kilos), so the multiplication rounds once, here.
 */
export function lineNet(line: InvoiceLine): Cents {
	const gross = roundCents(line.unitPriceCents * line.quantity);
	const discount = percentOf(gross, line.discountPercent);
	return gross - discount;
}

/**
 * The effective VAT rate for a line. When the invoice as a whole is
 * reverse-charged, exported or under the KOR, no VAT is charged regardless of
 * what rate the line carries.
 */
export function effectiveVatRate(
	line: InvoiceLine,
	treatment: SalesVatTreatment,
): VatRate {
	switch (treatment) {
		case 'domestic':
			return line.vatRate;
		case 'reverse_charge_domestic':
		case 'eu_goods':
		case 'eu_services':
		case 'export':
		case 'exempt':
		case 'kor':
			return 0;
		case 'eu_distance_sale':
			// The rate of the customer's country applies; we keep the line rate
			// and rely on the user to set it, but flag it in validation.
			return line.vatRate;
		default:
			return line.vatRate;
	}
}

export function lineTotals(
	line: InvoiceLine,
	treatment: SalesVatTreatment,
): LineTotals {
	const net = lineNet(line);
	const rate = effectiveVatRate(line, treatment);
	const vat = percentOf(net, rate);
	return { net, vat, gross: net + vat, vatRate: rate };
}

export interface InvoiceTotals {
	net: Cents;
	vat: Cents;
	gross: Cents;
	/** Net amount per effective VAT rate — needed for boxes 1a and 1b. */
	netByRate: Record<number, Cents>;
	vatByRate: Record<number, Cents>;
	paid: Cents;
	outstanding: Cents;
}

export function invoiceTotals(invoice: Invoice): InvoiceTotals {
	const netByRate: Record<number, Cents> = {};
	const vatByRate: Record<number, Cents> = {};
	let net = 0;
	let vat = 0;

	for (const line of invoice.lines) {
		const totals = lineTotals(line, invoice.vatTreatment);
		net += totals.net;
		vat += totals.vat;
		netByRate[totals.vatRate] =
			(netByRate[totals.vatRate] ?? 0) + totals.net;
		vatByRate[totals.vatRate] =
			(vatByRate[totals.vatRate] ?? 0) + totals.vat;
	}

	const paid = add(...invoice.payments.map((payment) => payment.amountCents));
	const gross = net + vat;

	return {
		net,
		vat,
		gross,
		netByRate,
		vatByRate,
		paid,
		outstanding: gross - paid,
	};
}

export function isOverdue(invoice: Invoice, asOf: string): boolean {
	if (
		invoice.status === 'paid' ||
		invoice.status === 'cancelled' ||
		invoice.status === 'draft'
	) {
		return false;
	}
	return invoice.dueDate < asOf && invoiceTotals(invoice).outstanding > 0;
}

// ---------------------------------------------------------------------------
// Expense arithmetic
// ---------------------------------------------------------------------------

export interface ExpenseTotals {
	/** Full net amount as invoiced. */
	net: Cents;
	/** Full VAT amount as invoiced. */
	vat: Cents;
	gross: Cents;
	/** Net amount attributable to the business (after business-use share). */
	businessNet: Cents;
	/** Portion of the cost that actually reduces taxable profit. */
	deductibleCost: Cents;
	/** Portion of the VAT that may be reclaimed as voorbelasting. */
	reclaimableVat: Cents;
	/**
	 * VAT the business owes because it was reverse-charged to it. Equal and
	 * opposite to the reclaimable side when fully deductible, but both legs
	 * still have to appear in the return.
	 */
	dueVat: Cents;
}

/**
 * VAT that a purchase makes payable by the buyer, rather than the seller.
 * These are the boxes 2a / 4a / 4b legs of the return.
 */
export function purchaseShiftsVatToBuyer(
	treatment: PurchaseVatTreatment,
): boolean {
	return (
		treatment === 'reverse_charge_domestic' ||
		treatment === 'eu_acquisition' ||
		treatment === 'import'
	);
}

export function expenseTotals(expense: Expense): ExpenseTotals {
	const businessShare = expense.businessUsePercent / 100;

	const net = expense.netCents;
	const vat = purchaseShiftsVatToBuyer(expense.vatTreatment)
		? percentOf(expense.netCents, expense.vatRate)
		: expense.vatCents;

	const businessNet = multiply(net, businessShare);
	const businessVat = multiply(vat, businessShare);

	const excluded = expense.status === 'excluded';

	const deductibleCost = excluded
		? 0
		: percentOf(businessNet, expense.profitDeductiblePercent);
	const reclaimableVat = excluded
		? 0
		: percentOf(businessVat, expense.vatDeductiblePercent);
	const dueVat =
		excluded || !purchaseShiftsVatToBuyer(expense.vatTreatment) ? 0 : vat;

	return {
		net,
		vat,
		gross: net + vat,
		businessNet,
		deductibleCost,
		reclaimableVat,
		dueVat,
	};
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const SALES_TREATMENT_LABELS: Record<SalesVatTreatment, string> = {
	domestic: 'Dutch customer — charge BTW',
	reverse_charge_domestic:
		'Dutch customer — VAT reverse-charged (btw verlegd)',
	eu_goods: 'EU business — goods (0%, reverse charge)',
	eu_services: 'EU business — services (0%, reverse charge)',
	eu_distance_sale: 'EU consumer — distance sale / installation',
	export: 'Outside the EU — export (0%)',
	exempt: 'VAT-exempt activity (vrijgesteld)',
	kor: 'Small-business scheme (KOR) — no VAT',
};

export const PURCHASE_TREATMENT_LABELS: Record<PurchaseVatTreatment, string> = {
	domestic: 'Dutch supplier charged BTW',
	reverse_charge_domestic: 'Dutch supplier reverse-charged VAT to me',
	eu_acquisition: 'Supplier in another EU country',
	import: 'Supplier outside the EU',
	no_vat: 'No VAT on this purchase',
};

/** Treatments that require the customer's VAT ID on the invoice. */
export function requiresCustomerVatId(treatment: SalesVatTreatment): boolean {
	return (
		treatment === 'eu_goods' ||
		treatment === 'eu_services' ||
		treatment === 'reverse_charge_domestic'
	);
}

/** Treatments that must be listed in the ICP declaration. */
export function goesToIcp(treatment: SalesVatTreatment): boolean {
	return treatment === 'eu_goods' || treatment === 'eu_services';
}

export function reverseChargeNoteFor(
	treatment: SalesVatTreatment,
): string | null {
	switch (treatment) {
		case 'reverse_charge_domestic':
			return 'BTW verlegd — VAT reverse-charged.';
		case 'eu_goods':
			return 'Intra-Community supply — VAT reverse-charged to the recipient (art. 138 EU VAT Directive).';
		case 'eu_services':
			return 'VAT reverse-charged to the recipient (art. 196 EU VAT Directive).';
		case 'export':
			return 'Export outside the EU — 0% VAT.';
		case 'exempt':
			return 'Exempt from VAT (vrijgesteld van btw).';
		case 'kor':
			return 'No VAT charged — small business scheme (kleineondernemersregeling).';
		default:
			return null;
	}
}
