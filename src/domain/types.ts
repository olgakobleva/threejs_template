import type { Cents } from '@/core/money';
import type { ISODate } from '@/core/dates';

// ---------------------------------------------------------------------------
// VAT (BTW)
// ---------------------------------------------------------------------------

/** The VAT rates a Dutch business can charge. */
export type VatRate = 21 | 9 | 0;

/**
 * How a line is treated for VAT. This — not the rate alone — decides which box
 * ("rubriek") of the BTW return the amount lands in.
 */
export type SalesVatTreatment =
	| 'domestic' // Normal NL sale at 21% / 9% / 0% — boxes 1a / 1b / 1e
	| 'reverse_charge_domestic' // BTW verlegd within NL (e.g. subcontracting) — box 1e
	| 'eu_goods' // Intra-EU B2B supply of goods — box 3b + ICP
	| 'eu_services' // Intra-EU B2B service, VAT reverse-charged — box 3b + ICP
	| 'eu_distance_sale' // Distance selling / installation in the EU — box 3c
	| 'export' // Supply to a country outside the EU — box 3a
	| 'exempt' // Vrijgesteld (education, medical, insurance…) — not in the return
	| 'kor'; // Under the small-business exemption — no VAT charged

export type PurchaseVatTreatment =
	| 'domestic' // NL supplier charged you BTW — deductible in box 5b
	| 'reverse_charge_domestic' // BTW verlegd to you by an NL supplier — box 2a
	| 'eu_acquisition' // Goods/services from another EU country — box 4b
	| 'import' // Goods/services from outside the EU — box 4a
	| 'no_vat'; // Private, exempt, or non-VAT-registered supplier

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface Address {
	line1: string;
	line2: string;
	postcode: string;
	city: string;
	country: string; // ISO-3166 alpha-2, e.g. "NL"
}

export type VatScheme =
	| 'standard' // Normal VAT-registered business
	| 'kor' // Kleineondernemersregeling — VAT-exempt, no returns, no input VAT
	| 'exempt'; // Structurally exempt activity

export type VatPeriodKind = 'month' | 'quarter' | 'year';

export interface BusinessProfile {
	tradeName: string;
	legalName: string;
	kvkNumber: string;
	vatId: string; // BTW-id (NL........B..)
	rsin: string;
	address: Address;
	email: string;
	phone: string;
	website: string;
	iban: string;
	bic: string;
	logoDataUrl: string;
}

export interface FiscalSettings {
	/** First calendar year the business was active — drives starter deductions. */
	firstYearOfBusiness: number;
	vatScheme: VatScheme;
	vatPeriod: VatPeriodKind;
	/** How many years startersaftrek has already been claimed (max 3). */
	startersaftrekYearsClaimed: number;
	/** Whether the 1,225-hour criterion is expected to be met this year. */
	expectsToMeetHoursCriterion: boolean;
	hasFiscalPartner: boolean;
	/** Reached AOW (state pension) age — lowers the box 1 rate. */
	reachedStatePensionAge: boolean;
	/** Other box 1 income (employment, benefits) for the income-tax estimate. */
	otherBox1IncomeCents: Cents;
	/** Deductible personal items (mortgage interest, annuity premiums…). */
	personalDeductionsCents: Cents;
}

export interface InvoiceSettings {
	/** Supports {YYYY}, {YY}, {MM} and {SEQ:n} placeholders. */
	numberFormat: string;
	nextSequence: number;
	paymentTermDays: number;
	defaultVatRate: VatRate;
	defaultNotes: string;
	footerText: string;
	/** Text printed when VAT is reverse-charged. */
	reverseChargeNote: string;
}

export interface AiSettings {
	enabled: boolean;
	/** Stored locally in IndexedDB only — never transmitted anywhere but Anthropic. */
	apiKey: string;
	model: string;
	/** Ask before every call that spends money. */
	confirmBeforeCalls: boolean;
}

