import {
	useEffect,
	useId,
	useRef,
	useState,
	type ChangeEvent,
	type InputHTMLAttributes,
	type ReactNode,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from 'react';
import {
	formatMoney,
	parseAmount,
	toDecimalString,
	type Cents,
} from '@/core/money';
import type { DeductionFlag, FlagSeverity } from '@/tax/nl/deductibility';

// ---------------------------------------------------------------------------
// Page furniture
// ---------------------------------------------------------------------------

export function PageHeader({
	title,
	description,
	actions,
}: {
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
}): JSX.Element {
	return (
		<header className="page-header">
			<div className="page-header__text">
				<h1>{title}</h1>
				{description ? <p>{description}</p> : null}
			</div>
			{actions ? <div className="page-actions">{actions}</div> : null}
		</header>
	);
}

export function Card({
	title,
	description,
	actions,
	children,
	flush,
}: {
	title?: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	flush?: boolean;
}): JSX.Element {
	return (
		<section className={flush ? 'card card--flush' : 'card'}>
			{title || actions ? (
				<div
					className="card__header"
					style={flush ? { padding: '16px 18px 0' } : undefined}
				>
					<div>
						<h2>{title}</h2>
						{description ? <p>{description}</p> : null}
					</div>
					{actions ? <div className="btn-row">{actions}</div> : null}
				</div>
			) : null}
			{children}
		</section>
	);
}

export type BannerTone = 'info' | 'warning' | 'danger' | 'success';

const BANNER_ICONS: Record<BannerTone, string> = {
	info: 'ℹ',
	warning: '▲',
	danger: '✕',
	success: '✓',
};

export function Banner({
	tone = 'info',
	title,
	children,
}: {
	tone?: BannerTone;
	title?: string;
	children: ReactNode;
}): JSX.Element {
	return (
		<div className={`banner banner--${tone}`}>
			<span className="banner__icon" aria-hidden="true">
				{BANNER_ICONS[tone]}
			</span>
			<div>
				{title ? <strong>{title}</strong> : null}
				{children}
			</div>
		</div>
	);
}

export function EmptyState({
	title,
	children,
	action,
}: {
	title: string;
	children?: ReactNode;
	action?: ReactNode;
}): JSX.Element {
	return (
		<div className="empty">
			<h3>{title}</h3>
			{children ? <p>{children}</p> : null}
			{action}
		</div>
	);
}

export function Stat({
	label,
	value,
	note,
	tone,
}: {
	label: string;
	value: ReactNode;
	note?: ReactNode;
	tone?: 'accent' | 'danger' | 'success';
}): JSX.Element {
	return (
		<div className={tone ? `stat stat--${tone}` : 'stat'}>
			<div className="stat__label">{label}</div>
			<div className="stat__value">{value}</div>
			{note ? <div className="stat__note">{note}</div> : null}
		</div>
	);
}

export function Badge({
	children,
	tone,
}: {
	children: ReactNode;
	tone?: 'success' | 'warning' | 'danger' | 'info' | 'accent';
}): JSX.Element {
	return (
		<span className={tone ? `badge badge--${tone}` : 'badge'}>
			{children}
		</span>
	);
}

export function Money({
	cents,
	bold,
}: {
	cents: Cents;
	bold?: boolean;
}): JSX.Element {
	return (
		<span className="mono" style={bold ? { fontWeight: 600 } : undefined}>
			{formatMoney(cents)}
		</span>
	);
}

export function Tabs<T extends string>({
	tabs,
	active,
	onChange,
}: {
	tabs: Array<{ id: T; label: string }>;
	active: T;
	onChange: (id: T) => void;
}): JSX.Element {
	return (
		<div className="tabs" role="tablist">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={tab.id === active}
					className={tab.id === active ? 'tab tab--active' : 'tab'}
					onClick={() => onChange(tab.id)}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export function Field({
	label,
	hint,
	error,
	children,
}: {
	label?: ReactNode;
	hint?: ReactNode;
	error?: ReactNode;
	children: ReactNode;
}): JSX.Element {
	return (
		<div className="field">
			{label ? <label className="field__label">{label}</label> : null}
			{children}
			{hint ? <span className="field__hint">{hint}</span> : null}
			{error ? <span className="field__error">{error}</span> : null}
		</div>
	);
}

export function TextField({
	label,
	hint,
	error,
	...props
}: {
	label?: ReactNode;
	hint?: ReactNode;
	error?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>): JSX.Element {
	return (
		<Field label={label} hint={hint} error={error}>
			<input {...props} />
		</Field>
	);
}

export function TextArea({
	label,
	hint,
	...props
}: {
	label?: ReactNode;
	hint?: ReactNode;
} & TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
	return (
		<Field label={label} hint={hint}>
			<textarea {...props} />
		</Field>
	);
}

export function SelectField<T extends string>({
	label,
	hint,
	options,
	value,
	onValueChange,
	...props
}: {
	label?: ReactNode;
	hint?: ReactNode;
	options: Array<{ value: T; label: string }>;
	value: T;
	onValueChange: (value: T) => void;
} & Omit<
	SelectHTMLAttributes<HTMLSelectElement>,
	'value' | 'onChange'
>): JSX.Element {
	return (
		<Field label={label} hint={hint}>
			<select
				{...props}
				value={value}
				onChange={(event: ChangeEvent<HTMLSelectElement>) =>
					onValueChange(event.target.value as T)
				}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</Field>
	);
}

/**
 * Money input that keeps the user's raw typing until they leave the field, so
 * "12,3" does not get rewritten mid-keystroke.
 */
export function MoneyField({
	label,
	hint,
	value,
	onValueChange,
	disabled,
}: {
	label?: ReactNode;
	hint?: ReactNode;
	value: Cents;
	onValueChange: (cents: Cents) => void;
	disabled?: boolean;
}): JSX.Element {
	const [draft, setDraft] = useState<string | null>(null);

	return (
		<Field label={label} hint={hint}>
			<input
				className="input--money"
				inputMode="decimal"
				disabled={disabled}
				value={draft ?? toDecimalString(value)}
				onChange={(event) => {
					setDraft(event.target.value);
					const parsed = parseAmount(event.target.value);
					if (parsed !== null) onValueChange(parsed);
				}}
				onFocus={(event) => event.currentTarget.select()}
				onBlur={() => setDraft(null)}
			/>
		</Field>
	);
}

export function NumberField({
	label,
	hint,
	value,
	onValueChange,
	step = 1,
	min,
	max,
	suffix,
}: {
	label?: ReactNode;
	hint?: ReactNode;
	value: number;
	onValueChange: (value: number) => void;
	step?: number;
	min?: number;
	max?: number;
	suffix?: string;
}): JSX.Element {
	const [draft, setDraft] = useState<string | null>(null);

	return (
		<Field label={suffix ? `${label} (${suffix})` : label} hint={hint}>
			<input
				className="input--number"
				type="number"
				step={step}
				min={min}
				max={max}
				value={draft ?? String(value)}
				onChange={(event) => {
					setDraft(event.target.value);
					const parsed = Number(event.target.value);
					if (Number.isFinite(parsed)) onValueChange(parsed);
				}}
				onBlur={() => setDraft(null)}
			/>
		</Field>
	);
}

export function Checkbox({
	label,
	hint,
	checked,
	onCheckedChange,
}: {
	label: ReactNode;
	hint?: ReactNode;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}): JSX.Element {
	return (
		<label className="checkbox">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onCheckedChange(event.target.checked)}
			/>
			<span>
				{label}
				{hint ? <small>{hint}</small> : null}
			</span>
		</label>
	);
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
	title,
	onClose,
	children,
	footer,
	wide,
}: {
	title: ReactNode;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	wide?: boolean;
}): JSX.Element {
	const headingId = useId();

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKeyDown);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [onClose]);

	return (
		<div
			className="modal-backdrop"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				className={wide ? 'modal modal--wide' : 'modal'}
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<div className="modal__header">
					<h2 id={headingId}>{title}</h2>
					<button
						type="button"
						className="btn btn--ghost btn--sm"
						onClick={onClose}
					>
						Close
					</button>
				</div>
				<div className="modal__body">{children}</div>
				{footer ? <div className="modal__footer">{footer}</div> : null}
			</div>
		</div>
	);
}

