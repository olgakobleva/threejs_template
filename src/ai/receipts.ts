import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type Anthropic from '@anthropic-ai/sdk';
import type {
	AiSettings,
	Expense,
	ExpenseCategory,
	PurchaseVatTreatment,
	VatRate,
} from '@/domain/types';
import { newExpense } from '@/domain/defaults';
import { blobToDataUrl, base64Payload } from '@/storage/IdbDataStore';
import { isValidISODate, today } from '@/core/dates';
import { roundCents, splitGross } from '@/core/money';
import { suggestCategory } from '@/tax/nl/deductibility';
import {
	createClient,
	estimatedCostUsd,
	refusalFallbackParams,
	REFUSAL_MESSAGE,
	servedByFallback,
} from './client';

/**
 * Receipt scanning: a photo or PDF in, a filled-in expense out.
 *
 * The model reads the document and returns structured fields. It does NOT
 * decide the tax treatment — deductibility comes from the category rules in
 * `tax/nl/categories.ts`, which are deterministic and auditable. The model's
 * job is transcription plus a category suggestion, and everything it returns
 * lands in a form you review before saving.
 */

const ReceiptSchema = z.object({
	supplier_name: z
		.string()
		.describe('Trading name of the supplier as printed on the document'),
	supplier_vat_id: z
		.string()
		.describe(
			'Supplier VAT/BTW number if printed, otherwise an empty string',
		),
	supplier_country: z
		.string()
		.describe(
			'ISO-3166 alpha-2 country code of the supplier, e.g. NL, DE, US. Empty if unclear',
		),
	document_date: z
		.string()
		.describe(
			'Date on the document in YYYY-MM-DD format. Empty string if not readable',
		),
	description: z
		.string()
		.describe('One short line describing what was bought'),
	currency: z.string().describe('ISO currency code, e.g. EUR'),
	total_incl_vat: z
		.number()
		.describe(
			'Grand total including VAT, as a decimal number in the document currency',
		),
	total_excl_vat: z
		.number()
		.describe(
			'Total excluding VAT as a decimal number, or 0 if the document does not state it',
		),
	vat_amount: z
		.number()
		.describe('VAT amount as a decimal number, or 0 if no VAT is stated'),
	vat_rate_percent: z
		.number()
		.describe(
			'The VAT rate applied: 21, 9 or 0. Use 0 when no VAT is charged',
		),
	has_multiple_vat_rates: z
		.boolean()
		.describe('True if the document mixes several VAT rates'),
	vat_reverse_charged: z
		.boolean()
		.describe(
			'True if the document says VAT is reverse-charged / btw verlegd / VAT shifted to the recipient',
		),
	payment_method: z
		.string()
		.describe('Card, cash, iDEAL, bank transfer… Empty if unclear'),
	line_item_summary: z
		.string()
		.describe(
			'Up to three notable line items, comma separated. Empty if not itemised',
		),
	suggested_category: z
		.string()
		.describe(
			'One category id from the provided list that best fits this purchase',
		),
	is_likely_private: z
		.boolean()
		.describe(
			'True if this looks like personal spending rather than a business cost',
		),
	confidence: z
		.number()
		.describe('Your confidence in the extracted figures, from 0 to 1'),
	warnings: z
		.array(z.string())
		.describe('Anything unreadable, ambiguous, or worth a human check'),
});

export type ReceiptExtraction = z.infer<typeof ReceiptSchema>;

function systemPrompt(categories: ExpenseCategory[]): string {
	const catalogue = categories
		.filter((category) => category.id !== 'uncategorised')
		.map((category) => `- ${category.id}: ${category.label}`)
		.join('\n');

	return `You transcribe purchase receipts and invoices for a Dutch sole trader's bookkeeping.

Read the document and report exactly what it says. Do not estimate, infer, or
tidy up figures. If a number is not printed on the document, return 0 and say so
in warnings rather than deriving it — the app can derive net from gross itself,
and a derived number that looks transcribed is worse than an obvious gap.

Amounts are decimal numbers in the document's own currency, not cents, and not
formatted. Dutch documents write 1.234,56 for one thousand two hundred
thirty-four euro and fifty-six cents; report that as 1234.56.

Dutch receipts label VAT as "BTW". A reverse charge appears as "btw verlegd",
"VAT reverse charged", or "VAT shifted to recipient". Standard rate is 21%,
reduced is 9% (food, books, transport, hotels), and some supplies are 0% or
exempt ("vrijgesteld").

For suggested_category, pick the single best id from this list:
${catalogue}

If nothing fits, use other_business. Judge the category from what was bought,
not from how the business might want it treated.

Set is_likely_private to true for things a person buys for themselves —
groceries, personal clothing, medical costs, entertainment with no business
context. Being wrong in that direction is cheap; the user sees your answer
before anything is saved.`;
}

