import { inRange, periodLabel, periodRange, type Period } from '@/core/dates';
import type { Cents } from '@/core/money';
import type { Invoice } from '@/domain/types';
import { goesToIcp, invoiceTotals } from './vat';

/**
 * ICP declaration (Opgaaf intracommunautaire prestaties).
 *
 * Every reverse-charged supply to a business in another EU member state has to
 * be listed here, per customer VAT number, split into goods and services. The
 * total must reconcile with box 3b of the BTW return — the Belastingdienst
 * cross-checks them and a mismatch generates a query.
 */

export interface IcpLine {
	vatId: string;
	customerName: string;
	countryCode: string;
	goodsCents: Cents;
	servicesCents: Cents;
	invoiceIds: string[];
}

export interface IcpResult {
	period: Period;
	periodLabel: string;
	lines: IcpLine[];
	totalCents: Cents;
	warnings: string[];
}

function countryFromVatId(vatId: string): string {
	return vatId.trim().slice(0, 2).toUpperCase();
}

export function computeIcp(period: Period, invoices: Invoice[]): IcpResult {
	const range = periodRange(period);
	const warnings: string[] = [];
	const byVatId = new Map<string, IcpLine>();

	const relevant = invoices.filter(
		(invoice) =>
			invoice.status !== 'draft' &&
			invoice.status !== 'cancelled' &&
			goesToIcp(invoice.vatTreatment) &&
			inRange(invoice.issueDate, range),
	);

	for (const invoice of relevant) {
		const vatId = invoice.contactSnapshot.vatId
			.replace(/[\s.]/g, '')
			.toUpperCase();

		if (!vatId) {
			warnings.push(
				`Invoice ${invoice.number} to ${
					invoice.contactSnapshot.name || 'an unnamed customer'
				} has no VAT ID and cannot be listed. Either obtain the number or charge Dutch VAT.`,
			);
			continue;
		}

		if (vatId.startsWith('NL')) {
			warnings.push(
				`Invoice ${invoice.number} carries a Dutch VAT ID but is booked as an intra-EU supply. A Dutch customer belongs in box 1a/1b or, for subcontracting, 1e.`,
			);
		}

		const { net } = invoiceTotals(invoice);
		const existing = byVatId.get(vatId) ?? {
			vatId,
			customerName: invoice.contactSnapshot.name,
			countryCode: countryFromVatId(vatId),
			goodsCents: 0,
			servicesCents: 0,
			invoiceIds: [],
		};

		if (invoice.vatTreatment === 'eu_goods') existing.goodsCents += net;
		else existing.servicesCents += net;
		existing.invoiceIds.push(invoice.id);

		byVatId.set(vatId, existing);
	}

	const lines = [...byVatId.values()].sort((a, b) =>
		a.vatId.localeCompare(b.vatId),
	);
	const totalCents = lines.reduce(
		(sum, line) => sum + line.goodsCents + line.servicesCents,
		0,
	);

	return {
		period,
		periodLabel: periodLabel(period),
		lines,
		totalCents,
		warnings,
	};
}

/** Cross-check against box 3b of the same period's BTW return. */
export function reconcileWithBox3b(
	icp: IcpResult,
	box3bTurnover: Cents,
): string | null {
	if (icp.totalCents === box3bTurnover) return null;
	return `ICP total and box 3b do not match (${icp.totalCents / 100} vs ${
		box3bTurnover / 100
	}). The Belastingdienst compares these automatically — resolve the difference before filing.`;
}
