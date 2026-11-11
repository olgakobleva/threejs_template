import { useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import {
	formatInvoiceNumber,
	newInvoice,
	newInvoiceLine,
	EMPTY_ADDRESS,
} from '@/domain/defaults';
import type {
	Invoice,
	InvoiceStatus,
	SalesVatTreatment,
	VatRate,
} from '@/domain/types';
import { addDays, formatDate, today, yearOf } from '@/core/dates';
import { formatMoney, type Cents } from '@/core/money';
import { newId, nowTimestamp } from '@/core/id';
import {
	invoiceTotals,
	isOverdue,
	lineTotals,
	requiresCustomerVatId,
	reverseChargeNoteFor,
	SALES_TREATMENT_LABELS,
} from '@/tax/nl/vat';
import {
	Badge,
	Banner,
	Card,
	Checkbox,
	ConfirmButton,
	EmptyState,
	Field,
	Modal,
	Money,
	MoneyField,
	PageHeader,
	SelectField,
	TextArea,
	TextField,
} from '@/ui/components';
import { navigate } from '@/app/router';

const STATUS_TONE: Record<
	InvoiceStatus,
	'success' | 'warning' | 'danger' | 'info' | undefined
> = {
	draft: undefined,
	sent: 'info',
	partially_paid: 'warning',
	paid: 'success',
	cancelled: 'danger',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
	draft: 'Draft',
	sent: 'Sent',
	partially_paid: 'Part paid',
	paid: 'Paid',
	cancelled: 'Cancelled',
};

export function Invoices({
	selectedId,
}: {
	selectedId: string | null;
}): JSX.Element {
	const store = useStore();
	const [draft, setDraft] = useState<Invoice | null>(null);
	const [previewing, setPreviewing] = useState<Invoice | null>(null);
	const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>(
		'all',
	);
	const [yearFilter, setYearFilter] = useState<string>(
		String(yearOf(today())),
	);
	const [search, setSearch] = useState('');

	const editing = useMemo(() => {
		if (draft) return draft;
		if (!selectedId) return null;
		return (
			store.invoices.find((invoice) => invoice.id === selectedId) ?? null
		);
	}, [draft, selectedId, store.invoices]);

	const years = useMemo(() => {
		const set = new Set(
			store.invoices.map((invoice) => invoice.issueDate.slice(0, 4)),
		);
		set.add(String(yearOf(today())));
		return [...set].sort().reverse();
	}, [store.invoices]);

	const visible = useMemo(() => {
		const needle = search.trim().toLowerCase();
		return store.invoices
			.filter(
				(invoice) =>
					statusFilter === 'all' || invoice.status === statusFilter,
			)
			.filter(
				(invoice) =>
					yearFilter === 'all' ||
					invoice.issueDate.startsWith(yearFilter),
			)
			.filter(
				(invoice) =>
					needle === '' ||
					invoice.number.toLowerCase().includes(needle) ||
					invoice.contactSnapshot.name
						.toLowerCase()
						.includes(needle) ||
					invoice.reference.toLowerCase().includes(needle),
			)
			.sort(
				(a, b) =>
					b.issueDate.localeCompare(a.issueDate) ||
					b.number.localeCompare(a.number),
			);
	}, [store.invoices, statusFilter, yearFilter, search]);

	const totals = useMemo(() => {
		let net = 0;
		let vat = 0;
		let outstanding = 0;
		for (const invoice of visible) {
			if (invoice.status === 'cancelled') continue;
			const row = invoiceTotals(invoice);
			net += row.net;
			vat += row.vat;
			outstanding += invoice.status === 'draft' ? 0 : row.outstanding;
		}
		return { net, vat, outstanding };
	}, [visible]);

	function startNew(): void {
		setDraft(newInvoice(store.settings));
	}

	function closeEditor(): void {
		setDraft(null);
		if (selectedId) navigate('invoices');
	}

	async function persist(invoice: Invoice): Promise<void> {
		await store.save('invoices', invoice);
		setDraft(null);
		if (selectedId) navigate('invoices');
	}

	return (
		<>
			<PageHeader
				title="Invoices"
				description="What you have billed. The invoice date — not the payment date — decides which BTW period the VAT falls in."
				actions={
					<button
						type="button"
						className="btn btn--primary"
						onClick={startNew}
					>
						New invoice
					</button>
				}
			/>

			<div className="toolbar">
				<input
					placeholder="Search number, customer or reference"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					style={{ minWidth: 260 }}
				/>
				<select
					value={statusFilter}
					onChange={(event) =>
						setStatusFilter(
							event.target.value as 'all' | InvoiceStatus,
						)
					}
				>
					<option value="all">All statuses</option>
					{(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map(
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
			</div>

			<Card flush>
				{visible.length === 0 ? (
					<EmptyState
						title="No invoices here"
						action={
							<button
								type="button"
								className="btn btn--primary"
								onClick={startNew}
							>
								Create your first invoice
							</button>
						}
					>
						Invoices you create appear here with their VAT treatment
						and payment status.
					</EmptyState>
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Number</th>
									<th>Date</th>
									<th>Customer</th>
									<th>VAT treatment</th>
									<th>Status</th>
									<th className="num">Net</th>
									<th className="num">VAT</th>
									<th className="num">Total</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{visible.map((invoice) => {
									const row = invoiceTotals(invoice);
									const overdue = isOverdue(invoice, today());
									return (
										<tr
											key={invoice.id}
											className="is-clickable"
											onClick={() => setDraft(invoice)}
										>
											<td className="mono td-strong">
												{invoice.number || '—'}
											</td>
											<td>
												{formatDate(invoice.issueDate)}
											</td>
											<td>
												{invoice.contactSnapshot.name ||
													'—'}
											</td>
											<td className="td-muted">
												{
													SALES_TREATMENT_LABELS[
														invoice.vatTreatment
													]
												}
											</td>
											<td>
												<Badge
													tone={
														overdue
															? 'danger'
															: STATUS_TONE[
																	invoice
																		.status
															  ]
													}
												>
													{overdue
														? 'Overdue'
														: STATUS_LABEL[
																invoice.status
														  ]}
												</Badge>
											</td>
											<td className="num">
												<Money cents={row.net} />
											</td>
											<td className="num td-muted">
												<Money cents={row.vat} />
											</td>
											<td className="num td-strong">
												<Money cents={row.gross} />
											</td>
											<td>
												<button
													type="button"
													className="btn btn--ghost btn--sm"
													onClick={(event) => {
														event.stopPropagation();
														setPreviewing(invoice);
													}}
												>
													View
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot>
								<tr>
									<td colSpan={5}>
										{visible.length} invoice
										{visible.length === 1 ? '' : 's'}
										{totals.outstanding > 0
											? ` · ${formatMoney(
													totals.outstanding,
											  )} outstanding`
											: ''}
									</td>
									<td className="num">
										<Money cents={totals.net} />
									</td>
									<td className="num">
										<Money cents={totals.vat} />
									</td>
									<td className="num">
										<Money
											cents={totals.net + totals.vat}
										/>
									</td>
									<td />
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</Card>

			{editing ? (
				<InvoiceEditor
					invoice={editing}
					onClose={closeEditor}
					onSave={persist}
					onPreview={setPreviewing}
				/>
			) : null}

			{previewing ? (
				<InvoicePreview
					invoice={previewing}
					onClose={() => setPreviewing(null)}
				/>
			) : null}
		</>
	);
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function InvoiceEditor({
	invoice,
	onClose,
	onSave,
	onPreview,
}: {
	invoice: Invoice;
	onClose: () => void;
	onSave: (invoice: Invoice) => Promise<void>;
	onPreview: (invoice: Invoice) => void;
}): JSX.Element {
	const store = useStore();
	const [working, setWorking] = useState<Invoice>(invoice);
	const [paymentAmount, setPaymentAmount] = useState<Cents>(0);
	const [paymentDate, setPaymentDate] = useState(today());

	const totals = invoiceTotals(working);
	const locked = working.lockedAt !== null;

	function update(patch: Partial<Invoice>): void {
		setWorking((current) => ({ ...current, ...patch }));
	}

	function selectContact(contactId: string): void {
		const contact = store.contacts.find(
			(candidate) => candidate.id === contactId,
		);
		if (!contact) {
			update({ contactId: null });
			return;
		}
		const isDutch =
			contact.address.country === 'NL' || contact.address.country === '';
		const treatment: SalesVatTreatment =
			store.settings.fiscal.vatScheme === 'kor'
				? 'kor'
				: isDutch
				? 'domestic'
				: contact.isBusiness && contact.vatId
				? 'eu_services'
				: 'export';

		update({
			contactId: contact.id,
			contactSnapshot: {
				name: contact.name,
				address: contact.address,
				vatId: contact.vatId,
				email: contact.email,
			},
			vatTreatment: locked ? working.vatTreatment : treatment,
			dueDate: addDays(
				working.issueDate,
				contact.defaultPaymentTermDays ??
					store.settings.invoicing.paymentTermDays,
			),
		});
	}

	async function markSent(): Promise<void> {
		const number =
			working.number ||
			formatInvoiceNumber(
				store.settings.invoicing.numberFormat,
				store.settings.invoicing.nextSequence,
				working.issueDate,
			);

		if (!working.number) {
			await store.saveSettings({
				...store.settings,
				invoicing: {
					...store.settings.invoicing,
					nextSequence: store.settings.invoicing.nextSequence + 1,
				},
			});
		}

		await onSave({
			...working,
			number,
			status: 'sent',
			lockedAt: nowTimestamp(),
		});
	}

	async function addPayment(): Promise<void> {
		if (paymentAmount <= 0) return;
		const payments = [
			...working.payments,
			{
				id: newId('pay'),
				date: paymentDate,
				amountCents: paymentAmount,
				method: '',
				reference: '',
			},
		];
		const paid = payments.reduce(
			(sum, payment) => sum + payment.amountCents,
			0,
		);
		const status: InvoiceStatus =
			paid >= totals.gross ? 'paid' : 'partially_paid';
		const next = { ...working, payments, status };
		setWorking(next);
		setPaymentAmount(0);
		await store.save('invoices', next);
	}

	const validationMessages: string[] = [];
	if (!working.contactSnapshot.name.trim()) {
		validationMessages.push('The invoice has no customer name.');
	}
	if (
		requiresCustomerVatId(working.vatTreatment) &&
		!working.contactSnapshot.vatId.trim()
	) {
		validationMessages.push(
			'This VAT treatment reverse-charges the VAT, which requires the customer’s VAT ID on the invoice. Without it you owe the Dutch VAT yourself.',
		);
	}
	if (working.lines.every((line) => line.description.trim() === '')) {
		validationMessages.push('None of the lines have a description.');
	}
	if (totals.gross === 0) {
		validationMessages.push('The invoice total is zero.');
	}
	if (!store.settings.business.vatId && working.vatTreatment !== 'kor') {
		validationMessages.push(
			'Your own BTW-id is not set in Settings — a Dutch invoice must show it.',
		);
	}

	return (
		<Modal
			wide
			title={working.number ? `Invoice ${working.number}` : 'New invoice'}
			onClose={onClose}
			footer={
				<>
					<ConfirmButton
						className="btn btn--danger"
						onConfirm={async () => {
							await store.remove('invoices', working.id);
							onClose();
						}}
					>
						Delete
					</ConfirmButton>
					<div style={{ flex: 1 }} />
					<button
						type="button"
						className="btn"
						onClick={() => onPreview(working)}
					>
						Preview
					</button>
					<button
						type="button"
						className="btn"
						onClick={() => void onSave(working)}
					>
						Save
					</button>
					{working.status === 'draft' ? (
						<button
							type="button"
							className="btn btn--primary"
							onClick={() => void markSent()}
						>
							Mark as sent
						</button>
					) : null}
				</>
			}
		>
			{locked ? (
				<Banner tone="info" title="This invoice has been sent">
					Sent invoices are part of your audit trail. You can still
					record payments and fix a typo, but changing amounts after
					the fact means issuing a credit note instead.
				</Banner>
			) : null}

			{validationMessages.length > 0 ? (
				<Banner tone="warning" title="Before you send this">
					<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
						{validationMessages.map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				</Banner>
			) : null}

			<div className="grid grid--2">
				<div>
					<Field label="Customer">
						<select
							value={working.contactId ?? ''}
							onChange={(event) =>
								selectContact(event.target.value)
							}
						>
							<option value="">— pick a contact —</option>
							{store.contacts
								.filter((contact) => !contact.archived)
								.map((contact) => (
									<option key={contact.id} value={contact.id}>
										{contact.name}
									</option>
								))}
						</select>
					</Field>
					<TextField
						label="Name on the invoice"
						value={working.contactSnapshot.name}
						onChange={(event) =>
							update({
								contactSnapshot: {
									...working.contactSnapshot,
									name: event.target.value,
								},
							})
						}
					/>
					<TextField
						label="Customer VAT ID"
						hint="Required whenever the VAT is reverse-charged."
						value={working.contactSnapshot.vatId}
						onChange={(event) =>
							update({
								contactSnapshot: {
									...working.contactSnapshot,
									vatId: event.target.value,
								},
							})
						}
					/>
				</div>

				<div>
					<TextField
						label="Invoice number"
						hint={
							working.number
								? undefined
								: `Assigned when you mark it as sent — next will be ${formatInvoiceNumber(
										store.settings.invoicing.numberFormat,
										store.settings.invoicing.nextSequence,
										working.issueDate,
								  )}.`
						}
						value={working.number}
						onChange={(event) =>
							update({ number: event.target.value })
						}
					/>
					<div className="grid grid--2">
						<TextField
							label="Invoice date"
							type="date"
							value={working.issueDate}
							onChange={(event) =>
								update({
									issueDate: event.target.value,
									dueDate: addDays(
										event.target.value,
										store.settings.invoicing
											.paymentTermDays,
									),
								})
							}
						/>
						<TextField
							label="Due date"
							type="date"
							value={working.dueDate}
							onChange={(event) =>
								update({ dueDate: event.target.value })
							}
						/>
					</div>
					<SelectField
						label="VAT treatment"
						hint={
							reverseChargeNoteFor(working.vatTreatment) ??
							undefined
						}
						value={working.vatTreatment}
						onValueChange={(value) =>
							update({ vatTreatment: value })
						}
						options={(
							Object.keys(
								SALES_TREATMENT_LABELS,
							) as SalesVatTreatment[]
						).map((value) => ({
							value,
							label: SALES_TREATMENT_LABELS[value],
						}))}
					/>
				</div>
			</div>

			<h3 style={{ margin: '10px 0 8px' }}>Lines</h3>
			<div className="table-wrap">
				<table className="line-items">
					<thead>
						<tr>
							<th style={{ width: '40%' }}>Description</th>
							<th style={{ width: 80 }}>Qty</th>
							<th style={{ width: 90 }}>Unit</th>
							<th style={{ width: 110 }}>Price</th>
							<th style={{ width: 80 }}>VAT</th>
							<th style={{ width: 70 }}>Disc %</th>
							<th className="num" style={{ width: 100 }}>
								Total
							</th>
							<th style={{ width: 34 }} />
						</tr>
					</thead>
					<tbody>
						{working.lines.map((line, index) => {
							const rowTotals = lineTotals(
								line,
								working.vatTreatment,
							);
							return (
								<tr key={line.id}>
									<td>
										<input
											value={line.description}
											placeholder="What you delivered"
											onChange={(event) =>
												update({
													lines: working.lines.map(
														(candidate) =>
															candidate.id ===
															line.id
																? {
																		...candidate,
																		description:
																			event
																				.target
																				.value,
																  }
																: candidate,
													),
												})
											}
										/>
									</td>
									<td>
										<input
											type="number"
											step="0.01"
											className="input--number"
											value={line.quantity}
											onChange={(event) =>
												update({
													lines: working.lines.map(
														(candidate) =>
															candidate.id ===
															line.id
																? {
																		...candidate,
																		quantity:
																			Number(
																				event
																					.target
																					.value,
																			) ||
																			0,
																  }
																: candidate,
													),
												})
											}
										/>
									</td>
									<td>
										<input
											value={line.unit}
											onChange={(event) =>
												update({
													lines: working.lines.map(
														(candidate) =>
															candidate.id ===
															line.id
																? {
																		...candidate,
																		unit: event
																			.target
																			.value,
																  }
																: candidate,
													),
												})
											}
										/>
									</td>
									<td>
										<input
											className="input--money"
											inputMode="decimal"
											value={(
												line.unitPriceCents / 100
											).toFixed(2)}
											onChange={(event) => {
												const value = Math.round(
													Number(
														event.target.value.replace(
															',',
															'.',
														),
													) * 100,
												);
												update({
													lines: working.lines.map(
														(candidate) =>
															candidate.id ===
															line.id
																? {
																		...candidate,
																		unitPriceCents:
																			Number.isFinite(
																				value,
																			)
																				? value
																				: 0,
																  }
																: candidate,
													),
												});
											}}
										/>
									</td>
									<td>
										<select
											value={line.vatRate}
											onChange={(event) =>
												update({
													lines: working.lines.map(
														(candidate) =>
															candidate.id ===
															line.id
																? {
																		...candidate,
																		vatRate:
																			Number(
																				event
																					.target
																					.value,
																			) as VatRate,
																  }
																: candidate,
													),
												})
											}
										>
											<option value={21}>21%</option>
											<option value={9}>9%</option>
											<option value={0}>0%</option>
										</select>
									</td>
									<td>
										<input
											type="number"
											className="input--number"
											value={line.discountPercent}
											onChange={(event) =>
												update({
													lines: working.lines.map(
														(candidate) =>
															candidate.id ===
															line.id
																? {
																		...candidate,
																		discountPercent:
																			Number(
																				event
																					.target
																					.value,
																			) ||
																			0,
																  }
																: candidate,
													),
												})
											}
										/>
									</td>
									<td className="num">
										<Money cents={rowTotals.gross} />
									</td>
									<td>
										{working.lines.length > 1 ? (
											<button
												type="button"
												className="btn btn--ghost btn--sm"
												aria-label={`Remove line ${
													index + 1
												}`}
												onClick={() =>
													update({
														lines: working.lines.filter(
															(candidate) =>
																candidate.id !==
																line.id,
														),
													})
												}
											>
												×
											</button>
										) : null}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div className="btn-row" style={{ margin: '10px 0 16px' }}>
				<button
					type="button"
					className="btn btn--sm"
					onClick={() =>
						update({
							lines: [
								...working.lines,
								newInvoiceLine({
									vatRate:
										store.settings.invoicing.defaultVatRate,
								}),
							],
						})
					}
				>
					Add line
				</button>
				<div style={{ flex: 1 }} />
				<dl className="dl" style={{ margin: 0 }}>
					<dt>Net</dt>
					<dd>
						<Money cents={totals.net} />
					</dd>
					<dt>VAT</dt>
					<dd>
						<Money cents={totals.vat} />
					</dd>
					<dt>Total</dt>
					<dd>
						<Money cents={totals.gross} bold />
					</dd>
				</dl>
			</div>

			<div className="grid grid--2">
				<TextArea
					label="Notes on the invoice"
					value={working.notes}
					onChange={(event) => update({ notes: event.target.value })}
				/>
				<div>
					<TextField
						label="Your reference / PO number"
						value={working.reference}
						onChange={(event) =>
							update({ reference: event.target.value })
						}
					/>
					{working.status !== 'draft' ? (
						<fieldset>
							<legend>
								Payments — {formatMoney(totals.paid)} of{' '}
								{formatMoney(totals.gross)} received
							</legend>
							{working.payments.map((payment) => (
								<div
									key={payment.id}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										fontSize: 13,
										padding: '3px 0',
									}}
								>
									<span>{formatDate(payment.date)}</span>
									<Money cents={payment.amountCents} />
								</div>
							))}
							{totals.outstanding > 0 ? (
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '1fr 1fr auto',
										gap: 8,
										alignItems: 'end',
									}}
								>
									<TextField
										label="Date"
										type="date"
										value={paymentDate}
										onChange={(event) =>
											setPaymentDate(event.target.value)
										}
									/>
									<MoneyField
										label="Amount"
										value={paymentAmount}
										onValueChange={setPaymentAmount}
									/>
									<button
										type="button"
										className="btn"
										style={{ marginBottom: 12 }}
										onClick={() => void addPayment()}
									>
										Record
									</button>
								</div>
							) : null}
						</fieldset>
					) : null}
					{working.status !== 'draft' &&
					working.status !== 'cancelled' ? (
						<Checkbox
							label="Cancel this invoice"
							hint="Keeps the record but takes it out of the BTW return and your revenue."
							checked={false}
							onCheckedChange={() =>
								update({ status: 'cancelled' })
							}
						/>
					) : null}
				</div>
			</div>
		</Modal>
	);
}

// ---------------------------------------------------------------------------
// Printable preview
// ---------------------------------------------------------------------------

function InvoicePreview({
	invoice,
	onClose,
}: {
	invoice: Invoice;
	onClose: () => void;
}): JSX.Element {
	const store = useStore();
	const business = store.settings.business;
	const totals = invoiceTotals(invoice);
	const note = reverseChargeNoteFor(invoice.vatTreatment);
	const address = invoice.contactSnapshot.address ?? EMPTY_ADDRESS;

	return (
		<Modal
			wide
			title={`Invoice ${invoice.number || '(draft)'}`}
			onClose={onClose}
			footer={
				<button
					type="button"
					className="btn btn--primary"
					onClick={() => window.print()}
				>
					Print / save as PDF
				</button>
			}
		>
			<div className="invoice-preview">
				<div className="invoice-preview__head">
					<div>
						<h2>Invoice</h2>
						<div style={{ color: '#5c6270', marginTop: 4 }}>
							{invoice.number || 'Draft — no number assigned'}
						</div>
					</div>
					<div style={{ textAlign: 'right' }}>
						<strong>
							{business.tradeName ||
								business.legalName ||
								'Your business'}
						</strong>
						<div>{business.address.line1}</div>
						<div>
							{business.address.postcode} {business.address.city}
						</div>
						<div>{business.address.country}</div>
						{business.email ? <div>{business.email}</div> : null}
					</div>
				</div>

				<div className="invoice-preview__parties">
					<div>
						<div style={{ color: '#5c6270', fontSize: 12 }}>
							Bill to
						</div>
						<strong>{invoice.contactSnapshot.name}</strong>
						<div>{address.line1}</div>
						<div>
							{address.postcode} {address.city}
						</div>
						<div>{address.country}</div>
						{invoice.contactSnapshot.vatId ? (
							<div style={{ marginTop: 6 }}>
								VAT ID: {invoice.contactSnapshot.vatId}
							</div>
						) : null}
					</div>
					<div style={{ textAlign: 'right' }}>
						<div>
							<span style={{ color: '#5c6270' }}>
								Invoice date:{' '}
							</span>
							{formatDate(invoice.issueDate)}
						</div>
						<div>
							<span style={{ color: '#5c6270' }}>Due date: </span>
							{formatDate(invoice.dueDate)}
						</div>
						{invoice.reference ? (
							<div>
								<span style={{ color: '#5c6270' }}>
									Reference:{' '}
								</span>
								{invoice.reference}
							</div>
						) : null}
						{business.kvkNumber ? (
							<div>
								<span style={{ color: '#5c6270' }}>KvK: </span>
								{business.kvkNumber}
							</div>
						) : null}
						{business.vatId ? (
							<div>
								<span style={{ color: '#5c6270' }}>
									BTW-id:{' '}
								</span>
								{business.vatId}
							</div>
						) : null}
					</div>
				</div>

				<table>
					<thead>
						<tr>
							<th>Description</th>
							<th className="num">Qty</th>
							<th className="num">Price</th>
							<th className="num">VAT</th>
							<th className="num">Amount</th>
						</tr>
					</thead>
					<tbody>
						{invoice.lines.map((line) => {
							const row = lineTotals(line, invoice.vatTreatment);
							return (
								<tr key={line.id}>
									<td>{line.description || '—'}</td>
									<td className="num">
										{line.quantity} {line.unit}
									</td>
									<td className="num">
										{formatMoney(line.unitPriceCents)}
									</td>
									<td className="num">{row.vatRate}%</td>
									<td className="num">
										{formatMoney(row.net)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				<table className="invoice-preview__totals">
					<tbody>
						<tr>
							<td>Subtotal</td>
							<td className="num">{formatMoney(totals.net)}</td>
						</tr>
						{Object.entries(totals.vatByRate)
							.filter(([, vat]) => vat !== 0)
							.map(([rate, vat]) => (
								<tr key={rate}>
									<td>VAT {rate}%</td>
									<td className="num">{formatMoney(vat)}</td>
								</tr>
							))}
						<tr>
							<td style={{ fontWeight: 600 }}>Total</td>
							<td className="num" style={{ fontWeight: 600 }}>
								{formatMoney(totals.gross)}
							</td>
						</tr>
					</tbody>
				</table>

				{note ? (
					<p style={{ marginTop: 26, color: '#5c6270' }}>{note}</p>
				) : null}
				{invoice.notes ? (
					<p style={{ marginTop: 12 }}>{invoice.notes}</p>
				) : null}
				{business.iban ? (
					<p style={{ marginTop: 20, color: '#5c6270' }}>
						Please pay {formatMoney(totals.gross)} by{' '}
						{formatDate(invoice.dueDate)} to {business.iban}
						{invoice.number ? `, quoting ${invoice.number}` : ''}.
					</p>
				) : null}
				{store.settings.invoicing.footerText ? (
					<p
						style={{
							marginTop: 20,
							fontSize: 12,
							color: '#878d9b',
						}}
					>
						{store.settings.invoicing.footerText}
					</p>
				) : null}
			</div>
		</Modal>
	);
}
