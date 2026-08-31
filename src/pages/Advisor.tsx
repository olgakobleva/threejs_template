import { useMemo, useRef, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import { today, yearOf } from '@/core/dates';
import { taxYearParameters } from '@/tax/nl/years';
import { CATEGORY_GROUPS } from '@/tax/nl/categories';
import {
	askAdvisor,
	SUGGESTED_QUESTIONS,
	type AdvisorMessage,
} from '@/ai/advisor';
import { describeAiError, isAiReady } from '@/ai/client';
import {
	Badge,
	Banner,
	Card,
	EmptyState,
	PageHeader,
	Spinner,
	Tabs,
} from '@/ui/components';
import { href } from '@/app/router';

export function Advisor(): JSX.Element {
	const [tab, setTab] = useState<'chat' | 'rulebook'>('chat');

	return (
		<>
			<PageHeader
				title="Deduction advisor"
				description="What can go through the business, and what cannot. The rulebook is the same one the app calculates with."
			/>

			<Tabs
				active={tab}
				onChange={setTab}
				tabs={[
					{ id: 'chat', label: 'Ask a question' },
					{ id: 'rulebook', label: 'Rulebook' },
				]}
			/>

			{tab === 'chat' ? <Chat /> : <Rulebook />}
		</>
	);
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

function Chat(): JSX.Element {
	const store = useStore();
	const [history, setHistory] = useState<AdvisorMessage[]>([]);
	const [question, setQuestion] = useState('');
	const [streaming, setStreaming] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const params = taxYearParameters(
		yearOf(today()),
		store.settings.taxYearOverrides,
	);
	const ready = isAiReady(store.settings.ai);

	async function send(text: string): Promise<void> {
		const trimmed = text.trim();
		if (!trimmed || busy) return;

		setBusy(true);
		setError(null);
		setStreaming('');
		setQuestion('');

		const controller = new AbortController();
		abortRef.current = controller;

		const nextHistory: AdvisorMessage[] = [
			...history,
			{ role: 'user', content: trimmed },
		];
		setHistory(nextHistory);

		try {
			let accumulated = '';
			const answer = await askAdvisor(
				{
					history,
					question: trimmed,
					categories: store.categories,
					settings: store.settings,
					params,
					aiSettings: store.settings.ai,
				},
				(delta) => {
					accumulated += delta;
					setStreaming(accumulated);
				},
				controller.signal,
			);
			setHistory([
				...nextHistory,
				{ role: 'assistant', content: answer },
			]);
		} catch (cause) {
			setError(describeAiError(cause));
			setHistory(history);
		} finally {
			setStreaming('');
			setBusy(false);
			abortRef.current = null;
		}
	}

	if (!ready) {
		return (
			<Card>
				<EmptyState
					title="Claude is not configured"
					action={
						<a className="btn btn--primary" href={href('settings')}>
							Add an API key
						</a>
					}
				>
					The advisor needs an Anthropic API key, stored in this
					browser. The rulebook tab works without one and covers most
					of what you need day to day.
				</EmptyState>
			</Card>
		);
	}

	return (
		<>
			{history.length === 0 && !busy ? (
				<>
					<Banner tone="info" title="What the advisor can see">
						Your business profile, the deduction rulebook, and the
						question you ask. Individual invoices and receipts are
						not sent unless you say so in the question. Answers are
						guidance, not a filing you can rely on.
					</Banner>
					<div className="chip-row">
						{SUGGESTED_QUESTIONS.map((suggestion) => (
							<button
								key={suggestion}
								type="button"
								className="chip"
								onClick={() => void send(suggestion)}
							>
								{suggestion}
							</button>
						))}
					</div>
				</>
			) : null}

			{history.length > 0 || streaming ? (
				<div className="chat">
					{history.map((message, index) => (
						<div
							key={index}
							className={`chat__message chat__message--${message.role}`}
						>
							{message.content}
						</div>
					))}
					{streaming ? (
						<div className="chat__message chat__message--assistant">
							{streaming}
						</div>
					) : null}
					{busy && !streaming ? (
						<div className="chat__message chat__message--assistant">
							<Spinner /> Thinking…
						</div>
					) : null}
				</div>
			) : null}

			{error ? (
				<Banner tone="danger" title="That did not work">
					{error}
				</Banner>
			) : null}

			<Card>
				<textarea
					rows={3}
					placeholder="Ask about an expense, a rule, or something you are not sure how to book…"
					value={question}
					onChange={(event) => setQuestion(event.target.value)}
					onKeyDown={(event) => {
						if (
							event.key === 'Enter' &&
							(event.metaKey || event.ctrlKey)
						) {
							void send(question);
						}
					}}
				/>
				<div className="btn-row" style={{ marginTop: 10 }}>
					<button
						type="button"
						className="btn btn--primary"
						disabled={busy || question.trim() === ''}
						onClick={() => void send(question)}
					>
						{busy ? <Spinner /> : null} Ask
					</button>
					{busy ? (
						<button
							type="button"
							className="btn"
							onClick={() => abortRef.current?.abort()}
						>
							Stop
						</button>
					) : null}
					{history.length > 0 && !busy ? (
						<button
							type="button"
							className="btn btn--ghost"
							onClick={() => setHistory([])}
						>
							Clear conversation
						</button>
					) : null}
					<div style={{ flex: 1 }} />
					<span className="td-muted" style={{ fontSize: 12 }}>
						{store.settings.ai.model} · ⌘/Ctrl + Enter to send
					</span>
				</div>
			</Card>
		</>
	);
}

// ---------------------------------------------------------------------------
// Rulebook
// ---------------------------------------------------------------------------

function Rulebook(): JSX.Element {
	const store = useStore();
	const [search, setSearch] = useState('');

	const grouped = useMemo(() => {
		const needle = search.trim().toLowerCase();
		const matching = store.categories.filter(
			(category) =>
				needle === '' ||
				category.label.toLowerCase().includes(needle) ||
				category.rationale.toLowerCase().includes(needle) ||
				category.caveats.some((caveat) =>
					caveat.toLowerCase().includes(needle),
				),
		);

		return CATEGORY_GROUPS.map((group) => ({
			group,
			items: matching.filter((category) => category.group === group),
		})).filter((entry) => entry.items.length > 0);
	}, [store.categories, search]);

	return (
		<>
			<Banner tone="info" title="Two questions, not one">
				Dutch law asks separately whether a cost reduces your taxable
				profit and whether you can reclaim the BTW on it. The two
				columns below often disagree — home internet deducts nothing but
				reclaims VAT; a restaurant bill deducts 80% but reclaims
				nothing.
			</Banner>

			<div className="toolbar">
				<input
					placeholder="Search the rulebook"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					style={{ minWidth: 300 }}
				/>
			</div>

			{grouped.length === 0 ? (
				<Card>
					<EmptyState title="Nothing matches that search" />
				</Card>
			) : (
				grouped.map(({ group, items }) => (
					<Card key={group} title={group} flush>
						<div className="table-wrap">
							<table>
								<thead>
									<tr>
										<th style={{ width: '30%' }}>
											Category
										</th>
										<th className="num">Profit</th>
										<th className="num">VAT</th>
										<th>What the rule is</th>
									</tr>
								</thead>
								<tbody>
									{items.map((category) => (
										<tr key={category.id}>
											<td className="td-strong">
												{category.label}
												<div
													className="td-muted"
													style={{
														fontSize: 11.5,
														marginTop: 3,
													}}
												>
													{category.reference}
												</div>
											</td>
											<td className="num">
												<Badge
													tone={
														category.profitDeductiblePercent ===
														100
															? 'success'
															: category.profitDeductiblePercent ===
															  0
															? 'danger'
															: 'warning'
													}
												>
													{
														category.profitDeductiblePercent
													}
													%
												</Badge>
											</td>
											<td className="num">
												<Badge
													tone={
														category.vatDeductiblePercent ===
														100
															? 'success'
															: category.vatDeductiblePercent ===
															  0
															? 'danger'
															: 'warning'
													}
												>
													{
														category.vatDeductiblePercent
													}
													%
												</Badge>
											</td>
											<td>
												{category.rationale}
												{category.caveats.length > 0 ? (
													<ul
														style={{
															margin: '6px 0 0',
															paddingLeft: 16,
															color: 'var(--text-muted)',
															fontSize: 12.5,
														}}
													>
														{category.caveats.map(
															(caveat) => (
																<li
																	key={caveat}
																>
																	{caveat}
																</li>
															),
														)}
													</ul>
												) : null}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				))
			)}
		</>
	);
}
