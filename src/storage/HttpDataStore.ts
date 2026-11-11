import type { Attachment, DatabaseSnapshot, Settings } from '@/domain/types';
import type { CollectionMap, CollectionName, DataStore } from './DataStore';

/**
 * Phase-2 skeleton: the same contract, over HTTP.
 *
 * Nothing in the app imports this yet. When you outgrow one device, stand up a
 * backend that serves these routes, then change the single line in
 * `StoreProvider` that constructs `IdbDataStore` to construct this instead.
 * Pages, calculations and the AI layer stay untouched.
 *
 * Expected routes:
 *   GET    /api/settings                 -> Settings
 *   PUT    /api/settings                 <- Settings
 *   GET    /api/:collection              -> T[]
 *   GET    /api/:collection/:id          -> T
 *   PUT    /api/:collection/:id          <- T
 *   PUT    /api/:collection              <- T[]        (bulk upsert)
 *   DELETE /api/:collection/:id
 *   POST   /api/attachments              <- multipart  -> { id }
 *   GET    /api/attachments/:id          -> binary
 *   GET    /api/attachments              -> metadata[]
 *   DELETE /api/attachments/:id
 *   GET    /api/export                   -> DatabaseSnapshot
 *   POST   /api/import                   <- DatabaseSnapshot
 *   POST   /api/reset
 *
 * Before this becomes real it needs the things a browser-only app does not:
 * authentication, per-user scoping on every route, and encryption at rest for
 * the receipt files.
 */
export class HttpDataStore implements DataStore {
	constructor(
		private readonly baseUrl: string,
		private readonly authToken: () => string | null = () => null,
	) {}

	private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
		const token = this.authToken();
		const response = await fetch(`${this.baseUrl}${path}`, {
			...init,
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...(init.headers ?? {}),
			},
		});

		if (!response.ok) {
			throw new Error(
				`${init.method ?? 'GET'} ${path} failed: ${response.status}`,
			);
		}
		if (response.status === 204) return undefined as T;
		return (await response.json()) as T;
	}

	async initialise(): Promise<void> {
		await this.request<{ ok: boolean }>('/api/health');
	}

	getSettings(): Promise<Settings> {
		return this.request<Settings>('/api/settings');
	}

	async saveSettings(settings: Settings): Promise<void> {
		await this.request('/api/settings', {
			method: 'PUT',
			body: JSON.stringify(settings),
		});
	}

	list<K extends CollectionName>(
		collection: K,
	): Promise<Array<CollectionMap[K]>> {
		return this.request<Array<CollectionMap[K]>>(`/api/${collection}`);
	}

	get<K extends CollectionName>(
		collection: K,
		id: string,
	): Promise<CollectionMap[K] | undefined> {
		return this.request<CollectionMap[K] | undefined>(
			`/api/${collection}/${id}`,
		);
	}

	async put<K extends CollectionName>(
		collection: K,
		record: CollectionMap[K],
	): Promise<void> {
		await this.request(
			`/api/${collection}/${(record as { id: string }).id}`,
			{
				method: 'PUT',
				body: JSON.stringify(record),
			},
		);
	}

	async putMany<K extends CollectionName>(
		collection: K,
		records: Array<CollectionMap[K]>,
	): Promise<void> {
		if (records.length === 0) return;
		await this.request(`/api/${collection}`, {
			method: 'PUT',
			body: JSON.stringify(records),
		});
	}

	async remove(collection: CollectionName, id: string): Promise<void> {
		await this.request(`/api/${collection}/${id}`, { method: 'DELETE' });
	}

	async putAttachment(attachment: Attachment): Promise<void> {
		const form = new FormData();
		form.append('id', attachment.id);
		form.append('filename', attachment.filename);
		form.append('linkedTo', JSON.stringify(attachment.linkedTo));
		form.append('file', attachment.blob, attachment.filename);

		const token = this.authToken();
		const response = await fetch(`${this.baseUrl}/api/attachments`, {
			method: 'POST',
			headers: token ? { Authorization: `Bearer ${token}` } : {},
			body: form,
		});
		if (!response.ok)
			throw new Error(`Attachment upload failed: ${response.status}`);
	}

	async getAttachment(id: string): Promise<Attachment | undefined> {
		const token = this.authToken();
		const response = await fetch(`${this.baseUrl}/api/attachments/${id}`, {
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		});
		if (response.status === 404) return undefined;
		if (!response.ok)
			throw new Error(`Attachment fetch failed: ${response.status}`);

		const blob = await response.blob();
		const meta = JSON.parse(
			response.headers.get('X-Attachment-Meta') ?? '{}',
		) as Omit<Attachment, 'blob'>;
		return { ...meta, id, blob };
	}

	listAttachmentMeta(): Promise<Array<Omit<Attachment, 'blob'>>> {
		return this.request<Array<Omit<Attachment, 'blob'>>>(
			'/api/attachments',
		);
	}

	async removeAttachment(id: string): Promise<void> {
		await this.request(`/api/attachments/${id}`, { method: 'DELETE' });
	}

	exportAll(): Promise<DatabaseSnapshot> {
		return this.request<DatabaseSnapshot>('/api/export');
	}

	async importAll(snapshot: DatabaseSnapshot): Promise<void> {
		await this.request('/api/import', {
			method: 'POST',
			body: JSON.stringify(snapshot),
		});
	}

	async clearAll(): Promise<void> {
		await this.request('/api/reset', { method: 'POST' });
	}
}
