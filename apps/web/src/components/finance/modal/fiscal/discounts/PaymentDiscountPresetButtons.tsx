import React from "react";
import { ShieldCheck } from "lucide-react";
import type { LoyaltyDiscountPreset } from "../../../fiscal/fiscal54fzEngine";

export interface PaymentDiscountPresetButtonsProps {
	readonly selectedDiscountPreset: LoyaltyDiscountPreset;
	readonly setSelectedDiscountPreset: (p: LoyaltyDiscountPreset) => void;
	readonly setCustomDiscountPercent: (pct: number) => void;
	readonly setCustomDiscountRub: (rub: number) => void;
}

export const PaymentDiscountPresetButtons: React.FC<PaymentDiscountPresetButtonsProps> = ({
	selectedDiscountPreset,
	setSelectedDiscountPreset,
	setCustomDiscountPercent,
	setCustomDiscountRub,
}) => {
	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			<span className="text-xs text-[var(--muted,#64748b)] mr-1">Быстрые:</span>
			{(["discount_3", "discount_5", "discount_10"] as const).map((preset) => {
				const label = preset === "discount_3" ? "3%" : preset === "discount_5" ? "5%" : "10%";
				return (
					<button
						key={preset}
						type="button"
						onClick={() => setSelectedDiscountPreset(preset)}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedDiscountPreset === preset
								? "bg-teal-600 text-white shadow-2xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid={`btn-${preset.replace("_", "-")}`}
					>
						{label}
					</button>
				);
			})}
			<button
				type="button"
				onClick={() => setSelectedDiscountPreset("warranty_100")}
				className={`h-7 px-3 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
					selectedDiscountPreset === "warranty_100"
						? "bg-blue-600 text-white shadow-2xs"
						: "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
				}`}
				data-testid="btn-discount-warranty"
			>
				<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
				<span>100% Гарантия (Переделка)</span>
			</button>
			<button
				type="button"
				onClick={() => setSelectedDiscountPreset("colleague_100")}
				className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					selectedDiscountPreset === "colleague_100"
						? "bg-purple-600 text-white shadow-2xs"
						: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
				}`}
				data-testid="btn-discount-colleague"
			>
				Персонал 100%
			</button>
			<button
				type="button"
				onClick={() => setSelectedDiscountPreset("manual_percent")}
				className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					selectedDiscountPreset === "manual_percent"
						? "bg-teal-700 text-white shadow-2xs"
						: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
				}`}
				data-testid="btn-discount-manual-percent"
			>
				Ручная %
			</button>
			<button
				type="button"
				onClick={() => {
					setSelectedDiscountPreset("none");
					setCustomDiscountPercent(0);
					setCustomDiscountRub(0);
				}}
				className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					selectedDiscountPreset === "none"
						? "bg-slate-700 text-white shadow-2xs"
						: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
				}`}
				data-testid="btn-discount-none"
			>
				Сброс (0%)
			</button>
		</div>
	);
};
