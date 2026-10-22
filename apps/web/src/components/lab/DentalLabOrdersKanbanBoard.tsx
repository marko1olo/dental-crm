import React, { useState, useMemo } from "react";
import { Calendar, CheckCircle2, FileText, Layers, Truck } from "lucide-react";
import type { LabWorkflowStatus, DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import type { CanonicalKanbanStageId } from "./DentalLabKanbanCard";
import { KanbanColumn } from "./kanbanBoardModules/KanbanColumn";

export interface DentalLabOrdersKanbanBoardProps {
	readonly ordersByStage: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]>;
	readonly stageLimits: Record<string, number>;
	readonly setStageLimits: React.Dispatch<React.SetStateAction<Record<string, number>>>;
	readonly activeCardMenuOrderId: string | null;
	readonly setActiveCardMenuOrderId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly onInspectOrder: (order: DentalLabWorkflowOrder) => void;
	readonly onAdvanceStage: (order: DentalLabWorkflowOrder) => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAttachBitePhoto: (order: DentalLabWorkflowOrder) => void;
	readonly onTechnicianComment: (order: DentalLabWorkflowOrder) => void;
	readonly onRepeatFitting: (order: DentalLabWorkflowOrder) => void;
	readonly onRequestWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onRescheduleAppointment?: (order: DentalLabWorkflowOrder) => void;
	readonly onPartialDelivery?: (order: DentalLabWorkflowOrder) => void;
	readonly onMoveOrderToColumn?: (orderId: string, targetColumnId: CanonicalKanbanStageId) => void | Promise<void>;
}

export interface CanonicalKanbanColumnDef {
	readonly id: CanonicalKanbanStageId;
	readonly title: string;
	readonly shortTitle: string;
	readonly icon: React.ReactNode;
	readonly colorHex: string;
}

export const CANONICAL_4_KANBAN_COLUMNS: readonly CanonicalKanbanColumnDef[] = [
	{ id: "sent_to_lab", title: "Отправлен в ЗТЛ", shortTitle: "В ЗТЛ", icon: <Layers size={16} />, colorHex: "#3b82f6" },
	{ id: "in_progress", title: "В работе у техника", shortTitle: "У техника", icon: <Calendar size={16} />, colorHex: "#8b5cf6" },
	{ id: "fitting_scheduled", title: "Готов / В клинике", shortTitle: "В клинике", icon: <FileText size={16} />, colorHex: "#f59e0b" },
	{ id: "installed_completed", title: "Установлен пациенту", shortTitle: "Сдано", icon: <CheckCircle2 size={16} />, colorHex: "#10b981" },
] as const;

export const CANONICAL_5_KANBAN_COLUMNS = CANONICAL_4_KANBAN_COLUMNS;

/**
 * 4-колоночная каноническая канбан-доска ЗТЛ (Мандат 8b: <= 120 строк).
 */
export const DentalLabOrdersKanbanBoard: React.FC<DentalLabOrdersKanbanBoardProps> = (props) => {
	const [dragOverCol, setDragOverCol] = useState<CanonicalKanbanStageId | null>(null);

	const resolved = useMemo(() => ({
		draft: [],
		sent_to_lab: [
			...(props.ordersByStage.draft || []),
			...(props.ordersByStage.sent_to_lab || []),
		],
		in_progress: [
			...((props.ordersByStage as any).in_progress || []),
			...(props.ordersByStage.warranty_rework || []),
		],
		fitting_scheduled: props.ordersByStage.fitting_scheduled || [],
		installed_completed: props.ordersByStage.installed_completed || [],
	}), [props.ordersByStage]);

	return (
		<main className="ztl-kanban-board" data-testid="canonical-4-stage-kanban-board">
			{CANONICAL_4_KANBAN_COLUMNS.map((col) => {
				const colOrders = resolved[col.id] || [];
				return (
					<KanbanColumn
						key={col.id} colId={col.id} colTitle={col.title} colIcon={col.icon} orders={colOrders}
						isDragOver={dragOverCol === col.id} limit={props.stageLimits[col.id] ?? 40}
						onIncreaseLimit={() => props.setStageLimits((prev) => ({ ...prev, [col.id]: (prev[col.id] ?? 40) + 40 }))}
						activeMenuId={props.activeCardMenuOrderId}
						onToggleMenu={(id, e) => { e.stopPropagation(); props.setActiveCardMenuOrderId((p) => p === id ? null : id); }}
						onCloseMenu={() => props.setActiveCardMenuOrderId(null)}
						onInspectOrder={props.onInspectOrder} onAdvanceStage={props.onAdvanceStage}
						onPrintBlank={props.onPrintBlank} onAttachBitePhoto={props.onAttachBitePhoto}
						onTechnicianComment={props.onTechnicianComment} onRepeatFitting={props.onRepeatFitting}
						onRequestWarrantyRework={props.onRequestWarrantyRework}
						onRescheduleAppointment={props.onRescheduleAppointment} onPartialDelivery={props.onPartialDelivery}
						onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverCol !== col.id) setDragOverCol(col.id); }}
						onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setDragOverCol(null); }}
						onDrop={async (e) => {
							e.preventDefault(); setDragOverCol(null);
							const orderId = e.dataTransfer.getData("text/plain");
							if (orderId && props.onMoveOrderToColumn) await props.onMoveOrderToColumn(orderId, col.id);
						}}
					/>
				);
			})}
		</main>
	);
};

export default DentalLabOrdersKanbanBoard;
