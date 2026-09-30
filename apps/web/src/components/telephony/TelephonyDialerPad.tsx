import { Delete, PhoneCall } from "lucide-react";
import React from "react";

export interface TelephonyDialerPadProps {
	dialNumber: string;
	onDialNumberChange: (value: string) => void;
	onDialDigit: (digit: string) => void;
	onDialBackspace: () => void;
	onStartOutgoingCall: () => void;
	dialInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function TelephonyDialerPad({
	dialNumber,
	onDialNumberChange,
	onDialDigit,
	onDialBackspace,
	onStartOutgoingCall,
	dialInputRef,
}: TelephonyDialerPadProps) {
	return (
		<div className="space-y-3">
			{/* Number Display Input */}
			<div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)]">
				<input
					ref={dialInputRef}
					type="text"
					value={dialNumber}
					onChange={(e) => onDialNumberChange(e.target.value)}
					placeholder="+7 (___) ___-__-__"
					className="flex-1 bg-transparent text-[var(--ink,#0f172a)] text-base font-mono font-bold tracking-wider focus:outline-none px-2"
				/>
				{dialNumber && (
					<button
						type="button"
						onClick={onDialBackspace}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-500 hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
						aria-label="Стереть цифру"
					>
						<Delete size={18} />
					</button>
				)}
			</div>

			{/* Numeric Keypad (48px min touch target per key) */}
			<div className="grid grid-cols-3 gap-2">
				{[
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
				].map((k) => (
					<button
						key={k.d}
						type="button"
						onClick={() => onDialDigit(k.d)}
						className="min-h-[48px] min-w-[48px] py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] active:scale-95 border border-[var(--line,#e2e8f0)] hover:border-[var(--teal)] text-[var(--ink,#0f172a)] transition-all flex flex-col items-center justify-center select-none shadow-xs cursor-pointer"
					>
						<span className="text-base font-black leading-none">{k.d}</span>
						{k.sub && (
							<span className="text-[9px] font-semibold text-[var(--muted,#64748b)] mt-0.5">
								{k.sub}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Outgoing Call Button >= 48x48px */}
			<button
				type="button"
				onClick={onStartOutgoingCall}
				className="w-full min-h-[48px] py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-98 text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 cursor-pointer"
				aria-label="Совершить исходящий вызов"
				data-testid="btn-start-outgoing-call"
			>
				<PhoneCall size={18} />
				<span>Позвонить</span>
			</button>
		</div>
	);
}
