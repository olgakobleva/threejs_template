/** Dates are stored as plain `YYYY-MM-DD` strings — no timezone surprises. */

export type ISODate = string;

export function today(): ISODate {
	return toISODate(new Date());
}

export function toISODate(date: Date): ISODate {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function fromISODate(value: ISODate): Date {
	const [y, m, d] = value.split('-').map(Number);
	return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isValidISODate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = fromISODate(value);
	return toISODate(date) === value;
}

export function addDays(value: ISODate, days: number): ISODate {
	const date = fromISODate(value);
	date.setDate(date.getDate() + days);
	return toISODate(date);
}

export function addMonths(value: ISODate, months: number): ISODate {
	const date = fromISODate(value);
	const targetDay = date.getDate();
	date.setDate(1);
	date.setMonth(date.getMonth() + months);
	const lastDay = new Date(
		date.getFullYear(),
		date.getMonth() + 1,
		0,
	).getDate();
	date.setDate(Math.min(targetDay, lastDay));
	return toISODate(date);
}

export function yearOf(value: ISODate): number {
	return Number(value.slice(0, 4));
}

export function monthOf(value: ISODate): number {
	return Number(value.slice(5, 7));
}

export function quarterOf(value: ISODate): 1 | 2 | 3 | 4 {
	return (Math.floor((monthOf(value) - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}

export function daysBetween(from: ISODate, to: ISODate): number {
	const ms = fromISODate(to).getTime() - fromISODate(from).getTime();
	return Math.round(ms / 86_400_000);
}

// ---------------------------------------------------------------------------
// Reporting periods
// ---------------------------------------------------------------------------

export type PeriodKind = 'month' | 'quarter' | 'year';

export interface Period {
	kind: PeriodKind;
	year: number;
	/** 1-12 for months, 1-4 for quarters, undefined for a full year. */
	index?: number;
}

export interface DateRange {
	start: ISODate;
	end: ISODate;
}

export function periodKey(period: Period): string {
	if (period.kind === 'year') return `${period.year}`;
	if (period.kind === 'quarter') return `${period.year}-Q${period.index}`;
	return `${period.year}-${String(period.index).padStart(2, '0')}`;
}

export function parsePeriodKey(key: string): Period {
	const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(key);
	if (quarterMatch) {
		return {
			kind: 'quarter',
			year: Number(quarterMatch[1]),
			index: Number(quarterMatch[2]),
		};
	}
	const monthMatch = /^(\d{4})-(\d{2})$/.exec(key);
	if (monthMatch) {
		return {
			kind: 'month',
			year: Number(monthMatch[1]),
			index: Number(monthMatch[2]),
		};
	}
	return { kind: 'year', year: Number(key) };
}

export function periodLabel(period: Period): string {
	if (period.kind === 'year') return `${period.year}`;
	if (period.kind === 'quarter') return `Q${period.index} ${period.year}`;
	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];
	return `${monthNames[(period.index ?? 1) - 1]} ${period.year}`;
}

export function periodRange(period: Period): DateRange {
	if (period.kind === 'year') {
		return { start: `${period.year}-01-01`, end: `${period.year}-12-31` };
	}
	if (period.kind === 'quarter') {
		const startMonth = ((period.index ?? 1) - 1) * 3 + 1;
		const endMonth = startMonth + 2;
		return {
			start: `${period.year}-${String(startMonth).padStart(2, '0')}-01`,
			end: lastDayOfMonth(period.year, endMonth),
		};
	}
	const month = period.index ?? 1;
	return {
		start: `${period.year}-${String(month).padStart(2, '0')}-01`,
		end: lastDayOfMonth(period.year, month),
	};
}

export function lastDayOfMonth(year: number, month: number): ISODate {
	const date = new Date(year, month, 0);
	return toISODate(date);
}

export function inRange(value: ISODate, range: DateRange): boolean {
	return value >= range.start && value <= range.end;
}

export function currentPeriod(
	kind: PeriodKind,
	reference: ISODate = today(),
): Period {
	const year = yearOf(reference);
	if (kind === 'year') return { kind, year };
	if (kind === 'quarter') return { kind, year, index: quarterOf(reference) };
	return { kind, year, index: monthOf(reference) };
}

export function previousPeriod(period: Period): Period {
	if (period.kind === 'year') return { kind: 'year', year: period.year - 1 };
	const index = period.index ?? 1;
	const max = period.kind === 'quarter' ? 4 : 12;
	if (index > 1) return { ...period, index: index - 1 };
	return { ...period, year: period.year - 1, index: max };
}

export function nextPeriod(period: Period): Period {
	if (period.kind === 'year') return { kind: 'year', year: period.year + 1 };
	const index = period.index ?? 1;
	const max = period.kind === 'quarter' ? 4 : 12;
	if (index < max) return { ...period, index: index + 1 };
	return { ...period, year: period.year + 1, index: 1 };
}

/**
 * Statutory filing deadline: the BTW return for a period is due by the last
 * day of the month following that period.
 */
export function vatFilingDeadline(period: Period): ISODate {
	const { end } = periodRange(period);
	const endDate = fromISODate(end);
	return lastDayOfMonth(endDate.getFullYear(), endDate.getMonth() + 2);
}

export function formatDate(value: ISODate): string {
	if (!isValidISODate(value)) return value;
	return fromISODate(value).toLocaleDateString('en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}
