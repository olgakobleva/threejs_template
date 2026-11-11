import { useEffect, useState } from 'react';

export type RouteName =
	| 'dashboard'
	| 'invoices'
	| 'expenses'
	| 'contacts'
	| 'assets'
	| 'logbook'
	| 'bank'
	| 'vat'
	| 'income-tax'
	| 'advisor'
	| 'settings';

export interface Route {
	name: RouteName;
	/** Optional record id, for deep links like #/invoices/inv_abc. */
	id: string | null;
}

const VALID: RouteName[] = [
	'dashboard',
	'invoices',
	'expenses',
	'contacts',
	'assets',
	'logbook',
	'bank',
	'vat',
	'income-tax',
	'advisor',
	'settings',
];

export function parseHash(hash: string): Route {
	const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
	const [name = '', id] = path.split('/');
	const matched = VALID.find((candidate) => candidate === name);
	return { name: matched ?? 'dashboard', id: id ?? null };
}

export function useRoute(): Route {
	const [route, setRoute] = useState<Route>(() =>
		parseHash(window.location.hash),
	);

	useEffect(() => {
		const onChange = (): void => setRoute(parseHash(window.location.hash));
		window.addEventListener('hashchange', onChange);
		return () => window.removeEventListener('hashchange', onChange);
	}, []);

	return route;
}

export function navigate(name: RouteName, id?: string): void {
	window.location.hash = id ? `#/${name}/${id}` : `#/${name}`;
}

export function href(name: RouteName, id?: string): string {
	return id ? `#/${name}/${id}` : `#/${name}`;
}
