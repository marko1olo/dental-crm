/**
 * apps/web/src/components/lab/ordersView/DentalLabRegistryOrderCard.tsx
 *
 * DENTE Dental CRM — Карточка наряда в реестре ЗТЛ (Мандаты 8b, 8e, 8am).
 */

import React from "react";
import {
	CANONICAL_LAB_STAGES,
	formatKopecksToRubles,
	getMaterialMeta,
	getStageMeta,
	isOrderOverdue,
	type DentalLabOrderEntry,
} from "../dentalLabCatalogData.js";

export interface DentalLabRegistryOrderCardProps {
	readonly ord: DentalLabOrderEntry;
	readonly onMarkInClinic: (id: string) => void;
	readonly onCallPatient: (order: DentalLabOrderEntry) => void;
	readonly onPrintOrder: (order: DentalLabOrderEntry) => void;
	readonly onAdvanceStage: (id: string) => void;
}

export const DentalLabRegistryOrderCard: React.FC<DentalLabRegistryOrderCardProps> = ({
	ord,
	onMarkInClinic,
	onCallPatient,
	onPrintOrder,
	onAdvanceStage,
}) => {
	const stageMeta = getStageMeta(ord.stage);
	const matMeta = getMaterialMeta(ord.materialId);
	const overdue = isOrderOverdue(ord);

	return (
		<article data-testid={`lab-order-card-${ord.id}`} className="dental-lab-order-card">
			<div className="flex items-center justify-between gap-1.5 flex-wrap">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]">{ord.orderNumber}</span>
					{ord.isUrgent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--rose-surface,#fee2e2)] text-[var(--rose-ink,#991b1b)] border border-[var(--rose,#ef4444)]/40">СРОЧНО</span>}
					<span className="text-[11px] text-[var(--ink-muted)] break-words">{ord.laboratoryName}</span>
				</div>
				<span data-testid={`order-stage-badge-${ord.id}`} className="text-[11px] font-bold px-2.5 py-0.5 rounded-xl border flex items-center gap-1.5 shrink-0" style={{ backgroundColor: stageMeta.bgToken, borderColor: stageMeta.borderToken, color: stageMeta.textToken }}>
					<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageMeta.borderToken }} />
					{stageMeta.labelRu}
				</span>
			</div>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
				<div className="min-w-0">
					<strong className="text-[var(--ink)] text-xs sm:text-sm block break-words">{ord.patientName}</strong>
					<div className="text-[11px] text-[var(--ink-muted)] break-words">{matMeta.titleRu} • Оттенок Vita: <strong className="text-[var(--ink)]">{ord.shadeCode}</strong></div>
				</div>
				<div className="text-left sm:text-right shrink-0">
					<span className="font-bold text-[11px] bg-[var(--teal-surface)] text-[var(--teal)] px-2 py-0.5 rounded-lg border border-[var(--teal)]/30">
						Зубы FDI: {Array.isArray(ord.teeth) && ord.teeth.filter((t) => typeof t === "number" && !isNaN(t) && t > 0).length > 0 ? ord.teeth.filter((t) => typeof t === "number" && !isNaN(t) && t > 0).join(", ") : "—"}
					</span>
				</div>
			</div>
			<div className="grid grid-cols-5 gap-1 pt-0.5">
				{CANONICAL_LAB_STAGES.map((st) => (<div key={st.id} title={st.labelRu} className={`h-1.5 rounded-full transition-all ${st.id === ord.stage ? "bg-[var(--teal)] ring-1 ring-[var(--teal)]" : st.stepNumber <= stageMeta.stepNumber ? "bg-[var(--teal)]/70" : "bg-[var(--line)]"}`} />))}
			</div>
			<div className="flex items-center justify-between pt-1.5 border-t border-[var(--line)] flex-wrap gap-2 text-xs">
				<div className="flex items-center gap-2.5">
					<span className={overdue ? "font-bold text-[var(--rose-ink,#991b1b)]" : "text-[var(--ink-muted)]"}>Срок: {ord.dueDate ? ord.dueDate.split("T")[0] : ""} {overdue && "(Просрочен)"}</span>
					<span className="text-[var(--ink-muted)] hidden sm:inline text-[11px]">Себестоимость: <strong className="text-[var(--ink)]">{formatKopecksToRubles(ord.labCostKopecks)}</strong></span>
				</div>
				<div className="dental-lab-quick-actions">
					{ord.stage !== "in_clinic" && ord.stage !== "seated" && (<button type="button" data-testid={`mark-ready-btn-${ord.id}`} onClick={() => onMarkInClinic(ord.id)} className="dental-lab-action-btn" title="Отметить прибытие из лаборатории"><span>В клинике</span></button>)}
					<button type="button" data-testid={`call-patient-btn-${ord.id}`} onClick={() => onCallPatient(ord)} className="dental-lab-action-btn" title="Позвонить пациенту на примерку"><span>Примерка</span></button>
					<button type="button" data-testid={`print-order-btn-${ord.id}`} onClick={() => onPrintOrder(ord)} className="dental-lab-action-btn" title="Распечатать бланк заказ-наряда"><span>Бланк</span></button>
					{ord.stage !== "seated" && (<button type="button" data-testid={`advance-stage-btn-${ord.id}`} onClick={() => onAdvanceStage(ord.id)} className="dental-lab-action-btn font-bold text-[var(--teal)] border-[var(--teal)]/40"><span>Этап →</span></button>)}
				</div>
			</div>
		</article>
	);
};
