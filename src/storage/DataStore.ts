import type {
	Asset,
	Attachment,
	BankTransaction,
	Contact,
	DatabaseSnapshot,
	Expense,
	ExpenseCategory,
	FiledVatReturn,
	HoursEntry,
	Invoice,
	MileageEntry,
	Settings,
} from '@/domain/types';

/**
 * Everything the app is allowed to do to persistent data.
 *
 * The UI talks to this interface and nothing else. Today the only
 * implementation is IndexedDB in the browser (`IdbDataStore`). Moving to a
 * server later means writing one more implementation that speaks HTTP —
 * `HttpDataStore` is the skeleton — and swapping it in `StoreProvider`. No page
 * or calculation changes.
 *
 * That is why every method is async even though IndexedDB could sometimes
 * answer synchronously: the network version cannot.
 */

export type CollectionName =
	| 'contacts'
	| 'invoices'
	| 'expenses'
	| 'assets'
	| 'mileage'
	| 'hours'
	| 'bankTransactions'
	| 'filedVatReturns'
	| 'categories';

export interface CollectionMap {
	contacts: Contact;
	invoices: Invoice;
	expenses: Expense;
	assets: Asset;
	mileage: MileageEntry;
	hours: HoursEntry;
	bankTransactions: BankTransaction;
	filedVatReturns: FiledVatReturn;
	categories: ExpenseCategory;
}

export interface DataStore {
	/** Create schema, seed built-in categories, migrate. Safe to call twice. */
	initialise(): Promise<void>;

	getSettings(): Promise<Settings>;
	saveSettings(settings: Settings): Promise<void>;

	list<K extends CollectionName>(
		collection: K,
	): Promise<Array<CollectionMap[K]>>;
	get<K extends CollectionName>(
		collection: K,
		id: string,
	): Promise<CollectionMap[K] | undefined>;
	put<K extends CollectionName>(
		collection: K,
		record: CollectionMap[K],
	): Promise<void>;
	putMany<K extends CollectionName>(
		collection: K,
		records: Array<CollectionMap[K]>,
	): Promise<void>;
	remove(collection: CollectionName, id: string): Promise<void>;

	// Attachments are handled separately because they carry binary blobs.
	putAttachment(attachment: Attachment): Promise<void>;
	getAttachment(id: string): Promise<Attachment | undefined>;
	listAttachmentMeta(): Promise<Array<Omit<Attachment, 'blob'>>>;
	removeAttachment(id: string): Promise<void>;

	/** Full export, for backups and for migrating to a server later. */
	exportAll(): Promise<DatabaseSnapshot>;
	/** Replaces everything. Used by restore. */
	importAll(snapshot: DatabaseSnapshot): Promise<void>;
	/** Wipes the database. */
	clearAll(): Promise<void>;
}

export const SCHEMA_VERSION = 1;
