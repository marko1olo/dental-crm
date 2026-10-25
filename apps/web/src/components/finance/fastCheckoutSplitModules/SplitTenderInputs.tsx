import { Banknote, CreditCard, QrCode } from "lucide-react";
import React from "react";
import {
	SplitDepositLoyaltyInputs,
	type SplitDepositLoyaltyInputsProps,
} from "./SplitDepositLoyaltyInputs";

export interface SplitTenderInputsProps extends SplitDepositLoyaltyInputsProps {
	readonly cardAmountRub: number;
	readonly setCardAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cashAmountRub: number;
	readonly setCashAmountRub: (val: number) => void;
	readonly cashTenderedRub: number;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
	readonly sbpAmountRub: number;
	readonly setSbpAmountRub: React.Dispatch<React.SetStateAction<number>>;
}

export const SplitTenderInputs: React.FC<SplitTenderInputsProps> = (props) => {
	const {
		cardAmountRub,
		setCardAmountRub,
		cashAmountRub,
		setCashAmountRub,
		cashTenderedRub,
		setCashTenderedRub,
		sbpAmountRub,
		setSbpAmountRub,
		onInputEnterKeyDown,
	} = props;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			{/* Card */}
			<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
				<span className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<CreditCard size={14} className="text-blue-600" />
					<span>Банковская карта</span>
				</span>
				<div className="relative">
					<input
						type="number"
						min={0}
						step="0.01"
						value={cardAmountRub || ""}
						onChange={(e) =>
							setCardAmountRub(Math.max(0, parseFloat(e.target.value) || 0))
						}
						onKeyDown={onInputEnterKeyDown}
						className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
						placeholder="0.00 ₽"
						data-testid="split-input-card"
					/>
					<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">
						₽
					</span>
				</div>
			</div>

			{/* Cash */}
			<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
				<span className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Banknote size={14} className="text-emerald-600" />
					<span>Наличные</span>
				</span>
				<div className="relative">
					<input
						type="number"
						min={0}
						step="0.01"
						value={cashAmountRub || ""}
						onChange={(e) => {
							const val = Math.max(0, parseFloat(e.target.value) || 0);
							setCashAmountRub(val);
							if (cashTenderedRub < val) {
								setCashTenderedRub(val);
							}
						}}
						onKeyDown={onInputEnterKeyDown}
						className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
						placeholder="0.00 ₽"
						data-testid="split-input-cash"
					/>
					<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">
						₽
					</span>
				</div>
			</div>

			{/* SBP QR */}
			<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
				<span className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<QrCode size={14} className="text-purple-600" />
					<span>СБП QR</span>
				</span>
				<div className="relative">
					<input
						type="number"
						min={0}
						step="0.01"
						value={sbpAmountRub || ""}
						onChange={(e) =>
							setSbpAmountRub(Math.max(0, parseFloat(e.target.value) || 0))
						}
						onKeyDown={onInputEnterKeyDown}
						className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
						placeholder="0.00 ₽"
						data-testid="split-input-sbp"
					/>
					<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">
						₽
					</span>
				</div>
			</div>

			<SplitDepositLoyaltyInputs {...props} />
		</div>
	);
};
