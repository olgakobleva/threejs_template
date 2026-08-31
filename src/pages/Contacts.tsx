import { useMemo, useState } from 'react';
import { useStore } from '@/storage/StoreProvider';
import { newContact } from '@/domain/defaults';
import type { Contact, ContactKind } from '@/domain/types';
import { invoiceTotals } from '@/tax/nl/vat';
import {
	Badge,
	Card,
	Checkbox,
	ConfirmButton,
	EmptyState,
	Modal,
	Money,
	PageHeader,
	SelectField,
	TextArea,
	TextField,
} from '@/ui/components';

const KIND_LABEL: Record<ContactKind, string> = {
	customer: 'Customer',
	supplier: 'Supplier',
	both: 'Both',
};

export function Contacts(): JSX.Element {
	const store = useStore();
	const [editing, setEditing] = useState<Contact | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [search, setSearch] = useState('');

	const visible = useMemo(() => {
		const needle = search.trim().toLowerCase();
		return store.contacts
			.filter((contact) => showArchived || !contact.archived)
			.filter(
				(contact) =>
					needle === '' ||
					contact.name.toLowerCase().includes(needle) ||
					contact.email.toLowerCase().includes(needle) ||
					contact.vatId.toLowerCase().includes(needle),
			)
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [store.contacts, showArchived, search]);

	const revenueByContact = useMemo(() => {
		const map = new Map<string, number>();
		for (const invoice of store.invoices) {
			if (
				!invoice.contactId ||
				invoice.status === 'cancelled' ||
				invoice.status === 'draft'
			) {
				continue;
			}
			map.set(
				invoice.contactId,
				(map.get(invoice.contactId) ?? 0) + invoiceTotals(invoice).net,
			);
		}
		return map;
	}, [store.invoices]);

	return (
		<>
			<PageHeader
				title="Contacts"
				description="Customers and suppliers. A customer's country and VAT ID decide how VAT is treated on their invoices, so it is worth getting right once."
				actions={
					<button
						type="button"
						className="btn btn--primary"
						onClick={() => setEditing(newContact())}
					>
						New contact
					</button>
				}
			/>

			<div className="toolbar">
				<input
					placeholder="Search name, email or VAT ID"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					style={{ minWidth: 260 }}
				/>
				<label className="checkbox" style={{ margin: 0 }}>
					<input
						type="checkbox"
						checked={showArchived}
						onChange={(event) =>
							setShowArchived(event.target.checked)
						}
					/>
					<span>Show archived</span>
				</label>
			</div>

			<Card flush>
				{visible.length === 0 ? (
					<EmptyState title="No contacts yet">
						Add the people and companies you invoice, so their
						details go onto invoices automatically.
					</EmptyState>
				) : (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Type</th>
									<th>Country</th>
									<th>VAT ID</th>
									<th>Email</th>
									<th className="num">Revenue</th>
								</tr>
							</thead>
							<tbody>
								{visible.map((contact) => (
									<tr
										key={contact.id}
										className="is-clickable"
										onClick={() => setEditing(contact)}
									>
										<td className="td-strong">
											{contact.name || '—'}
											{contact.archived ? (
												<>
													{' '}
													<Badge>Archived</Badge>
												</>
											) : null}
										</td>
										<td className="td-muted">
											{KIND_LABEL[contact.kind]}
										</td>
										<td>
											{contact.address.country || '—'}
										</td>
										<td className="mono td-muted">
											{contact.vatId || '—'}
										</td>
										<td className="td-muted">
											{contact.email || '—'}
										</td>
										<td className="num">
											<Money
												cents={
													revenueByContact.get(
														contact.id,
													) ?? 0
												}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			{editing ? (
				<ContactEditor
					contact={editing}
					onClose={() => setEditing(null)}
				/>
			) : null}
		</>
	);
}

function ContactEditor({
	contact,
	onClose,
}: {
	contact: Contact;
	onClose: () => void;
}): JSX.Element {
	const store = useStore();
	const [working, setWorking] = useState<Contact>(contact);

	function update(patch: Partial<Contact>): void {
		setWorking((current) => ({ ...current, ...patch }));
	}

	function updateAddress(patch: Partial<Contact['address']>): void {
		setWorking((current) => ({
			...current,
			address: { ...current.address, ...patch },
		}));
	}

	const isForeign =
		working.address.country !== 'NL' && working.address.country !== '';

	return (
		<Modal
			title={working.name || 'New contact'}
			onClose={onClose}
			footer={
				<>
					<ConfirmButton
						className="btn btn--danger"
						onConfirm={async () => {
							await store.remove('contacts', working.id);
							onClose();
						}}
					>
						Delete
					</ConfirmButton>
					<div style={{ flex: 1 }} />
					<button type="button" className="btn" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn--primary"
						onClick={async () => {
							await store.save('contacts', working);
							onClose();
						}}
					>
						Save
					</button>
				</>
			}
		>
			<div className="grid grid--2">
				<div>
					<TextField
						label="Name"
						value={working.name}
						onChange={(event) =>
							update({ name: event.target.value })
						}
					/>
					<SelectField
						label="Type"
						value={working.kind}
						onValueChange={(value) => update({ kind: value })}
						options={(Object.keys(KIND_LABEL) as ContactKind[]).map(
							(value) => ({
								value,
								label: KIND_LABEL[value],
							}),
						)}
					/>
					<TextField
						label="Contact person"
						value={working.contactPerson}
						onChange={(event) =>
							update({ contactPerson: event.target.value })
						}
					/>
					<TextField
						label="Email"
						type="email"
						value={working.email}
						onChange={(event) =>
							update({ email: event.target.value })
						}
					/>
					<TextField
						label="Phone"
						value={working.phone}
						onChange={(event) =>
							update({ phone: event.target.value })
						}
					/>
				</div>

				<div>
					<TextField
						label="Address"
						value={working.address.line1}
						onChange={(event) =>
							updateAddress({ line1: event.target.value })
						}
					/>
					<div className="grid grid--2">
						<TextField
							label="Postcode"
							value={working.address.postcode}
							onChange={(event) =>
								updateAddress({ postcode: event.target.value })
							}
						/>
						<TextField
							label="City"
							value={working.address.city}
							onChange={(event) =>
								updateAddress({ city: event.target.value })
							}
						/>
					</div>
					<TextField
						label="Country code"
						hint="Two letters, e.g. NL, DE, US. This drives the VAT treatment on their invoices."
						value={working.address.country}
						maxLength={2}
						onChange={(event) =>
							updateAddress({
								country: event.target.value.toUpperCase(),
							})
						}
					/>
					<TextField
						label="VAT ID"
						hint={
							isForeign && working.isBusiness
								? 'Required to reverse-charge VAT on invoices to this customer.'
								: undefined
						}
						value={working.vatId}
						onChange={(event) =>
							update({ vatId: event.target.value.toUpperCase() })
						}
					/>
					<TextField
						label="KvK number"
						value={working.kvkNumber}
						onChange={(event) =>
							update({ kvkNumber: event.target.value })
						}
					/>
				</div>
			</div>

			<Checkbox
				label="This is a business, not a private individual"
				hint="Reverse charge on cross-border sales only applies between businesses."
				checked={working.isBusiness}
				onCheckedChange={(checked) => update({ isBusiness: checked })}
			/>

			<TextField
				label="Payment term (days)"
				type="number"
				value={working.defaultPaymentTermDays ?? ''}
				placeholder={String(store.settings.invoicing.paymentTermDays)}
				onChange={(event) =>
					update({
						defaultPaymentTermDays:
							event.target.value === ''
								? null
								: Number(event.target.value),
					})
				}
			/>

			<TextArea
				label="Notes"
				value={working.notes}
				onChange={(event) => update({ notes: event.target.value })}
			/>

			<Checkbox
				label="Archived"
				hint="Hides them from pickers without losing the history."
				checked={working.archived}
				onCheckedChange={(checked) => update({ archived: checked })}
			/>
		</Modal>
	);
}
