import { useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import type {
	DatabaseSnapshot,
	Settings,
	TaxYearParameters,
	VatRate,
} from '@/domain/types';
import { formatInvoiceNumber } from '@/domain/defaults';
import { today, toISODate, yearOf } from '@/core/dates';
import { downloadFile } from '@/core/csv';
import { formatMoney } from '@/core/money';
import { AVAILABLE_TAX_YEARS, taxYearParameters } from '@/tax/nl/years';
import { SELECTABLE_MODELS } from '@/ai/client';
import {
	Badge,
	Banner,
	Card,
	Checkbox,
	ConfirmButton,
	MoneyField,
	NumberField,
	PageHeader,
	SelectField,
	Tabs,
	TextArea,
	TextField,
} from '@/ui/components';

type SettingsTab =
	| 'business'
	| 'fiscal'
	| 'invoicing'
	| 'ai'
	| 'taxyears'
	| 'data';

export function SettingsPage(): JSX.Element {
	const store = useStore();
	const [tab, setTab] = useState<SettingsTab>('business');
	const [working, setWorking] = useState<Settings>(store.settings);
	const [saved, setSaved] = useState(false);

	function update(patch: Partial<Settings>): void {
		setWorking((current) => ({ ...current, ...patch }));
		setSaved(false);
	}

	async function persist(): Promise<void> {
		const next = { ...working, onboardingComplete: true };
		await store.saveSettings(next);
		// Mirror what was actually stored, otherwise `dirty` stays true forever
		// because `working` still carries the pre-save onboarding flag.
		setWorking(next);
		setSaved(true);
	}

	// `updatedAt` is stamped by the store on every write, so comparing it would
	// leave the form permanently "dirty" after a successful save.
	const dirty =
		JSON.stringify({ ...working, updatedAt: '' }) !==
		JSON.stringify({ ...store.settings, updatedAt: '' });

	return (
		<>
			<PageHeader
				title="Settings"
				description="Your business details, how tax is calculated, and where the data lives."
				actions={
					<>
						{saved && !dirty ? (
							<Badge tone="success">Saved</Badge>
						) : null}
						<button
							type="button"
							className="btn btn--primary"
							disabled={!dirty}
							onClick={() => void persist()}
						>
							Save changes
						</button>
					</>
				}
			/>

			<Tabs
				active={tab}
				onChange={setTab}
				tabs={[
					{ id: 'business', label: 'Business' },
					{ id: 'fiscal', label: 'Tax position' },
					{ id: 'invoicing', label: 'Invoicing' },
					{ id: 'ai', label: 'AI assistance' },
					{ id: 'taxyears', label: 'Tax years' },
					{ id: 'data', label: 'Data' },
				]}
			/>

			{tab === 'business' ? (
				<BusinessTab working={working} update={update} />
			) : null}
			{tab === 'fiscal' ? (
				<FiscalTab working={working} update={update} />
			) : null}
			{tab === 'invoicing' ? (
				<InvoicingTab working={working} update={update} />
			) : null}
			{tab === 'ai' ? <AiTab working={working} update={update} /> : null}
			{tab === 'taxyears' ? (
				<TaxYearsTab working={working} update={update} />
			) : null}
			{tab === 'data' ? <DataTab /> : null}
		</>
	);
}

interface TabProps {
	working: Settings;
	update: (patch: Partial<Settings>) => void;
}

// ---------------------------------------------------------------------------

function BusinessTab({ working, update }: TabProps): JSX.Element {
	const business = working.business;

	function set(patch: Partial<Settings['business']>): void {
		update({ business: { ...business, ...patch } });
	}

	return (
		<Card
			title="Business details"
			description="These appear on every invoice. A Dutch invoice must show your KvK number and BTW-id."
		>
			<div className="grid grid--2">
				<div>
					<TextField
						label="Trading name"
						value={business.tradeName}
						onChange={(event) =>
							set({ tradeName: event.target.value })
						}
					/>
					<TextField
						label="Legal name"
						hint="Your own name, for a sole trader."
						value={business.legalName}
						onChange={(event) =>
							set({ legalName: event.target.value })
						}
					/>
					<TextField
						label="KvK number"
						value={business.kvkNumber}
						onChange={(event) =>
							set({ kvkNumber: event.target.value })
						}
					/>
					<TextField
						label="BTW-id"
						hint="The NL……B.. number you put on invoices — not your omzetbelastingnummer."
						value={business.vatId}
						onChange={(event) =>
							set({ vatId: event.target.value.toUpperCase() })
						}
					/>
					<TextField
						label="IBAN"
						value={business.iban}
						onChange={(event) =>
							set({ iban: event.target.value.toUpperCase() })
						}
					/>
				</div>
				<div>
					<TextField
						label="Address"
						value={business.address.line1}
						onChange={(event) =>
							set({
								address: {
									...business.address,
									line1: event.target.value,
								},
							})
						}
					/>
					<div className="grid grid--2">
						<TextField
							label="Postcode"
							value={business.address.postcode}
							onChange={(event) =>
								set({
									address: {
										...business.address,
										postcode: event.target.value,
									},
								})
							}
						/>
						<TextField
							label="City"
							value={business.address.city}
							onChange={(event) =>
								set({
									address: {
										...business.address,
										city: event.target.value,
									},
								})
							}
						/>
					</div>
					<TextField
						label="Country"
						value={business.address.country}
						maxLength={2}
						onChange={(event) =>
							set({
								address: {
									...business.address,
									country: event.target.value.toUpperCase(),
								},
							})
						}
					/>
					<TextField
						label="Email"
						type="email"
						value={business.email}
						onChange={(event) => set({ email: event.target.value })}
					/>
					<TextField
						label="Phone"
						value={business.phone}
						onChange={(event) => set({ phone: event.target.value })}
					/>
				</div>
			</div>
		</Card>
	);
}

// ---------------------------------------------------------------------------

function FiscalTab({ working, update }: TabProps): JSX.Element {
	const fiscal = working.fiscal;
	const params = taxYearParameters(yearOf(today()), working.taxYearOverrides);

	function set(patch: Partial<Settings['fiscal']>): void {
		update({ fiscal: { ...fiscal, ...patch } });
	}

	return (
		<>
			<Card
				title="VAT scheme"
				description="This decides whether you charge BTW at all and whether you file returns."
			>
				<div className="grid grid--2">
					<SelectField
						label="Scheme"
						value={fiscal.vatScheme}
						onValueChange={(value) => set({ vatScheme: value })}
						options={[
							{
								value: 'standard',
								label: 'Standard — I charge and reclaim BTW',
							},
							{
								value: 'kor',
								label: 'KOR — small business exemption, no BTW',
							},
							{
								value: 'exempt',
								label: 'Exempt activity (vrijgesteld)',
							},
						]}
						hint={
							fiscal.vatScheme === 'kor'
								? `Under the KOR you charge no BTW and reclaim none. The turnover ceiling is ${formatMoney(
										params.korTurnoverCeilingCents,
								  )} — pass it and the exemption ends mid-year.`
								: undefined
						}
					/>
					<SelectField
						label="Return frequency"
						value={fiscal.vatPeriod}
						onValueChange={(value) => set({ vatPeriod: value })}
						options={[
							{
								value: 'quarter',
								label: 'Quarterly (most common)',
							},
							{ value: 'month', label: 'Monthly' },
							{ value: 'year', label: 'Annually' },
						]}
						hint="The Belastingdienst tells you which one applies to you."
					/>
				</div>
			</Card>

			<Card
				title="Entrepreneur status"
				description="What unlocks the self-employed and starter deductions."
			>
				<div className="grid grid--2">
					<NumberField
						label="First year of business"
						value={fiscal.firstYearOfBusiness}
						onValueChange={(value) =>
							set({ firstYearOfBusiness: value })
						}
					/>
					<NumberField
						label="Startersaftrek already claimed"
						suffix="times"
						min={0}
						max={3}
						hint="Available at most 3 times in your first 5 years."
						value={fiscal.startersaftrekYearsClaimed}
						onValueChange={(value) =>
							set({ startersaftrekYearsClaimed: value })
						}
					/>
				</div>
				<Checkbox
					label={`I expect to meet the ${params.hoursCriterion}-hour criterion this year`}
					hint="Without it you lose the zelfstandigenaftrek and startersaftrek entirely. The estimate assumes this until your hours log proves it."
					checked={fiscal.expectsToMeetHoursCriterion}
					onCheckedChange={(checked) =>
						set({ expectsToMeetHoursCriterion: checked })
					}
				/>
				<Checkbox
					label="I have reached state pension age (AOW)"
					hint="Lowers the rate in the first box 1 bracket."
					checked={fiscal.reachedStatePensionAge}
					onCheckedChange={(checked) =>
						set({ reachedStatePensionAge: checked })
					}
				/>
				<Checkbox
					label="I have a fiscal partner"
					hint="Recorded for context; the estimate does not model a partner's position."
					checked={fiscal.hasFiscalPartner}
					onCheckedChange={(checked) =>
						set({ hasFiscalPartner: checked })
					}
				/>
			</Card>

			<Card
				title="Other income and personal deductions"
				description="Needed to place your profit in the right bracket."
			>
				<div className="grid grid--2">
					<MoneyField
						label="Other box 1 income this year"
						hint="Salary, benefits, or another business. Leave at zero if the business is your only income."
						value={fiscal.otherBox1IncomeCents}
						onValueChange={(value) =>
							set({ otherBox1IncomeCents: value })
						}
					/>
					<MoneyField
						label="Personal deductions"
						hint="Deductible mortgage interest, AOV premiums, annuity (lijfrente) contributions within your jaarruimte."
						value={fiscal.personalDeductionsCents}
						onValueChange={(value) =>
							set({ personalDeductionsCents: value })
						}
					/>
				</div>
			</Card>
		</>
	);
}

// ---------------------------------------------------------------------------

function InvoicingTab({ working, update }: TabProps): JSX.Element {
	const invoicing = working.invoicing;

	function set(patch: Partial<Settings['invoicing']>): void {
		update({ invoicing: { ...invoicing, ...patch } });
	}

	return (
		<Card title="Invoicing defaults">
			<div className="grid grid--2">
				<div>
					<TextField
						label="Invoice number format"
						hint="{YYYY} year, {YY} short year, {MM} month, {SEQ:3} zero-padded sequence."
						value={invoicing.numberFormat}
						onChange={(event) =>
							set({ numberFormat: event.target.value })
						}
					/>
					<p
						className="field__hint"
						style={{ marginTop: -6, marginBottom: 14 }}
					>
						Next invoice will be{' '}
						<strong>
							{formatInvoiceNumber(
								invoicing.numberFormat,
								invoicing.nextSequence,
								today(),
							)}
						</strong>
						. Dutch rules require an unbroken, sequential series.
					</p>
					<NumberField
						label="Next sequence number"
						min={1}
						value={invoicing.nextSequence}
						onValueChange={(value) => set({ nextSequence: value })}
					/>
					<NumberField
						label="Payment term"
						suffix="days"
						min={0}
						value={invoicing.paymentTermDays}
						onValueChange={(value) =>
							set({ paymentTermDays: value })
						}
					/>
					<SelectField
						label="Default VAT rate"
						value={String(invoicing.defaultVatRate)}
						onValueChange={(value) =>
							set({ defaultVatRate: Number(value) as VatRate })
						}
						options={[
							{ value: '21', label: '21% — standard' },
							{ value: '9', label: '9% — reduced' },
							{ value: '0', label: '0%' },
						]}
					/>
				</div>
				<div>
					<TextArea
						label="Default notes on new invoices"
						value={invoicing.defaultNotes}
						onChange={(event) =>
							set({ defaultNotes: event.target.value })
						}
					/>
					<TextArea
						label="Invoice footer"
						hint="Terms, dispute period, anything you want at the bottom of every invoice."
						value={invoicing.footerText}
						onChange={(event) =>
							set({ footerText: event.target.value })
						}
					/>
				</div>
			</div>
		</Card>
	);
}

// ---------------------------------------------------------------------------

function AiTab({ working, update }: TabProps): JSX.Element {
	const ai = working.ai;
	const [reveal, setReveal] = useState(false);

	function set(patch: Partial<Settings['ai']>): void {
		update({ ai: { ...ai, ...patch } });
	}

	return (
		<>
			<Card
				title="Claude"
				description="Powers receipt scanning and the deduction advisor. Both are optional — everything else in the app works without a key."
			>
				<Checkbox
					label="Enable AI features"
					checked={ai.enabled}
					onCheckedChange={(checked) => set({ enabled: checked })}
				/>
				<TextField
					label="Anthropic API key"
					type={reveal ? 'text' : 'password'}
					placeholder="sk-ant-…"
					autoComplete="off"
					value={ai.apiKey}
					onChange={(event) => set({ apiKey: event.target.value })}
				/>
				<div
					className="btn-row"
					style={{ marginTop: -4, marginBottom: 14 }}
				>
					<button
						type="button"
						className="btn btn--ghost btn--sm"
						onClick={() => setReveal((current) => !current)}
					>
						{reveal ? 'Hide' : 'Show'} key
					</button>
					<a
						className="btn btn--ghost btn--sm"
						href="https://console.anthropic.com/settings/keys"
						target="_blank"
						rel="noreferrer"
					>
						Get a key
					</a>
				</div>

				<SelectField
					label="Model"
					value={ai.model}
					onValueChange={(value) => set({ model: value })}
					options={SELECTABLE_MODELS.map((model) => ({
						value: model.id,
						label: model.label,
					}))}
				/>
			</Card>

			<Banner
				tone="warning"
				title="Where the key lives, and what that means"
			>
				<p>
					The key is stored in this browser's IndexedDB, unencrypted,
					and sent directly from this page to api.anthropic.com. There
					is no server in between — which is why there is nothing to
					breach, and also why anything that can run script in this
					browser could read it.
				</p>
				<p style={{ marginBottom: 0 }}>
					Use a key scoped to a workspace you can rotate cheaply, and
					do not run this app on a shared machine with a key you care
					about. When you move to a server, move the key to it.
				</p>
			</Banner>

			<Banner tone="info" title="What gets sent">
				Receipt scanning sends the receipt image or PDF. The advisor
				sends your business profile, the rulebook and your question.
				Neither sends your invoices, contacts or bank data.
			</Banner>
		</>
	);
}

// ---------------------------------------------------------------------------

function TaxYearsTab({ working, update }: TabProps): JSX.Element {
	const [year, setYear] = useState(yearOf(today()));
	const params = taxYearParameters(year, working.taxYearOverrides);

	function set(patch: Partial<TaxYearParameters>): void {
		update({
			taxYearOverrides: {
				...working.taxYearOverrides,
				[year]: { ...(working.taxYearOverrides[year] ?? {}), ...patch },
			},
		});
	}

	function resetYear(): void {
		const next = { ...working.taxYearOverrides };
		delete next[year];
		update({ taxYearOverrides: next });
	}

	const years = [
		...new Set([...AVAILABLE_TAX_YEARS, yearOf(today()), year]),
	].sort((a, b) => b - a);

	return (
		<>
			<Banner
				tone={params.verifiedByUser ? 'success' : 'warning'}
				title={params.sourceNote}
			>
				<p style={{ marginBottom: 0 }}>
					Dutch rates and allowances change every year and this app
					ships with figures that were correct when it was written,
					not necessarily now. Check them against{' '}
					<a
						href="https://www.belastingdienst.nl"
						target="_blank"
						rel="noreferrer"
					>
						belastingdienst.nl
					</a>{' '}
					and tick the box below — the tax pages carry a warning until
					you do.
				</p>
			</Banner>

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
				<button
					type="button"
					className="btn btn--sm"
					onClick={() => setYear(year + 1)}
				>
					Add {year + 1}
				</button>
				<div className="toolbar__spacer" />
				{working.taxYearOverrides[year] ? (
					<button
						type="button"
						className="btn btn--sm"
						onClick={resetYear}
					>
						Reset {year} to built-in figures
					</button>
				) : null}
			</div>

			<Card title={`Deductions and allowances — ${year}`}>
				<div className="grid grid--3">
					<MoneyField
						label="Zelfstandigenaftrek"
						value={params.zelfstandigenaftrekCents}
						onValueChange={(value) =>
							set({ zelfstandigenaftrekCents: value })
						}
					/>
					<MoneyField
						label="Startersaftrek"
						value={params.startersaftrekCents}
						onValueChange={(value) =>
							set({ startersaftrekCents: value })
						}
					/>
					<NumberField
						label="MKB profit exemption"
						suffix="%"
						step={0.01}
						value={params.mkbProfitExemptionPercent}
						onValueChange={(value) =>
							set({ mkbProfitExemptionPercent: value })
						}
					/>
					<NumberField
						label="Hours criterion"
						suffix="hours"
						value={params.hoursCriterion}
						onValueChange={(value) =>
							set({ hoursCriterion: value })
						}
					/>
					<NumberField
						label="Mileage allowance"
						suffix="cents/km"
						value={params.mileageAllowanceCentsPerKm}
						onValueChange={(value) =>
							set({ mileageAllowanceCentsPerKm: value })
						}
					/>
					<MoneyField
						label="Capitalisation threshold"
						value={params.capitalisationThresholdCents}
						onValueChange={(value) =>
							set({ capitalisationThresholdCents: value })
						}
					/>
				</div>
			</Card>

			<Card title={`Income tax — ${year}`}>
				<div className="grid grid--3">
					<NumberField
						label="Zvw contribution rate"
						suffix="%"
						step={0.01}
						value={params.zvwRatePercent}
						onValueChange={(value) =>
							set({ zvwRatePercent: value })
						}
					/>
					<MoneyField
						label="Zvw maximum income"
						value={params.zvwMaxIncomeCents}
						onValueChange={(value) =>
							set({ zvwMaxIncomeCents: value })
						}
					/>
					<MoneyField
						label="KOR turnover ceiling"
						value={params.korTurnoverCeilingCents}
						onValueChange={(value) =>
							set({ korTurnoverCeilingCents: value })
						}
					/>
				</div>

				<h3 style={{ margin: '12px 0 8px' }}>
					Box 1 brackets (below state pension age)
				</h3>
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Up to</th>
								<th className="num">Rate</th>
							</tr>
						</thead>
						<tbody>
							{params.box1Brackets.map((bracket, index) => (
								<tr key={index}>
									<td>
										{bracket.upToCents === null ? (
											'and above'
										) : (
											<MoneyField
												value={bracket.upToCents}
												onValueChange={(value) =>
													set({
														box1Brackets:
															params.box1Brackets.map(
																(
																	candidate,
																	candidateIndex,
																) =>
																	candidateIndex ===
																	index
																		? {
																				...candidate,
																				upToCents:
																					value,
																		  }
																		: candidate,
															),
													})
												}
											/>
										)}
									</td>
									<td className="num" style={{ width: 140 }}>
										<NumberField
											step={0.01}
											value={bracket.ratePercent}
											onValueChange={(value) =>
												set({
													box1Brackets:
														params.box1Brackets.map(
															(
																candidate,
																candidateIndex,
															) =>
																candidateIndex ===
																index
																	? {
																			...candidate,
																			ratePercent:
																				value,
																	  }
																	: candidate,
														),
												})
											}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="field__hint">
					Rates include national insurance contributions (premies
					volksverzekeringen), the way the Belastingdienst tables
					present them.
				</p>
			</Card>

			<Card title="Verification">
				<Checkbox
					label={`I have checked the ${year} figures against belastingdienst.nl`}
					hint="This only removes the warning banners. It does not make the numbers right — that part is on you."
					checked={params.verifiedByUser}
					onCheckedChange={(checked) =>
						set({ verifiedByUser: checked })
					}
				/>
			</Card>
		</>
	);
}

// ---------------------------------------------------------------------------

function DataTab(): JSX.Element {
	const store = useStore();
	const [importError, setImportError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function exportBackup(): Promise<void> {
		setBusy(true);
		try {
			const snapshot = await store.exportSnapshot();
			downloadFile(
				`ledgerly-backup-${toISODate(new Date())}.json`,
				JSON.stringify(snapshot, null, 2),
				'application/json',
			);
		} finally {
			setBusy(false);
		}
	}

	async function importBackup(file: File): Promise<void> {
		setBusy(true);
		setImportError(null);
		try {
			const snapshot = JSON.parse(await file.text()) as DatabaseSnapshot;
			if (!snapshot.settings || !Array.isArray(snapshot.invoices)) {
				throw new Error(
					'That file does not look like a Ledgerly backup.',
				);
			}
			await store.importSnapshot(snapshot);
		} catch (cause) {
			setImportError(
				cause instanceof Error
					? cause.message
					: 'Could not read that file.',
			);
		} finally {
			setBusy(false);
		}
	}

	const counts = [
		['Invoices', store.invoices.length],
		['Expenses', store.expenses.length],
		['Contacts', store.contacts.length],
		['Assets', store.assets.length],
		['Mileage entries', store.mileage.length],
		['Hours entries', store.hours.length],
		['Bank transactions', store.bankTransactions.length],
		['Receipts stored', store.attachmentMeta.length],
	] as const;

	const attachmentBytes = store.attachmentMeta.reduce(
		(sum, meta) => sum + meta.sizeBytes,
		0,
	);

	return (
		<>
			<Banner tone="warning" title="There is no cloud copy">
				Everything is in this browser. Clearing site data, switching
				browsers, or a dead laptop takes your bookkeeping with it — and
				you are required to keep these records for seven years. Export a
				backup regularly and store it where you keep your tax documents.
			</Banner>

			<Card title="What is stored">
				<div className="table-wrap">
					<table>
						<tbody>
							{counts.map(([label, count]) => (
								<tr key={label}>
									<td>{label}</td>
									<td className="num">{count}</td>
								</tr>
							))}
							<tr>
								<td>Receipt files</td>
								<td className="num">
									{(attachmentBytes / 1_048_576).toFixed(1)}{' '}
									MB
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</Card>

			<Card
				title="Backup and restore"
				description="The backup is a single JSON file containing every record and every receipt, so it can be restored anywhere — and read by anyone who gets hold of it."
			>
				<div className="btn-row">
					<button
						type="button"
						className="btn btn--primary"
						disabled={busy}
						onClick={() => void exportBackup()}
					>
						Export backup
					</button>
					<label className="btn" style={{ cursor: 'pointer' }}>
						Restore from backup
						<input
							type="file"
							accept="application/json,.json"
							hidden
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) void importBackup(file);
								event.target.value = '';
							}}
						/>
					</label>
				</div>
				{importError ? (
					<Banner tone="danger" title="Restore failed">
						{importError}
					</Banner>
				) : null}
				<p
					className="field__hint"
					style={{ marginTop: 12, marginBottom: 0 }}
				>
					Restoring replaces everything currently in the app. Export
					first if you are not sure.
				</p>
			</Card>

			<Card
				title="Moving to a server later"
				description="The app was built so this is a swap, not a rewrite."
			>
				<p className="td-muted">
					All persistence goes through one interface (
					<code>DataStore</code>). The browser implementation is{' '}
					<code>IdbDataStore</code>; a skeleton HTTP implementation
					with the expected routes is in{' '}
					<code>src/storage/HttpDataStore.ts</code>. Point{' '}
					<code>StoreProvider</code> at the second one and every page,
					calculation and export keeps working.
				</p>
				<p className="td-muted" style={{ marginBottom: 0 }}>
					A backup export is also the migration file: it contains the
					full dataset, receipts included, in the shape the server
					would need to import.
				</p>
			</Card>

			<Card title="Danger zone">
				<ConfirmButton
					className="btn btn--danger"
					confirmLabel="Delete everything — really?"
					onConfirm={() => void store.reset()}
				>
					Delete all data
				</ConfirmButton>
				<p
					className="field__hint"
					style={{ marginTop: 10, marginBottom: 0 }}
				>
					Wipes every record and receipt in this browser. There is no
					undo and no server copy.
				</p>
			</Card>
		</>
	);
}
