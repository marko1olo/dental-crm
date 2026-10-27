/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneSplitTender.tsx
 * Multi-Tender Split Grid with 1-click auto-balance and zero disabled submit button.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Layers, QrCode, Banknote, CreditCard, CheckCircle2 } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import { SbpDynamicQrCard } from "../SbpDynamicQrCard.js";

interface PaymentPaneSplitTenderProps {
	readonly amountRub: number;
	readonly splitRemainingRub: number;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (val: number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (val: number) => void;
	readonly splitCardRub: number;
	readonly setSplitCardRub: (val: number) => void;
	readonly clinicLegalName: string;
	readonly onOpenFullSplitModal?: (() => void) | undefined;
	readonly isSubmitting: boolean;
	readonly finalizeReceipt: (method: any, sum: number, options?: { readonly idempotencyKey?: string | undefined }) => Promise<unknown>;
}

export const PaymentPaneSplitTender: React.FC<PaymentPaneSplitTenderProps> = ({
	amountRub, splitRemainingRub, splitSbpRub, setSplitSbpRub, splitCashRub,
	setSplitCashRub, splitCardRub, setSplitCardRub, clinicLegalName,
	onOpenFullSplitModal, isSubmitting, finalizeReceipt,
}) => {
	const handleSplitSubmit = () => {
		if (splitRemainingRub !== 0) {
			setSplitSbpRub(splitSbpRub + splitRemainingRub);
			showToast(`Остаток ${splitRemainingRub.toLocaleString("ru-RU")} ₽ добавлен в СБП QR`, "info");
		}
		void finalizeReceipt("split", amountRub);
	};

	return (
		<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs" data-testid="pane-tender-split">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Layers size={16} className="text-[var(--teal,#0d9488)]" /> <span>Комбинированный сплит:</span>
				</span>
				<span className={`text-xs font-mono font-bold ${splitRemainingRub === 0 ? "text-teal-700 dark:text-teal-300" : "text-amber-600 dark:text-amber-400"}`}>
					{splitRemainingRub === 0 ? "Сбалансировано" : `Осталось: ${splitRemainingRub.toLocaleString("ru-RU")} ₽`}
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
					<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1"><QrCode size={13} className="text-[var(--teal,#0d9488)]" /><span>СБП QR</span></span>
					<input type="number" value={splitSbpRub || ""} onChange={(e) => setSplitSbpRub(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs" data-testid="input-split-pane-sbp" />
				</div>
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
					<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1"><Banknote size={13} className="text-[var(--teal,#0d9488)]" /><span>Наличные</span></span>
					<input type="number" value={splitCashRub || ""} onChange={(e) => setSplitCashRub(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs" data-testid="input-split-pane-cash" />
				</div>
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
					<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1"><CreditCard size={13} className="text-[var(--teal,#0d9488)]" /><span>Карта (POS)</span></span>
					<input type="number" value={splitCardRub || ""} onChange={(e) => setSplitCardRub(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs" data-testid="input-split-pane-card" />
				</div>
			</div>

			{splitSbpRub > 0 && (
				<div className="pt-2">
					<SbpDynamicQrCard sumRub={splitSbpRub} clinicLegalName={clinicLegalName} ttlSeconds={300} compactMode={true} hideManualConfirm={true} />
				</div>
			)}

			<div className="flex items-center gap-2 pt-1">
				{onOpenFullSplitModal && (
					<button type="button" onClick={onOpenFullSplitModal} className="min-h-[44px] sm:min-h-[36px] sm:h-9 h-11 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] cursor-pointer transition-colors" data-testid="btn-open-advanced-split">
						Расширенный сплит...
					</button>
				)}
				<button type="button" onClick={handleSplitSubmit} className="flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all" data-testid="btn-confirm-split-pane">
					<CheckCircle2 size={16} /> <span>{isSubmitting ? "Проведение..." : `Принять оплату — ${amountRub.toLocaleString("ru-RU")} ₽ (сплит)`}</span>
				</button>
			</div>
		</div>
	);
};
