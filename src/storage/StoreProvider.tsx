import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
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
import { defaultSettings } from '@/domain/defaults';
import { nowTimestamp } from '@/core/id';
import { IdbDataStore } from './IdbDataStore';
import type { CollectionMap, CollectionName, DataStore } from './DataStore';

/**
 * The whole dataset is held in memory and mirrored to the store on every write.
 *
 * A sole trader's books are small — a few thousand records over a decade — so
 * this keeps every page and calculation synchronous and simple. Swapping in a
 * networked store later changes the load and the write-through, not the pages.
 */

interface Collections {
	contacts: Contact[];
	invoices: Invoice[];
	expenses: Expense[];
	assets: Asset[];
	mileage: MileageEntry[];
	hours: HoursEntry[];
	bankTransactions: BankTransaction[];
	filedVatReturns: FiledVatReturn[];
	categories: ExpenseCategory[];
}

const EMPTY_COLLECTIONS: Collections = {
	contacts: [],
	invoices: [],
	expenses: [],
	assets: [],
	mileage: [],
	hours: [],
	bankTransactions: [],
	filedVatReturns: [],
	categories: [],
};

export interface StoreContextValue extends Collections {
	ready: boolean;
	error: string | null;
	settings: Settings;
	attachmentMeta: Array<Omit<Attachment, 'blob'>>;

	saveSettings(next: Settings): Promise<void>;
	save<K extends CollectionName>(
		collection: K,
		record: CollectionMap[K],
	): Promise<void>;
	saveMany<K extends CollectionName>(
		collection: K,
		records: Array<CollectionMap[K]>,
	): Promise<void>;
	remove(collection: CollectionName, id: string): Promise<void>;

	addAttachment(
		file: File,
		linkedTo: Attachment['linkedTo'],
	): Promise<Attachment>;
	getAttachment(id: string): Promise<Attachment | undefined>;
	removeAttachment(id: string): Promise<void>;

