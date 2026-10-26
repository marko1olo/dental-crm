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
		// Честный контур: состав сплита уходит на сервер, тост успеха — только после подтверждения.
		void finalizeReceipt("split", amountRub);
	};

	return (
		<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs" data-testid="pane-tender-split">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Layers size={16} className="text-purple-600" /> <span>Комбинированный сплит:</span>
				</span>
				<span className={`text-xs font-mono font-bold ${splitRemainingRub === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
					{splitRemainingRub === 0 ? "Сбалансировано" : `Осталось: ${splitRemainingRub.toLocaleString("ru-RU")} ₽`}
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
					<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1"><QrCode size={13} className="text-teal-600" /><span>СБП QR</span></span>
					<input type="number" value={splitSbpRub || ""} onChange={(e) => setSplitSbpRub(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs" data-testid="input-split-pane-sbp" />
				</div>
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
					<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1"><Banknote size={13} className="text-emerald-600" /><span>Наличные</span></span>
					<input type="number" value={splitCashRub || ""} onChange={(e) => setSplitCashRub(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs" data-testid="input-split-pane-cash" />
				</div>
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
					<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1"><CreditCard size={13} className="text-blue-600" /><span>Карта (POS)</span></span>
					<input type="number" value={splitCardRub || ""} onChange={(e) => setSplitCardRub(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs" data-testid="input-split-pane-card" />
				</div>
			</div>

			{splitSbpRub > 0 && (
				<div className="pt-2">
					{/* Внутри сплита QR — витрина для сканирования: платёж фиксирует общая кнопка
					    «Завершить сплит-оплату», поэтому локальное подтверждение здесь скрыто. */}
					<SbpDynamicQrCard sumRub={splitSbpRub} clinicLegalName={clinicLegalName} ttlSeconds={300} compactMode={true} hideManualConfirm={true} />
				</div>
			)}

			<div className="flex items-center gap-2 pt-1">
				{onOpenFullSplitModal && (
					<button type="button" onClick={onOpenFullSplitModal} className="h-9 px-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 cursor-pointer transition-all" data-testid="btn-open-advanced-split">
						Расширенный сплит...
					</button>
				)}
				<button type="button" onClick={handleSplitSubmit} className="flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all" data-testid="btn-confirm-split-pane">
					<CheckCircle2 size={16} /> <span>{isSubmitting ? "Проведение..." : "Завершить сплит-оплату"}</span>
				</button>
			</div>
		</div>
	);
};
