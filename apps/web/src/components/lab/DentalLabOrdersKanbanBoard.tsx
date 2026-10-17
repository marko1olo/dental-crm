/**
 * DentalLabOrdersKanbanBoard.tsx — Каноническая 4-колоночная клиническая канбан-доска ЗТЛ.
 *
 * 4 ЖИЗНЕННЫХ СТАТУСА (SSOT):
 * 1. Слепок снят            (draft)
 * 2. В работе у техника    (sent_to_lab + warranty_rework)
 * 3. Доставлено в клинику   (fitting_scheduled / ready_in_clinic)
 * 4. Зафиксировано пациенту (installed_completed / delivered_to_patient)
 *
 * Оптимизация: DOM-виртуализация sliceDomList, contentVisibility: auto,
 * быстрый 1-клик перевод этапа и открытие единого SSOT-дравера DentalLabOrderDrawer.
 */

import React from "react";
import {
	Calendar,
	CheckCircle2,
	Truck,
	FileText,
} from "lucide-react";
import type {
	LabWorkflowStatus,
	DentalLabWorkflowOrder,
} from "./dentalLabWorkflowEngine";
import { sliceDomList } from "../../utils/domVirtualizationHelper";
import {
	DentalLabKanbanCard,
	type CanonicalKanbanStageId,
} from "./DentalLabKanbanCard";

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
	readonly onRescheduleAppointment?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly onPartialDelivery?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly onMoveOrderToColumn?: ((orderId: string, targetColumnId: CanonicalKanbanStageId) => void | Promise<void>) | undefined;
}

export interface CanonicalKanbanColumnDef {
	readonly id: CanonicalKanbanStageId;
	readonly title: string;
	readonly shortTitle: string;
	readonly icon: React.ReactNode;
	readonly colorHex: string;
}

export const CANONICAL_4_KANBAN_COLUMNS: readonly CanonicalKanbanColumnDef[] = [
	{
		id: "draft",
		title: "Отправлен в лабораторию",
		shortTitle: "Отправлен в лабораторию",
		icon: <FileText size={16} />,
		colorHex: "#64748b",
	},
	{
		id: "sent_to_lab",
		title: "В работе у техника",
		shortTitle: "В работе у техника",
		icon: <Truck size={16} />,
		colorHex: "#3b82f6",
	},
	{
		id: "fitting_scheduled",
		title: "Готов / Доставка в клинику",
		shortTitle: "Готов / Доставка в клинику",
		icon: <Calendar size={16} />,
		colorHex: "#f59e0b",
	},
	{
		id: "installed_completed",
		title: "Припасован и зафиксирован",
		shortTitle: "Припасован и зафиксирован",
		icon: <CheckCircle2 size={16} />,
		colorHex: "#10b981",
	},
] as const;

