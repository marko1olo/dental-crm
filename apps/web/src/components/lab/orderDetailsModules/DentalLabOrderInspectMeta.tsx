import React from "react";
import {
	type DentalLabWorkflowOrder,
	formatRussianDate,
} from "../dentalLabWorkflowEngine";
import { DentalLabOrderInspectFinancials } from "./DentalLabOrderInspectFinancials";
import { DentalLabOrderInspectImplants } from "./DentalLabOrderInspectImplants";

export function DentalLabOrderInspectMeta({
	order,
}: {
	readonly order: DentalLabWorkflowOrder;
}) {
	return (
		<div className="space-y-3">
			<div className="ztl-form-grid-2">
				<div className="min-w-0">
					<p className="text-[11px] text-[var(--muted,#64748b)] mb-0.5">
						Пациент:
					</p>
					<p className="m-0 font-bold truncate" title={order.patientName}>
						{order.patientName}
					</p>
				</div>
				<div className="min-w-0">
					<p className="text-[11px] text-[var(--muted,#64748b)] mb-0.5">
						Врач-ортопед:
					</p>
					<p className="m-0 font-bold truncate" title={order.doctorName}>
						{order.doctorName}
					</p>
				</div>
			</div>

			<div className="ztl-form-grid-2">
				<div className="min-w-0">
					<p className="text-[11px] text-[var(--muted,#64748b)] mb-0.5">
						Лаборатория:
					</p>
					<p className="m-0 font-semibold truncate" title={order.labName}>
						{order.labName}
					</p>
				</div>
				<div className="min-w-0">
					<p className="text-[11px] text-[var(--muted,#64748b)] mb-0.5">
						Конструкция:
					</p>
					<p className="m-0 font-semibold truncate" title={order.materialName}>
						{order.materialName}
					</p>
				</div>
			</div>

			<div className="ztl-form-grid-2">
				<div>
					<p className="text-[11px] text-[var(--muted,#64748b)] mb-0.5">
						Срок готовности ЗТЛ:
					</p>
					<p className="m-0 font-bold text-[var(--teal,#0d9488)]">
						{formatRussianDate(order.expectedLabDateIso)}
					</p>
				</div>
				<div>
					<p className="text-[11px] text-[var(--muted,#64748b)] mb-0.5">
						Дата примерки / Прием:
					</p>
					<p className="m-0 font-bold">
						{order.fittingDate ? formatRussianDate(order.fittingDate) : "—"}
						{order.appointmentId ? ` (${order.appointmentId})` : ""}
					</p>
				</div>
			</div>

			<DentalLabOrderInspectImplants order={order} />
			<DentalLabOrderInspectFinancials order={order} />
		</div>
	);
}
