/**
 * Model catalogue. Deliberately free of any SDK import, so the domain layer can
 * name a default model without pulling the Anthropic client into the bundle.
 */

export const DEFAULT_MODEL = 'claude-opus-5';

/**
 * Cost per million tokens, used to show what a scan actually cost. Fable 5 sits
 * above the Opus tier — worth knowing before you point it at a shoebox of
 * receipts.
 */
export const PRICE_PER_MTOK: Record<string, { input: number; output: number }> =
	{
		'claude-fable-5': { input: 10, output: 50 },
		'claude-opus-5': { input: 5, output: 25 },
		'claude-sonnet-5': { input: 2, output: 10 },
		'claude-haiku-4-5': { input: 1, output: 5 },
	};

export const SELECTABLE_MODELS = [
	{
		id: 'claude-opus-5',
		label: 'Claude Opus 5 — very accurate; the default',
	},
	{
		id: 'claude-fable-5',
		label: 'Claude Fable 5 — most capable, at twice the price of Opus',
	},
	{
		id: 'claude-sonnet-5',
		label: 'Claude Sonnet 5 — cheaper, good on clean receipts',
	},
	{
		id: 'claude-haiku-4-5',
		label: 'Claude Haiku 4.5 — cheapest, for bulk clean scans',
	},
] as const;

export function estimatedCostUsd(
	model: string,
	inputTokens: number,
	outputTokens: number,
): number {
	const price = PRICE_PER_MTOK[model] ?? PRICE_PER_MTOK[DEFAULT_MODEL];
	if (!price) return 0;
	return (
		(inputTokens / 1_000_000) * price.input +
		(outputTokens / 1_000_000) * price.output
	);
}

/**
 * Models that can decline a request outright and therefore want server-side
 * refusal fallbacks turned on.
 */
export function modelSupportsRefusalFallback(model: string): boolean {
	return model === 'claude-fable-5' || model === 'claude-opus-5';
}

/** Fable 5 is not offered to organisations configured for zero data retention. */
export function modelRequiresDataRetention(model: string): boolean {
	return model === 'claude-fable-5';
}
