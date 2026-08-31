export function newId(prefix: string): string {
	const random =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
			: Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
	return `${prefix}_${random}`;
}

export function nowTimestamp(): string {
	return new Date().toISOString();
}
