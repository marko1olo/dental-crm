/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneDoctorDiscounts.tsx
 *
 * Doctor discounts row (0..50%) and 100% warranty button.
 * Mandate 8e: Doctor Autonomy without manager passwords or bureaucratic blocks.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Percent, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

interface PaymentPaneDoctorDiscountsProps {
	readonly baseAmountRub: number;
	readonly amountRub: number;
	readonly setAmountRub: (val: number) => void;
	readonly setCashTenderedRub: (val: number) => void;
	readonly activeDiscountPercent: number;
	readonly setActiveDiscountPercent: (val: number) => void;
	readonly isWarranty100: boolean;
	readonly setIsWarranty100: (val: boolean) => void;
}

export const PaymentPaneDoctorDiscounts: React.FC<PaymentPaneDoctorDiscountsProps> = ({
	baseAmountRub,
	amountRub,
	setAmountRub,
	setCashTenderedRub,
	activeDiscountPercent,
	setActiveDiscountPercent,
	isWarranty100,
	setIsWarranty100,
}) => {
	const applyDoctorDiscount = (pct: number) => {
		setIsWarranty100(false);
		setActiveDiscountPercent(pct);
		if (pct === 0) {
			setAmountRub(baseAmountRub);
			setCashTenderedRub(baseAmountRub);
			showToast("Скидка сброшена (полная цена)", "info");
		} else {
			const discounted = Math.max(0, Math.round(baseAmountRub * (1 - pct / 100)));
			setAmountRub(discounted);
			setCashTenderedRub(discounted);
			showToast(`Применена скидка врача ${pct}%: ${discounted.toLocaleString("ru-RU")} ₽`, "info");
		}
	};

	const applyWarranty100 = () => {
		setIsWarranty100(true);
		setActiveDiscountPercent(100);
		setAmountRub(0);
		setCashTenderedRub(0);
		showToast("Гарантийный случай: скидка 100% (0.00 ₽) зафиксирована без ограничений", "success");
	};

	return (
		<div className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] space-y-1.5 text-xs">
			<div className="flex items-center justify-between">
				<span className="font-bold text-[var(--muted,#64748b)] text-[11px] flex items-center gap-1">
					<Percent size={13} className="text-amber-500" />
					<span>Скидки врача:</span>
				</span>
				{activeDiscountPercent > 0 && !isWarranty100 && (
					<span className="text-[11px] font-bold text-amber-600">
						{`-${activeDiscountPercent}% (${(baseAmountRub - amountRub).toLocaleString("ru-RU")} ₽)`}
					</span>
				)}
			</div>
			<div className="grid grid-cols-6 gap-1">
				{[0, 5, 10, 15, 20, 50].map((pct) => (
					<button
						key={pct}
						type="button"
						onClick={() => applyDoctorDiscount(pct)}
						className={`h-8 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
							activeDiscountPercent === pct && !isWarranty100
								? "border-teal-500 bg-teal-500/15 text-teal-800 dark:text-teal-200"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-500 text-[var(--ink,#0f172a)]"
						}`}
						data-testid={`btn-discount-${pct}`}
					>
						{pct === 0 ? "0%" : `${pct}%`}
					</button>
				))}
			</div>
			<button
				type="button"
				onClick={applyWarranty100}
				className={`w-full h-8 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
					isWarranty100
						? "border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
						: "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
				}`}
				data-testid="btn-warranty-100-chip"
				title="Гарантийный случай — 100% скидка без требований пароля суперадмина"
			>
				<ShieldCheck size={14} />
				<span>Гарантия 100% (0 ₽)</span>
			</button>
		</div>
	);
};
