import { openDB, type IDBPDatabase } from 'idb';
import type {
	Attachment,
	DatabaseSnapshot,
	ExpenseCategory,
	Settings,
} from '@/domain/types';
import { defaultSettings } from '@/domain/defaults';
import { BUILT_IN_CATEGORIES } from '@/tax/nl/categories';
import { nowTimestamp } from '@/core/id';
import {
	SCHEMA_VERSION,
	type CollectionMap,
	type CollectionName,
	type DataStore,
} from './DataStore';

const DB_NAME = 'ledgerly';

const COLLECTIONS: CollectionName[] = [
	'contacts',
	'invoices',
	'expenses',
	'assets',
	'mileage',
	'hours',
	'bankTransactions',
	'filedVatReturns',
	'categories',
];

const META_STORE = 'settings';
const ATTACHMENT_STORE = 'attachments';

/**
 * IndexedDB implementation. Everything — including receipt scans — lives in the
 * browser profile of this device. Nothing leaves it except the receipt images
 * you explicitly send to the AI scanner.
 *
 * The obvious consequence: clearing site data deletes your bookkeeping. The app
 * nags about backups for exactly this reason.
 */
export class IdbDataStore implements DataStore {
	private db: IDBPDatabase | null = null;

	private async connection(): Promise<IDBPDatabase> {
		if (this.db) return this.db;
		this.db = await openDB(DB_NAME, SCHEMA_VERSION, {
			upgrade(db) {
				for (const name of COLLECTIONS) {
					if (!db.objectStoreNames.contains(name)) {
						db.createObjectStore(name, { keyPath: 'id' });
					}
				}
				if (!db.objectStoreNames.contains(META_STORE)) {
					db.createObjectStore(META_STORE, { keyPath: 'id' });
				}
				if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) {
					db.createObjectStore(ATTACHMENT_STORE, { keyPath: 'id' });
				}
			},
		});
		return this.db;
	}

	async initialise(): Promise<void> {
		const db = await this.connection();

		const existingSettings = await db.get(META_STORE, 'settings');
		if (!existingSettings) {
			await db.put(META_STORE, defaultSettings());
		}

		// Seed built-in categories, and top up any added in a later release
		// without touching the user's edits to existing ones.
		const existingCategories = (await db.getAll(
			'categories',
		)) as ExpenseCategory[];
		const existingIds = new Set(
			existingCategories.map((category) => category.id),
		);
		const missing = BUILT_IN_CATEGORIES.filter(
			(category) => !existingIds.has(category.id),
		);
		if (missing.length > 0) {
			const tx = db.transaction('categories', 'readwrite');
			await Promise.all(
				missing.map((category) => tx.store.put(category)),
			);
			await tx.done;
		}
	}

	async getSettings(): Promise<Settings> {
		const db = await this.connection();
		const stored = (await db.get(META_STORE, 'settings')) as
			| Settings
			| undefined;
		return stored ?? defaultSettings();
	}

	async saveSettings(settings: Settings): Promise<void> {
		const db = await this.connection();
		await db.put(META_STORE, {
			...settings,
			id: 'settings',
			updatedAt: nowTimestamp(),
		});
	}

	async list<K extends CollectionName>(
		collection: K,
	): Promise<Array<CollectionMap[K]>> {
		const db = await this.connection();
		return (await db.getAll(collection)) as Array<CollectionMap[K]>;
	}

	async get<K extends CollectionName>(
		collection: K,
		id: string,
	): Promise<CollectionMap[K] | undefined> {
		const db = await this.connection();
		return (await db.get(collection, id)) as CollectionMap[K] | undefined;
	}

	async put<K extends CollectionName>(
		collection: K,
		record: CollectionMap[K],
	): Promise<void> {
		const db = await this.connection();
		await db.put(collection, record);
	}

	async putMany<K extends CollectionName>(
		collection: K,
		records: Array<CollectionMap[K]>,
	): Promise<void> {
		if (records.length === 0) return;
		const db = await this.connection();
		const tx = db.transaction(collection, 'readwrite');
		await Promise.all(records.map((record) => tx.store.put(record)));
		await tx.done;
	}

	async remove(collection: CollectionName, id: string): Promise<void> {
		const db = await this.connection();
		await db.delete(collection, id);
	}

	async putAttachment(attachment: Attachment): Promise<void> {
		const db = await this.connection();
		await db.put(ATTACHMENT_STORE, attachment);
	}

	async getAttachment(id: string): Promise<Attachment | undefined> {
		const db = await this.connection();
		return (await db.get(ATTACHMENT_STORE, id)) as Attachment | undefined;
	}

	async listAttachmentMeta(): Promise<Array<Omit<Attachment, 'blob'>>> {
		const db = await this.connection();
		const all = (await db.getAll(ATTACHMENT_STORE)) as Attachment[];
		return all.map(({ blob: _blob, ...meta }) => meta);
	}

	async removeAttachment(id: string): Promise<void> {
		const db = await this.connection();
		await db.delete(ATTACHMENT_STORE, id);
	}

	async exportAll(): Promise<DatabaseSnapshot> {
		const db = await this.connection();
		const attachments = (await db.getAll(ATTACHMENT_STORE)) as Attachment[];

		const encoded = await Promise.all(
			attachments.map(async ({ blob, ...meta }) => ({
				...meta,
				dataUrl: await blobToDataUrl(blob),
			})),
		);

		return {
			version: SCHEMA_VERSION,
			exportedAt: nowTimestamp(),
			settings: await this.getSettings(),
			contacts: await this.list('contacts'),
			invoices: await this.list('invoices'),
			expenses: await this.list('expenses'),
			assets: await this.list('assets'),
			mileage: await this.list('mileage'),
			hours: await this.list('hours'),
			bankTransactions: await this.list('bankTransactions'),
			filedVatReturns: await this.list('filedVatReturns'),
			categories: await this.list('categories'),
			attachments: encoded,
		};
	}

	async importAll(snapshot: DatabaseSnapshot): Promise<void> {
		await this.clearAll();
		const db = await this.connection();

		await db.put(META_STORE, { ...snapshot.settings, id: 'settings' });
		await this.putMany('contacts', snapshot.contacts ?? []);
		await this.putMany('invoices', snapshot.invoices ?? []);
		await this.putMany('expenses', snapshot.expenses ?? []);
		await this.putMany('assets', snapshot.assets ?? []);
		await this.putMany('mileage', snapshot.mileage ?? []);
		await this.putMany('hours', snapshot.hours ?? []);
		await this.putMany('bankTransactions', snapshot.bankTransactions ?? []);
		await this.putMany('filedVatReturns', snapshot.filedVatReturns ?? []);
		await this.putMany(
			'categories',
			snapshot.categories ?? BUILT_IN_CATEGORIES,
		);

		for (const attachment of snapshot.attachments ?? []) {
			const { dataUrl, ...meta } = attachment;
			await this.putAttachment({ ...meta, blob: dataUrlToBlob(dataUrl) });
		}
	}

	async clearAll(): Promise<void> {
		const db = await this.connection();
		const stores = [...COLLECTIONS, META_STORE, ATTACHMENT_STORE];
		const tx = db.transaction(stores, 'readwrite');
		await Promise.all(stores.map((store) => tx.objectStore(store).clear()));
		await tx.done;
	}
}

// ---------------------------------------------------------------------------

export function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () =>
			reject(reader.error ?? new Error('Could not read file'));
		reader.readAsDataURL(blob);
	});
}

export function dataUrlToBlob(dataUrl: string): Blob {
	const [header = '', payload = ''] = dataUrl.split(',');
	const mimeMatch = /data:([^;]+)/.exec(header);
	const mimeType = mimeMatch?.[1] ?? 'application/octet-stream';
	const binary = atob(payload);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type: mimeType });
}

/** Strip the `data:...;base64,` prefix — what the Anthropic API wants. */
export function base64Payload(dataUrl: string): string {
	return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
