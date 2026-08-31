import { useMemo } from 'react';
import { useStore } from '@/storage/StoreProvider';
import {
	currentPeriod,
	formatDate,
	today,
	vatFilingDeadline,
	daysBetween,
	yearOf,
} from '@/core/dates';
import { formatMoney } from '@/core/money';
import { computeVatReturn } from '@/tax/nl/vatReturn';
import { computeIncomeTax } from '@/tax/nl/incomeTax';
import { taxYearParameters } from '@/tax/nl/years';
import { invoiceTotals, isOverdue } from '@/tax/nl/vat';
import {
	Badge,
	Banner,
	Card,
	EmptyState,
	Money,
	PageHeader,
	Stat,
} from '@/ui/components';
import { href } from '@/app/router';

export function Dashboard(): JSX.Element {
	const store = useStore();
	const now = today();
	const year = yearOf(now);
	const params = taxYearParameters(year, store.settings.taxYearOverrides);

	const vatPeriodKind = store.settings.fiscal.vatPeriod;
	const period = currentPeriod(vatPeriodKind, now);

	const vatReturn = useMemo(
		() =>
			computeVatReturn(
				period,
				store.invoices,
				store.expenses,
				store.settings,
			),
		[period, store.invoices, store.expenses, store.settings],
	);

	const estimate = useMemo(
		() =>
			computeIncomeTax({
				year,
				invoices: store.invoices,
				expenses: store.expenses,
				assets: store.assets,
				mileage: store.mileage,
				hours: store.hours,
				categories: store.categories,
				settings: store.settings,
				params,
			}),
		[year, store, params],
	);

	const outstanding = useMemo(
		() =>
			store.invoices
				.filter(
					(invoice) =>
						invoice.status === 'sent' ||
						invoice.status === 'partially_paid',
				)
				.map((invoice) => ({ invoice, totals: invoiceTotals(invoice) }))
				.sort((a, b) =>
					a.invoice.dueDate.localeCompare(b.invoice.dueDate),
				),
		[store.invoices],
	);

	const outstandingTotal = outstanding.reduce(
		(sum, row) => sum + row.totals.outstanding,
		0,
	);
	const overdue = outstanding.filter((row) => isOverdue(row.invoice, now));

	const unreviewed = store.expenses.filter(
		(expense) => expense.status === 'unreviewed',
	);
	const deadline = vatFilingDeadline(period);
	const daysToDeadline = daysBetween(now, deadline);

	const hoursProgress = Math.min(
		100,
		(estimate.hoursLogged / Math.max(1, params.hoursCriterion)) * 100,
	);

	const isEmpty =
		store.invoices.length === 0 &&
		store.expenses.length === 0 &&
		store.contacts.length === 0;

	if (isEmpty) {
		return (
			<>
				<PageHeader
					title="Dashboard"
					description="Bookkeeping for a Dutch sole trader, in English, stored on this device."
				/>
				<Card>
					<EmptyState title="Nothing in the books yet">
						Start by setting up your business details, then add your
						first invoice or drop a receipt into the expenses page.
					</EmptyState>
					<div
						className="btn-row"
						style={{ justifyContent: 'center' }}
					>
						<a className="btn btn--primary" href={href('settings')}>
							Set up the business
						</a>
						<a className="btn" href={href('invoices')}>
							Create an invoice
						</a>
						<a className="btn" href={href('expenses')}>
							Add a receipt
						</a>
					</div>
				</Card>
			</>
		);
	}

	return (
		<>
			<PageHeader
				title="Dashboard"
				description={`Your position for ${year}, and the ${vatReturn.periodLabel} BTW return.`}
			/>

			{!params.verifiedByUser ? (
				<Banner
					tone="warning"
					title={`The ${year} tax figures are unverified`}
				>
					Rates, deductions and credits were pre-filled from public
					sources and have not been checked by you. Every number on
					the tax pages is an estimate until you verify them in{' '}
					<a href={href('settings')}>Settings → Tax years</a>.
				</Banner>
			) : null}

			{daysToDeadline >= 0 &&
			daysToDeadline <= 21 &&
			!vatReturn.notApplicable ? (
				<Banner
					tone={daysToDeadline <= 7 ? 'danger' : 'warning'}
					title="BTW deadline"
				>
					The {vatReturn.periodLabel} return is due by{' '}
					{formatDate(deadline)} — {daysToDeadline} day
					{daysToDeadline === 1 ? '' : 's'} away.{' '}
					<a href={href('vat')}>Review it</a>.
				</Banner>
			) : null}

			<div className="grid grid--4" style={{ marginBottom: 16 }}>
				<Stat
					label={`Revenue ${year}`}
					value={formatMoney(estimate.pnl.revenueCents)}
					note={`${estimate.pnl.invoiceCount} invoice${
						estimate.pnl.invoiceCount === 1 ? '' : 's'
					}, excl. BTW`}
				/>
				<Stat
					label={`Deductible costs ${year}`}
					value={formatMoney(
						estimate.pnl.deductibleCostsCents +
							estimate.pnl.depreciationCents +
							estimate.pnl.mileageDeductionCents,
					)}
					note={`${estimate.pnl.expenseCount} expense${
						estimate.pnl.expenseCount === 1 ? '' : 's'
					}, incl. depreciation and mileage`}
				/>
				<Stat
					label={`Profit ${year}`}
					value={formatMoney(estimate.pnl.profitCents)}
					tone={estimate.pnl.profitCents >= 0 ? 'accent' : 'danger'}
					note="Before entrepreneur deductions"
				/>
				<Stat
					label="Set aside for tax"
					value={formatMoney(
						estimate.totalLiabilityCents +
							Math.max(0, vatReturn.balance),
					)}
					tone="danger"
					note={`Income tax + Zvw${
						vatReturn.balance > 0 ? ', plus this period’s BTW' : ''
					}`}
				/>
			</div>

			<div className="split">
				<div>
					<Card
						title={`BTW — ${vatReturn.periodLabel}`}
						description={
							vatReturn.notApplicable
								? 'No return is filed under your current scheme.'
								: `Due by ${formatDate(deadline)}.`
						}
						actions={
							<a className="btn btn--sm" href={href('vat')}>
								Open
							</a>
						}
					>
						{vatReturn.notApplicable ? (
							<p className="td-muted">
								{vatReturn.notApplicableReason}
							</p>
						) : (
							<dl className="dl">
								<dt>VAT charged (5a)</dt>
								<dd>
									<Money cents={vatReturn.totalDue} />
								</dd>
								<dt>Input VAT (5b)</dt>
								<dd>
									<Money cents={vatReturn.totalInputVat} />
								</dd>
								<dt>
									{vatReturn.balance >= 0
										? 'To pay'
										: 'To reclaim'}
								</dt>
								<dd>
									<Money
										cents={Math.abs(vatReturn.balance)}
										bold
									/>
								</dd>
							</dl>
						)}
						{vatReturn.warnings.length > 0 ? (
							<p style={{ marginTop: 12, marginBottom: 0 }}>
								<Badge tone="warning">
									{vatReturn.warnings.length} thing
									{vatReturn.warnings.length === 1
										? ''
										: 's'}{' '}
									to check
								</Badge>
							</p>
						) : null}
					</Card>

					<Card
						title={`Income tax estimate ${year}`}
						actions={
							<a
								className="btn btn--sm"
								href={href('income-tax')}
							>
								Open
							</a>
						}
					>
						<dl className="dl">
							<dt>Taxable profit</dt>
							<dd>
								<Money cents={estimate.taxableProfitCents} />
							</dd>
							<dt>Income tax due</dt>
							<dd>
								<Money cents={estimate.incomeTaxDueCents} />
							</dd>
							<dt>Zvw contribution</dt>
							<dd>
								<Money cents={estimate.zvwContributionCents} />
							</dd>
							<dt>Total</dt>
							<dd>
								<Money
									cents={estimate.totalLiabilityCents}
									bold
								/>
							</dd>
							<dt>Hold back on new work</dt>
							<dd>
								{estimate.recommendedSetAsidePercent}% of every
								invoice
							</dd>
						</dl>
					</Card>
				</div>

				<div>
					<Card
						title="Money owed to you"
						description={
							outstanding.length === 0
								? 'Nothing outstanding.'
								: `${outstanding.length} unpaid invoice${
										outstanding.length === 1 ? '' : 's'
								  }, ${formatMoney(outstandingTotal)} in total.`
						}
						actions={
							<a className="btn btn--sm" href={href('invoices')}>
								Open
							</a>
						}
					>
						{outstanding.length === 0 ? (
							<p className="td-muted" style={{ margin: 0 }}>
								Every invoice you have sent has been paid.
							</p>
						) : (
							<div className="table-wrap">
								<table>
									<thead>
										<tr>
											<th>Invoice</th>
											<th>Customer</th>
											<th>Due</th>
											<th className="num">Outstanding</th>
										</tr>
									</thead>
									<tbody>
										{outstanding
											.slice(0, 6)
											.map(({ invoice, totals }) => (
												<tr key={invoice.id}>
													<td className="mono">
														{invoice.number}
													</td>
													<td>
														{
															invoice
																.contactSnapshot
																.name
														}
													</td>
													<td>
														{isOverdue(
															invoice,
															now,
														) ? (
															<Badge tone="danger">
																{formatDate(
																	invoice.dueDate,
																)}
															</Badge>
														) : (
															formatDate(
																invoice.dueDate,
															)
														)}
													</td>
													<td className="num">
														<Money
															cents={
																totals.outstanding
															}
														/>
													</td>
												</tr>
											))}
									</tbody>
								</table>
							</div>
						)}
						{overdue.length > 0 ? (
							<p style={{ marginTop: 12, marginBottom: 0 }}>
								<Badge tone="danger">
									{overdue.length} overdue —{' '}
									{formatMoney(
										overdue.reduce(
											(sum, row) =>
												sum + row.totals.outstanding,
											0,
										),
									)}
								</Badge>
							</p>
						) : null}
					</Card>

					<Card
						title="Hours criterion"
						description={`${params.hoursCriterion} hours a year unlocks the self-employed deduction.`}
						actions={
							<a className="btn btn--sm" href={href('logbook')}>
								Log hours
							</a>
						}
					>
						<div className="progress">
							<div
								className="progress__bar"
								style={{ width: `${hoursProgress}%` }}
							/>
						</div>
						<p style={{ marginBottom: 0 }} className="td-muted">
							{Math.round(estimate.hoursLogged)} of{' '}
							{params.hoursCriterion} hours logged for {year}
							{estimate.hoursLogged < params.hoursCriterion &&
							store.settings.fiscal.expectsToMeetHoursCriterion
								? ' — the estimate assumes you will get there.'
								: '.'}
						</p>
					</Card>

					{unreviewed.length > 0 ? (
						<Card
							title="Expenses waiting for review"
							actions={
								<a
									className="btn btn--sm"
									href={href('expenses')}
								>
									Review
								</a>
							}
						>
							<p style={{ marginBottom: 0 }} className="td-muted">
								{unreviewed.length} expense
								{unreviewed.length === 1 ? '' : 's'} are counted
								in the figures above but have not been checked
								by you.
							</p>
						</Card>
					) : null}
				</div>
			</div>

			<Banner tone="info" title="Everything here lives in this browser">
				Nothing is uploaded and there is no account. Clearing site data
				deletes your books. Take a backup from{' '}
				<a href={href('settings')}>Settings → Data</a> regularly, and
				keep it somewhere you would keep your tax records.
			</Banner>
		</>
	);
}
