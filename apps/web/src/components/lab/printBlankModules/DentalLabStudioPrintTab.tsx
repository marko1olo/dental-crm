/**
 * apps/web/src/components/lab/printBlankModules/DentalLabStudioPrintTab.tsx
 *
 * DENTE Dental CRM — Вкладка 3: Печатный клинический бланк заказ-наряда.
 */

import React from "react";
import type { DentalLabOrderEntry, OrthopedicMaterialMeta } from "../dentalLabCatalogData.js";

export interface DentalLabStudioPrintTabProps {
	readonly currentPrintOrder: DentalLabOrderEntry;
	readonly printMaterial: OrthopedicMaterialMeta;
	readonly onBackToRegistry: () => void;
}

export const DentalLabStudioPrintTab: React.FC<DentalLabStudioPrintTabProps> = ({
	currentPrintOrder,
	printMaterial,
	onBackToRegistry,
}) => {
	return (
		<div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-4" data-testid="lab-order-printable-blank">
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 flex-wrap gap-2">
				<div>
					<h3 className="text-base font-bold text-[var(--ink)]">Клинический заказ-наряд в лабораторию {currentPrintOrder.orderNumber}</h3>
					<p className="text-xs text-[var(--ink-muted)]">Бланк наряда А4/А5 для передачи в зуботехническую лабораторию и курьеру</p>
				</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={onBackToRegistry} className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer">К реестру нарядов</button>
					<button type="button" data-testid="print-blank-submit-btn" onClick={() => window.print?.()} className="px-4 py-1.5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs font-bold shadow-xs cursor-pointer">Печать бланка</button>
				</div>
			</div>
			<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl p-4 sm:p-6 space-y-4 text-xs">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[var(--line)] pb-3">
					<div><span className="text-[var(--ink-muted)] block text-[11px]">Пациент:</span><strong className="text-[var(--ink)] text-sm">{currentPrintOrder.patientName}</strong></div>
					<div><span className="text-[var(--ink-muted)] block text-[11px]">Врач-ортопед:</span><strong className="text-[var(--ink)] text-sm">{currentPrintOrder.doctorName}</strong></div>
					<div><span className="text-[var(--ink-muted)] block text-[11px]">Лаборатория:</span><strong className="text-[var(--teal)] text-sm">{currentPrintOrder.laboratoryName}</strong></div>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-[var(--line)] pb-3">
					<div><span className="text-[var(--ink-muted)] block text-[11px]">Зубы (FDI):</span><strong className="text-[var(--ink)]">{currentPrintOrder.teeth.join(", ")}</strong></div>
					<div><span className="text-[var(--ink-muted)] block text-[11px]">Конструкция:</span><strong className="text-[var(--ink)]">{printMaterial.titleRu}</strong></div>
					<div><span className="text-[var(--ink-muted)] block text-[11px]">Цвет VITA:</span><strong className="text-[var(--ink)]">{currentPrintOrder.shadeCode}</strong></div>
					<div><span className="text-[var(--ink-muted)] block text-[11px]">Срок сдачи:</span><strong className="text-[var(--ink)]">{currentPrintOrder.dueDate.split("T")[0]}</strong></div>
				</div>
				<div className="space-y-1">
					<span className="text-[var(--ink-muted)] block text-[11px]">Клинические указания технику:</span>
					<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] text-[var(--ink)] font-mono text-xs">{currentPrintOrder.notes || "Анатомическая окклюзия, плотный апроксимальный контакт, уступ поддесневой 0.3 мм."}</div>
				</div>
				<div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-muted)]">
					<span>Подпись врача-ортопеда: ___________________</span>
					<span>Подпись зубного техника: ___________________</span>
				</div>
			</div>
		</div>
	);
};
