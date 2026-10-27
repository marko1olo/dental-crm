import React from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { FastCheckoutDiscountPreset, QuickCheckoutPresetType } from "../payments/checkout/fastCheckoutEngine";
import { FastCheckoutDiscountBanners } from "./fastCheckoutComponents/FastCheckoutDiscountBanners";
import { FastCheckoutDiscountButtonsRow } from "./fastCheckoutComponents/FastCheckoutDiscountButtonsRow";
import { FastCheckoutQuickPresetsGrid } from "./fastCheckoutComponents/FastCheckoutQuickPresetsGrid";

export interface FastCheckoutPresetsAndDiscountsProps {
	readonly familyPayerName?: string | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly onQuickPreset: (preset: QuickCheckoutPresetType) => void;
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

export const FastCheckoutPresetsAndDiscounts: React.FC<FastCheckoutPresetsAndDiscountsProps> = (props) => {
	const { discountPreset, onSetDiscountPreset, customDiscountPercent, onSetCustomDiscountPercent, discountCalc } = props;

	return (
		<div className="space-y-3" data-testid="fast-checkout-presets-and-discounts-root">
			<FastCheckoutQuickPresetsGrid
				familyPayerName={props.familyPayerName}
				patientFamilyBalanceRub={props.patientFamilyBalanceRub}
				onQuickPreset={props.onQuickPreset}
			/>

			<details
				className="group rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] shadow-xs"
				data-testid="checkout-doctor-discounts-section"
				open={discountPreset !== "none" || discountCalc.discountKop > 0}
			>
				<summary className="p-2 px-3 flex items-center justify-between cursor-pointer select-none text-xs list-none [&::-webkit-details-marker]:hidden">
					<div className="flex items-center gap-1.5 font-bold text-[var(--muted,#64748b)]">
						<Sparkles size={14} className="text-teal-600 shrink-0" />
						<span className="text-[var(--ink,#0f172a)] font-bold">Скидки врача и Гарантия</span>
						{discountCalc.discountKop > 0 ? (
							<span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-300 ml-1">
								• {(discountCalc.discountKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ ({discountCalc.effectivePercent}%)
							</span>
						) : (
							<span className="text-[11px] font-normal text-[var(--muted,#64748b)] hidden sm:inline">
								• До сотен ₽, 3%, 5%, 10%, Гарантия, Персонал
							</span>
						)}
					</div>
					<div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300 font-semibold">
						<span className="group-open:hidden text-[11px]">{discountCalc.discountKop > 0 ? "Изменить" : "Развернуть (8)"}</span>
						<ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
					</div>
				</summary>

				<div className="p-3 pt-1 flex flex-col gap-2">
					<FastCheckoutDiscountButtonsRow
						discountPreset={discountPreset}
						onSetDiscountPreset={onSetDiscountPreset}
						customDiscountPercent={customDiscountPercent}
						onSetCustomDiscountPercent={onSetCustomDiscountPercent}
						discountCalc={discountCalc}
					/>

					{discountCalc.discountKop > 0 && (
						<div className="flex items-center gap-2 p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs flex-wrap" data-testid="badge-discount-active">
							<span className="px-2 py-0.5 rounded-full text-xs font-black bg-teal-600 text-white">-{discountCalc.effectivePercent}%</span>
							<span className="text-[var(--muted,#64748b)]">Сумма без скидки:</span>
							<span className="line-through text-xs font-bold font-mono text-[var(--muted,#64748b)]" data-testid="text-payment-original-total">
								{((discountCalc.netKop + discountCalc.discountKop) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
							</span>
						</div>
					)}

					<FastCheckoutDiscountBanners
						discountPreset={discountPreset}
						onSetDiscountPreset={onSetDiscountPreset}
						customDiscountPercent={customDiscountPercent}
						onSetCustomDiscountPercent={onSetCustomDiscountPercent}
						discountCalc={discountCalc}
					/>
				</div>
			</details>
		</div>
	);
};
