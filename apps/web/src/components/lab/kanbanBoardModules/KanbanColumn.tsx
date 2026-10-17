import React from "react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { DentalLabKanbanCard, type CanonicalKanbanStageId } from "../DentalLabKanbanCard";

export interface KanbanColumnProps {
	readonly colId: CanonicalKanbanStageId;
	readonly colTitle: string;
	readonly colIcon: React.ReactNode;
	readonly orders: DentalLabWorkflowOrder[];
	readonly isDragOver: boolean;
	readonly limit: number;
	readonly onIncreaseLimit: () => void;
	readonly activeMenuId: string | null;
	readonly onToggleMenu: (orderId: string, e: React.MouseEvent) => void;
	readonly onCloseMenu: () => void;
	readonly onInspectOrder: (order: DentalLabWorkflowOrder) => void;
	readonly onAdvanceStage: (order: DentalLabWorkflowOrder) => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAttachBitePhoto: (order: DentalLabWorkflowOrder) => void;
	readonly onTechnicianComment: (order: DentalLabWorkflowOrder) => void;
	readonly onRepeatFitting: (order: DentalLabWorkflowOrder) => void;
	readonly onRequestWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onRescheduleAppointment?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly onPartialDelivery?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly onDragOver: (e: React.DragEvent) => void;
	readonly onDragLeave: (e: React.DragEvent) => void;
	readonly onDrop: (e: React.DragEvent) => void;
}

export function KanbanColumn(props: KanbanColumnProps) {
	const { colId, colTitle, colIcon, orders, isDragOver, limit, onIncreaseLimit, activeMenuId, onToggleMenu, onCloseMenu } = props;
	const slice = sliceDomList(orders, limit, 0);

	return (
		<div
			className={`ztl-kanban-column ${isDragOver ? "is-drag-over" : ""}`}
			data-testid={`kanban-column-${colId}`}
			onDragOver={props.onDragOver}
			onDragLeave={props.onDragLeave}
			onDrop={props.onDrop}
		>
			<div className="ztl-column-header">
				<div className="ztl-column-title-wrap">
					<span className="ztl-column-icon">{colIcon}</span>
					<h3 className="ztl-column-title" title={colTitle}>{colTitle}</h3>
				</div>
				<span className={`ztl-column-count ${orders.length > 0 ? "has-items" : ""}`} data-testid={`column-count-${colId}`}>
					{orders.length}
				</span>
			</div>

			<div className="ztl-column-cards">
				{slice.visibleItems.map((order) => (
					<DentalLabKanbanCard
						key={order.id} order={order} columnId={colId}
						isMenuOpen={activeMenuId === order.id}
						onToggleMenu={(e) => onToggleMenu(order.id, e)}
						onCloseMenu={onCloseMenu}
						onInspectOrder={props.onInspectOrder} onAdvanceStage={props.onAdvanceStage}
						onPrintBlank={props.onPrintBlank} onAttachBitePhoto={props.onAttachBitePhoto}
						onTechnicianComment={props.onTechnicianComment} onRepeatFitting={props.onRepeatFitting}
						onRequestWarrantyRework={props.onRequestWarrantyRework}
						onRescheduleAppointment={props.onRescheduleAppointment} onPartialDelivery={props.onPartialDelivery}
					/>
				))}

				{slice.hasMore && (
					<div style={{ padding: "8px 4px", textAlign: "center" }}>
						<button type="button" className="ztl-chip" onClick={onIncreaseLimit} style={{ width: "100%", justifyContent: "center", padding: "6px 10px", fontSize: "11px", fontWeight: 600 }}>
							Показать ещё 40 нарядов ({slice.displayedCount} из {slice.totalCount})
						</button>
					</div>
				)}

				{orders.length === 0 && (
					<div className="ztl-kanban-empty-column" style={{ textAlign: "center", padding: "36px 12px", color: "var(--muted, #94a3b8)", fontSize: "12px", border: "1.5px dashed var(--line, #cbd5e1)", borderRadius: "8px", margin: "8px 0" }} data-testid={`empty-column-${colId}`}>
						<span>Нет нарядов в этом статусе</span>
					</div>
				)}
			</div>
		</div>
	);
}