export function ConfirmButton({
	onConfirm,
	children,
	confirmLabel = 'Sure?',
	className = 'btn btn--danger btn--sm',
}: {
	onConfirm: () => void;
	children: ReactNode;
	confirmLabel?: string;
	className?: string;
}): JSX.Element {
	const [armed, setArmed] = useState(false);
	const timer = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		},
		[],
	);

	return (
		<button
			type="button"
			className={className}
			onClick={() => {
				if (armed) {
					setArmed(false);
					onConfirm();
					return;
				}
				setArmed(true);
				timer.current = window.setTimeout(() => setArmed(false), 4000);
			}}
		>
			{armed ? confirmLabel : children}
		</button>
	);
}

// ---------------------------------------------------------------------------
// Domain-flavoured bits
// ---------------------------------------------------------------------------

const FLAG_ICONS: Record<FlagSeverity, string> = {
	error: '✕',
	warning: '▲',
	info: 'ℹ',
};

export function FlagList({
	flags,
}: {
	flags: DeductionFlag[];
}): JSX.Element | null {
	if (flags.length === 0) return null;
	return (
		<ul className="flag-list">
			{flags.map((flag) => (
				<li
					key={flag.code + flag.message}
					className={`flag flag--${flag.severity}`}
				>
					<span aria-hidden="true">{FLAG_ICONS[flag.severity]}</span>
					<span>
						{flag.message}
						{flag.action ? (
							<em className="flag__action">{flag.action}</em>
						) : null}
					</span>
				</li>
			))}
		</ul>
	);
}

export function Spinner(): JSX.Element {
	return <span className="spinner" aria-label="Working" />;
}

export function FileDrop({
	accept,
	onFiles,
	label,
	hint,
}: {
	accept: string;
	onFiles: (files: File[]) => void;
	label: string;
	hint?: string;
}): JSX.Element {
	const inputRef = useRef<HTMLInputElement>(null);
	const [active, setActive] = useState(false);

	return (
		<div
			className={active ? 'dropzone dropzone--active' : 'dropzone'}
			role="button"
			tabIndex={0}
			onClick={() => inputRef.current?.click()}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ')
					inputRef.current?.click();
			}}
			onDragOver={(event) => {
				event.preventDefault();
				setActive(true);
			}}
			onDragLeave={() => setActive(false)}
			onDrop={(event) => {
				event.preventDefault();
				setActive(false);
				onFiles([...event.dataTransfer.files]);
			}}
		>
			<strong>{label}</strong>
			{hint ? (
				<div
					style={{
						fontSize: 12,
						marginTop: 4,
						color: 'var(--text-faint)',
					}}
				>
					{hint}
				</div>
			) : null}
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple
				hidden
				onChange={(event) => {
					onFiles([...(event.target.files ?? [])]);
					event.target.value = '';
				}}
			/>
		</div>
	);
}
