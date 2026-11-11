/**
 * All monetary amounts in the app are integer euro cents. Never floats — a
 * VAT return that is one cent off is a VAT return that has to be corrected.
 */

export type Cents = number;

export const ZERO: Cents = 0;

/** Round half away from zero, which is what the Belastingdienst forms assume. */
export function roundCents(value: number): Cents {
	return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function add(...values: Cents[]): Cents {
	return values.reduce((total, value) => total + value, 0);
}

export function multiply(amount: Cents, factor: number): Cents {
	return roundCents(amount * factor);
}

/** Apply a percentage (e.g. 21 for 21%) to an amount. */
export function percentOf(amount: Cents, percent: number): Cents {
	return roundCents((amount * percent) / 100);
}

/** Split a gross (incl. VAT) amount into net and VAT at the given rate. */
export function splitGross(
	gross: Cents,
	ratePercent: number,
): { net: Cents; vat: Cents } {
	if (ratePercent === 0) return { net: gross, vat: 0 };
	const net = roundCents((gross * 100) / (100 + ratePercent));
	return { net, vat: gross - net };
}

/** Parse free-form user input ("1.234,56", "1234.56", "€ 12,-") into cents. */
export function parseAmount(input: string): Cents | null {
	const cleaned = input.replace(/[^\d,.\-]/g, '').trim();
	if (cleaned === '' || cleaned === '-') return null;

	const lastComma = cleaned.lastIndexOf(',');
	const lastDot = cleaned.lastIndexOf('.');
	let normalised: string;

	if (lastComma > lastDot) {
		// Dutch style: 1.234,56
		normalised = cleaned.replace(/\./g, '').replace(',', '.');
	} else if (lastDot > lastComma) {
		// English style: 1,234.56
		normalised = cleaned.replace(/,/g, '');
	} else {
		normalised = cleaned;
	}

	const value = Number.parseFloat(normalised);
	if (!Number.isFinite(value)) return null;
	return roundCents(value * 100);
}

const eurFormatter = new Intl.NumberFormat('en-IE', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatMoney(cents: Cents): string {
	return eurFormatter.format(cents / 100);
}

/** Plain "1234.56" — for CSV export and form inputs, never for display. */
export function toDecimalString(cents: Cents): string {
	const sign = cents < 0 ? '-' : '';
	const abs = Math.abs(cents);
	return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(
		2,
		'0',
	)}`;
}
