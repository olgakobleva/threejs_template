/** Minimal RFC-4180 CSV reader/writer — used for bank imports and exports. */

export type CsvRow = Record<string, string>;

export function detectDelimiter(text: string): string {
	const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
	const candidates = [',', ';', '\t', '|'];
	let best = ',';
	let bestCount = -1;
	for (const candidate of candidates) {
		const count = firstLine.split(candidate).length - 1;
		if (count > bestCount) {
			best = candidate;
			bestCount = count;
		}
	}
	return best;
}

export function parseCsv(
	text: string,
	delimiter = detectDelimiter(text),
): CsvRow[] {
	const table = parseCsvTable(text, delimiter);
	const [header, ...rows] = table;
	if (!header) return [];

	const keys = header.map(
		(key, index) => key.trim() || `column_${index + 1}`,
	);
	return rows
		.filter((row) => row.some((cell) => cell.trim() !== ''))
		.map((row) => {
			const record: CsvRow = {};
			keys.forEach((key, index) => {
				record[key] = (row[index] ?? '').trim();
			});
			return record;
		});
}

export function parseCsvTable(
	text: string,
	delimiter = detectDelimiter(text),
): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;

	const source = text.replace(/^﻿/, '');

	for (let i = 0; i < source.length; i += 1) {
		const char = source[i];

		if (inQuotes) {
			if (char === '"') {
				if (source[i + 1] === '"') {
					field += '"';
					i += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
		} else if (char === delimiter) {
			row.push(field);
			field = '';
		} else if (char === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else if (char !== '\r') {
			field += char;
		}
	}

	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows;
}

export function toCsv(
	rows: Array<Record<string, string | number>>,
	delimiter = ',',
): string {
	if (rows.length === 0) return '';
	const keys = Object.keys(rows[0] as Record<string, unknown>);
	const escape = (value: string | number): string => {
		const text = String(value ?? '');
		return /["\n\r]|^\s|\s$/.test(text) || text.includes(delimiter)
			? `"${text.replace(/"/g, '""')}"`
			: text;
	};
	const lines = [keys.join(delimiter)];
	for (const row of rows) {
		lines.push(keys.map((key) => escape(row[key] ?? '')).join(delimiter));
	}
	return lines.join('\r\n');
}

export function downloadFile(
	filename: string,
	content: BlobPart,
	mimeType: string,
): void {
	const blob =
		content instanceof Blob
			? content
			: new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