export interface ScanResult {
	extraction: ReceiptExtraction;
	expense: Expense;
	/** Model-reported plus locally-derived problems. */
	warnings: string[];
	usage: {
		inputTokens: number;
		outputTokens: number;
		estimatedCostUsd: number;
	};
}

function documentBlock(
	dataUrl: string,
	mimeType: string,
): Anthropic.Beta.BetaContentBlockParam {
	const data = base64Payload(dataUrl);

	if (mimeType === 'application/pdf') {
		return {
			type: 'document',
			source: { type: 'base64', media_type: 'application/pdf', data },
		};
	}

	const supported = [
		'image/png',
		'image/jpeg',
		'image/gif',
		'image/webp',
	] as const;
	type SupportedImage = (typeof supported)[number];
	const mediaType: SupportedImage = (supported as readonly string[]).includes(
		mimeType,
	)
		? (mimeType as SupportedImage)
		: 'image/jpeg';

	return {
		type: 'image',
		source: { type: 'base64', media_type: mediaType, data },
	};
}

export async function scanReceipt(
	file: Blob,
	filename: string,
	aiSettings: AiSettings,
	categories: ExpenseCategory[],
): Promise<ScanResult> {
	const client = createClient(aiSettings);
	const dataUrl = await blobToDataUrl(file);

	// `thinking` is deliberately omitted rather than configured. Fable 5 thinks
	// unconditionally and rejects any explicit setting; the other selectable
	// models are fine with the default. Depth is steered with `effort` instead,
	// and transcription is the kind of task where "low" is genuinely enough —
	// on Fable it still beats older models working much harder.
	const response = await client.beta.messages.parse({
		model: aiSettings.model,
		max_tokens: 4000,
		system: systemPrompt(categories),
		output_config: {
			effort: 'low',
			format: betaZodOutputFormat(ReceiptSchema),
		},
		...refusalFallbackParams(aiSettings.model),
		messages: [
			{
				role: 'user',
				content: [
					documentBlock(dataUrl, file.type),
					{
						type: 'text',
						text: `Transcribe this document (${filename}) into the receipt schema.`,
					},
				],
			},
		],
	});

	// A refusal comes back as a successful response, not an exception, so it has
	// to be checked before reading the content.
	if (response.stop_reason === 'refusal') {
		throw new Error(REFUSAL_MESSAGE);
	}

	const extraction = response.parsed_output;
	if (!extraction) {
		throw new Error(
			'Claude could not produce a structured reading of this document.',
		);
	}

	const { expense, warnings } = toExpense(extraction, categories);

	if (servedByFallback(response.usage)) {
		warnings.push(
			'The selected model declined this document and a fallback model read it instead. The figures are worth a closer look than usual.',
		);
	}

	return {
		extraction,
		expense,
		warnings,
		usage: {
			inputTokens: response.usage.input_tokens,
			outputTokens: response.usage.output_tokens,
			estimatedCostUsd: estimatedCostUsd(
				response.model ?? aiSettings.model,
				response.usage.input_tokens,
				response.usage.output_tokens,
			),
		},
	};
}

/**
 * Turn the model's transcription into a draft expense, applying the category
 * defaults locally. Anything the model was unsure about becomes a warning
 * rather than a silently-filled field.
 */
