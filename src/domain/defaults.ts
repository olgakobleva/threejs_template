import { newId, nowTimestamp } from '@/core/id';
import { addDays, today, yearOf } from '@/core/dates';
import type {
	Address,
	Asset,
	Contact,
	Expense,
	HoursEntry,
	Invoice,
	InvoiceLine,
	MileageEntry,
	Settings,
} from './types';

export const EMPTY_ADDRESS: Address = {
	line1: '',
	line2: '',
	postcode: '',
	city: '',
	country: 'NL',
};

export function defaultSettings(): Settings {
	const year = yearOf(today());
	return {
		id: 'settings',
		business: {
			tradeName: '',
			legalName: '',
			kvkNumber: '',
			vatId: '',
			rsin: '',
			address: { ...EMPTY_ADDRESS },
			email: '',
			phone: '',
			website: '',
			iban: '',
			bic: '',
			logoDataUrl: '',
		},
		fiscal: {
			firstYearOfBusiness: year,
			vatScheme: 'standard',
			vatPeriod: 'quarter',
			startersaftrekYearsClaimed: 0,
			expectsToMeetHoursCriterion: true,
			hasFiscalPartner: false,
			reachedStatePensionAge: false,
			otherBox1IncomeCents: 0,
			personalDeductionsCents: 0,
		},
		invoicing: {
			numberFormat: '{YYYY}-{SEQ:3}',
			nextSequence: 1,
			paymentTermDays: 30,
			defaultVatRate: 21,
			defaultNotes: '',
			footerText: '',
			reverseChargeNote: '',
		},
		ai: {
			enabled: false,
			apiKey: '',
			model: 'claude-opus-5',
			confirmBeforeCalls: true,
		},
		taxYearOverrides: {},
		onboardingComplete: false,
		updatedAt: nowTimestamp(),
	};
}

export function newContact(overrides: Partial<Contact> = {}): Contact {
	const timestamp = nowTimestamp();
	return {
		id: newId('con'),
		kind: 'customer',
		name: '',
		contactPerson: '',
		email: '',
		phone: '',
		address: { ...EMPTY_ADDRESS },
		vatId: '',
		kvkNumber: '',
		isBusiness: true,
		defaultPaymentTermDays: null,
		notes: '',
		archived: false,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

export function newInvoiceLine(
	overrides: Partial<InvoiceLine> = {},
): InvoiceLine {
	return {
		id: newId('lin'),
		description: '',
		quantity: 1,
		unit: 'item',
		unitPriceCents: 0,
		vatRate: 21,
		discountPercent: 0,
		...overrides,
	};
}

export function newInvoice(
	settings: Settings,
	overrides: Partial<Invoice> = {},
): Invoice {
	const timestamp = nowTimestamp();
	const issueDate = overrides.issueDate ?? today();
	return {
		id: newId('inv'),
		number: '',
		issueDate,
		dueDate: addDays(issueDate, settings.invoicing.paymentTermDays),
		contactId: null,
		contactSnapshot: {
			name: '',
			address: { ...EMPTY_ADDRESS },
			vatId: '',
			email: '',
		},
		lines: [newInvoiceLine({ vatRate: settings.invoicing.defaultVatRate })],
		vatTreatment: settings.fiscal.vatScheme === 'kor' ? 'kor' : 'domestic',
		currency: 'EUR',
		status: 'draft',
		notes: settings.invoicing.defaultNotes,
		reference: '',
		payments: [],
		lockedAt: null,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

export function newExpense(overrides: Partial<Expense> = {}): Expense {
	const timestamp = nowTimestamp();
	return {
		id: newId('exp'),
		date: today(),
		supplierName: '',
		contactId: null,
		description: '',
		categoryId: 'uncategorised',
		netCents: 0,
		vatRate: 21,
		vatCents: 0,
		vatTreatment: 'domestic',
		businessUsePercent: 100,
		profitDeductiblePercent: 0,
		vatDeductiblePercent: 0,
		paymentMethod: '',
		justification: '',
		attachmentIds: [],
		status: 'unreviewed',
		assetId: null,
		aiExtraction: null,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

export function newAsset(overrides: Partial<Asset> = {}): Asset {
	const timestamp = nowTimestamp();
	return {
		id: newId('ast'),
		description: '',
		purchaseDate: today(),
		purchasePriceCents: 0,
		residualValueCents: 0,
		usefulLifeYears: 5,
		businessUsePercent: 100,
		categoryId: 'equipment_capitalised',
		qualifiesForKia: true,
		disposedOn: null,
		disposalProceedsCents: 0,
		attachmentIds: [],
		notes: '',
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

export function newMileageEntry(
	overrides: Partial<MileageEntry> = {},
): MileageEntry {
	const timestamp = nowTimestamp();
	return {
		id: newId('mil'),
		date: today(),
		vehicle: 'private_car',
		fromLocation: '',
		toLocation: '',
		purpose: '',
		kilometres: 0,
		isBusiness: true,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

export function newHoursEntry(overrides: Partial<HoursEntry> = {}): HoursEntry {
	const timestamp = nowTimestamp();
	return {
		id: newId('hrs'),
		date: today(),
		hours: 0,
		kind: 'billable',
		countsForCriterion: true,
		contactId: null,
		description: '',
		invoiceId: null,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides,
	};
}

/** Render the configured invoice number pattern for a given sequence. */
export function formatInvoiceNumber(
	pattern: string,
	sequence: number,
	issueDate: string,
): string {
	return pattern
		.replace(/\{YYYY\}/g, issueDate.slice(0, 4))
		.replace(/\{YY\}/g, issueDate.slice(2, 4))
		.replace(/\{MM\}/g, issueDate.slice(5, 7))
		.replace(/\{SEQ:(\d+)\}/g, (_match, width: string) =>
			String(sequence).padStart(Number(width), '0'),
		)
		.replace(/\{SEQ\}/g, String(sequence));
}
