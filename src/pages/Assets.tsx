import { useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import { newAsset } from '@/domain/defaults';
import type { Asset } from '@/domain/types';
import { formatDate, today, yearOf } from '@/core/dates';
import { formatMoney } from '@/core/money';
import {
	bookValueAtEndOf,
	computeKia,
	depreciationForYear,
	depreciationSchedule,
} from '@/tax/nl/depreciation';
import { taxYearParameters } from '@/tax/nl/years';
import {
	Banner,
	Card,
	Checkbox,
	ConfirmButton,
	EmptyState,
	Modal,
	Money,
	MoneyField,
	NumberField,
	PageHeader,
	Stat,
	TextArea,
	TextField,
} from '@/ui/components';

export function Assets(): JSX.Element {
	const store = useStore();
	const [editing, setEditing] = useState<Asset | null>(null);
	const [year, setYear] = useState(yearOf(today()));

	const params = taxYearParameters(year, store.settings.taxYearOverrides);

	const rows = useMemo(
		() =>
			store.assets
				.map((asset) => ({
					asset,
					charge: depreciationForYear(asset, year, params),
					bookValue: bookValueAtEndOf(asset, year, params),
				}))
				.sort((a, b) =>
					b.asset.purchaseDate.localeCompare(a.asset.purchaseDate),
				),
		[store.assets, year, params],
	);

	const totalCharge = rows.reduce((sum, row) => sum + row.charge, 0);
	const totalBookValue = rows.reduce((sum, row) => sum + row.bookValue, 0);
	const kia = computeKia(store.assets, year, params);

	const years = useMemo(() => {
		const set = new Set<number>([yearOf(today())]);
		for (const asset of store.assets) set.add(yearOf(asset.purchaseDate));
		const min = Math.min(...set);
		const max = Math.max(...set, yearOf(today()));
		const range: number[] = [];
		for (let candidate = max; candidate >= min; candidate -= 1)
			range.push(candidate);
		return range;
	}, [store.assets]);

	return (
		<>
			<PageHeader
				title="Assets"
				description={`Anything costing more than ${formatMoney(
					params.capitalisationThresholdCents,
				)} excluding VAT cannot be written off in one year — it is depreciated over at least five.`}
				actions={
					<button
						type="button"
						className="btn btn--primary"
						onClick={() => setEditing(newAsset())}
					>
						New asset
					</button>
				}
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

			<div className="grid grid--3" style={{ marginBottom: 16 }}>
				<Stat
					label={`Depreciation charged in ${year}`}
					value={formatMoney(totalCharge)}
					note="Reduces your taxable profit"
				/>
				<Stat
					label={`Book value end of ${year}`}
					value={formatMoney(totalBookValue)}
					note={`${rows.length} asset${rows.length === 1 ? '' : 's'}`}
				/>
				<Stat
					label={`Investment allowance (KIA) ${year}`}
					value={formatMoney(kia.allowanceCents)}
					note={kia.explanation}
					tone={kia.applies ? 'success' : undefined}
				/>
			</div>

			<Card flush>
				{rows.length === 0 ? (
					<EmptyState title="No assets recorded">
						Laptops, cameras, furniture and vehicles above the
						threshold belong here. The expenses page offers to
						convert a purchase into an asset when it spots one.
					</EmptyState>
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Description</th>
									<th>Purchased</th>
									<th className="num">Cost</th>
									<th className="num">Life</th>
									<th className="num">Business use</th>
									<th className="num">{year} charge</th>
									<th className="num">Book value</th>
								</tr>
							</thead>
							<tbody>
								{rows.map(({ asset, charge, bookValue }) => (
									<tr
										key={asset.id}
										className="is-clickable"
										onClick={() => setEditing(asset)}
									>
										<td className="td-strong">
											{asset.description || '—'}
										</td>
										<td>
											{formatDate(asset.purchaseDate)}
										</td>
										<td className="num">
											<Money
												cents={asset.purchasePriceCents}
											/>
										</td>
										<td className="num td-muted">
											{asset.usefulLifeYears} yr
										</td>
										<td className="num td-muted">
											{asset.businessUsePercent}%
										</td>
										<td className="num">
											<Money cents={charge} />
										</td>
										<td className="num td-muted">
											<Money cents={bookValue} />
										</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr>
									<td colSpan={5}>Total</td>
									<td className="num">
										<Money cents={totalCharge} />
									</td>
									<td className="num">
										<Money cents={totalBookValue} />
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</Card>

			{editing ? (
				<AssetEditor asset={editing} onClose={() => setEditing(null)} />
			) : null}
		</>
	);
}

function AssetEditor({
	asset,
	onClose,
}: {
	asset: Asset;
	onClose: () => void;
}): JSX.Element {
	const store = useStore();
	const [working, setWorking] = useState<Asset>(asset);
	const params = taxYearParameters(
		yearOf(working.purchaseDate),
		store.settings.taxYearOverrides,
	);
	const schedule = depreciationSchedule(working, params);

	function update(patch: Partial<Asset>): void {
		setWorking((current) => ({ ...current, ...patch }));
	}

	const belowThreshold =
		working.purchasePriceCents < params.capitalisationThresholdCents;
	const tooFast =
		working.usefulLifeYears < 100 / params.maxDepreciationPercent;

	return (
		<Modal
			wide
			title={working.description || 'New asset'}
			onClose={onClose}
			footer={
				<>
					<ConfirmButton
						className="btn btn--danger"
						onConfirm={async () => {
							await store.remove('assets', working.id);
							onClose();
						}}
					>
						Delete
					</ConfirmButton>
					<div style={{ flex: 1 }} />
					<button type="button" className="btn" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn--primary"
						onClick={async () => {
							await store.save('assets', working);
							onClose();
						}}
					>
						Save
					</button>
				</>
			}
		>
			{belowThreshold ? (
				<Banner tone="info" title="This may not need to be an asset">
					At {formatMoney(working.purchasePriceCents)} it is below the{' '}
					{formatMoney(params.capitalisationThresholdCents)}{' '}
					threshold, so you can normally deduct the whole amount in
					the year of purchase. Booking it as an asset delays the
					deduction over five years for no benefit.
				</Banner>
			) : null}

			{tooFast ? (
				<Banner tone="warning" title="Depreciating too fast">
					Dutch rules cap straight-line depreciation at{' '}
					{params.maxDepreciationPercent}% a year, so a useful life
					under {100 / params.maxDepreciationPercent} years is not
					accepted. The schedule below applies the cap regardless of
					what you enter.
				</Banner>
			) : null}

			<div className="split">
				<div>
					<TextField
						label="Description"
						value={working.description}
						onChange={(event) =>
							update({ description: event.target.value })
						}
					/>
					<div className="grid grid--2">
						<TextField
							label="Purchase date"
							type="date"
							value={working.purchaseDate}
							onChange={(event) =>
								update({ purchaseDate: event.target.value })
							}
						/>
						<MoneyField
							label="Purchase price excl. VAT"
							value={working.purchasePriceCents}
							onValueChange={(value) =>
								update({ purchasePriceCents: value })
							}
						/>
					</div>
					<div className="grid grid--2">
						<MoneyField
							label="Residual value"
							hint="What it will still be worth at the end. Often zero for IT kit."
							value={working.residualValueCents}
							onValueChange={(value) =>
								update({ residualValueCents: value })
							}
						/>
						<NumberField
							label="Useful life"
							suffix="years"
							min={1}
							value={working.usefulLifeYears}
							onValueChange={(value) =>
								update({ usefulLifeYears: value })
							}
						/>
					</div>
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
					<Checkbox
						label="Counts towards the investment allowance (KIA)"
						hint="Most business equipment does. Cars, homes, goodwill and land do not."
						checked={working.qualifiesForKia}
						onCheckedChange={(checked) =>
							update({ qualifiesForKia: checked })
						}
					/>
					<TextField
						label="Disposed on"
						type="date"
						value={working.disposedOn ?? ''}
						onChange={(event) =>
							update({ disposedOn: event.target.value || null })
						}
					/>
					<TextArea
						label="Notes"
						value={working.notes}
						onChange={(event) =>
							update({ notes: event.target.value })
						}
					/>
				</div>

				<div>
					<Card title="Depreciation schedule">
						{schedule.length === 0 ? (
							<p className="td-muted" style={{ margin: 0 }}>
								Nothing to depreciate — the cost equals the
								residual value.
							</p>
						) : (
							<div className="table-wrap">
								<table>
									<thead>
										<tr>
											<th>Year</th>
											<th className="num">Months</th>
											<th className="num">Charge</th>
											<th className="num">Book value</th>
										</tr>
									</thead>
									<tbody>
										{schedule.map((row) => (
											<tr key={row.year}>
												<td>{row.year}</td>
												<td className="num td-muted">
													{row.months}
												</td>
												<td className="num">
													<Money
														cents={row.chargeCents}
													/>
												</td>
												<td className="num td-muted">
													<Money
														cents={
															row.closingBookValueCents
														}
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
						<p
							className="field__hint"
							style={{ marginTop: 10, marginBottom: 0 }}
						>
							The first and last years are pro-rated by month.
							Charges shown here are before the business-use
							share; the profit calculation applies it.
						</p>
					</Card>
				</div>
			</div>
		</Modal>
	);
}
