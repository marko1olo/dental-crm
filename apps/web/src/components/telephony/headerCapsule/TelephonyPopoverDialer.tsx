import React from "react";
import { Delete, PhoneCall } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { DIALPAD_KEYS } from "../telephonyCatalogData";

export interface TelephonyPopoverDialerProps {
	dialNumber: string;
	onDialNumberChange: (val: string) => void;
	onStartCall: (phone: string) => void;
	dialInputRef: React.RefObject<HTMLInputElement | null>;
}

export function TelephonyPopoverDialer({
	dialNumber, onDialNumberChange, onStartCall, dialInputRef,
}: TelephonyPopoverDialerProps): React.JSX.Element {
	const handleDigit = (d: string) => {
		onDialNumberChange(dialNumber + d);
		dialInputRef.current?.focus();
	};

	const handleBackspace = () => {
		onDialNumberChange(dialNumber.slice(0, -1));
		dialInputRef.current?.focus();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!dialNumber.trim()) {
			dialInputRef.current?.focus();
			showToast("Введите номер телефона для набора", "warning");
			return;
		}
		onStartCall(dialNumber.trim());
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<input
					ref={dialInputRef}
					type="tel"
					value={dialNumber}
					onChange={(e) => onDialNumberChange(e.target.value)}
					placeholder="+7 (___) ___-__-__"
					className="flex-1 bg-transparent px-2.5 py-1.5 text-sm font-mono font-bold text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-hidden min-h-[48px] sm:min-h-[36px]"
					aria-label="Номер телефона для набора"
				/>
				{dialNumber && (
					<button
						type="button"
						onClick={handleBackspace}
						className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--paper-subtle)] text-[var(--ink-muted)] hover:text-[var(--danger)] cursor-pointer"
						title="Стереть"
						aria-label="Стереть цифру"
					>
						<Delete size={16} />
					</button>
				)}
			</div>

			<div className="grid grid-cols-3 gap-1.5">
				{DIALPAD_KEYS.map(({ digit, sub }) => (
					<button
						key={digit}
						type="button"
						onClick={() => handleDigit(digit)}
						className="min-h-[52px] h-[52px] sm:min-h-[40px] sm:h-auto rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-subtle)] active:scale-95 border border-[var(--line)] flex flex-col items-center justify-center transition-all cursor-pointer group"
					>
						<span className="text-sm font-bold text-[var(--ink)] group-hover:text-[var(--primary)]">{digit}</span>
						{sub && <span className="text-[9px] font-mono text-[var(--ink-muted)] -mt-0.5 leading-none">{sub}</span>}
					</button>
				))}
			</div>

			<button
				type="submit"
				data-testid="btn-start-outgoing-call"
				className="primary-button min-h-[48px] sm:min-h-[40px] w-full rounded-xl flex items-center justify-center gap-2 text-xs font-bold shadow-md cursor-pointer mt-0.5"
				title="Позвонить"
			>
				<PhoneCall size={15} />
				<span>Вызов</span>
			</button>
		</form>
	);
}
