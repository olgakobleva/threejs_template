import type Anthropic from '@anthropic-ai/sdk';
import type {
	AiSettings,
	Expense,
	ExpenseCategory,
	Settings,
	TaxYearParameters,
} from '@/domain/types';
import { formatMoney } from '@/core/money';
import { formatDate } from '@/core/dates';
import { expenseTotals } from '@/tax/nl/vat';
import { reviewExpense } from '@/tax/nl/deductibility';
import { createClient } from './client';

/**
 * The deduction advisor.
 *
 * It answers "can I put this through the business?" against the same rulebook
 * the app uses for its own calculations, with the user's actual figures in
 * context. Two deliberate constraints:
 *
 *   • The rulebook is passed in as context rather than trusted to memory, so
 *     the advice matches what the app will actually compute.
 *   • It is told to say when something is genuinely uncertain, because most of
 *     the expensive mistakes in Dutch bookkeeping are borderline calls that
 *     look settled.
 */

const SYSTEM_PROMPT = `You advise a sole trader in the Netherlands (eenmanszaak / ZZP) on
what they can and cannot put through the business. You are working inside their
bookkeeping app and you can see their actual records.

How to answer:

- Answer in English, plainly, in a few sentences. No headers or bullet lists
  unless you are genuinely comparing several options.
- Lead with the answer, then the reason. "No — fines are never deductible,
  including on a business trip" beats three sentences of context first.
- Distinguish the two questions Dutch law keeps separate: does the cost reduce
  taxable profit, and can the BTW be reclaimed? They often differ. Home internet
  is the standard example: no profit deduction, but the BTW on the business
  share is reclaimable.
- When something depends on facts you do not have, ask the one question that
  settles it rather than listing every branch.
- Say plainly when a case is genuinely borderline or when the answer depends on
  how the Belastingdienst would view the substance. Do not manufacture
  confidence, and do not hedge on things that are actually settled.
- You are not a belastingadviseur and this is not advice they can rely on for
  filing. Say so when the stakes are real — a large deduction, an audit
  question, anything structural — not on every answer.

The rulebook below is what the app itself computes with. If you disagree with it,
say so explicitly rather than quietly answering differently — a mismatch between
your answer and the app's arithmetic is a bug the user needs to know about.`;

function rulebookContext(categories: ExpenseCategory[]): string {
	return categories
		.map((category) => {
			const caveats =
				category.caveats.length > 0
					? ` Caveats: ${category.caveats.join(' ')}`
					: '';
			return `${category.label} [${category.id}] — profit ${category.profitDeductiblePercent}%, VAT ${category.vatDeductiblePercent}%. ${category.rationale}${caveats} (${category.reference})`;
		})
		.join('\n');
}

function businessContext(
	settings: Settings,
	params: TaxYearParameters,
): string {
	const { fiscal } = settings;
	return `Business profile:
- Trading as: ${settings.business.tradeName || 'not set'}
- First year of business: ${fiscal.firstYearOfBusiness}
- VAT scheme: ${fiscal.vatScheme}${
		fiscal.vatScheme === 'kor'
			? ' (no VAT charged, no input VAT reclaimable)'
			: ''
	}
- VAT return frequency: ${fiscal.vatPeriod}
- Expects to meet the ${params.hoursCriterion}-hour criterion: ${
		fiscal.expectsToMeetHoursCriterion ? 'yes' : 'no'
	}
- Startersaftrek claimed: ${fiscal.startersaftrekYearsClaimed} of 3 times
- Tax year in view: ${params.year} (capitalisation threshold ${formatMoney(
		params.capitalisationThresholdCents,
	)}, mileage allowance ${params.mileageAllowanceCentsPerKm}c/km)`;
}

export function describeExpense(
	expense: Expense,
	categories: ExpenseCategory[],
	params: TaxYearParameters,
	settings: Settings,
): string {
	const category = categories.find(
		(candidate) => candidate.id === expense.categoryId,
	);
	const totals = expenseTotals(expense);
	const flags = reviewExpense(expense, category, params, settings);

	return `Expense under discussion:
- Date: ${formatDate(expense.date)}
- Supplier: ${expense.supplierName || 'unknown'}
- Description: ${expense.description || '(none)'}
- Category: ${category?.label ?? expense.categoryId}
- Net ${formatMoney(expense.netCents)}, VAT ${formatMoney(
		expense.vatCents,
	)} at ${expense.vatRate}%, treatment ${expense.vatTreatment}
- Business use ${expense.businessUsePercent}%, profit-deductible ${
		expense.profitDeductiblePercent
	}%, VAT-deductible ${expense.vatDeductiblePercent}%
- The app currently deducts ${formatMoney(
		totals.deductibleCost,
	)} from profit and reclaims ${formatMoney(totals.reclaimableVat)} of VAT
- User's own note: ${expense.justification || '(none)'}
- Receipt attached: ${expense.attachmentIds.length > 0 ? 'yes' : 'no'}
${
	flags.length > 0
		? `- Automated checks flagged: ${flags
				.map((flag) => flag.message)
				.join(' | ')}`
		: '- Automated checks found nothing'
}`;
}

export interface AdvisorMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface AdvisorRequest {
	history: AdvisorMessage[];
	question: string;
	categories: ExpenseCategory[];
	settings: Settings;
	params: TaxYearParameters;
	/** Optional focus — the expense the user clicked "ask about this" on. */
	expenseContext?: string;
	aiSettings: AiSettings;
}

/**
 * Streams an answer. `onDelta` receives text as it arrives; the promise
 * resolves with the complete answer.
 */
export async function askAdvisor(
	request: AdvisorRequest,
	onDelta: (text: string) => void,
	signal?: AbortSignal,
): Promise<string> {
	const client = createClient(request.aiSettings);

	const contextBlocks = [
		businessContext(request.settings, request.params),
		`Deduction rulebook the app computes with:\n${rulebookContext(
			request.categories,
		)}`,
	];
	if (request.expenseContext) contextBlocks.push(request.expenseContext);

	const messages: Anthropic.MessageParam[] = [
		...request.history.map((message) => ({
			role: message.role,
			content: message.content,
		})),
		{ role: 'user' as const, content: request.question },
	];

	const stream = client.messages.stream(
		{
			model: request.aiSettings.model,
			max_tokens: 4000,
			// The rulebook and profile are identical across turns, so they sit
			// in the cached prefix and the question goes after it.
			system: [
				{ type: 'text', text: SYSTEM_PROMPT },
				{
					type: 'text',
					text: contextBlocks.join('\n\n'),
					cache_control: { type: 'ephemeral' },
				},
			],
			output_config: { effort: 'medium' },
			messages,
		},
		{ signal },
	);

	stream.on('text', onDelta);

	const final = await stream.finalMessage();

	if (final.stop_reason === 'refusal') {
		return 'Claude declined to answer that one. Rephrase the question, or ask a bookkeeper.';
	}

	return final.content
		.filter((block): block is Anthropic.TextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('');
}

/** Canned prompts that make the advisor useful before you know what to ask. */
export const SUGGESTED_QUESTIONS = [
	'Review my unreviewed expenses this quarter and tell me which ones look wrong.',
	'I work from a room in my flat. What can I actually deduct?',
	'I bought a laptop for €1,400. Can I write it off this year?',
	'A client took me to lunch and I paid. How do I book it?',
	'I drove 340 km to a client in my own car. What do I claim?',
	'Should I stay on the KOR or register for VAT normally?',
	'What do I need to have on file if the Belastingdienst asks about this quarter?',
];
