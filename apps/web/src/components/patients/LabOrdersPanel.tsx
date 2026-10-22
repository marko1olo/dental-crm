import React from "react";
import { FlaskConical, Plus } from "lucide-react";
import { DentalLabOrdersView } from "../lab/DentalLabOrdersView";
import { useLabOrdersPanelLogic } from "./useLabOrdersPanelLogic";
import { LabOrderCardItem } from "./LabOrderCardItem";
import { LAB_ORDER_PORTAL_PATH } from "../../lib/publicPortalRoute";
import "./LabOrdersPanel.css";

export type { LabOrder } from "./labOrdersTypes";

export interface LabOrdersPanelProps {
	patientId?: string;
}

/**
 * LabOrdersPanel — Канонический фасад интеграции ЗТЛ в карточке пациента (Мандат 8e, 8n).
 * Делегирует работу каноническому модулю DentalLabOrdersView из components/lab/,
 * предотвращая дублирование разрозненных ЗТЛ-компонентов.
 */
export function LabOrdersPanel({ patientId }: LabOrdersPanelProps) {
	if (!patientId) return <DentalLabOrdersView />;
	const logic = useLabOrdersPanelLogic(patientId);

	// Канонический путь для зуботехника через LAB_ORDER_PORTAL_PATH
	const portalBasePath = `/#${LAB_ORDER_PORTAL_PATH}`;

	return (
		<div className="lab-orders-panel" data-testid="patient-lab-orders-panel" data-patient-id={patientId} data-portal-path={portalBasePath}>
			{logic.orders.length === 0 ? (
				<div className="p-8 text-center bg-[var(--paper-soft)] rounded-xl border border-dashed border-[var(--line)] flex flex-col items-center gap-3 my-2">
					<FlaskConical size={36} color="var(--teal, #0d9488)" />
					<div className="font-bold text-sm text-[var(--ink)]">Нет оформленных заказов в лабораторию</div>
					<div className="text-xs text-[var(--muted)] max-w-md">Оформите заказ на изготовление коронок или вкладок для этого пациента.</div>
					<button
						type="button"
						onClick={() => logic.setIsOrderModalOpen(true)}
						className="primary-button min-h-[40px] px-4 flex items-center gap-1.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
						data-testid="lab-order-panel-create-btn"
					>
						<Plus size={15} />
						<span>+ Заказ в лабораторию</span>
					</button>
				</div>
			) : (
				<div className="lab-orders-list space-y-2">
					{logic.orders.map((order) => (
						<LabOrderCardItem
							key={order.id}
							order={order}
							onOpenPrintOrder={() => logic.copyPortalLink(order.secureToken)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export default LabOrdersPanel;
