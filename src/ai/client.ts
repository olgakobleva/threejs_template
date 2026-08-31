import Anthropic from '@anthropic-ai/sdk';
import type { AiSettings } from '@/domain/types';

/**
 * The Claude client, constructed per call from the key in Settings.
 *
 * `dangerouslyAllowBrowser` is exactly as alarming as it sounds, and it is the
 * right trade-off *only* because of how this app is deployed: it runs on your
 * own machine, the key is yours, it is stored in your own IndexedDB, and it is
 * sent to api.anthropic.com and nowhere else. There is no server in between to
 * leak it and no other user to leak it to.
 *
 * The moment this app grows the backend sketched in `HttpDataStore`, the key
 * belongs on that server and these calls should be proxied through it. Until
 * then, the honest summary is: the key lives in your browser, and anything that
 * can run script in your browser can read it.
 */

export class AiNotConfiguredError extends Error {
	constructor() {
		super(
			'Claude is not configured. Add an API key in Settings → AI assistance to use receipt scanning and the deduction advisor.',
		);
		this.name = 'AiNotConfiguredError';
	}
}

export function isAiReady(settings: AiSettings): boolean {
	return settings.enabled && settings.apiKey.trim().length > 0;
}

export function createClient(settings: AiSettings): Anthropic {
	if (!isAiReady(settings)) throw new AiNotConfiguredError();
	return new Anthropic({
		apiKey: settings.apiKey.trim(),
		dangerouslyAllowBrowser: true,
		maxRetries: 2,
	});
}

/** Turn an SDK failure into something worth showing a person. */
export function describeAiError(cause: unknown): string {
	if (cause instanceof AiNotConfiguredError) return cause.message;

	if (cause instanceof Anthropic.AuthenticationError) {
		return 'Claude rejected the API key. Check it in Settings → AI assistance.';
	}
	if (cause instanceof Anthropic.RateLimitError) {
		return 'Rate limited by the API. Wait a moment and try again.';
	}
	if (cause instanceof Anthropic.BadRequestError) {
		return `The request was rejected: ${cause.message}`;
	}
	if (cause instanceof Anthropic.APIConnectionError) {
		return 'Could not reach api.anthropic.com. Check your connection.';
	}
	if (cause instanceof Anthropic.APIError) {
		return `Claude returned an error (${cause.status}): ${cause.message}`;
	}
	return cause instanceof Error
		? cause.message
		: 'Something went wrong talking to Claude.';
}

/**
 * Rough cost estimate so the app can tell you what a scan costs before it runs.
 * Opus 5 pricing; adjust if you switch models.
 */
export const PRICE_PER_MTOK = {
	'claude-opus-5': { input: 5, output: 25 },
	'claude-sonnet-5': { input: 2, output: 10 },
	'claude-haiku-4-5': { input: 1, output: 5 },
} as const;

export const SELECTABLE_MODELS = [
	{
		id: 'claude-opus-5',
		label: 'Claude Opus 5 — most accurate, best on messy receipts',
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
