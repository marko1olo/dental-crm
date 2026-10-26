/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneAmountDisplay.tsx
 * Clean amount display: 36px bold centered on mobile (390x844), left-aligned on desktop.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Layers, QrCode, Sparkles, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

interface PaymentPaneAmountDisplayProps {
	readonly amountRub: number;
	readonly setAmountRub: (val: number) => void;
	readonly setCashTenderedRub: (val: number) => void;
	readonly setSplitCashRub: (val: number) => void;
	readonly setSplitSbpRub: (val: number) => void;
	readonly setSplitCardRub: (val: number) => void;
	readonly setSplitDepositRub: (val: number) => void;
	readonly setActiveMethod: (method: any) => void;
	readonly isRoundedToHundreds: boolean;
	readonly setIsRoundedToHundreds: (val: boolean) => void;
	readonly isWarranty100: boolean;
}

export const PaymentPaneAmountDisplay: React.FC<PaymentPaneAmountDisplayProps> = ({
	amountRub, setAmountRub, setCashTenderedRub, setSplitCashRub, setSplitSbpRub,
	setSplitCardRub, setSplitDepositRub, setActiveMethod, isRoundedToHundreds,
	setIsRoundedToHundreds, isWarranty100,
}) => {
	const handlePreset5050CashSbp = () => {
		const half = Math.floor(amountRub / 2);
		setSplitCashRub(half); setSplitSbpRub(amountRub - half); setSplitCardRub(0); setSplitDepositRub(0);
		setActiveMethod("split"); showToast("Применен сплит 50/50: Наличные + СБП QR", "info");
	};

	const handlePresetAllSbp = () => {
		setActiveMethod("sbp"); setSplitSbpRub(amountRub); setSplitCashRub(0); setSplitCardRub(0); setSplitDepositRub(0);
		showToast("100% суммы переведено в СБП QR", "info");
	};

	const handleRoundToHundreds = () => {
		const rounded = Math.floor(amountRub / 100) * 100;
		if (rounded > 0 && rounded !== amountRub) {
			setAmountRub(rounded); setCashTenderedRub(rounded); setIsRoundedToHundreds(true);
			showToast(`Сумма округлена до сотен: ${rounded.toLocaleString("ru-RU")} ₽`, "info");
		}
	};

	return (
		<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
			<div className="text-center sm:text-left w-full sm:w-auto">
				<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block">Сумма к оплате</span>
				<div className={`text-3xl sm:text-3xl font-extrabold font-mono tracking-tight leading-tight mt-0.5 text-center sm:text-left whitespace-nowrap ${isWarranty100 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--ink,#0f172a)]"}`} data-testid="cashier-display-total-amount">
					{amountRub.toLocaleString("ru-RU")} ₽
				</div>
				{isWarranty100 && (
					<span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
						<ShieldCheck size={12} /> <span>Гарантия 100% (свобода врача)</span>
					</span>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
				<button type="button" onClick={handlePreset5050CashSbp} className="h-9 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-500 hover:text-teal-600 text-xs font-bold text-[var(--ink,#0f172a)] transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1" data-testid="chip-preset-50-50-sbp" title="Разделить 50/50: Наличные + СБП">
					<Layers size={13} className="text-teal-600 shrink-0" /> <span>50/50 Нал+СБП</span>
				</button>
				<button type="button" onClick={handlePresetAllSbp} className="h-9 px-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-xs font-bold text-teal-700 dark:text-teal-300 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1" data-testid="chip-preset-all-sbp" title="Оплатить 100% через СБП QR">
					<QrCode size={13} className="text-teal-600 shrink-0" /> <span>Вся сумма в СБП</span>
				</button>
				<button type="button" onClick={handleRoundToHundreds} className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 ${isRoundedToHundreds ? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300" : "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-amber-400 text-[var(--ink,#0f172a)]"}`} data-testid="chip-preset-round-hundreds" title="Округлить сумму вниз до сотен рублей">
					<Sparkles size={13} className="text-amber-500 shrink-0" /> <span>Округлить до сотен</span>
				</button>
			</div>
		</div>
	);
};
