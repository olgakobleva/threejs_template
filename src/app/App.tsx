import { useMemo } from 'react';
import { useStore } from '@/storage/StoreProvider';
import { href, useRoute, type RouteName } from './router';
import { Banner } from '@/ui/components';
import { Dashboard } from '@/pages/Dashboard';
import { Invoices } from '@/pages/Invoices';
import { Expenses } from '@/pages/Expenses';
import { Contacts } from '@/pages/Contacts';
import { Assets } from '@/pages/Assets';
import { Logbook } from '@/pages/Logbook';
import { Bank } from '@/pages/Bank';
import { VatReturnPage } from '@/pages/VatReturn';
import { IncomeTaxPage } from '@/pages/IncomeTax';
import { Advisor } from '@/pages/Advisor';
import { SettingsPage } from '@/pages/Settings';

interface NavItem {
	name: RouteName;
	label: string;
	count?: number;
}

export function App(): JSX.Element {
	const store = useStore();
	const route = useRoute();

	const unreviewedExpenses = useMemo(
		() =>
			store.expenses.filter((expense) => expense.status === 'unreviewed')
				.length,
		[store.expenses],
	);

	const openInvoices = useMemo(
		() =>
			store.invoices.filter(
				(invoice) =>
					invoice.status === 'sent' ||
					invoice.status === 'partially_paid',
			).length,
		[store.invoices],
	);

	const unmatchedTransactions = useMemo(
		() =>
			store.bankTransactions.filter(
				(transaction) => transaction.matchType === 'unmatched',
			).length,
		[store.bankTransactions],
	);

	if (!store.ready) {
		return (
			<div style={{ padding: 40, color: 'var(--text-muted)' }}>
				Opening your books…
			</div>
		);
	}

	const groups: Array<{ heading: string; items: NavItem[] }> = [
		{
			heading: 'Overview',
			items: [{ name: 'dashboard', label: 'Dashboard' }],
		},
		{
			heading: 'Records',
			items: [
				{ name: 'invoices', label: 'Invoices', count: openInvoices },
				{
					name: 'expenses',
					label: 'Expenses',
					count: unreviewedExpenses,
				},
				{ name: 'contacts', label: 'Contacts' },
				{ name: 'assets', label: 'Assets' },
				{ name: 'logbook', label: 'Mileage & hours' },
				{ name: 'bank', label: 'Bank', count: unmatchedTransactions },
			],
		},
		{
			heading: 'Tax',
			items: [
				{ name: 'vat', label: 'BTW return' },
				{ name: 'income-tax', label: 'Income tax' },
			],
		},
		{
			heading: 'Help',
			items: [
				{ name: 'advisor', label: 'Deduction advisor' },
				{ name: 'settings', label: 'Settings' },
			],
		},
	];

	return (
		<div className="app">
			<nav className="sidebar">
				<div className="sidebar__brand">
					<strong>Ledgerly</strong>
					<span>NL · ZZP</span>
				</div>

				{groups.map((group) => (
					<div key={group.heading}>
						<div className="sidebar__section">{group.heading}</div>
						{group.items.map((item) => (
							<a
								key={item.name}
								href={href(item.name)}
								className={
									route.name === item.name
										? 'navlink navlink--active'
										: 'navlink'
								}
							>
								<span>{item.label}</span>
								{item.count ? (
									<span className="navlink__count">
										{item.count}
									</span>
								) : null}
							</a>
						))}
					</div>
				))}
			</nav>

			<main className="main">
				{store.error ? (
					<Banner tone="danger" title="Storage problem">
						{store.error} Your data is stored in this browser; if it
						cannot be opened, nothing will be saved.
					</Banner>
				) : null}

				{!store.settings.onboardingComplete &&
				route.name !== 'settings' ? (
					<Banner tone="info" title="Finish setting up">
						Your business details, VAT scheme and tax-year figures
						are not configured yet, so invoices and returns will be
						incomplete. <a href={href('settings')}>Open settings</a>
						.
					</Banner>
				) : null}

				<PageBody route={route.name} id={route.id} />
			</main>
		</div>
	);
}

function PageBody({
	route,
	id,
}: {
	route: RouteName;
	id: string | null;
}): JSX.Element {
	switch (route) {
		case 'invoices':
			return <Invoices selectedId={id} />;
		case 'expenses':
			return <Expenses selectedId={id} />;
		case 'contacts':
			return <Contacts />;
		case 'assets':
			return <Assets />;
		case 'logbook':
			return <Logbook />;
		case 'bank':
			return <Bank />;
		case 'vat':
			return <VatReturnPage />;
		case 'income-tax':
			return <IncomeTaxPage />;
		case 'advisor':
			return <Advisor />;
		case 'settings':
			return <SettingsPage />;
		case 'dashboard':
		default:
			return <Dashboard />;
	}
}
