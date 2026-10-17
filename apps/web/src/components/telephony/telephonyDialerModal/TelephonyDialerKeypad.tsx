import React from "react";
import { Delete, PhoneCall } from "lucide-react";

interface TelephonyDialerKeypadProps {
	dialNumber: string;
	onDialNumberChange: (val: string) => void;
	onDialDigit: (digit: string) => void;
	onDialBackspace: () => void;
	onStartCall: () => void;
	dialInputRef: React.RefObject<HTMLInputElement | null>;
}

const KEYS = [
	{ d: "1", sub: "" },
	{ d: "2", sub: "ABC" },
	{ d: "3", sub: "DEF" },
	{ d: "4", sub: "GHI" },
	{ d: "5", sub: "JKL" },
	{ d: "6", sub: "MNO" },
	{ d: "7", sub: "PQRS" },
	{ d: "8", sub: "TUV" },
	{ d: "9", sub: "WXYZ" },
	{ d: "*", sub: "" },
	{ d: "0", sub: "+" },
	{ d: "#", sub: "" },
];

export const TelephonyDialerKeypad: React.FC<TelephonyDialerKeypadProps> = ({
	dialNumber,
	onDialNumberChange,
	onDialDigit,
	onDialBackspace,
	onStartCall,
	dialInputRef,
}) => {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<input
					ref={dialInputRef}
					type="text"
					value={dialNumber}
					onChange={(e) => onDialNumberChange(e.target.value)}
					placeholder="+7 (___) ___-__-__"
					className="flex-1 bg-transparent text-[var(--ink)] text-base font-mono font-bold tracking-wider focus:outline-none px-2"
				/>
				{dialNumber && (
					<button
						type="button"
						onClick={onDialBackspace}
						className="icon-button min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger,#ef4444)] hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center justify-center cursor-pointer"
						aria-label="Стереть цифру"
					>
						<Delete size={18} />
					</button>
				)}
			</div>

			<div className="grid grid-cols-3 gap-2">
				{KEYS.map((k) => (
					<button
						key={k.d}
						type="button"
						onClick={() => onDialDigit(k.d)}
						className="icon-button min-h-[48px] min-w-[48px] py-2.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--teal-surface)] active:scale-95 border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] transition-all flex flex-col items-center justify-center select-none shadow-xs cursor-pointer"
					>
						<span className="text-base font-black leading-none">{k.d}</span>
						{k.sub && (
							<span className="text-[9px] font-semibold text-[var(--muted)] mt-0.5">
								{k.sub}
							</span>
						)}
					</button>
				))}
			</div>

			<button
				type="button"
				onClick={onStartCall}
				className="primary-button w-full min-h-[48px] py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-98 text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-lg cursor-pointer"
				aria-label="Совершить исходящий вызов"
				data-testid="btn-start-outgoing-call"
			>
				<PhoneCall size={18} />
				<span>Позвонить</span>
			</button>
		</div>
	);
};