	exportSnapshot(): Promise<DatabaseSnapshot>;
	importSnapshot(snapshot: DatabaseSnapshot): Promise<void>;
	reset(): Promise<void>;
	reload(): Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function withTimestamp<T extends { updatedAt?: string }>(record: T): T {
	if ('updatedAt' in record) {
		return { ...record, updatedAt: nowTimestamp() };
	}
	return record;
}

export function StoreProvider({
	children,
	store,
}: {
	children: ReactNode;
	/**
	 * Phase 2: pass `new HttpDataStore('https://…')` here instead and nothing
	 * else in the app has to change.
	 */
	store?: DataStore;
}): JSX.Element {
	const storeRef = useRef<DataStore>(store ?? new IdbDataStore());
	const [ready, setReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [settings, setSettings] = useState<Settings>(defaultSettings());
	const [collections, setCollections] =
		useState<Collections>(EMPTY_COLLECTIONS);
	const [attachmentMeta, setAttachmentMeta] = useState<
		Array<Omit<Attachment, 'blob'>>
	>([]);

	const loadEverything = useCallback(async () => {
		const dataStore = storeRef.current;
		await dataStore.initialise();

		const [
			loadedSettings,
			contacts,
			invoices,
			expenses,
			assets,
			mileage,
			hours,
			bankTransactions,
			filedVatReturns,
			categories,
			attachments,
		] = await Promise.all([
			dataStore.getSettings(),
			dataStore.list('contacts'),
			dataStore.list('invoices'),
			dataStore.list('expenses'),
			dataStore.list('assets'),
			dataStore.list('mileage'),
			dataStore.list('hours'),
			dataStore.list('bankTransactions'),
			dataStore.list('filedVatReturns'),
			dataStore.list('categories'),
			dataStore.listAttachmentMeta(),
		]);

		setSettings(loadedSettings);
		setCollections({
			contacts,
			invoices,
			expenses,
			assets,
			mileage,
			hours,
			bankTransactions,
			filedVatReturns,
			categories,
		});
		setAttachmentMeta(attachments);
	}, []);

	useEffect(() => {
		let cancelled = false;
		loadEverything()
			.then(() => {
				if (!cancelled) {
					setReady(true);
					setError(null);
				}
			})
			.catch((cause: unknown) => {
				if (cancelled) return;
				setError(
					cause instanceof Error
						? cause.message
						: 'Could not open the local database. Private browsing modes often block IndexedDB.',
				);
				setReady(true);
			});
		return () => {
			cancelled = true;
		};
	}, [loadEverything]);

	const saveSettings = useCallback(async (next: Settings) => {
		await storeRef.current.saveSettings(next);
		setSettings({ ...next, updatedAt: nowTimestamp() });
	}, []);

	const save = useCallback(
		async <K extends CollectionName>(
			collection: K,
			record: CollectionMap[K],
		) => {
			const stamped = withTimestamp(
				record as { updatedAt?: string },
			) as CollectionMap[K];
			await storeRef.current.put(collection, stamped);
			setCollections((current) => {
				const list = current[collection] as Array<CollectionMap[K]>;
				const id = (stamped as { id: string }).id;
				const index = list.findIndex(
					(item) => (item as { id: string }).id === id,
				);
				const next = index >= 0 ? [...list] : [...list, stamped];
				if (index >= 0) next[index] = stamped;
				return { ...current, [collection]: next };
			});
		},
		[],
	);

	const saveMany = useCallback(
		async <K extends CollectionName>(
			collection: K,
			records: Array<CollectionMap[K]>,
		) => {
			if (records.length === 0) return;
			const stamped = records.map(
				(record) =>
					withTimestamp(
						record as { updatedAt?: string },
					) as CollectionMap[K],
			);
			await storeRef.current.putMany(collection, stamped);
			setCollections((current) => {
				const list = [
					...(current[collection] as Array<CollectionMap[K]>),
				];
				for (const record of stamped) {
					const id = (record as { id: string }).id;
					const index = list.findIndex(
						(item) => (item as { id: string }).id === id,
					);
					if (index >= 0) list[index] = record;
					else list.push(record);
				}
				return { ...current, [collection]: list };
			});
		},
		[],
	);

	const remove = useCallback(
		async (collection: CollectionName, id: string) => {
			await storeRef.current.remove(collection, id);
			setCollections((current) => ({
				...current,
				[collection]: (
					current[collection] as Array<{ id: string }>
				).filter((item) => item.id !== id),
			}));
		},
		[],
	);

	const addAttachment = useCallback(
		async (
			file: File,
			linkedTo: Attachment['linkedTo'],
		): Promise<Attachment> => {
			const attachment: Attachment = {
				id: `att_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
				filename: file.name,
				mimeType: file.type || 'application/octet-stream',
				sizeBytes: file.size,
				blob: file,
				uploadedAt: nowTimestamp(),
				linkedTo,
			};
			await storeRef.current.putAttachment(attachment);
			const { blob: _blob, ...meta } = attachment;
			setAttachmentMeta((current) => [...current, meta]);
			return attachment;
		},
		[],
	);

	const getAttachment = useCallback(
		(id: string) => storeRef.current.getAttachment(id),
		[],
	);

	const removeAttachment = useCallback(async (id: string) => {
		await storeRef.current.removeAttachment(id);
		setAttachmentMeta((current) =>
			current.filter((meta) => meta.id !== id),
		);
	}, []);

	const exportSnapshot = useCallback(() => storeRef.current.exportAll(), []);

	const importSnapshot = useCallback(
		async (snapshot: DatabaseSnapshot) => {
			await storeRef.current.importAll(snapshot);
			await loadEverything();
		},
		[loadEverything],
	);

	const reset = useCallback(async () => {
		await storeRef.current.clearAll();
		await loadEverything();
	}, [loadEverything]);

	const value = useMemo<StoreContextValue>(
		() => ({
			...collections,
			ready,
			error,
			settings,
			attachmentMeta,
			saveSettings,
			save,
			saveMany,
			remove,
			addAttachment,
			getAttachment,
			removeAttachment,
			exportSnapshot,
			importSnapshot,
			reset,
			reload: loadEverything,
		}),
		[
			collections,
			ready,
			error,
			settings,
			attachmentMeta,
			saveSettings,
			save,
			saveMany,
			remove,
			addAttachment,
			getAttachment,
			removeAttachment,
			exportSnapshot,
			importSnapshot,
			reset,
			loadEverything,
		],
	);

	return (
		<StoreContext.Provider value={value}>{children}</StoreContext.Provider>
	);
}

export function useStore(): StoreContextValue {
	const context = useContext(StoreContext);
	if (!context)
		throw new Error('useStore must be used inside <StoreProvider>');
	return context;
}
