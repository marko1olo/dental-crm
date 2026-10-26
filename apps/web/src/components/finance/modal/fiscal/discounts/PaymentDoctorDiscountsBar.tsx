import React from "react";
import { Sparkles } from "lucide-react";
import type { LoyaltyDiscountPreset } from "../../../fiscal/fiscal54fzEngine";
import { PaymentDiscountBanners } from "./PaymentDiscountBanners";
import { PaymentDiscountPresetButtons } from "./PaymentDiscountPresetButtons";

export interface PaymentDoctorDiscountsBarProps {
	readonly selectedDiscountPreset: LoyaltyDiscountPreset;
	readonly setSelectedDiscountPreset: (p: LoyaltyDiscountPreset) => void;
	readonly customDiscountPercent: number;
	readonly setCustomDiscountPercent: (pct: number) => void;
	readonly setCustomDiscountRub: (rub: number) => void;
	readonly totalSumRub: number;
}

export const PaymentDoctorDiscountsBar: React.FC<PaymentDoctorDiscountsBarProps> = ({
	selectedDiscountPreset,
	setSelectedDiscountPreset,
	customDiscountPercent,
	setCustomDiscountPercent,
	setCustomDiscountRub,
	totalSumRub,
}) => {
	return (
		<div className="p-3.5 rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5" data-testid="doctor-discounts-bar">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
					<span className="text-xs font-black text-[var(--ink,#0f172a)] uppercase tracking-wider">
						Скидка врача и округление:
					</span>
				</div>
				<button
					type="button"
					onClick={() => setSelectedDiscountPreset("round_hundreds")}
					className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
						selectedDiscountPreset === "round_hundreds"
							? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400"
							: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
					}`}
					data-testid="btn-round-hundreds"
					title="Округлить сумму чека до сотен рублей (скидка на копейки в пользу пациента)"
				>
					<Sparkles className="w-3.5 h-3.5 shrink-0" />
					<span>Округлить до сотен рублей (скидка на копейки)</span>
				</button>
			</div>

			<PaymentDiscountPresetButtons
				selectedDiscountPreset={selectedDiscountPreset}
				setSelectedDiscountPreset={setSelectedDiscountPreset}
				setCustomDiscountPercent={setCustomDiscountPercent}
				setCustomDiscountRub={setCustomDiscountRub}
			/>

			<PaymentDiscountBanners
				selectedDiscountPreset={selectedDiscountPreset}
				totalSumRub={totalSumRub}
				customDiscountPercent={customDiscountPercent}
				setCustomDiscountPercent={setCustomDiscountPercent}
			/>
		</div>
	);
};
