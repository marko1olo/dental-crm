import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import type { LoyaltyDiscountPreset } from "../../../fiscal/fiscal54fzEngine";
import { PaymentDiscountPresetsList } from "./PaymentDiscountPresetsList";

export interface PaymentDoctorDiscountsSectionProps {
	readonly selectedDiscountPreset: LoyaltyDiscountPreset;
	readonly setSelectedDiscountPreset: (p: LoyaltyDiscountPreset) => void;
	readonly customDiscountPercent: number;
	readonly setCustomDiscountPercent: (pct: number) => void;
	readonly setCustomDiscountRub: (rub: number) => void;
	readonly totalSumRub: number;
}

export const PaymentDoctorDiscountsSection: React.FC<PaymentDoctorDiscountsSectionProps> = ({
	selectedDiscountPreset,
	setSelectedDiscountPreset,
	customDiscountPercent,
	setCustomDiscountPercent,
	setCustomDiscountRub,
	totalSumRub,
}) => {
	const handleReset = () => {
		setSelectedDiscountPreset("none");
		setCustomDiscountPercent(0);
		setCustomDiscountRub(0);
	};

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
					title="Округлить сумму чека до сотен рублей"
				>
					<Sparkles className="w-3.5 h-3.5 shrink-0" />
					<span>Округлить до сотен рублей (скидка на копейки)</span>
				</button>
			</div>

			<PaymentDiscountPresetsList
				selectedDiscountPreset={selectedDiscountPreset}
				setSelectedDiscountPreset={setSelectedDiscountPreset}
				onReset={handleReset}
			/>

			{selectedDiscountPreset === "round_hundreds" && (
				<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between gap-2 flex-wrap" data-testid="round-hundreds-banner">
					<div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
						<Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
						<span>Округление до сотен: копейки списаны в пользу пациента. К оплате ровно {totalSumRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<span className="text-[11px] font-mono text-amber-700 dark:text-amber-300">Точность до копейки</span>
				</div>
			)}

			{selectedDiscountPreset === "warranty_100" && (
				<div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between gap-2 flex-wrap" data-testid="warranty-rework-banner">
					<div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
						<ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
						<span>100% Гарантийная переделка: стоимость услуг списана в 0 ₽</span>
					</div>
					<span className="text-[11px] font-mono text-blue-700 dark:text-blue-300">Чек 0 ₽ / Гарантия</span>
				</div>
			)}

			{selectedDiscountPreset === "manual_percent" && (
				<div className="flex items-center gap-2 pt-1">
					<label className="text-xs font-semibold text-[var(--muted,#64748b)]">Процент скидки (%):</label>
					<input
						type="number"
						min={0}
						max={100}
						value={customDiscountPercent || ""}
						onChange={(e) => setCustomDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
						className="h-8 w-20 px-2 rounded-lg border border-[var(--border,#cbd5e1)] text-xs font-bold text-right"
						placeholder="0"
					/>
					<span className="text-xs font-bold">%</span>
				</div>
			)}
		</div>
	);
};