export function toExpense(
	extraction: ReceiptExtraction,
	categories: ExpenseCategory[],
): { expense: Expense; warnings: string[] } {
	const warnings = [...extraction.warnings];

	const date =
		extraction.document_date && isValidISODate(extraction.document_date)
			? extraction.document_date
			: today();
	if (date !== extraction.document_date) {
		warnings.push(
			'No readable date on the document — today’s date was used. Correct it before saving.',
		);
	}

	if (extraction.currency && extraction.currency.toUpperCase() !== 'EUR') {
		warnings.push(
			`The document is in ${extraction.currency.toUpperCase()}. The amounts were taken as printed and NOT converted — enter the euro amounts from your bank statement.`,
		);
	}

	if (extraction.has_multiple_vat_rates) {
		warnings.push(
			'This receipt mixes several VAT rates. Split it into one expense per rate, otherwise the BTW return will be wrong.',
		);
	}

	if (extraction.is_likely_private) {
		warnings.push(
			'This looks like personal spending. If it is, mark the expense as excluded rather than deleting it — you keep the record without it affecting the books.',
		);
	}

	// Prefer the printed figures; fall back to deriving net from gross.
	const grossCents = roundCents(extraction.total_incl_vat * 100);
	const statedNet = roundCents(extraction.total_excl_vat * 100);
	const statedVat = roundCents(extraction.vat_amount * 100);

	const rate = ([21, 9, 0] as const).includes(
		extraction.vat_rate_percent as VatRate,
	)
		? (extraction.vat_rate_percent as VatRate)
		: 21;

	let netCents = statedNet;
	let vatCents = statedVat;

	if (netCents === 0 && grossCents !== 0) {
		const derived = splitGross(
			grossCents,
			extraction.vat_reverse_charged ? 0 : rate,
		);
		netCents = derived.net;
		if (vatCents === 0) vatCents = derived.vat;
		warnings.push(
			'The net amount was not printed, so it was calculated from the total and the VAT rate. Check it against the receipt.',
		);
	}

	if (netCents !== 0 && vatCents !== 0 && grossCents !== 0) {
		const drift = Math.abs(netCents + vatCents - grossCents);
		if (drift > 200) {
			warnings.push(
				`The printed net, VAT and total do not add up (off by €${(
					drift / 100
				).toFixed(2)}). Check all three figures.`,
			);
		}
	}

	const country = extraction.supplier_country.toUpperCase();
	const vatTreatment = resolveTreatment(
		country,
		extraction.vat_reverse_charged,
		vatCents,
	);

	if (vatTreatment !== 'domestic' && vatTreatment !== 'no_vat') {
		warnings.push(
			'VAT on this purchase is reverse-charged to you. The app will declare it as payable and, where deductible, reclaim it in the same return.',
		);
	}

	const suggested =
		categories.find(
			(category) => category.id === extraction.suggested_category,
		) ??
		suggestCategory(
			`${extraction.supplier_name} ${extraction.description} ${extraction.line_item_summary}`,
			categories,
		) ??
		categories.find((category) => category.id === 'uncategorised');

	const expense = newExpense({
		date,
		supplierName: extraction.supplier_name,
		description:
			extraction.description ||
			extraction.line_item_summary ||
			'Scanned receipt',
		categoryId: suggested?.id ?? 'uncategorised',
		netCents,
		vatRate: rate,
		vatCents: vatTreatment === 'domestic' ? vatCents : 0,
		vatTreatment,
		businessUsePercent: 100,
		profitDeductiblePercent: suggested?.profitDeductiblePercent ?? 0,
		vatDeductiblePercent: suggested?.vatDeductiblePercent ?? 0,
		paymentMethod: extraction.payment_method,
		justification: extraction.line_item_summary,
		status: 'unreviewed',
		aiExtraction: {
			model: 'receipt-scan',
			extractedAt: new Date().toISOString(),
			confidence: extraction.confidence,
			warnings: extraction.warnings,
			rawFields: {
				supplier_vat_id: extraction.supplier_vat_id,
				supplier_country: extraction.supplier_country,
				currency: extraction.currency,
				total_incl_vat: String(extraction.total_incl_vat),
				line_items: extraction.line_item_summary,
			},
		},
	});

	if (extraction.confidence < 0.7) {
		warnings.push(
			`Low confidence (${Math.round(
				extraction.confidence * 100,
			)}%) — check every field against the document.`,
		);
	}

	return { expense, warnings };
}

const EU_COUNTRIES = new Set([
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
]);

function resolveTreatment(
	country: string,
	reverseCharged: boolean,
	vatCents: number,
): PurchaseVatTreatment {
	if (country && country !== 'NL') {
		if (EU_COUNTRIES.has(country)) return 'eu_acquisition';
		return 'import';
	}
	if (reverseCharged) return 'reverse_charge_domestic';
	if (vatCents === 0) return 'no_vat';
	return 'domestic';
}
