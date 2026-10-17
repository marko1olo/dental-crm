import React from "react";
import { Building2, CheckCircle2, RotateCcw } from "lucide-react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export interface KanbanCardHeaderProps {
	readonly order: DentalLabWorkflowOrder;
}

export function KanbanCardHeader({ order }: KanbanCardHeaderProps) {
	return (
		<>
			<div className="ztl-card-top-row">
				<span className="ztl-card-order-num">{order.orderNumber}</span>
				<span className="ztl-card-teeth-badge">
					Зубы: {order.selectedTeeth.join(", ")}
				</span>
			</div>

			{order.isWarrantyRework && (
				<div style={{ marginTop: "4px", fontSize: "10.5px", color: "var(--bad-fg, #e11d48)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
					<RotateCcw size={11} />
					<span className="truncate">
						ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 руб){order.originalOrderNumber ? ` • исх. № ${order.originalOrderNumber}` : ""}
					</span>
				</div>
			)}

			{(order as any).isPartialDelivery && (
				<div style={{ marginTop: "3px", fontSize: "10.5px", color: "var(--teal, #0d9488)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
					<CheckCircle2 size={11} />
					<span className="truncate">
						Частичная поставка: готовы [{(order as any).deliveredTeeth?.join(", ") || order.selectedTeeth.join(", ")}]
					</span>
				</div>
			)}

			<h4 className="ztl-card-patient-name min-w-0" title={order.patientName}>
				{order.patientName}
			</h4>

			<p className="ztl-card-doctor min-w-0" title={order.doctorName}>
				{order.doctorName}
			</p>

			<div className="ztl-card-lab-name min-w-0" title={order.labName}>
				<Building2 size={11} className="shrink-0" />
				<span>{order.labName}</span>
			</div>
		</>
	);
}
