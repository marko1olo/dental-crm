import React from "react";
import { Delete, PhoneCall } from "lucide-react";
import { showToast } from "../../GlobalToast";

const KEYPAD_DIGITS = [
	{ d: "1", sub: "" }, { d: "2", sub: "ABC" }, { d: "3", sub: "DEF" },
	{ d: "4", sub: "GHI" }, { d: "5", sub: "JKL" }, { d: "6", sub: "MNO" },
	{ d: "7", sub: "PQRS" }, { d: "8", sub: "TUV" }, { d: "9", sub: "WXYZ" },
	{ d: "*", sub: "" }, { d: "0", sub: "+" }, { d: "#", sub: "" },
];

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
					className="flex-1 bg-transparent px-2.5 py-1.5 text-sm font-mono font-bold text-[var(--ink)] placeholder:text-[var(--muted)] outline-hidden min-h-[44px] sm:min-h-[36px]"
					aria-label="Номер телефона для набора"
				/>
				{dialNumber && (
					<button
						type="button"
						onClick={handleBackspace}
						className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--paper-subtle)] text-[var(--muted)] hover:text-rose-500 cursor-pointer"
						title="Стереть"
						aria-label="Стереть цифру"
					>
						<Delete size={16} />
					</button>
				)}
			</div>

			<div className="grid grid-cols-3 gap-1.5">
				{KEYPAD_DIGITS.map(({ d, sub }) => (
					<button
						key={d}
						type="button"
						onClick={() => handleDigit(d)}
						className="min-h-[44px] sm:min-h-[38px] rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-subtle)] active:scale-95 border border-[var(--line)] flex flex-col items-center justify-center transition-all cursor-pointer group"
					>
						<span className="text-sm font-bold text-[var(--ink)] group-hover:text-[var(--teal)]">{d}</span>
						{sub && <span className="text-[9px] font-mono text-[var(--muted)] -mt-0.5 leading-none">{sub}</span>}
					</button>
				))}
			</div>

			<button
				type="submit"
				className="primary-button min-h-[44px] sm:min-h-[40px] w-full rounded-xl flex items-center justify-center gap-2 text-xs font-bold shadow-md cursor-pointer mt-0.5"
				title="Позвонить"
			>
				<PhoneCall size={15} />
				<span>Вызов</span>
			</button>
		</form>
	);
}