export interface Settings {
	id: 'settings';
	business: BusinessProfile;
	fiscal: FiscalSettings;
	invoicing: InvoiceSettings;
	ai: AiSettings;
	/** Tax-year parameters the user has overridden, keyed by year. */
	taxYearOverrides: Record<number, Partial<TaxYearParameters>>;
	onboardingComplete: boolean;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export type ContactKind = 'customer' | 'supplier' | 'both';

export interface Contact {
	id: string;
	kind: ContactKind;
	name: string;
	contactPerson: string;
	email: string;
	phone: string;
	address: Address;
	vatId: string;
	kvkNumber: string;
	/** B2B with a valid EU VAT ID enables reverse-charge treatment. */
	isBusiness: boolean;
	defaultPaymentTermDays: number | null;
	notes: string;
	archived: boolean;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Invoices (sales)
// ---------------------------------------------------------------------------

export type InvoiceStatus =
	| 'draft'
	| 'sent'
	| 'partially_paid'
	| 'paid'
	| 'cancelled';

export interface InvoiceLine {
	id: string;
	description: string;
	quantity: number;
	unit: string;
	unitPriceCents: Cents;
	vatRate: VatRate;
	/** Percentage discount on this line, 0-100. */
	discountPercent: number;
}

export interface Payment {
	id: string;
	date: ISODate;
	amountCents: Cents;
	method: string;
	reference: string;
}

export interface Invoice {
	id: string;
	number: string;
	/** Invoice date — this is the date that decides the VAT period. */
	issueDate: ISODate;
	dueDate: ISODate;
	contactId: string | null;
	/** Snapshot of the customer, so a later contact edit cannot rewrite history. */
	contactSnapshot: {
		name: string;
		address: Address;
		vatId: string;
		email: string;
	};
	lines: InvoiceLine[];
	vatTreatment: SalesVatTreatment;
	currency: 'EUR';
	status: InvoiceStatus;
	notes: string;
	reference: string;
	payments: Payment[];
	/** Set once the invoice has been sent; blocks edits to keep the audit trail. */
	lockedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Expenses (purchases / receipts)
// ---------------------------------------------------------------------------

export type ExpenseStatus = 'unreviewed' | 'confirmed' | 'excluded';

export interface Expense {
	id: string;
	date: ISODate;
	supplierName: string;
	contactId: string | null;
	description: string;
	categoryId: string;
	/** Net amount excluding VAT. */
	netCents: Cents;
	vatRate: VatRate;
	vatCents: Cents;
	vatTreatment: PurchaseVatTreatment;
	/**
	 * Share of the expense that is business-related, 0-100. Applied to both the
	 * deductible cost and the reclaimable VAT.
	 */
	businessUsePercent: number;
	/**
	 * Percentage of the (business-share) cost that is deductible for income tax.
	 * Defaults from the category, overridable per expense.
	 */
	profitDeductiblePercent: number;
	/** Percentage of the (business-share) VAT that may be reclaimed. */
	vatDeductiblePercent: number;
	paymentMethod: string;
	/** Free-text justification — the "explanation" a tax inspector may ask for. */
	justification: string;
	attachmentIds: string[];
	status: ExpenseStatus;
	/** Set when this expense was capitalised as an asset instead of expensed. */
	assetId: string | null;
	/** Populated when the row came from an AI receipt scan. */
	aiExtraction: AiExtractionMeta | null;
	createdAt: string;
	updatedAt: string;
}

export interface AiExtractionMeta {
	model: string;
	extractedAt: string;
	confidence: number;
	warnings: string[];
	rawFields: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export interface Attachment {
	id: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	/** The actual bytes. Kept in a separate object store from the metadata. */
	blob: Blob;
	uploadedAt: string;
	/** Free-form link back to the record that owns it. */
	linkedTo: {
		type: 'expense' | 'invoice' | 'asset' | 'other';
		id: string;
	} | null;
}

// ---------------------------------------------------------------------------
// Fixed assets & depreciation
// ---------------------------------------------------------------------------

export interface Asset {
	id: string;
	description: string;
	purchaseDate: ISODate;
	/** Net purchase price excluding VAT. */
	purchasePriceCents: Cents;
	residualValueCents: Cents;
	/** Straight-line term in years. NL practice: at least 5 (max 20%/year). */
	usefulLifeYears: number;
	businessUsePercent: number;
	categoryId: string;
	/** Whether this investment counts towards the KIA investment allowance. */
	qualifiesForKia: boolean;
	disposedOn: ISODate | null;
	disposalProceedsCents: Cents;
	attachmentIds: string[];
	notes: string;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Mileage & hours
// ---------------------------------------------------------------------------

export type VehicleKind = 'private_car' | 'business_car' | 'bicycle' | 'other';

export interface MileageEntry {
	id: string;
	date: ISODate;
	vehicle: VehicleKind;
	fromLocation: string;
	toLocation: string;
	purpose: string;
	kilometres: number;
	isBusiness: boolean;
	createdAt: string;
	updatedAt: string;
}

export type HoursKind =
	| 'billable'
	| 'admin'
	| 'acquisition'
	| 'study'
	| 'travel'
	| 'other';

export interface HoursEntry {
	id: string;
	date: ISODate;
	hours: number;
	kind: HoursKind;
	/** Counts towards the 1,225-hour urencriterium. */
	countsForCriterion: boolean;
	contactId: string | null;
	description: string;
	invoiceId: string | null;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Bank transactions
// ---------------------------------------------------------------------------

export type BankMatchType =
	| 'invoice'
	| 'expense'
	| 'private'
	| 'transfer'
	| 'unmatched';

export interface BankTransaction {
	id: string;
	date: ISODate;
	/** Positive for money in, negative for money out. */
	amountCents: Cents;
	counterparty: string;
	counterpartyIban: string;
	description: string;
	importBatchId: string;
	matchType: BankMatchType;
	matchedId: string | null;
	notes: string;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Filed returns
// ---------------------------------------------------------------------------

export interface FiledVatReturn {
	id: string;
	/** Period key from `core/dates`, e.g. "2026-Q2". */
	periodKey: string;
	filedOn: ISODate;
	/** Frozen copy of the computed figures at filing time. */
	snapshot: unknown;
	paidOn: ISODate | null;
	notes: string;
	createdAt: string;
}

// ---------------------------------------------------------------------------
// Expense categories & deduction rules
// ---------------------------------------------------------------------------

export type DeductionVerdict =
	| 'deductible'
	| 'partial'
	| 'not_deductible'
	| 'capitalise';

export interface ExpenseCategory {
	id: string;
	label: string;
	group: string;
	/** Default share of the cost deductible against profit, 0-100. */
	profitDeductiblePercent: number;
	/** Default share of the VAT that may be reclaimed, 0-100. */
	vatDeductiblePercent: number;
	verdict: DeductionVerdict;
	/** Short explanation shown in the UI and used by the AI advisor. */
	rationale: string;
	/** Things that flip the verdict — surfaced as warnings. */
	caveats: string[];
	/** Reference to the underlying rule, for the user to verify. */
	reference: string;
	typicalVatRate: VatRate;
	isCustom: boolean;
}

// ---------------------------------------------------------------------------
// Tax-year parameters
// ---------------------------------------------------------------------------

export interface TaxBracket {
	/** Upper bound of the bracket in cents; null means "and above". */
	upToCents: Cents | null;
	/** Combined income tax + national insurance rate, as a percentage. */
	ratePercent: number;
}

export interface CreditPhase {
	/** Income at which this phase starts, in cents. */
	fromCents: Cents;
	/** Fixed amount at the start of the phase, in cents. */
	baseCents: Cents;
	/** Percentage applied to income above `fromCents`; negative for taper-off. */
	ratePercent: number;
}

export interface TaxYearParameters {
	year: number;
	/** Box 1 brackets for taxpayers below state pension age. */
	box1Brackets: TaxBracket[];
	/** Box 1 brackets for taxpayers at or above state pension age. */
	box1BracketsAow: TaxBracket[];
	zelfstandigenaftrekCents: Cents;
	startersaftrekCents: Cents;
	hoursCriterion: number;
	mkbProfitExemptionPercent: number;
	/** Investment allowance (KIA) thresholds. */
	kiaThresholdCents: Cents;
	kiaCeilingCents: Cents;
	kiaRatePercent: number;
	/** Untaxed kilometre allowance for a privately-owned car. */
	mileageAllowanceCentsPerKm: number;
	/** Minimum net purchase price above which an item must be capitalised. */
	capitalisationThresholdCents: Cents;
	/** Maximum straight-line depreciation per year, as a percentage. */
	maxDepreciationPercent: number;
	/** Flat non-deductible amount for mixed-purpose costs (representation etc.). */
	mixedCostsFlatAddbackCents: Cents;
	/** Alternative to the flat add-back: deduct only this share. */
	mixedCostsDeductiblePercent: number;
	generalTaxCredit: CreditPhase[];
	labourTaxCredit: CreditPhase[];
	zvwRatePercent: number;
	zvwMaxIncomeCents: Cents;
	korTurnoverCeilingCents: Cents;
	vatRates: VatRate[];
	/** False until the user has checked the figures against belastingdienst.nl. */
	verifiedByUser: boolean;
	sourceNote: string;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface DatabaseSnapshot {
	version: number;
	exportedAt: string;
	settings: Settings;
	contacts: Contact[];
	invoices: Invoice[];
	expenses: Expense[];
	assets: Asset[];
	mileage: MileageEntry[];
	hours: HoursEntry[];
	bankTransactions: BankTransaction[];
	filedVatReturns: FiledVatReturn[];
	categories: ExpenseCategory[];
	/** Attachments are exported separately because they hold binary data. */
	attachments: Array<Omit<Attachment, 'blob'> & { dataUrl: string }>;
}
