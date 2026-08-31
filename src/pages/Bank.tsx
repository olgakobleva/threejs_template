import { useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import type { BankMatchType, BankTransaction } from '@/domain/types';
import { newExpense } from '@/domain/defaults';
import {
	detectDelimiter,
	downloadFile,
	parseCsv,
	toCsv,
	type CsvRow,
} from '@/core/csv';
import { formatDate, isValidISODate, toISODate } from '@/core/dates';
import { formatMoney, parseAmount, toDecimalString } from '@/core/money';
import { newId, nowTimestamp } from '@/core/id';
import { invoiceTotals } from '@/tax/nl/vat';
import { suggestCategory } from '@/tax/nl/deductibility';
import {
	Badge,
	Banner,
	Card,
	ConfirmButton,
	EmptyState,
	FileDrop,
	Modal,
	Money,
	PageHeader,
	SelectField,
	Stat,
} from '@/ui/components';

const MATCH_LABEL: Record<BankMatchType, string> = {
	invoice: 'Invoice payment',
	expense: 'Business expense',
	private: 'Private',
	transfer: 'Own transfer',
	unmatched: 'Unmatched',
};

interface ColumnMapping {
	date: string;
	amount: string;
	counterparty: string;
	description: string;
	iban: string;
	/** Some exports use a separate debit/credit indicator instead of a sign. */
	directionColumn: string;
	debitValue: string;
}

export function Bank(): JSX.Element {
	const store = useStore();
	const [importing, setImporting] = useState<{
		rows: CsvRow[];
		columns: string[];
	} | null>(null);
	const [filter, setFilter] = useState<'all' | BankMatchType>('all');

	const transactions = useMemo(
		() =>
			store.bankTransactions
				.filter(
					(transaction) =>
						filter === 'all' || transaction.matchType === filter,
				)
				.sort((a, b) => b.date.localeCompare(a.date)),
		[store.bankTransactions, filter],
	);

	const unmatched = store.bankTransactions.filter(
		(transaction) => transaction.matchType === 'unmatched',
	);
	const moneyIn = store.bankTransactions
		.filter((transaction) => transaction.amountCents > 0)
		.reduce((sum, transaction) => sum + transaction.amountCents, 0);
	const moneyOut = store.bankTransactions
		.filter((transaction) => transaction.amountCents < 0)
		.reduce((sum, transaction) => sum + transaction.amountCents, 0);

	function handleFile(files: File[]): void {
		const file = files[0];
		if (!file) return;
		void file.text().then((text) => {
			const rows = parseCsv(text, detectDelimiter(text));
			if (rows.length === 0) return;
			setImporting({ rows, columns: Object.keys(rows[0] as CsvRow) });
		});
	}

	function exportCsv(): void {
		downloadFile(
			`bank-transactions-${toISODate(new Date())}.csv`,
			toCsv(
				store.bankTransactions.map((transaction) => ({
					date: transaction.date,
					amount: toDecimalString(transaction.amountCents),
					counterparty: transaction.counterparty,
					iban: transaction.counterpartyIban,
					description: transaction.description,
					classification: transaction.matchType,
					notes: transaction.notes,
				})),
			),
			'text/csv',
		);
	}

	return (
		<>
			<PageHeader
				title="Bank"
				description="Import your statement and tie every line to an invoice, an expense, or a private withdrawal. What is left unmatched is what your books are missing."
				actions={
					store.bankTransactions.length > 0 ? (
						<button
							type="button"
							className="btn"
							onClick={exportCsv}
						>
							Export CSV
						</button>
					) : null
				}
			/>

			{store.bankTransactions.length > 0 ? (
				<div className="grid grid--3" style={{ marginBottom: 16 }}>
					<Stat
						label="Money in"
						value={formatMoney(moneyIn)}
						tone="success"
					/>
					<Stat
						label="Money out"
						value={formatMoney(Math.abs(moneyOut))}
					/>
					<Stat
						label="Unmatched"
						value={String(unmatched.length)}
						tone={unmatched.length > 0 ? 'danger' : 'success'}
						note={
							unmatched.length > 0
								? 'Each one is a missing receipt or an unrecorded payment'
								: 'Everything is accounted for'
						}
					/>
				</div>
			) : null}

			<FileDrop
				accept=".csv,text/csv"
				label="Drop a CSV export from your bank"
				hint="Most Dutch banks export CSV directly. You choose which columns mean what on the next screen."
				onFiles={handleFile}
			/>

			{store.bankTransactions.length > 0 ? (
				<>
					<div className="toolbar" style={{ marginTop: 18 }}>
						<select
							value={filter}
							onChange={(event) =>
								setFilter(
									event.target.value as 'all' | BankMatchType,
								)
							}
						>
							<option value="all">All transactions</option>
							{(Object.keys(MATCH_LABEL) as BankMatchType[]).map(
								(value) => (
									<option key={value} value={value}>
										{MATCH_LABEL[value]}
									</option>
								),
							)}
						</select>
						<div className="toolbar__spacer" />
						<ConfirmButton
							className="btn btn--danger btn--sm"
							onConfirm={async () => {
								for (const transaction of store.bankTransactions) {
									await store.remove(
										'bankTransactions',
										transaction.id,
									);
								}
							}}
						>
							Clear all transactions
						</ConfirmButton>
					</div>

					<Card flush>
						<div className="table-wrap">
							<table>
								<thead>
									<tr>
										<th>Date</th>
										<th>Counterparty</th>
										<th>Description</th>
										<th className="num">Amount</th>
										<th>Classification</th>
										<th />
									</tr>
								</thead>
								<tbody>
									{transactions.map((transaction) => (
										<TransactionRow
											key={transaction.id}
											transaction={transaction}
										/>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				</>
			) : (
				<Card>
					<EmptyState title="No bank data imported">
						Importing your statement is the cheapest way to find
						receipts you forgot to book. Nothing is uploaded — the
						file is parsed in this browser.
					</EmptyState>
				</Card>
			)}

			{importing ? (
				<ImportDialog
					rows={importing.rows}
					columns={importing.columns}
					onClose={() => setImporting(null)}
				/>
			) : null}
		</>
	);
}

function TransactionRow({
	transaction,
}: {
	transaction: BankTransaction;
}): JSX.Element {
	const store = useStore();

	/** Invoices whose outstanding amount matches this credit, within a few cents. */
	const candidates = useMemo(() => {
		if (transaction.amountCents <= 0) return [];
		return store.invoices
			.filter(
				(invoice) =>
					invoice.status === 'sent' ||
					invoice.status === 'partially_paid',
			)
			.filter(
				(invoice) =>
					Math.abs(
						invoiceTotals(invoice).outstanding -
							transaction.amountCents,
					) < 100,
			);
	}, [store.invoices, transaction.amountCents]);

	async function classify(matchType: BankMatchType): Promise<void> {
		await store.save('bankTransactions', {
			...transaction,
			matchType,
			matchedId: null,
		});
	}

	async function settleInvoice(invoiceId: string): Promise<void> {
		const invoice = store.invoices.find(
			(candidate) => candidate.id === invoiceId,
		);
		if (!invoice) return;

		const payments = [
			...invoice.payments,
			{
				id: newId('pay'),
				date: transaction.date,
				amountCents: transaction.amountCents,
				method: 'bank',
				reference: transaction.description,
			},
		];
		const paid = payments.reduce(
			(sum, payment) => sum + payment.amountCents,
			0,
		);

		await store.save('invoices', {
			...invoice,
			payments,
			status:
				paid >= invoiceTotals(invoice).gross
					? 'paid'
					: 'partially_paid',
		});
		await store.save('bankTransactions', {
			...transaction,
			matchType: 'invoice',
			matchedId: invoice.id,
		});
	}

	async function createExpense(): Promise<void> {
		const suggested = suggestCategory(
			`${transaction.counterparty} ${transaction.description}`,
			store.categories,
		);
		const expense = newExpense({
			date: transaction.date,
			supplierName: transaction.counterparty,
			description: transaction.description,
			categoryId: suggested?.id ?? 'uncategorised',
			netCents: Math.abs(transaction.amountCents),
			vatCents: 0,
			vatRate: suggested?.typicalVatRate ?? 21,
			profitDeductiblePercent: suggested?.profitDeductiblePercent ?? 0,
			vatDeductiblePercent: suggested?.vatDeductiblePercent ?? 0,
			paymentMethod: 'bank',
			status: 'unreviewed',
		});
		await store.save('expenses', expense);
		await store.save('bankTransactions', {
			...transaction,
			matchType: 'expense',
			matchedId: expense.id,
		});
	}

	return (
		<tr>
			<td>{formatDate(transaction.date)}</td>
			<td className="td-strong">{transaction.counterparty || '—'}</td>
			<td className="td-muted" style={{ maxWidth: 320 }}>
				{transaction.description}
			</td>
			<td
				className="num"
				style={{
					color:
						transaction.amountCents > 0
							? 'var(--success)'
							: 'var(--text)',
				}}
			>
				<Money cents={transaction.amountCents} />
			</td>
			<td>
				<Badge
					tone={
						transaction.matchType === 'unmatched'
							? 'warning'
							: transaction.matchType === 'private'
							? undefined
							: 'success'
					}
				>
					{MATCH_LABEL[transaction.matchType]}
				</Badge>
			</td>
			<td>
				{transaction.matchType === 'unmatched' ? (
					<div className="btn-row">
						{candidates.length > 0 ? (
							<button
								type="button"
								className="btn btn--sm btn--primary"
								onClick={() =>
									void settleInvoice(candidates[0]!.id)
								}
							>
								Settle {candidates[0]!.number}
							</button>
						) : null}
						{transaction.amountCents < 0 ? (
							<button
								type="button"
								className="btn btn--sm"
								onClick={() => void createExpense()}
							>
								Make expense
							</button>
						) : null}
						<button
							type="button"
							className="btn btn--sm btn--ghost"
							onClick={() => void classify('private')}
						>
							Private
						</button>
					</div>
				) : (
					<button
						type="button"
						className="btn btn--sm btn--ghost"
						onClick={() => void classify('unmatched')}
					>
						Undo
					</button>
				)}
			</td>
		</tr>
	);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function guessColumn(columns: string[], needles: string[]): string {
	for (const needle of needles) {
		const match = columns.find((column) =>
			column.toLowerCase().includes(needle),
		);
		if (match) return match;
	}
	return '';
}

function ImportDialog({
	rows,
	columns,
	onClose,
}: {
	rows: CsvRow[];
	columns: string[];
	onClose: () => void;
}): JSX.Element {
	const store = useStore();
	const [mapping, setMapping] = useState<ColumnMapping>(() => ({
		date: guessColumn(columns, ['datum', 'date', 'boekdatum']),
		amount: guessColumn(columns, ['bedrag', 'amount', 'transactiebedrag']),
		counterparty: guessColumn(columns, [
			'naam',
			'tegenrekening houder',
			'counterparty',
			'name',
		]),
		description: guessColumn(columns, [
			'omschrijving',
			'description',
			'mededelingen',
		]),
		iban: guessColumn(columns, [
			'tegenrekening',
			'iban',
			'counterparty iban',
		]),
		directionColumn: guessColumn(columns, [
			'af bij',
			'debit',
			'credit',
			'debet',
		]),
		debitValue: 'Af',
	}));

	const options = [
		{ value: '', label: '— not present —' },
		...columns.map((column) => ({
			value: column,
			label: column,
		})),
	];

	const preview = useMemo(
		() =>
			rows
				.slice(0, 5)
				.map((row) => convertRow(row, mapping))
				.filter(Boolean),
		[rows, mapping],
	);

	async function runImport(): Promise<void> {
		const batchId = newId('imp');
		const converted = rows
			.map((row) => convertRow(row, mapping))
			.filter(
				(row): row is Omit<BankTransaction, 'id' | 'importBatchId'> =>
					row !== null,
			);

		const existing = new Set(
			store.bankTransactions.map(
				(transaction) =>
					`${transaction.date}|${transaction.amountCents}|${transaction.description}`,
			),
		);

		const records: BankTransaction[] = converted
			.filter(
				(row) =>
					!existing.has(
						`${row.date}|${row.amountCents}|${row.description}`,
					),
			)
			.map((row) => ({
				...row,
				id: newId('txn'),
				importBatchId: batchId,
			}));

		await store.saveMany('bankTransactions', records);
		onClose();
	}

	const skipped = rows.length - preview.length * (rows.length <= 5 ? 1 : 0);

	return (
		<Modal
			wide
			title={`Import ${rows.length} rows`}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="btn" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn--primary"
						disabled={!mapping.date || !mapping.amount}
						onClick={() => void runImport()}
					>
						Import
					</button>
				</>
			}
		>
			<p className="td-muted">
				Tell the app which columns mean what. Rows that already exist —
				same date, amount and description — are skipped, so re-importing
				an overlapping period is safe.
			</p>

			<div className="grid grid--3">
				<SelectField
					label="Date"
					value={mapping.date}
					onValueChange={(value) =>
						setMapping({ ...mapping, date: value })
					}
					options={options}
				/>
				<SelectField
					label="Amount"
					value={mapping.amount}
					onValueChange={(value) =>
						setMapping({ ...mapping, amount: value })
					}
					options={options}
				/>
				<SelectField
					label="Counterparty"
					value={mapping.counterparty}
					onValueChange={(value) =>
						setMapping({ ...mapping, counterparty: value })
					}
					options={options}
				/>
				<SelectField
					label="Description"
					value={mapping.description}
					onValueChange={(value) =>
						setMapping({ ...mapping, description: value })
					}
					options={options}
				/>
				<SelectField
					label="Counterparty IBAN"
					value={mapping.iban}
					onValueChange={(value) =>
						setMapping({ ...mapping, iban: value })
					}
					options={options}
				/>
				<SelectField
					label="Debit/credit column"
					hint="Only if amounts are unsigned and a separate column says Af/Bij."
					value={mapping.directionColumn}
					onValueChange={(value) =>
						setMapping({ ...mapping, directionColumn: value })
					}
					options={options}
				/>
			</div>

			{mapping.directionColumn ? (
				<SelectField
					label="Value that means money out"
					value={mapping.debitValue}
					onValueChange={(value) =>
						setMapping({ ...mapping, debitValue: value })
					}
					options={[
						...new Set(
							rows.map(
								(row) => row[mapping.directionColumn] ?? '',
							),
						),
					]
						.filter(Boolean)
						.map((value) => ({ value, label: value }))}
				/>
			) : null}

			<h3 style={{ margin: '16px 0 8px' }}>Preview</h3>
			{preview.length === 0 ? (
				<Banner tone="warning">
					None of the rows could be read with this mapping. Check the
					date and amount columns.
				</Banner>
			) : (
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Date</th>
								<th>Counterparty</th>
								<th>Description</th>
								<th className="num">Amount</th>
							</tr>
						</thead>
						<tbody>
							{preview.map((row, index) => (
								<tr key={index}>
									<td>{row!.date}</td>
									<td>{row!.counterparty}</td>
									<td className="td-muted">
										{row!.description}
									</td>
									<td className="num">
										<Money cents={row!.amountCents} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{skipped > 0 && preview.length > 0 ? null : null}
		</Modal>
	);
}

function convertRow(
	row: CsvRow,
	mapping: ColumnMapping,
): Omit<BankTransaction, 'id' | 'importBatchId'> | null {
	const rawDate = row[mapping.date] ?? '';
	const date = normaliseDate(rawDate);
	if (!date) return null;

	const parsed = parseAmount(row[mapping.amount] ?? '');
	if (parsed === null) return null;

	let amountCents = parsed;
	if (mapping.directionColumn) {
		const direction = (row[mapping.directionColumn] ?? '').trim();
		amountCents =
			direction.toLowerCase() === mapping.debitValue.toLowerCase()
				? -Math.abs(parsed)
				: Math.abs(parsed);
	}

	return {
		date,
		amountCents,
		counterparty: row[mapping.counterparty] ?? '',
		counterpartyIban: row[mapping.iban] ?? '',
		description: row[mapping.description] ?? '',
		matchType: 'unmatched',
		matchedId: null,
		notes: '',
		createdAt: nowTimestamp(),
		updatedAt: nowTimestamp(),
	};
}

/** Handles YYYY-MM-DD, YYYYMMDD and DD-MM-YYYY, which covers the Dutch banks. */
function normaliseDate(value: string): string | null {
	const trimmed = value.trim();
	if (isValidISODate(trimmed)) return trimmed;

	const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
	if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

	const dutch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
	if (dutch) {
		return `${dutch[3]}-${String(dutch[2]).padStart(2, '0')}-${String(
			dutch[1],
		).padStart(2, '0')}`;
	}

	const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
	if (iso) {
		return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(
			iso[3],
		).padStart(2, '0')}`;
	}

	return null;
}
