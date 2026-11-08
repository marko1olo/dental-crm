import React, { useState, useMemo } from "react";
import { Calendar, CheckCircle2, FileText, Layers, Truck } from "lucide-react";
import type { LabWorkflowStatus, DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import type { CanonicalKanbanStageId } from "./DentalLabKanbanCard";
import { KanbanColumn } from "./kanbanBoardModules/KanbanColumn";
import { KanbanMobileStageSelector } from "./kanbanBoardModules/KanbanMobileStageSelector";

export interface DentalLabOrdersKanbanBoardProps {
	readonly ordersByStage?: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]>;
	readonly orders?: readonly DentalLabWorkflowOrder[];
	readonly stageLimits?: Record<string, number>;
	readonly setStageLimits?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
	readonly activeCardMenuOrderId?: string | null;
	readonly setActiveCardMenuOrderId?: React.Dispatch<React.SetStateAction<string | null>>;
	readonly onInspectOrder?: (order: DentalLabWorkflowOrder) => void;
	readonly onOpenOrder?: (order: DentalLabWorkflowOrder) => void;
	readonly onAdvanceStage?: (order: DentalLabWorkflowOrder) => void;
	readonly onOpenStatusTimeline?: (order: DentalLabWorkflowOrder) => void;
	readonly onPrintBlank?: (order: DentalLabWorkflowOrder) => void;
	readonly onAttachBitePhoto?: (order: DentalLabWorkflowOrder) => void;
	readonly onTechnicianComment?: (order: DentalLabWorkflowOrder) => void;
	readonly onRepeatFitting?: (order: DentalLabWorkflowOrder) => void;
	readonly onRequestWarrantyRework?: (order: DentalLabWorkflowOrder) => void;
	readonly onRescheduleAppointment?: (order: DentalLabWorkflowOrder) => void;
	readonly onPartialDelivery?: (order: DentalLabWorkflowOrder) => void;
	readonly onMoveOrderToColumn?: (orderId: string, targetColumnId: CanonicalKanbanStageId) => void | Promise<void>;
	readonly onActionPrompt?: (order: DentalLabWorkflowOrder) => void;
	readonly onOpenScan3D?: (order: DentalLabWorkflowOrder) => void;
	readonly onOpenFittingModal?: (order: DentalLabWorkflowOrder) => void;
}

export interface CanonicalKanbanColumnDef {
	readonly id: CanonicalKanbanStageId;
	readonly title: string;
	readonly shortTitle: string;
	readonly icon: React.ReactNode;
	readonly colorHex: string;
}

export const CANONICAL_4_KANBAN_COLUMNS: readonly CanonicalKanbanColumnDef[] = [
	{ id: "sent_to_lab", title: "Слепок/скан отправлен в ЗТЛ", shortTitle: "Отправлен в ЗТЛ", icon: <Layers size={16} />, colorHex: "#3b82f6" },
	{ id: "in_progress", title: "В работе у техника", shortTitle: "У техника", icon: <Calendar size={16} />, colorHex: "#8b5cf6" },
	{ id: "fitting_scheduled", title: "В клинике (готово к примерке/фиксации)", shortTitle: "В клинике", icon: <FileText size={16} />, colorHex: "#0d9488" },
	{ id: "installed_completed", title: "Установлено пациенту / Сдано", shortTitle: "Сдано", icon: <CheckCircle2 size={16} />, colorHex: "#10b981" },
] as const;

export const CANONICAL_5_KANBAN_COLUMNS = CANONICAL_4_KANBAN_COLUMNS;

/**
 * 4-колоночная каноническая канбан-доска ЗТЛ (Мандат 8b: <= 120 строк).
 */
