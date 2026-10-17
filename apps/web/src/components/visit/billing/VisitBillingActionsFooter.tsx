/**
 * apps/web/src/components/visit/billing/VisitBillingActionsFooter.tsx
 * Bottom action buttons: Save calculation, Print estimate, DMS letter, Pay/Close checkout.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { Check, Printer, ShieldCheck, CreditCard } from "lucide-react";
import type { VisitBillingTotals } from "../visitBillingTypes.js";

export interface VisitBillingActionsFooterProps {
	isSaving: boolean;
	totals: VisitBillingTotals;
	readOnly?: boolean | undefined;
	effectiveDmsCoverage: number;
	effectiveDmsNumber?: string | undefined;
	effectiveDmsInsurer?: string | undefined;
	onSave: () => void;
	onPrintEstimate: () => void;
	onOpenDmsModal: () => void;
	onOpenPaymentModal: () => void;
}

export const VisitBillingActionsFooter: React.FC<VisitBillingActionsFooterProps> = ({
	isSaving,
	totals,
	readOnly = false,
	effectiveDmsCoverage,
	effectiveDmsNumber,
	effectiveDmsInsurer,
	onSave,
	onPrintEstimate,
	onOpenDmsModal,
	onOpenPaymentModal,
}) => {
	return (
		<div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onSave}
					title={isSaving ? "Идет сохранение расчёта визита..." : "Сохранить позиции услуг и цены визита"}
					className="h-9 px-4 rounded-xl bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] cursor-pointer transition-all flex items-center gap-1.5"
					data-testid="btn-save-visit-billing"
				>
					<Check size={14} className="text-emerald-600" />
					<span>{isSaving ? "Сохранение..." : "Сохранить расчёт"}</span>
				</button>

				<button
					type="button"
					onClick={onPrintEstimate}
					title="Распечатать смету оказанных стоматологических услуг"
					className="h-9 px-4 rounded-xl bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] cursor-pointer transition-all flex items-center gap-1.5"
					data-testid="btn-print-visit-billing-estimate"
				>
					<Printer size={14} className="text-[var(--teal,var(--brand-primary,#0d9488))]" />
					<span>Печать сметы</span>
				</button>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				{effectiveDmsCoverage > 0 ? (
					<button
						type="button"
						onClick={onOpenDmsModal}
						className="h-9 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-teal-100 dark:hover:bg-teal-900/50 cursor-pointer transition-all"
						data-testid="badge-visit-dms-coverage"
						title={`Гарантийное письмо № ${effectiveDmsNumber || ""} (${effectiveDmsInsurer || ""}) — нажмите для просмотра или изменения`}
					>
						<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>ДМС: {effectiveDmsInsurer || "ГП"} ({effectiveDmsCoverage.toLocaleString("ru-RU")} ₽)</span>
					</button>
				) : !readOnly ? (
					<button
						type="button"
						onClick={onOpenDmsModal}
						className="h-9 px-3 rounded-xl bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] cursor-pointer transition-all flex items-center gap-1.5"
						data-testid="btn-attach-visit-dms"
						title="Прикрепить или согласовать гарантийное письмо ДМС для пациента без перезагрузки визита"
					>
						<ShieldCheck size={14} className="text-teal-600" />
						<span>+ ДМС / Полис</span>
					</button>
				) : null}

				<button
					type="button"
					onClick={onOpenPaymentModal}
					title={totals.isWarranty100 ? "Закрыть визит по 100% гарантии (0 ₽)" : `Перейти к оплате ${totals.totalDueRub.toLocaleString("ru-RU")} ₽ в кассу`}
					className={`h-9 px-5 rounded-xl text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shadow-sm ${totals.isWarranty100 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-teal-600 hover:bg-teal-700"}`}
					data-testid="btn-open-payment-modal"
					data-tour="cashier-pay"
				>
					{totals.isWarranty100 ? (
						<><ShieldCheck size={16} /><span>Закрыть по гарантии (0 ₽)</span></>
					) : (
						<><CreditCard size={16} /><span>Оплатить в кассу ({totals.totalDueRub.toLocaleString("ru-RU")} ₽)</span></>
					)}
				</button>
			</div>
		</div>
	);
};
