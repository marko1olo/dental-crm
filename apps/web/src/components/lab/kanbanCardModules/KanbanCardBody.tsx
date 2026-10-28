import React from "react";
import { AlertTriangle, Calendar, Clock, RotateCcw } from "lucide-react";
import { ORTHOPEDIC_WORK_TYPES, type DentalLabWorkflowOrder, formatRussianDate } from "../dentalLabWorkflowEngine";
import type { FittingUrgencyInfo } from "../DentalLabKanbanCard";

export interface KanbanCardBodyProps {
	readonly order: DentalLabWorkflowOrder;
	readonly fittingUrgency: FittingUrgencyInfo | null;
	readonly onRescheduleAppointment?: ((order: DentalLabWorkflowOrder) => void) | undefined;
}

export function KanbanCardBody({ order, fittingUrgency, onRescheduleAppointment }: KanbanCardBodyProps) {
	const preset = ORTHOPEDIC_WORK_TYPES[order.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
	const hasDelayAlert = order.isDelayedAlert || order.delayAlert?.isDelayedAlert;

	return (
		<>
			<div className="ztl-card-work-type min-w-0" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", marginTop: "3px" }}>
				<span style={{ fontWeight: 600 }}>{preset.shortNameRu}</span>
				<span style={{ background: "var(--teal-surface, rgba(13, 148, 136, 0.1))", color: "var(--teal, #0d9488)", border: "1px solid var(--teal-soft, rgba(13, 148, 136, 0.3))", padding: "1px 5px", borderRadius: "4px", fontWeight: 700, fontSize: "10.5px" }} data-testid={`ztl-card-shade-${order.id}`}>
					VITA: {order.shadeCode}
				</span>
				{order.translucency && (
					<span style={{ background: "var(--paper-soft, #f1f5f9)", color: "var(--ink, #334155)", border: "1px solid var(--line, #cbd5e1)", padding: "1px 4px", borderRadius: "4px", fontSize: "10px", fontWeight: 600 }} data-testid={`ztl-card-translucency-${order.id}`}>
						{order.translucency}
					</span>
				)}
			</div>

			{hasDelayAlert && (
				<div className="ztl-card-delay-alert-box" style={{ background: "var(--amber-bg, #fef3c7)", border: "1px solid var(--amber-soft, #fde68a)", borderRadius: "8px", padding: "7px 9px", marginTop: "5px" }} data-testid={`ztl-card-delay-alert-${order.id}`}>
					<div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--amber-fg, #b45309)", fontWeight: 700, fontSize: "11px" }}>
						<RotateCcw size={12} className="shrink-0 text-amber-600" />
						<span className="truncate">{order.delayAlert?.alertMessageRu || "Задерживается лабораторией"}</span>
					</div>
					{onRescheduleAppointment && (
						<button type="button" onClick={(e) => { e.stopPropagation(); onRescheduleAppointment(order); }} className="secondary-button ztl-delay-reschedule-btn" style={{ marginTop: "4px", backgroundColor: "#d97706", color: "#fff", border: "none", fontWeight: 700, fontSize: "10.5px", padding: "3px 8px", borderRadius: "5px", cursor: "pointer" }} data-testid={`ztl-delay-reschedule-btn-${order.id}`}>
							<Calendar size={11} /><span>Перенести запись</span>
						</button>
					)}
				</div>
			)}

			{fittingUrgency && (
				<div className={`ztl-card-urgency-badge ztl-urgency-${fittingUrgency.severity}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 8px", borderRadius: "6px", fontSize: "10.5px", fontWeight: 700, marginTop: "4px" }} data-testid={`ztl-card-fitting-urgency-${order.id}`}>
					{fittingUrgency.severity === "critical" ? <AlertTriangle size={12} className="shrink-0" /> : <Clock size={12} className="shrink-0" />}
					<span className="truncate">{fittingUrgency.text}</span>
				</div>
			)}

			<div className="ztl-card-dates-row">
				<span>Срок: <strong>{formatRussianDate(order.expectedLabDateIso)}</strong></span>
				<span>Примерка: <strong>{order.fittingDate ? formatRussianDate(order.fittingDate) : order.scheduledVisitDateIso ? formatRussianDate(order.scheduledVisitDateIso) : "—"}</strong></span>
			</div>

			<div className="ztl-card-price-row">
				<span style={order.isWarrantyRework ? { color: "var(--teal, #10b981)", fontWeight: 700 } : undefined}>
					{order.isWarrantyRework
						? "0 руб (Гарантия)"
						: `${(order.financials?.patientPriceTotalRub ?? (order as any).priceRub ?? 0).toLocaleString("ru-RU")} руб`}
				</span>
				<span style={{ color: "var(--muted, #64748b)", fontSize: "10px" }}>
					Себест: {(order.financials?.labCostTotalRub ?? Math.round(((order as any).priceRub ?? 0) * 0.4)).toLocaleString("ru-RU")} руб
				</span>
			</div>
		</>
	);
}
