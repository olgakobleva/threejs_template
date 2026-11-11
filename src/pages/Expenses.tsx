import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import { newAsset, newExpense } from '@/domain/defaults';
import type {
	Attachment,
	Expense,
	ExpenseStatus,
	PurchaseVatTreatment,
	VatRate,
} from '@/domain/types';
import { formatDate, today, yearOf } from '@/core/dates';
import { formatMoney, splitGross, type Cents } from '@/core/money';
import { expenseTotals, PURCHASE_TREATMENT_LABELS } from '@/tax/nl/vat';
import { reviewExpense, type DeductionFlag } from '@/tax/nl/deductibility';
import { taxYearParameters } from '@/tax/nl/years';
import { scanReceipt } from '@/ai/receipts';
import { describeAiError, isAiReady } from '@/ai/client';
import {
	Badge,
	Banner,
	Card,
	ConfirmButton,
	EmptyState,
	FileDrop,
	FlagList,
	Modal,
	Money,
	MoneyField,
	NumberField,
	PageHeader,
	SelectField,
	Spinner,
	TextArea,
	TextField,
} from '@/ui/components';
import { href, navigate } from '@/app/router';

const STATUS_LABEL: Record<ExpenseStatus, string> = {
	unreviewed: 'Unreviewed',
	confirmed: 'Confirmed',
	excluded: 'Excluded',
};

