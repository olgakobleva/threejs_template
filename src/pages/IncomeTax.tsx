import { useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import { currentPeriod, today, yearOf } from '@/core/dates';
import { formatMoney } from '@/core/money';
import { computeIncomeTax } from '@/tax/nl/incomeTax';
import { computeVatReturn } from '@/tax/nl/vatReturn';
import { taxYearParameters } from '@/tax/nl/years';
import {
	Banner,
	Card,
	EmptyState,
	Money,
	PageHeader,
	Stat,
} from '@/ui/components';
import { href } from '@/app/router';

export function IncomeTaxPage(): JSX.Element {
	const store = useStore();
	const [year, setYear] = useState(yearOf(today()));

	const params = taxYearParameters(year, store.settings.taxYearOverrides);

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

	const vatBalance = useMemo(() => {
		const period = currentPeriod(store.settings.fiscal.vatPeriod, today());
		if (period.year !== year) return 0;
		return computeVatReturn(
			period,
			store.invoices,
			store.expenses,
			store.settings,
		).balance;
	}, [year, store]);

	const years = useMemo(() => {
		const set = new Set<number>([
			yearOf(today()),
			store.settings.fiscal.firstYearOfBusiness,
		]);
		for (const invoice of store.invoices)
			set.add(yearOf(invoice.issueDate));
		for (const expense of store.expenses) set.add(yearOf(expense.date));
		return [...set].sort((a, b) => b - a);
	}, [
		store.invoices,
		store.expenses,
		store.settings.fiscal.firstYearOfBusiness,
	]);

	const { pnl } = estimate;
	const hasData = pnl.invoiceCount > 0 || pnl.expenseCount > 0;

	return (
		<>
			<PageHeader
				title="Income tax"
				description="An estimate of what you owe on this year's profit, following the order the law applies: profit, entrepreneur deductions, SME exemption, brackets, credits, healthcare contribution."
			/>

			<div className="toolbar">
				<select
					value={year}
					onChange={(event) => setYear(Number(event.target.value))}
				>
					{years.map((candidate) => (
						<option key={candidate} value={candidate}>
							{candidate}
						</option>
					))}
				</select>
			</div>

			{estimate.warnings.map((warning) => (
				<Banner key={warning} tone="warning">
					{warning}{' '}
					{warning.includes('Settings') ? null : (
						<a href={href('settings')}>Open settings</a>
					)}
				</Banner>
			))}

			{!hasData ? (
				<Card>
					<EmptyState title={`Nothing recorded for ${year}`}>
						Add invoices and expenses and the estimate builds
						itself.
					</EmptyState>
				</Card>
			) : (
				<>
					<div className="grid grid--4" style={{ marginBottom: 16 }}>
						<Stat
							label="Profit"
							value={formatMoney(pnl.profitCents)}
							tone={pnl.profitCents >= 0 ? 'accent' : 'danger'}
							note="Before entrepreneur deductions"
						/>
						<Stat
							label="Taxable profit"
							value={formatMoney(estimate.taxableProfitCents)}
							note="After deductions and the SME exemption"
						/>
						<Stat
							label="Total to pay"
							value={formatMoney(estimate.totalLiabilityCents)}
							tone="danger"
							note="Income tax plus Zvw contribution"
						/>
						<Stat
							label="Marginal rate"
							value={`${estimate.marginalRatePercent.toFixed(
								1,
							)}%`}
							note={`Hold back ${estimate.recommendedSetAsidePercent}% of new revenue`}
						/>
					</div>

					<div className="split">
						<div>
							<Card
								title="How the profit is built"
								description={`${pnl.invoiceCount} invoices, ${pnl.expenseCount} expenses.`}
							>
								<div className="table-wrap">
									<table>
										<tbody>
											<tr>
												<td>Revenue (excl. BTW)</td>
												<td className="num">
													<Money
														cents={pnl.revenueCents}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− Deductible costs
													{pnl.totalCostsBookedCents >
													pnl.deductibleCostsCents ? (
														<div
															style={{
																fontSize: 12,
															}}
														>
															{formatMoney(
																pnl.totalCostsBookedCents -
																	pnl.deductibleCostsCents,
															)}{' '}
															of what you booked
															is not deductible
														</div>
													) : null}
												</td>
												<td className="num">
													−
													<Money
														cents={
															pnl.deductibleCostsCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− Depreciation
												</td>
												<td className="num">
													−
													<Money
														cents={
															pnl.depreciationCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− Mileage (
													{Math.round(pnl.mileageKm)}{' '}
													km at{' '}
													{
														params.mileageAllowanceCentsPerKm
													}
													c)
												</td>
												<td className="num">
													−
													<Money
														cents={
															pnl.mileageDeductionCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− Investment allowance (KIA)
													<div
														style={{ fontSize: 12 }}
													>
														{pnl.kiaExplanation}
													</div>
												</td>
												<td className="num">
													−
													<Money
														cents={pnl.kiaCents}
													/>
												</td>
											</tr>
										</tbody>
										<tfoot>
											<tr>
												<td>Profit</td>
												<td className="num">
													<Money
														cents={pnl.profitCents}
													/>
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							</Card>

							<Card title="From profit to tax">
								<div className="table-wrap">
									<table>
										<tbody>
											<tr>
												<td>Profit</td>
												<td className="num">
													<Money
														cents={pnl.profitCents}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− Zelfstandigenaftrek
													{!estimate.meetsHoursCriterion ? (
														<div
															style={{
																fontSize: 12,
															}}
														>
															Not available —
															hours criterion not
															met
														</div>
													) : null}
												</td>
												<td className="num">
													−
													<Money
														cents={
															estimate.zelfstandigenaftrekCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− Startersaftrek
												</td>
												<td className="num">
													−
													<Money
														cents={
															estimate.startersaftrekCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− MKB-winstvrijstelling (
													{
														params.mkbProfitExemptionPercent
													}
													%)
												</td>
												<td className="num">
													−
													<Money
														cents={
															estimate.mkbExemptionCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-strong">
													Taxable profit
												</td>
												<td className="num td-strong">
													<Money
														cents={
															estimate.taxableProfitCents
														}
													/>
												</td>
											</tr>
											{estimate.otherBox1IncomeCents !==
											0 ? (
												<tr>
													<td className="td-muted">
														+ Other box 1 income
													</td>
													<td className="num">
														<Money
															cents={
																estimate.otherBox1IncomeCents
															}
														/>
													</td>
												</tr>
											) : null}
											{estimate.personalDeductionsCents !==
											0 ? (
												<tr>
													<td className="td-muted">
														− Personal deductions
													</td>
													<td className="num">
														−
														<Money
															cents={
																estimate.personalDeductionsCents
															}
														/>
													</td>
												</tr>
											) : null}
											<tr>
												<td>Taxable income (box 1)</td>
												<td className="num">
													<Money
														cents={
															estimate.taxableIncomeCents
														}
													/>
												</td>
											</tr>
											{estimate.bracketCharges.map(
												(charge, index) => (
													<tr key={index}>
														<td className="td-muted">
															Tax at{' '}
															{charge.ratePercent}
															% on{' '}
															{formatMoney(
																charge.amountInBracketCents,
															)}
														</td>
														<td className="num td-muted">
															<Money
																cents={
																	charge.taxCents
																}
															/>
														</td>
													</tr>
												),
											)}
											<tr>
												<td>Gross tax</td>
												<td className="num">
													<Money
														cents={
															estimate.grossTaxCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− General tax credit
												</td>
												<td className="num">
													−
													<Money
														cents={
															estimate.generalTaxCreditCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													− Labour tax credit
												</td>
												<td className="num">
													−
													<Money
														cents={
															estimate.labourTaxCreditCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-strong">
													Income tax
												</td>
												<td className="num td-strong">
													<Money
														cents={
															estimate.incomeTaxDueCents
														}
													/>
												</td>
											</tr>
											<tr>
												<td className="td-muted">
													+ Zvw contribution (
													{params.zvwRatePercent}%)
												</td>
												<td className="num">
													<Money
														cents={
															estimate.zvwContributionCents
														}
													/>
												</td>
											</tr>
										</tbody>
										<tfoot>
											<tr>
												<td>Total</td>
												<td className="num">
													<Money
														cents={
															estimate.totalLiabilityCents
														}
													/>
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							</Card>
						</div>

						<div>
							<Card title="What to set aside">
								<dl className="dl">
									<dt>Income tax and Zvw</dt>
									<dd>
										<Money
											cents={estimate.totalLiabilityCents}
										/>
									</dd>
									{vatBalance > 0 ? (
										<>
											<dt>This period's BTW</dt>
											<dd>
												<Money cents={vatBalance} />
											</dd>
										</>
									) : null}
									<dt>Total</dt>
									<dd>
										<Money
											cents={
												estimate.totalLiabilityCents +
												Math.max(0, vatBalance)
											}
											bold
										/>
									</dd>
								</dl>
								<p
									style={{ marginTop: 12, marginBottom: 0 }}
									className="td-muted"
								>
									On every new invoice, hold back about{' '}
									<strong>
										{estimate.recommendedSetAsidePercent}%
									</strong>{' '}
									of the net amount for income tax, on top of
									the BTW you charged. The BTW was never
									yours.
								</p>
							</Card>

							<Card title="Where the money went">
								{pnl.categoryBreakdown.length === 0 ? (
									<p
										className="td-muted"
										style={{ margin: 0 }}
									>
										No costs booked this year.
									</p>
								) : (
									<div className="table-wrap">
										<table>
											<thead>
												<tr>
													<th>Category</th>
													<th className="num">
														Booked
													</th>
													<th className="num">
														Deducted
													</th>
													<th className="num">
														Lost
													</th>
												</tr>
											</thead>
											<tbody>
												{pnl.categoryBreakdown.map(
													(row) => (
														<tr
															key={row.categoryId}
														>
															<td>
																{row.label}
																<div
																	className="td-muted"
																	style={{
																		fontSize: 12,
																	}}
																>
																	{row.count}{' '}
																	item
																	{row.count ===
																	1
																		? ''
																		: 's'}
																</div>
															</td>
															<td className="num">
																<Money
																	cents={
																		row.grossCents
																	}
																/>
															</td>
															<td className="num">
																<Money
																	cents={
																		row.deductibleCents
																	}
																/>
															</td>
															<td
																className="num"
																style={{
																	color:
																		row.disallowedCents >
																		0
																			? 'var(--danger)'
																			: undefined,
																}}
															>
																<Money
																	cents={
																		row.disallowedCents
																	}
																/>
															</td>
														</tr>
													),
												)}
											</tbody>
										</table>
									</div>
								)}
							</Card>

							{estimate.notes.length > 0 ? (
								<Card title="Notes on this estimate">
									<ul style={{ margin: 0, paddingLeft: 18 }}>
										{estimate.notes.map((note) => (
											<li
												key={note}
												style={{ marginBottom: 6 }}
											>
												{note}
											</li>
										))}
									</ul>
								</Card>
							) : null}
						</div>
					</div>
				</>
			)}

			<Banner tone="info" title="What this estimate does not do">
				It covers box 1 for a sole trader with no co-entrepreneurs. It
				does not model loss carry-forward between years, the
				oudedagsreserve, box 2 or box 3, a fiscal partner's position, or
				provisional assessments you have already paid. For a first year,
				or any year with something unusual in it, have a bookkeeper
				check the return.
			</Banner>
		</>
	);
}
