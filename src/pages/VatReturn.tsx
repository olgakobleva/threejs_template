import { useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import {
	currentPeriod,
	formatDate,
	nextPeriod,
	periodKey,
	periodLabel,
	previousPeriod,
	today,
	vatFilingDeadline,
	type Period,
} from '@/core/dates';
import { formatMoney, toDecimalString } from '@/core/money';
import { downloadFile, toCsv } from '@/core/csv';
import { newId, nowTimestamp } from '@/core/id';
import {
	computeVatReturn,
	EMPTY_ADJUSTMENTS,
	type VatReturnAdjustments,
} from '@/tax/nl/vatReturn';
import { computeIcp, reconcileWithBox3b } from '@/tax/nl/icp';
import { taxYearParameters } from '@/tax/nl/years';
import {
	Badge,
	Banner,
	Card,
	EmptyState,
	Money,
	MoneyField,
	PageHeader,
	Stat,
	Tabs,
} from '@/ui/components';
import { href } from '@/app/router';

export function VatReturnPage(): JSX.Element {
	const store = useStore();
	const [tab, setTab] = useState<'return' | 'icp'>('return');
	const [period, setPeriod] = useState<Period>(() =>
		currentPeriod(store.settings.fiscal.vatPeriod, today()),
	);
	const [adjustments, setAdjustments] =
		useState<VatReturnAdjustments>(EMPTY_ADJUSTMENTS);

	const params = taxYearParameters(
		period.year,
		store.settings.taxYearOverrides,
	);

	const result = useMemo(
		() =>
			computeVatReturn(
				period,
				store.invoices,
				store.expenses,
				store.settings,
				adjustments,
			),
		[period, store.invoices, store.expenses, store.settings, adjustments],
	);

	const icp = useMemo(
		() => computeIcp(period, store.invoices),
		[period, store.invoices],
	);

	const box3b = result.boxes.find((box) => box.code === '3b');
	const reconciliation = box3b
		? reconcileWithBox3b(icp, box3b.turnover ?? 0)
		: null;

	const filed = store.filedVatReturns.find(
		(record) => record.periodKey === periodKey(period),
	);

	async function markFiled(): Promise<void> {
		await store.save('filedVatReturns', {
			id: newId('vat'),
			periodKey: periodKey(period),
			filedOn: today(),
			snapshot: result,
			paidOn: null,
			notes: '',
			createdAt: nowTimestamp(),
		});
	}

	function exportBoxes(): void {
		downloadFile(
			`btw-${periodKey(period)}.csv`,
			toCsv(
				result.boxes.map((box) => ({
					box: box.code,
					description: box.label,
					turnover:
						box.turnover === null
							? ''
							: toDecimalString(box.turnover),
					vat: box.vat === null ? '' : toDecimalString(box.vat),
				})),
			),
			'text/csv',
		);
	}

	return (
		<>
			<PageHeader
				title="BTW return"
				description="The figures for your omzetbelasting aangifte, box by box, in the order the Belastingdienst form asks for them."
				actions={
					<>
						<button
							type="button"
							className="btn"
							onClick={exportBoxes}
						>
							Export CSV
						</button>
						{!filed && !result.notApplicable ? (
							<button
								type="button"
								className="btn btn--primary"
								onClick={() => void markFiled()}
							>
								Mark as filed
							</button>
						) : null}
					</>
				}
			/>

			<div className="toolbar">
				<button
					type="button"
					className="btn btn--sm"
					onClick={() => setPeriod(previousPeriod(period))}
				>
					← Previous
				</button>
				<strong style={{ minWidth: 130, textAlign: 'center' }}>
					{periodLabel(period)}
				</strong>
				<button
					type="button"
					className="btn btn--sm"
					onClick={() => setPeriod(nextPeriod(period))}
				>
					Next →
				</button>
				<div className="toolbar__spacer" />
				<span className="td-muted" style={{ fontSize: 12.5 }}>
					Deadline {formatDate(vatFilingDeadline(period))}
				</span>
				{filed ? (
					<Badge tone="success">
						Filed {formatDate(filed.filedOn)}
					</Badge>
				) : null}
			</div>

			{result.notApplicable ? (
				<Card>
					<EmptyState title="No return to file">
						{result.notApplicableReason}
					</EmptyState>
				</Card>
			) : (
				<>
					{!params.verifiedByUser ? (
						<Banner tone="warning" title="Unverified figures">
							The {period.year} parameters have not been checked
							by you. The BTW rates themselves rarely move, but
							confirm them in{' '}
							<a href={href('settings')}>Settings → Tax years</a>{' '}
							before filing.
						</Banner>
					) : null}

					{result.warnings.map((warning) => (
						<Banner key={warning} tone="warning">
							{warning}
						</Banner>
					))}

					<div className="grid grid--3" style={{ marginBottom: 16 }}>
						<Stat
							label="VAT charged (5a)"
							value={formatMoney(result.totalDue)}
						/>
						<Stat
							label="Input VAT (5b)"
							value={formatMoney(result.totalInputVat)}
						/>
						<Stat
							label={
								result.balance >= 0 ? 'To pay' : 'To reclaim'
							}
							value={formatMoney(Math.abs(result.balance))}
							tone={result.balance >= 0 ? 'danger' : 'success'}
							note={`By ${formatDate(vatFilingDeadline(period))}`}
						/>
					</div>

					<Tabs
						active={tab}
						onChange={setTab}
						tabs={[
							{ id: 'return', label: 'Return' },
							{
								id: 'icp',
								label: `ICP declaration${
									icp.lines.length > 0
										? ` (${icp.lines.length})`
										: ''
								}`,
							},
						]}
					/>

					{tab === 'return' ? (
						<>
							<Card flush>
								<div className="table-wrap">
									<table>
										<thead>
											<tr>
												<th style={{ width: 50 }}>
													Box
												</th>
												<th>Description</th>
												<th className="num">
													Turnover
												</th>
												<th className="num">VAT</th>
											</tr>
										</thead>
										<tbody>
											{result.boxes.map((box) => (
												<tr key={box.code}>
													<td className="mono td-strong">
														{box.code}
													</td>
													<td>{box.label}</td>
													<td className="num">
														{box.turnover ===
														null ? (
															<span className="td-muted">
																—
															</span>
														) : (
															<Money
																cents={
																	box.turnover
																}
															/>
														)}
													</td>
													<td className="num">
														{box.vat === null ? (
															<span className="td-muted">
																—
															</span>
														) : (
															<Money
																cents={box.vat}
															/>
														)}
													</td>
												</tr>
											))}
											<tr>
												<td className="mono td-strong">
													5a
												</td>
												<td className="td-strong">
													Total VAT payable
												</td>
												<td className="num td-muted">
													—
												</td>
												<td className="num td-strong">
													<Money
														cents={result.totalDue}
													/>
												</td>
											</tr>
											<tr>
												<td className="mono td-strong">
													5b
												</td>
												<td className="td-strong">
													Input VAT (voorbelasting)
												</td>
												<td className="num td-muted">
													—
												</td>
												<td className="num td-strong">
													<Money
														cents={
															result.totalInputVat
														}
													/>
												</td>
											</tr>
										</tbody>
										<tfoot>
											<tr>
												<td className="mono">5c</td>
												<td>
													{result.balance >= 0
														? 'To pay'
														: 'To reclaim'}
												</td>
												<td className="num">—</td>
												<td className="num">
													<Money
														cents={Math.abs(
															result.balance,
														)}
													/>
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							</Card>

							<Card
								title="Adjustments"
								description="Things the app cannot derive from your records."
							>
								<div className="grid grid--3">
									<MoneyField
										label="Private use — turnover (1d)"
										hint="Usually only in the final return of the year."
										value={adjustments.privateUseTurnover}
										onValueChange={(value) =>
											setAdjustments({
												...adjustments,
												privateUseTurnover: value,
											})
										}
									/>
									<MoneyField
										label="Private use — VAT (1d)"
										value={adjustments.privateUseVat}
										onValueChange={(value) =>
											setAdjustments({
												...adjustments,
												privateUseVat: value,
											})
										}
									/>
									<MoneyField
										label="Extra input VAT (5b)"
										hint="A correction carried over from an earlier period, for example."
										value={adjustments.extraInputVat}
										onValueChange={(value) =>
											setAdjustments({
												...adjustments,
												extraInputVat: value,
											})
										}
									/>
								</div>
								<p
									className="field__hint"
									style={{ marginBottom: 0 }}
								>
									Adjustments are not saved with the period —
									they apply to what you are looking at now.
									Note them down when you file.
								</p>
							</Card>

							<Card title="What went into this">
								<p
									className="td-muted"
									style={{ marginBottom: 0 }}
								>
									{result.invoiceCount} invoice
									{result.invoiceCount === 1
										? ''
										: 's'} and {result.expenseCount} expense
									{result.expenseCount === 1 ? '' : 's'} dated
									inside {result.periodLabel}. VAT follows the
									invoice date, not the payment date — an
									invoice you sent in March but were paid for
									in May belongs to Q1.
								</p>
							</Card>
						</>
					) : (
						<>
							{icp.warnings.map((warning) => (
								<Banner key={warning} tone="warning">
									{warning}
								</Banner>
							))}
							{reconciliation ? (
								<Banner
									tone="danger"
									title="ICP does not reconcile with box 3b"
								>
									{reconciliation}
								</Banner>
							) : null}

							<Card flush>
								{icp.lines.length === 0 ? (
									<EmptyState title="Nothing to declare">
										No reverse-charged supplies to EU
										businesses in {result.periodLabel}. The
										ICP declaration is only needed when box
										3b is non-zero.
									</EmptyState>
								) : (
									<div className="table-wrap">
										<table>
											<thead>
												<tr>
													<th>Country</th>
													<th>VAT ID</th>
													<th>Customer</th>
													<th className="num">
														Goods
													</th>
													<th className="num">
														Services
													</th>
													<th className="num">
														Total
													</th>
												</tr>
											</thead>
											<tbody>
												{icp.lines.map((line) => (
													<tr key={line.vatId}>
														<td>
															{line.countryCode}
														</td>
														<td className="mono">
															{line.vatId}
														</td>
														<td>
															{line.customerName}
														</td>
														<td className="num">
															<Money
																cents={
																	line.goodsCents
																}
															/>
														</td>
														<td className="num">
															<Money
																cents={
																	line.servicesCents
																}
															/>
														</td>
														<td className="num td-strong">
															<Money
																cents={
																	line.goodsCents +
																	line.servicesCents
																}
															/>
														</td>
													</tr>
												))}
											</tbody>
											<tfoot>
												<tr>
													<td colSpan={5}>
														Total — must equal box
														3b
													</td>
													<td className="num">
														<Money
															cents={
																icp.totalCents
															}
														/>
													</td>
												</tr>
											</tfoot>
										</table>
									</div>
								)}
							</Card>
						</>
					)}
				</>
			)}

			<Banner tone="info" title="This is a worksheet, not a filing">
				Nothing here is submitted anywhere. Copy the figures into Mijn
				Belastingdienst Zakelijk yourself, and keep the export alongside
				the invoices and receipts that produced them.
			</Banner>
		</>
	);
}