export function Expenses({
	selectedId,
}: {
	selectedId: string | null;
}): JSX.Element {
	const store = useStore();
	const [draft, setDraft] = useState<Expense | null>(null);
	const [pendingAttachment, setPendingAttachment] = useState<string | null>(
		null,
	);
	const [scanState, setScanState] = useState<{
		busy: boolean;
		message: string;
		error: string | null;
		warnings: string[];
	}>({ busy: false, message: '', error: null, warnings: [] });
	const [statusFilter, setStatusFilter] = useState<'all' | ExpenseStatus>(
		'all',
	);
	const [yearFilter, setYearFilter] = useState(String(yearOf(today())));
	const [search, setSearch] = useState('');

	const params = taxYearParameters(
		Number(yearFilter) || yearOf(today()),
		store.settings.taxYearOverrides,
	);

	const editing = useMemo(() => {
		if (draft) return draft;
		if (!selectedId) return null;
		return (
			store.expenses.find((expense) => expense.id === selectedId) ?? null
		);
	}, [draft, selectedId, store.expenses]);

	const years = useMemo(() => {
		const set = new Set(
			store.expenses.map((expense) => expense.date.slice(0, 4)),
		);
		set.add(String(yearOf(today())));
		return [...set].sort().reverse();
	}, [store.expenses]);

	const visible = useMemo(() => {
		const needle = search.trim().toLowerCase();
		return store.expenses
			.filter(
				(expense) =>
					statusFilter === 'all' || expense.status === statusFilter,
			)
			.filter(
				(expense) =>
					yearFilter === 'all' || expense.date.startsWith(yearFilter),
			)
			.filter(
				(expense) =>
					needle === '' ||
					expense.supplierName.toLowerCase().includes(needle) ||
					expense.description.toLowerCase().includes(needle),
			)
			.sort((a, b) => b.date.localeCompare(a.date));
	}, [store.expenses, statusFilter, yearFilter, search]);

	const summary = useMemo(() => {
		let booked = 0;
		let deductible = 0;
		let vat = 0;
		for (const expense of visible) {
			const totals = expenseTotals(expense);
			booked += totals.net;
			deductible += totals.deductibleCost;
			vat += totals.reclaimableVat;
		}
		return { booked, deductible, vat };
	}, [visible]);

	async function handleFiles(files: File[]): Promise<void> {
		const file = files[0];
		if (!file) return;

		if (!isAiReady(store.settings.ai)) {
			// Still attach the file and open a blank expense — scanning is optional.
			const attachment = await store.addAttachment(file, null);
			setPendingAttachment(attachment.id);
			setDraft(
				newExpense({
					attachmentIds: [attachment.id],
					description: file.name,
				}),
			);
			setScanState({
				busy: false,
				message: '',
				error: null,
				warnings: [
					'Claude is not configured, so the receipt was attached but not read. Fill the fields in yourself, or add an API key in Settings → AI assistance.',
				],
			});
			return;
		}

		setScanState({
			busy: true,
			message: `Reading ${file.name}…`,
			error: null,
			warnings: [],
		});

		try {
			const attachment = await store.addAttachment(file, null);
			const result = await scanReceipt(
				file,
				file.name,
				store.settings.ai,
				store.categories,
			);
			setPendingAttachment(attachment.id);
			setDraft({ ...result.expense, attachmentIds: [attachment.id] });
			setScanState({
				busy: false,
				message: '',
				error: null,
				warnings: result.warnings,
			});
		} catch (cause) {
			setScanState({
				busy: false,
				message: '',
				error: describeAiError(cause),
				warnings: [],
			});
		}
	}

	function closeEditor(): void {
		setDraft(null);
		setPendingAttachment(null);
		setScanState({ busy: false, message: '', error: null, warnings: [] });
		if (selectedId) navigate('expenses');
	}

	return (
		<>
			<PageHeader
				title="Expenses"
				description="Every cost, its receipt, and the reason it belongs in the business. Deductibility comes from the category rules, not from guesswork."
				actions={
					<button
						type="button"
						className="btn btn--primary"
						onClick={() => setDraft(newExpense())}
					>
						Add manually
					</button>
				}
			/>

			<FileDrop
				accept="image/*,application/pdf"
				label={
					scanState.busy
						? scanState.message
						: isAiReady(store.settings.ai)
						? 'Drop a receipt or invoice here to read it with Claude'
						: 'Drop a receipt here to attach it'
				}
				hint={
					isAiReady(store.settings.ai)
						? 'Photos and PDFs. Claude fills in the supplier, date, amounts and VAT; you review before anything is saved.'
						: 'Add an API key in Settings → AI assistance to have receipts read automatically.'
				}
				onFiles={(files) => void handleFiles(files)}
			/>

			{scanState.busy ? (
				<p style={{ marginTop: 10, color: 'var(--text-muted)' }}>
					<Spinner /> {scanState.message}
				</p>
			) : null}

			{scanState.error ? (
				<Banner tone="danger" title="The scan failed">
					{scanState.error}
				</Banner>
			) : null}

			<div className="toolbar" style={{ marginTop: 18 }}>
				<input
					placeholder="Search supplier or description"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					style={{ minWidth: 240 }}
				/>
				<select
					value={statusFilter}
					onChange={(event) =>
						setStatusFilter(
							event.target.value as 'all' | ExpenseStatus,
						)
					}
				>
					<option value="all">All statuses</option>
					{(Object.keys(STATUS_LABEL) as ExpenseStatus[]).map(
						(status) => (
							<option key={status} value={status}>
								{STATUS_LABEL[status]}
							</option>
						),
					)}
				</select>
				<select
					value={yearFilter}
					onChange={(event) => setYearFilter(event.target.value)}
				>
					<option value="all">All years</option>
					{years.map((year) => (
						<option key={year} value={year}>
							{year}
						</option>
					))}
				</select>
				<div className="toolbar__spacer" />
				<span className="td-muted" style={{ fontSize: 12.5 }}>
					{formatMoney(summary.booked)} booked ·{' '}
					{formatMoney(summary.deductible)} deductible ·{' '}
					{formatMoney(summary.vat)} VAT reclaimable
				</span>
			</div>

			<Card flush>
				{visible.length === 0 ? (
					<EmptyState title="No expenses here">
						Drop a receipt above, or add one manually.
					</EmptyState>
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Date</th>
									<th>Supplier</th>
									<th>Category</th>
									<th>Status</th>
									<th className="num">Net</th>
									<th className="num">Deductible</th>
									<th className="num">VAT back</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{visible.map((expense) => {
									const totals = expenseTotals(expense);
									const category = store.categories.find(
										(candidate) =>
											candidate.id === expense.categoryId,
									);
									const flags = reviewExpense(
										expense,
										category,
										params,
										store.settings,
									);
									const errors = flags.filter(
										(flag) => flag.severity === 'error',
									).length;
									const warnings = flags.filter(
										(flag) => flag.severity === 'warning',
									).length;

									return (
										<tr
											key={expense.id}
											className="is-clickable"
											onClick={() => setDraft(expense)}
										>
											<td>{formatDate(expense.date)}</td>
											<td>
												<div className="td-strong">
													{expense.supplierName ||
														'—'}
												</div>
												<div
													className="td-muted"
													style={{ fontSize: 12 }}
												>
													{expense.description}
												</div>
											</td>
											<td className="td-muted">
												{category?.label ??
													expense.categoryId}
											</td>
											<td>
												<Badge
													tone={
														expense.status ===
														'confirmed'
															? 'success'
															: expense.status ===
															  'excluded'
															? undefined
															: 'warning'
													}
												>
													{
														STATUS_LABEL[
															expense.status
														]
													}
												</Badge>
												{errors > 0 ? (
													<>
														{' '}
														<Badge tone="danger">
															{errors}
														</Badge>
													</>
												) : null}
												{errors === 0 &&
												warnings > 0 ? (
													<>
														{' '}
														<Badge tone="warning">
															{warnings}
														</Badge>
													</>
												) : null}
											</td>
											<td className="num">
												<Money cents={totals.net} />
											</td>
											<td className="num">
												<Money
													cents={
														totals.deductibleCost
													}
												/>
											</td>
											<td className="num td-muted">
												<Money
													cents={
														totals.reclaimableVat
													}
												/>
											</td>
											<td>
												{expense.attachmentIds.length >
												0 ? (
													<span title="Receipt attached">
														📎
													</span>
												) : null}
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot>
								<tr>
									<td colSpan={4}>
										{visible.length} expense
										{visible.length === 1 ? '' : 's'}
									</td>
									<td className="num">
										<Money cents={summary.booked} />
									</td>
									<td className="num">
										<Money cents={summary.deductible} />
									</td>
									<td className="num">
										<Money cents={summary.vat} />
									</td>
									<td />
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</Card>

			{editing ? (
				<ExpenseEditor
					expense={editing}
					scanWarnings={scanState.warnings}
					highlightAttachmentId={pendingAttachment}
					onClose={closeEditor}
				/>
			) : null}
		</>
	);
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function ExpenseEditor({
	expense,
	scanWarnings,
	highlightAttachmentId,
	onClose,
}: {
	expense: Expense;
	scanWarnings: string[];
	highlightAttachmentId: string | null;
	onClose: () => void;
}): JSX.Element {
	const store = useStore();
	const [working, setWorking] = useState<Expense>(expense);
	const [grossDraft, setGrossDraft] = useState<Cents>(
		expense.netCents + expense.vatCents,
	);

	const params = taxYearParameters(
		yearOf(working.date),
		store.settings.taxYearOverrides,
	);
	const category = store.categories.find(
		(candidate) => candidate.id === working.categoryId,
	);
	const totals = expenseTotals(working);
	const flags: DeductionFlag[] = reviewExpense(
		working,
		category,
		params,
		store.settings,
	);

	function update(patch: Partial<Expense>): void {
		setWorking((current) => ({ ...current, ...patch }));
	}

	/** Changing the category resets the two deductibility percentages to its defaults. */
	function changeCategory(categoryId: string): void {
		const next = store.categories.find(
			(candidate) => candidate.id === categoryId,
		);
		update({
			categoryId,
			profitDeductiblePercent: next?.profitDeductiblePercent ?? 0,
			vatDeductiblePercent: next?.vatDeductiblePercent ?? 0,
			vatRate: next?.typicalVatRate ?? working.vatRate,
		});
	}

	function setGross(gross: Cents): void {
		setGrossDraft(gross);
		const split = splitGross(gross, working.vatRate);
		update({ netCents: split.net, vatCents: split.vat });
	}

	async function convertToAsset(): Promise<void> {
		const asset = newAsset({
			description: working.description || working.supplierName,
			purchaseDate: working.date,
			purchasePriceCents: working.netCents,
			businessUsePercent: working.businessUsePercent,
			attachmentIds: working.attachmentIds,
			notes: `Created from expense ${working.id}`,
		});
		await store.save('assets', asset);
		const next: Expense = {
			...working,
			assetId: asset.id,
			categoryId: 'equipment_capitalised',
			profitDeductiblePercent: 0,
			status: 'confirmed',
		};
		await store.save('expenses', next);
		onClose();
		navigate('assets');
	}

	const grouped = useMemo(() => {
		const map = new Map<string, typeof store.categories>();
		for (const item of store.categories) {
			const list = map.get(item.group) ?? [];
			list.push(item);
			map.set(item.group, list);
		}
		return [...map.entries()];
	}, [store.categories]);

	return (
		<Modal
			wide
			title={working.supplierName || 'Expense'}
			onClose={onClose}
			footer={
				<>
					<ConfirmButton
						className="btn btn--danger"
						onConfirm={async () => {
							for (const id of working.attachmentIds) {
								await store.removeAttachment(id);
							}
							await store.remove('expenses', working.id);
							onClose();
						}}
					>
						Delete
					</ConfirmButton>
					<div style={{ flex: 1 }} />
					<button
						type="button"
						className="btn"
						onClick={async () => {
							await store.save('expenses', {
								...working,
								status: 'excluded',
							});
							onClose();
						}}
					>
						Mark private
					</button>
					<button
						type="button"
						className="btn"
						onClick={async () => {
							await store.save('expenses', working);
							onClose();
						}}
					>
						Save
					</button>
					<button
						type="button"
						className="btn btn--primary"
						onClick={async () => {
							await store.save('expenses', {
								...working,
								status: 'confirmed',
							});
							onClose();
						}}
					>
						Save &amp; confirm
					</button>
				</>
			}
		>
			{scanWarnings.length > 0 ? (
				<Banner tone="warning" title="From the scan">
					<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
						{scanWarnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				</Banner>
			) : null}

			<div className="split">
				<div>
					<div className="grid grid--2">
						<TextField
							label="Date"
							type="date"
							value={working.date}
							onChange={(event) =>
								update({ date: event.target.value })
							}
						/>
						<TextField
							label="Supplier"
							value={working.supplierName}
							onChange={(event) =>
								update({ supplierName: event.target.value })
							}
						/>
					</div>

					<TextField
						label="Description"
						value={working.description}
						onChange={(event) =>
							update({ description: event.target.value })
						}
					/>

					<div className="field">
						<label className="field__label">Category</label>
						<select
							value={working.categoryId}
							onChange={(event) =>
								changeCategory(event.target.value)
							}
						>
							{grouped.map(([group, items]) => (
								<optgroup key={group} label={group}>
									{items.map((item) => (
										<option key={item.id} value={item.id}>
											{item.label}
										</option>
									))}
								</optgroup>
							))}
						</select>
						{category ? (
							<span className="field__hint">
								{category.rationale}
							</span>
						) : null}
					</div>

					{category && category.caveats.length > 0 ? (
						<Banner tone="info" title="Worth knowing">
							<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
								{category.caveats.map((caveat) => (
									<li key={caveat}>{caveat}</li>
								))}
							</ul>
						</Banner>
					) : null}

					<fieldset>
						<legend>Amounts</legend>
						<div className="grid grid--3">
							<MoneyField
								label="Total incl. VAT"
								value={grossDraft}
								onValueChange={setGross}
							/>
							<MoneyField
								label="Net excl. VAT"
								value={working.netCents}
								onValueChange={(net) => {
									update({ netCents: net });
									setGrossDraft(net + working.vatCents);
								}}
							/>
							<MoneyField
								label="VAT amount"
								value={working.vatCents}
								onValueChange={(vat) => {
									update({ vatCents: vat });
									setGrossDraft(working.netCents + vat);
								}}
							/>
						</div>
						<div className="grid grid--2">
							<SelectField
								label="VAT rate"
								value={String(working.vatRate)}
								onValueChange={(value) => {
									const rate = Number(value) as VatRate;
									const split = splitGross(grossDraft, rate);
									update({
										vatRate: rate,
										netCents: split.net,
										vatCents: split.vat,
									});
								}}
								options={[
									{ value: '21', label: '21% — standard' },
									{ value: '9', label: '9% — reduced' },
									{ value: '0', label: '0% / none' },
								]}
							/>
							<SelectField
								label="Where the supplier is"
								value={working.vatTreatment}
								onValueChange={(value) =>
									update({
										vatTreatment:
											value as PurchaseVatTreatment,
									})
								}
								options={(
									Object.keys(
										PURCHASE_TREATMENT_LABELS,
									) as PurchaseVatTreatment[]
								).map((value) => ({
									value,
									label: PURCHASE_TREATMENT_LABELS[value],
								}))}
							/>
						</div>
					</fieldset>

					<fieldset>
						<legend>How much of it counts</legend>
						<div className="grid grid--3">
							<NumberField
								label="Business use"
								suffix="%"
								min={0}
								max={100}
								value={working.businessUsePercent}
								onValueChange={(value) =>
									update({ businessUsePercent: value })
								}
							/>
							<NumberField
								label="Profit deductible"
								suffix="%"
								min={0}
								max={100}
								value={working.profitDeductiblePercent}
								onValueChange={(value) =>
									update({ profitDeductiblePercent: value })
								}
							/>
							<NumberField
								label="VAT reclaimable"
								suffix="%"
								min={0}
								max={100}
								value={working.vatDeductiblePercent}
								onValueChange={(value) =>
									update({ vatDeductiblePercent: value })
								}
							/>
						</div>
					</fieldset>

					<TextArea
						label="Why this is a business cost"
						hint="The note you would want to have if you were asked about this line in three years."
						value={working.justification}
						onChange={(event) =>
							update({ justification: event.target.value })
						}
					/>
				</div>

				<div>
					<Card title="What this expense does">
						<dl className="dl">
							<dt>Booked net</dt>
							<dd>
								<Money cents={totals.net} />
							</dd>
							<dt>Reduces profit by</dt>
							<dd>
								<Money cents={totals.deductibleCost} bold />
							</dd>
							<dt>VAT reclaimed</dt>
							<dd>
								<Money cents={totals.reclaimableVat} bold />
							</dd>
							{totals.dueVat > 0 ? (
								<>
									<dt>VAT you owe (reverse charge)</dt>
									<dd>
										<Money cents={totals.dueVat} />
									</dd>
								</>
							) : null}
							<dt>Out of pocket after VAT</dt>
							<dd>
								<Money
									cents={totals.gross - totals.reclaimableVat}
								/>
							</dd>
						</dl>
						<p
							className="field__hint"
							style={{ marginTop: 10, marginBottom: 0 }}
						>
							A deduction is not a refund: reducing your profit by{' '}
							{formatMoney(totals.deductibleCost)} saves you that
							much <em>times your marginal rate</em>, which the
							income tax page shows.
							{category ? ` Rule: ${category.reference}` : ''}
						</p>
					</Card>

					{flags.length > 0 ? (
						<Card title="Checks">
							<FlagList flags={flags} />
							{flags.some(
								(flag) => flag.code === 'should_capitalise',
							) ? (
								<button
									type="button"
									className="btn btn--sm"
									style={{ marginTop: 12 }}
									onClick={() => void convertToAsset()}
								>
									Turn this into a depreciable asset
								</button>
							) : null}
						</Card>
					) : (
						<Card title="Checks">
							<p className="td-muted" style={{ margin: 0 }}>
								Nothing flagged. That is not the same as correct
								— the automated checks only catch mechanical
								problems.
							</p>
						</Card>
					)}

					<Card
						title="Receipt"
						actions={
							<a className="btn btn--sm" href={href('advisor')}>
								Ask the advisor
							</a>
						}
					>
						<AttachmentPanel
							attachmentIds={working.attachmentIds}
							highlightId={highlightAttachmentId}
							onAdd={async (files) => {
								const added: string[] = [];
								for (const file of files) {
									const attachment =
										await store.addAttachment(file, {
											type: 'expense',
											id: working.id,
										});
									added.push(attachment.id);
								}
								update({
									attachmentIds: [
										...working.attachmentIds,
										...added,
									],
								});
							}}
							onRemove={async (id) => {
								await store.removeAttachment(id);
								update({
									attachmentIds: working.attachmentIds.filter(
										(candidate) => candidate !== id,
									),
								});
							}}
						/>
					</Card>
				</div>
			</div>
		</Modal>
	);
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

function AttachmentPanel({
	attachmentIds,
	highlightId,
	onAdd,
	onRemove,
}: {
	attachmentIds: string[];
	highlightId: string | null;
	onAdd: (files: File[]) => Promise<void>;
	onRemove: (id: string) => Promise<void>;
}): JSX.Element {
	const store = useStore();
	const [previews, setPreviews] = useState<
		Array<{ meta: Attachment; url: string }>
	>([]);

	useEffect(() => {
		let cancelled = false;
		const urls: string[] = [];

		void (async () => {
			const loaded: Array<{ meta: Attachment; url: string }> = [];
			for (const id of attachmentIds) {
				const attachment = await store.getAttachment(id);
				if (!attachment) continue;
				const url = URL.createObjectURL(attachment.blob);
				urls.push(url);
				loaded.push({ meta: attachment, url });
			}
			if (cancelled) {
				urls.forEach((url) => URL.revokeObjectURL(url));
				return;
			}
			setPreviews(loaded);
		})();

		return () => {
			cancelled = true;
			urls.forEach((url) => URL.revokeObjectURL(url));
		};
	}, [attachmentIds, store]);

	const primary =
		previews.find((item) => item.meta.id === highlightId) ?? previews[0];

	return (
		<>
			{primary ? (
				primary.meta.mimeType.startsWith('image/') ? (
					<img
						className="receipt-preview"
						src={primary.url}
						alt={primary.meta.filename}
					/>
				) : (
					<p>
						<a href={primary.url} target="_blank" rel="noreferrer">
							Open {primary.meta.filename}
						</a>
					</p>
				)
			) : (
				<FileDrop
					accept="image/*,application/pdf"
					label="Attach the receipt"
					onFiles={(files) => void onAdd(files)}
				/>
			)}

			{previews.length > 0 ? (
				<div className="attachment-strip">
					{previews.map((item) => (
						<span key={item.meta.id} className="attachment">
							<a href={item.url} target="_blank" rel="noreferrer">
								{item.meta.filename}
							</a>
							<button
								type="button"
								className="btn btn--ghost btn--sm"
								onClick={() => void onRemove(item.meta.id)}
							>
								×
							</button>
						</span>
					))}
				</div>
			) : null}
		</>
	);
}
