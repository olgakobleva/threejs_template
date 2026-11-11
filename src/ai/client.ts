import Anthropic from '@anthropic-ai/sdk';
import type { AiSettings } from '@/domain/types';
import { modelSupportsRefusalFallback } from './models';

export {
	DEFAULT_MODEL,
	PRICE_PER_MTOK,
	SELECTABLE_MODELS,
	estimatedCostUsd,
	modelRequiresDataRetention,
} from './models';

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

// ---------------------------------------------------------------------------
// Refusal fallbacks
// ---------------------------------------------------------------------------

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/**
 * Fable 5 and Opus 5 can decline a request outright: the call returns HTTP 200
 * with `stop_reason: "refusal"` rather than raising. Opting into server-side
 * fallbacks means the API silently re-runs the same request on another model
 * inside the same call, so a stray refusal on a perfectly ordinary receipt does
 * not turn into a dead end for the user.
 *
 * `fallbacks: 'default'` lets the server pick the target by refusal category,
 * so there is no model list here to go stale. A decline before any output is
 * not billed; the rescue bills at the fallback model's own rates.
 */
export function refusalFallbackParams(model: string): {
	betas?: Anthropic.Beta.AnthropicBeta[];
	fallbacks?: 'default';
} {
	if (!modelSupportsRefusalFallback(model)) return {};
	return { betas: [FALLBACK_BETA], fallbacks: 'default' };
}

/** Did a fallback model end up serving this response? */
export function servedByFallback(usage: {
	iterations?: Array<{ type: string }> | null;
}): boolean {
	return (usage.iterations ?? []).some(
		(entry) => entry.type === 'fallback_message',
	);
}

export const REFUSAL_MESSAGE =
	'Claude declined to handle this one, and the fallback model did too. That is unusual for a receipt — if the document is ordinary, try again; otherwise fill the fields in by hand.';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

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
		// The most likely cause here is an org configured for zero data
		// retention, which Fable 5 is not available under.
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
