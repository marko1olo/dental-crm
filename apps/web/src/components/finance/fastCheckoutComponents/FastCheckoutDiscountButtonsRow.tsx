import React from "react";
import { ShieldCheck, Sparkles, X } from "lucide-react";
import type { FastCheckoutDiscountPreset } from "../payments/checkout/fastCheckoutEngine";

export interface FastCheckoutDiscountButtonsRowProps {
	readonly discountPreset: FastCheckoutDiscountPreset;
	readonly onSetDiscountPreset: (preset: FastCheckoutDiscountPreset) => void;
	readonly customDiscountPercent: number;
	readonly onSetCustomDiscountPercent: (percent: number) => void;
	readonly discountCalc: {
		readonly discountKop: number;
		readonly netKop: number;
		readonly effectivePercent: number;
	};
}

export const FastCheckoutDiscountButtonsRow: React.FC<FastCheckoutDiscountButtonsRowProps> = ({
	discountPreset,
	onSetDiscountPreset,
	customDiscountPercent,
	onSetCustomDiscountPercent,
	discountCalc,
}) => {
	const handleReset = () => {
		onSetDiscountPreset("none");
		onSetCustomDiscountPercent(0);
	};

	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			<button
				type="button"
				onClick={handleReset}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "none" && customDiscountPercent === 0
						? "bg-slate-700 text-white shadow-2xs"
						: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="preset-discount-0"
			>
				Без скидки 0%
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("round_hundreds")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
					discountPreset === "round_hundreds"
						? "bg-amber-600 text-white shadow-2xs ring-2 ring-amber-400"
						: "bg-[var(--paper,#ffffff)] hover:bg-amber-500/10 text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="btn-discount-round-hundreds"
				title="Округлить сумму чека до сотен рублей (скидка на копейки в пользу пациента)"
			>
				<Sparkles size={13} className="text-amber-500" />
				<span>До сотен ₽</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("discount_3")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "discount_3" ? "bg-teal-600 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="btn-discount-3"
			>
				3%
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("discount_5")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "discount_5" ? "bg-teal-600 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="preset-discount-5"
			>
				<span data-testid="btn-discount-5">-5% Пенс/Утро</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("discount_10")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "discount_10" ? "bg-teal-600 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="preset-discount-10"
			>
				<span data-testid="btn-discount-10">-10% Постоянный</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("discount_15")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "discount_15" ? "bg-teal-600 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="preset-discount-15"
			>
				<span data-testid="btn-discount-15">-15% Комплекс</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("discount_20")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "discount_20" ? "bg-teal-600 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="preset-discount-20"
			>
				<span data-testid="btn-discount-20">-20% Партнёр</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("discount_50")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "discount_50" ? "bg-teal-600 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="preset-discount-50"
			>
				<span data-testid="btn-discount-50">-50% Персонал</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("warranty_100")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
					discountPreset === "warranty_100"
						? "bg-[var(--teal,#0d9488)] text-white shadow-2xs"
						: "bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="btn-discount-warranty"
				title="100% гарантийная переделка (к оплате 0 ₽)"
			>
				<ShieldCheck size={14} className="shrink-0" />
				<span data-testid="preset-warranty-100">Гарантия 100% (0 ₽)</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("colleague_100")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
					discountPreset === "colleague_100"
						? "bg-[var(--teal,#0d9488)] text-white shadow-2xs"
						: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-soft)]"
				}`}
				data-testid="btn-discount-colleague"
				title="100% скидка для коллег и медицинского персонала"
			>
				<span>Персонал 100%</span>
			</button>
			<button
				type="button"
				onClick={() => onSetDiscountPreset("manual_percent")}
				className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
					discountPreset === "manual_percent" ? "bg-teal-700 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
				}`}
				data-testid="btn-discount-manual-percent"
			>
				Ручная %
			</button>
			{discountPreset !== "none" && (
				<button
					type="button"
					onClick={handleReset}
					className="min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)] cursor-pointer transition-all active:scale-95 flex items-center gap-1"
					data-testid="btn-discount-none"
					title="Сбросить скидку"
				>
					<X size={14} className="inline mr-1 shrink-0" />
					<span>Сброс (0%)</span>
				</button>
			)}
		</div>
	);
};