export const DentalLabOrdersKanbanBoard: React.FC<DentalLabOrdersKanbanBoardProps> = ({
	ordersByStage,
	stageLimits,
	setStageLimits,
	activeCardMenuOrderId,
	setActiveCardMenuOrderId,
	onInspectOrder,
	onAdvanceStage,
	onPrintBlank,
	onAttachBitePhoto,
	onTechnicianComment,
	onRepeatFitting,
	onRequestWarrantyRework,
	onRescheduleAppointment,
	onPartialDelivery,
	onMoveOrderToColumn,
}) => {
	const [dragOverColumn, setDragOverColumn] = React.useState<CanonicalKanbanStageId | null>(null);

	// Группировка заказов строго по 4 каноническим колонкам
	const resolvedColumns = React.useMemo(() => {
		const draftOrders = ordersByStage.draft || [];
		const inLabOrders = [
			...(ordersByStage.sent_to_lab || []),
			...(ordersByStage.warranty_rework || []),
		];
		const inClinicOrders = ordersByStage.fitting_scheduled || [];
		const installedOrders = ordersByStage.installed_completed || [];

		return {
			draft: draftOrders,
			sent_to_lab: inLabOrders,
			fitting_scheduled: inClinicOrders,
			installed_completed: installedOrders,
		};
	}, [ordersByStage]);

	return (
		<main className="ztl-kanban-board" data-testid="canonical-4-stage-kanban-board">
			{CANONICAL_4_KANBAN_COLUMNS.map((col) => {
				const colOrders = resolvedColumns[col.id] || [];
				const colLimit = stageLimits[col.id] ?? 40;
				const stageSlice = sliceDomList(colOrders, colLimit, 0);

				return (
					<div
						key={col.id}
						className={`ztl-kanban-column ${dragOverColumn === col.id ? "is-drag-over" : ""}`}
						data-testid={`kanban-column-${col.id}`}
						onDragOver={(e) => {
							e.preventDefault();
							e.dataTransfer.dropEffect = "move";
							if (dragOverColumn !== col.id) {
								setDragOverColumn(col.id);
							}
						}}
						onDragLeave={(e) => {
							if (e.currentTarget.contains(e.relatedTarget as Node)) return;
							setDragOverColumn(null);
						}}
						onDrop={async (e) => {
							e.preventDefault();
							setDragOverColumn(null);
							const orderId = e.dataTransfer.getData("text/plain");
							if (orderId && onMoveOrderToColumn) {
								await onMoveOrderToColumn(orderId, col.id);
							}
						}}
					>
						<div className="ztl-column-header">
							<div className="ztl-column-title-wrap">
								<span className="ztl-column-icon">{col.icon}</span>
								<h3 className="ztl-column-title" title={col.title}>
									{col.title}
								</h3>
							</div>
							<span
								className={`ztl-column-count ${colOrders.length > 0 ? "has-items" : ""}`}
								data-testid={`column-count-${col.id}`}
							>
								{colOrders.length}
							</span>
						</div>

						<div className="ztl-column-cards">
							{stageSlice.visibleItems.map((order) => (
								<DentalLabKanbanCard
									key={order.id}
									order={order}
									columnId={col.id}
									isMenuOpen={activeCardMenuOrderId === order.id}
									onToggleMenu={(e) => {
										e.stopPropagation();
										setActiveCardMenuOrderId((prev) =>
											prev === order.id ? null : order.id,
										);
									}}
									onCloseMenu={() => setActiveCardMenuOrderId(null)}
									onInspectOrder={onInspectOrder}
									onAdvanceStage={onAdvanceStage}
									onPrintBlank={onPrintBlank}
									onAttachBitePhoto={onAttachBitePhoto}
									onTechnicianComment={onTechnicianComment}
									onRepeatFitting={onRepeatFitting}
									onRequestWarrantyRework={onRequestWarrantyRework}
									onRescheduleAppointment={onRescheduleAppointment}
									onPartialDelivery={onPartialDelivery}
								/>
							))}

							{stageSlice.hasMore && (
								<div style={{ padding: "8px 4px", textAlign: "center" }}>
									<button
										type="button"
										className="ztl-chip"
										style={{
											width: "100%",
											justifyContent: "center",
											padding: "6px 10px",
											fontSize: "11px",
											fontWeight: 600,
										}}
										onClick={() =>
											setStageLimits((prev) => ({
												...prev,
												[col.id]: (prev[col.id] ?? 40) + 40,
											}))
										}
									>
										Показать ещё 40 нарядов (показано {stageSlice.displayedCount} из{" "}
										{stageSlice.totalCount})
									</button>
								</div>
							)}

							{colOrders.length === 0 && (
								<div
									className="ztl-kanban-empty-column"
									style={{
										textAlign: "center",
										padding: "36px 12px",
										color: "var(--muted, #94a3b8)",
										fontSize: "12px",
										border: "1.5px dashed var(--line, #cbd5e1)",
										borderRadius: "8px",
										margin: "8px 0",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										minHeight: "140px",
										gap: "6px",
									}}
									data-testid={`empty-column-${col.id}`}
								>
									<span>Нет нарядов в этом статусе</span>
								</div>
							)}
						</div>
					</div>
				);
			})}
		</main>
	);
};
