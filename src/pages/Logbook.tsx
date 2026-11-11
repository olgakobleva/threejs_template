import { useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import { newHoursEntry, newMileageEntry } from '@/domain/defaults';
import type {
	HoursEntry,
	HoursKind,
	MileageEntry,
	VehicleKind,
} from '@/domain/types';
import { formatDate, today, yearOf } from '@/core/dates';
import { formatMoney, roundCents } from '@/core/money';
import { taxYearParameters } from '@/tax/nl/years';
import {
	Badge,
	Banner,
	Card,
	Checkbox,
	ConfirmButton,
	EmptyState,
	Money,
	NumberField,
	PageHeader,
	SelectField,
	Stat,
	Tabs,
	TextField,
} from '@/ui/components';

const VEHICLE_LABEL: Record<VehicleKind, string> = {
	private_car: 'My own car',
	business_car: 'Business car',
	bicycle: 'Bicycle',
	other: 'Other',
};

const HOURS_LABEL: Record<HoursKind, string> = {
	billable: 'Billable work',
	admin: 'Admin & bookkeeping',
	acquisition: 'Acquisition & networking',
	study: 'Study & training',
	travel: 'Travel',
	other: 'Other',
};

export function Logbook(): JSX.Element {
	const [tab, setTab] = useState<'mileage' | 'hours'>('mileage');
	const [year, setYear] = useState(yearOf(today()));

	return (
		<>
			<PageHeader
				title="Mileage & hours"
				description="Two administrations the Belastingdienst asks for by name: a kilometre log for a privately-owned car, and an hours log for the self-employed deduction."
			/>

			<Tabs
				active={tab}
				onChange={setTab}
				tabs={[
					{ id: 'mileage', label: 'Mileage' },
					{ id: 'hours', label: 'Hours' },
				]}
			/>

			{tab === 'mileage' ? (
				<MileageTab year={year} onYearChange={setYear} />
			) : (
				<HoursTab year={year} onYearChange={setYear} />
			)}
		</>
	);
}

function YearPicker({
	year,
	onChange,
	dates,
}: {
	year: number;
	onChange: (year: number) => void;
	dates: string[];
}): JSX.Element {
	const years = useMemo(() => {
		const set = new Set<number>([yearOf(today())]);
		for (const date of dates) set.add(yearOf(date));
		return [...set].sort((a, b) => b - a);
	}, [dates]);

	return (
		<select
			value={year}
			onChange={(event) => onChange(Number(event.target.value))}
		>
			{years.map((candidate) => (
				<option key={candidate} value={candidate}>
					{candidate}
				</option>
			))}
		</select>
	);
}

// ---------------------------------------------------------------------------
// Mileage
// ---------------------------------------------------------------------------

function MileageTab({
	year,
	onYearChange,
}: {
	year: number;
	onYearChange: (year: number) => void;
}): JSX.Element {
	const store = useStore();
	const params = taxYearParameters(year, store.settings.taxYearOverrides);
	const [draft, setDraft] = useState<MileageEntry>(newMileageEntry());

	const entries = useMemo(
		() =>
			store.mileage
				.filter((entry) => yearOf(entry.date) === year)
				.sort((a, b) => b.date.localeCompare(a.date)),
		[store.mileage, year],
	);

	const businessKm = entries
		.filter((entry) => entry.isBusiness && entry.vehicle === 'private_car')
		.reduce((sum, entry) => sum + entry.kilometres, 0);
	const privateKm = entries
		.filter((entry) => !entry.isBusiness)
		.reduce((sum, entry) => sum + entry.kilometres, 0);
	const deduction = roundCents(
		businessKm * params.mileageAllowanceCentsPerKm,
	);

	async function add(): Promise<void> {
		if (draft.kilometres <= 0) return;
		await store.save('mileage', draft);
		setDraft(
			newMileageEntry({
				date: draft.date,
				vehicle: draft.vehicle,
				fromLocation: draft.toLocation,
			}),
		);
	}

	return (
		<>
			<div className="toolbar">
				<YearPicker
					year={year}
					onChange={onYearChange}
					dates={store.mileage.map((entry) => entry.date)}
				/>
			</div>

			<div className="grid grid--3" style={{ marginBottom: 16 }}>
				<Stat
					label="Business kilometres"
					value={`${businessKm.toLocaleString('en-GB')} km`}
					note="Own car only"
				/>
				<Stat
					label="Deduction"
					value={formatMoney(deduction)}
					tone="accent"
					note={`${params.mileageAllowanceCentsPerKm} cents per kilometre`}
				/>
				<Stat
					label="Private kilometres"
					value={`${privateKm.toLocaleString('en-GB')} km`}
					note="Logged but not deducted"
				/>
			</div>

			<Card title="Log a trip">
				<div
					style={{
						display: 'grid',
						gridTemplateColumns:
							'repeat(auto-fit, minmax(140px, 1fr)) auto',
						gap: 10,
						alignItems: 'end',
					}}
				>
					<TextField
						label="Date"
						type="date"
						value={draft.date}
						onChange={(event) =>
							setDraft({ ...draft, date: event.target.value })
						}
					/>
					<TextField
						label="From"
						value={draft.fromLocation}
						onChange={(event) =>
							setDraft({
								...draft,
								fromLocation: event.target.value,
							})
						}
					/>
					<TextField
						label="To"
						value={draft.toLocation}
						onChange={(event) =>
							setDraft({
								...draft,
								toLocation: event.target.value,
							})
						}
					/>
					<TextField
						label="Purpose"
						value={draft.purpose}
						onChange={(event) =>
							setDraft({ ...draft, purpose: event.target.value })
						}
					/>
					<NumberField
						label="Kilometres"
						min={0}
						step={0.1}
						value={draft.kilometres}
						onValueChange={(value) =>
							setDraft({ ...draft, kilometres: value })
						}
					/>
					<SelectField
						label="Vehicle"
						value={draft.vehicle}
						onValueChange={(value) =>
							setDraft({ ...draft, vehicle: value })
						}
						options={(
							Object.keys(VEHICLE_LABEL) as VehicleKind[]
						).map((value) => ({
							value,
							label: VEHICLE_LABEL[value],
						}))}
					/>
					<button
						type="button"
						className="btn btn--primary"
						style={{ marginBottom: 12 }}
						onClick={() => void add()}
					>
						Add
					</button>
				</div>
				<Checkbox
					label="Business trip"
					checked={draft.isBusiness}
					onCheckedChange={(checked) =>
						setDraft({ ...draft, isBusiness: checked })
					}
				/>
			</Card>

			<Banner tone="info" title="What a valid kilometre log needs">
				Date, start and end address, the purpose of the trip, and the
				distance. Commuting to a fixed workplace does not count as
				business travel, and you cannot claim the per-kilometre
				allowance and the car's actual costs at the same time.
			</Banner>

			<Card flush>
				{entries.length === 0 ? (
					<EmptyState title={`No trips logged for ${year}`}>
						Log trips as you make them — reconstructing a year of
						driving afterwards is both painful and unconvincing.
					</EmptyState>
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Date</th>
									<th>Route</th>
									<th>Purpose</th>
									<th>Vehicle</th>
									<th className="num">Km</th>
									<th className="num">Deduction</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{entries.map((entry) => (
									<tr key={entry.id}>
										<td>{formatDate(entry.date)}</td>
										<td>
											{entry.fromLocation} →{' '}
											{entry.toLocation}
										</td>
										<td className="td-muted">
											{entry.purpose}
										</td>
										<td className="td-muted">
											{VEHICLE_LABEL[entry.vehicle]}
											{!entry.isBusiness ? (
												<>
													{' '}
													<Badge>Private</Badge>
												</>
											) : null}
										</td>
										<td className="num">
											{entry.kilometres}
										</td>
										<td className="num">
											<Money
												cents={
													entry.isBusiness &&
													entry.vehicle ===
														'private_car'
														? roundCents(
																entry.kilometres *
																	params.mileageAllowanceCentsPerKm,
														  )
														: 0
												}
											/>
										</td>
										<td>
											<ConfirmButton
												onConfirm={() =>
													void store.remove(
														'mileage',
														entry.id,
													)
												}
											>
												Delete
											</ConfirmButton>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</>
	);
}

// ---------------------------------------------------------------------------
// Hours
// ---------------------------------------------------------------------------

function HoursTab({
	year,
	onYearChange,
}: {
	year: number;
	onYearChange: (year: number) => void;
}): JSX.Element {
	const store = useStore();
	const params = taxYearParameters(year, store.settings.taxYearOverrides);
	const [draft, setDraft] = useState<HoursEntry>(newHoursEntry());

	const entries = useMemo(
		() =>
			store.hours
				.filter((entry) => yearOf(entry.date) === year)
				.sort((a, b) => b.date.localeCompare(a.date)),
		[store.hours, year],
	);

	const counting = entries
		.filter((entry) => entry.countsForCriterion)
		.reduce((sum, entry) => sum + entry.hours, 0);
	const billable = entries
		.filter((entry) => entry.kind === 'billable')
		.reduce((sum, entry) => sum + entry.hours, 0);
	const progress = Math.min(
		100,
		(counting / Math.max(1, params.hoursCriterion)) * 100,
	);
	const weeksLeft = Math.max(
		0,
		52 - Math.ceil((new Date().getMonth() + 1) * 4.33),
	);

	async function add(): Promise<void> {
		if (draft.hours <= 0) return;
		await store.save('hours', draft);
		setDraft(newHoursEntry({ date: draft.date, kind: draft.kind }));
	}

	return (
		<>
			<div className="toolbar">
				<YearPicker
					year={year}
					onChange={onYearChange}
					dates={store.hours.map((entry) => entry.date)}
				/>
			</div>

			<div className="grid grid--3" style={{ marginBottom: 16 }}>
				<Stat
					label="Hours towards the criterion"
					value={Math.round(counting).toLocaleString('en-GB')}
					tone={
						counting >= params.hoursCriterion
							? 'success'
							: undefined
					}
					note={`${params.hoursCriterion} needed`}
				/>
				<Stat
					label="Billable hours"
					value={Math.round(billable).toLocaleString('en-GB')}
					note={`${
						Math.round((billable / Math.max(1, counting)) * 100) ||
						0
					}% of logged time`}
				/>
				<Stat
					label="Still needed"
					value={Math.max(
						0,
						Math.round(params.hoursCriterion - counting),
					).toLocaleString('en-GB')}
					note={
						year === yearOf(today()) &&
						counting < params.hoursCriterion
							? `About ${Math.ceil(
									(params.hoursCriterion - counting) /
										Math.max(1, weeksLeft),
							  )} hours a week for the rest of the year`
							: undefined
					}
				/>
			</div>

			<div className="progress" style={{ marginBottom: 16 }}>
				<div
					className="progress__bar"
					style={{ width: `${progress}%` }}
				/>
			</div>

			<Card title="Log time">
				<div
					style={{
						display: 'grid',
						gridTemplateColumns:
							'repeat(auto-fit, minmax(150px, 1fr)) auto',
						gap: 10,
						alignItems: 'end',
					}}
				>
					<TextField
						label="Date"
						type="date"
						value={draft.date}
						onChange={(event) =>
							setDraft({ ...draft, date: event.target.value })
						}
					/>
					<NumberField
						label="Hours"
						min={0}
						step={0.25}
						value={draft.hours}
						onValueChange={(value) =>
							setDraft({ ...draft, hours: value })
						}
					/>
					<SelectField
						label="Type"
						value={draft.kind}
						onValueChange={(value) =>
							setDraft({ ...draft, kind: value })
						}
						options={(Object.keys(HOURS_LABEL) as HoursKind[]).map(
							(value) => ({
								value,
								label: HOURS_LABEL[value],
							}),
						)}
					/>
					<TextField
						label="What you did"
						value={draft.description}
						onChange={(event) =>
							setDraft({
								...draft,
								description: event.target.value,
							})
						}
					/>
					<button
						type="button"
						className="btn btn--primary"
						style={{ marginBottom: 12 }}
						onClick={() => void add()}
					>
						Add
					</button>
				</div>
				<Checkbox
					label="Counts towards the hours criterion"
					hint="Almost all business time counts, not just billable work: admin, acquisition, travel and training all do."
					checked={draft.countsForCriterion}
					onCheckedChange={(checked) =>
						setDraft({ ...draft, countsForCriterion: checked })
					}
				/>
			</Card>

			<Banner tone="info" title="Why this log matters">
				Meeting the {params.hoursCriterion}-hour criterion is what
				unlocks the zelfstandigenaftrek and startersaftrek. If it is
				questioned, a contemporaneous log is the evidence — an estimate
				written at year end is not.
			</Banner>

			<Card flush>
				{entries.length === 0 ? (
					<EmptyState title={`No hours logged for ${year}`}>
						Even a weekly entry is far better than nothing.
					</EmptyState>
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Date</th>
									<th className="num">Hours</th>
									<th>Type</th>
									<th>Description</th>
									<th>Counts</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{entries.map((entry) => (
									<tr key={entry.id}>
										<td>{formatDate(entry.date)}</td>
										<td className="num">{entry.hours}</td>
										<td className="td-muted">
											{HOURS_LABEL[entry.kind]}
										</td>
										<td className="td-muted">
											{entry.description}
										</td>
										<td>
											{entry.countsForCriterion ? (
												<Badge tone="success">
													Yes
												</Badge>
											) : (
												<Badge>No</Badge>
											)}
										</td>
										<td>
											<ConfirmButton
												onConfirm={() =>
													void store.remove(
														'hours',
														entry.id,
													)
												}
											>
												Delete
											</ConfirmButton>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</>
	);
}
