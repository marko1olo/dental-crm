import React from "react";
import type { useDentalLabOrders } from "./useDentalLabOrders";
import { DentalLabOrdersKanbanBoard } from "../DentalLabOrdersKanbanBoard";

export interface DentalLabOrdersKanbanViewProps {
	readonly logic: ReturnType<typeof useDentalLabOrders>;
}

export function DentalLabOrdersKanbanView({ logic }: DentalLabOrdersKanbanViewProps): React.JSX.Element {
	const {
		orders, kanbanOrdersByStage, kanbanStageLimits, setKanbanStageLimits,
		kanbanActiveMenuId, setKanbanActiveMenuId, handleOpenEditOrder,
		handleStatusChange, handleOpenPrintOrder, handleAttachBitePhoto,
		handleTechnicianComment, handleRepeatFitting, handleReclamation,
	} = logic;

	return (
		<div
			className="w-full max-w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs"
			data-testid="lab-orders-kanban-container"
		>
			<DentalLabOrdersKanbanBoard
				ordersByStage={kanbanOrdersByStage}
				stageLimits={kanbanStageLimits}
					setStageLimits={setKanbanStageLimits}
					activeCardMenuOrderId={kanbanActiveMenuId}
					setActiveCardMenuOrderId={setKanbanActiveMenuId}
					onInspectOrder={(wfOrder) => {
						const orig = orders.find((o) => o.id === wfOrder.id);
						if (orig) handleOpenEditOrder(orig);
					}}
					onAdvanceStage={async (wfOrder) => {
						const nextStatus = wfOrder.currentStage === "draft" ? "sent_to_lab" : wfOrder.currentStage === "sent_to_lab" ? "fitting_scheduled" : "installed_completed";
						await handleStatusChange(wfOrder.id, nextStatus);
					}}
					onPrintBlank={(wfOrder) => {
						const orig = orders.find((o) => o.id === wfOrder.id);
						if (orig) handleOpenPrintOrder(orig);
					}}
					onAttachBitePhoto={(wfOrder) => {
						const orig = orders.find((o) => o.id === wfOrder.id);
						if (orig) handleAttachBitePhoto(orig);
					}}
					onTechnicianComment={(wfOrder) => {
						const orig = orders.find((o) => o.id === wfOrder.id);
						if (orig) handleTechnicianComment(orig);
					}}
					onRepeatFitting={(wfOrder) => {
						const orig = orders.find((o) => o.id === wfOrder.id);
						if (orig) handleRepeatFitting(orig);
					}}
					onRequestWarrantyRework={(wfOrder) => {
						const orig = orders.find((o) => o.id === wfOrder.id);
						if (orig) handleReclamation(orig);
					}}
					onMoveOrderToColumn={async (orderId, targetColumnId) => {
						await handleStatusChange(orderId, targetColumnId);
					}}
				/>
		</div>
	);
}