export const DentalLabOrdersKanbanBoard: React.FC<DentalLabOrdersKanbanBoardProps> = (props) => {
	const [dragOverCol, setDragOverCol] = useState<CanonicalKanbanStageId | null>(null);
	const [mobileStage, setMobileStage] = useState<CanonicalKanbanStageId>("sent_to_lab");
	const [localStageLimits, setLocalStageLimits] = useState<Record<string, number>>({});
	const [localActiveMenuId, setLocalActiveMenuId] = useState<string | null>(null);

	const stageLimits = props.stageLimits || localStageLimits;
	const setStageLimits = props.setStageLimits || setLocalStageLimits;
	const activeMenuId = props.activeCardMenuOrderId !== undefined ? props.activeCardMenuOrderId : localActiveMenuId;
	const setActiveMenuId = props.setActiveCardMenuOrderId || setLocalActiveMenuId;
	const onInspectOrder = props.onInspectOrder || props.onOpenOrder || (() => {});
	const onAdvanceStage = props.onAdvanceStage || props.onOpenStatusTimeline || (() => {});

	const safeOrdersByStage = useMemo(() => {
		if (props.ordersByStage) return props.ordersByStage;
		const map: Record<string, DentalLabWorkflowOrder[]> = {
			draft: [],
			sent_to_lab: [],
			in_progress: [],
			fitting_scheduled: [],
			installed_completed: [],
		};
		if (props.orders) {
			for (const o of props.orders) {
				const st = (o.currentStage || "sent_to_lab") as string;
				if (st in map) map[st]!.push(o);
				else map.sent_to_lab!.push(o);
			}
		}
		return map;
	}, [props.ordersByStage, props.orders]);

	const resolved = useMemo(() => ({
		draft: [],
		sent_to_lab: [...(safeOrdersByStage.draft || []), ...(safeOrdersByStage.sent_to_lab || [])],
		in_progress: [...((safeOrdersByStage as any).in_progress || []), ...((safeOrdersByStage as any).warranty_rework || [])],
		fitting_scheduled: safeOrdersByStage.fitting_scheduled || [],
		installed_completed: safeOrdersByStage.installed_completed || [],
	}), [safeOrdersByStage]);

	const stageCounts = useMemo(() => ({
		draft: 0,
		sent_to_lab: resolved.sent_to_lab.length,
		in_progress: resolved.in_progress.length,
		fitting_scheduled: resolved.fitting_scheduled.length,
		installed_completed: resolved.installed_completed.length,
	}), [resolved]);

	return (
		<main className="ztl-kanban-board" data-testid="canonical-4-stage-kanban-board" data-mobile-active={mobileStage}>
			<div className="sm:hidden w-full pb-1">
				<KanbanMobileStageSelector columns={CANONICAL_4_KANBAN_COLUMNS} activeStageId={mobileStage} onSelectStage={setMobileStage} counts={stageCounts} />
			</div>
			{CANONICAL_4_KANBAN_COLUMNS.map((col) => {
				const colOrders = resolved[col.id] || [];
				return (
					<KanbanColumn
						key={col.id} colId={col.id} colTitle={col.title} colIcon={col.icon} orders={colOrders}
						isDragOver={dragOverCol === col.id} limit={stageLimits[col.id] ?? 40}
						onIncreaseLimit={() => setStageLimits((prev) => ({ ...prev, [col.id]: (prev[col.id] ?? 40) + 40 }))}
						activeMenuId={activeMenuId}
						onToggleMenu={(id, e) => { e.stopPropagation(); setActiveMenuId((p) => p === id ? null : id); }}
						onCloseMenu={() => setActiveMenuId(null)}
						onInspectOrder={onInspectOrder} onAdvanceStage={onAdvanceStage}
						onPrintBlank={props.onPrintBlank || (() => {})} onAttachBitePhoto={props.onAttachBitePhoto || (() => {})}
						onTechnicianComment={props.onTechnicianComment || (() => {})} onRepeatFitting={props.onRepeatFitting || (() => {})}
						onRequestWarrantyRework={props.onRequestWarrantyRework || (() => {})}
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
