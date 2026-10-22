import React from "react";
import { CheckCircle2, ChevronRight, Eye, MoreHorizontal, Send, Sparkles } from "lucide-react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import type { CanonicalKanbanStageId } from "../DentalLabKanbanCard";
import { DentalLabKanbanCardMenu } from "../DentalLabKanbanCardMenu";

export interface KanbanCardActionsProps {
	readonly order: DentalLabWorkflowOrder;
	readonly columnId: CanonicalKanbanStageId;
	readonly isMenuOpen: boolean;
	readonly onToggleMenu: (e: React.MouseEvent) => void;
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
}

export function KanbanCardActions({
	order, columnId, isMenuOpen, onToggleMenu, onCloseMenu,
	onInspectOrder, onAdvanceStage, onPrintBlank, onAttachBitePhoto,
	onTechnicianComment, onRepeatFitting, onRequestWarrantyRework,
	onRescheduleAppointment, onPartialDelivery,
}: KanbanCardActionsProps) {
	let advanceLabel = "Далее";
	let advanceTitle = "Передвинуть на следующий статус";
	let AdvanceIcon = ChevronRight;

	if (columnId === "draft") {
		advanceLabel = "В работу";
		advanceTitle = "Передать наряд в работу технику";
		AdvanceIcon = Send;
	} else if (columnId === "sent_to_lab") {
		advanceLabel = "В работу";
		advanceTitle = "Передать технику в работу";
		AdvanceIcon = Send;
	} else if (columnId === "in_progress") {
		advanceLabel = "Поступил в клинику";
		advanceTitle = "Конструкция готова и доставлена в клинику";
		AdvanceIcon = CheckCircle2;
	} else if (columnId === "fitting_scheduled") {
		advanceLabel = "Установлен";
		advanceTitle = "Конструкция зафиксирована и установлена пациенту";
		AdvanceIcon = CheckCircle2;
	} else if (columnId === "installed_completed") {
		advanceLabel = "Сдано";
		advanceTitle = "Работа зафиксирована и сдана";
		AdvanceIcon = CheckCircle2;
	}

	return (
		<div className="ztl-card-actions-row" style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
			<button type="button" className="secondary-button ztl-btn-card-action ztl-btn-open min-h-[44px] sm:min-h-0" onClick={(e) => { e.stopPropagation(); onInspectOrder(order); }} title="Открыть спецификацию наряда" data-testid={`ztl-card-open-${order.id}`}>
				<Eye size={13} className="shrink-0" /><span>Открыть</span>
			</button>

			<button
				type="button"
				className={`ztl-btn-card-action flex-1 px-1 text-[11px] min-h-[44px] sm:min-h-0 ${columnId === "installed_completed" ? "secondary-button font-bold text-emerald-600" : "primary-button ztl-btn-advance"}`}
				onClick={(e) => { e.stopPropagation(); columnId === "installed_completed" ? onInspectOrder(order) : onAdvanceStage(order); }}
				title={advanceTitle}
				data-testid={`ztl-card-status-${order.id}`}
			>
				<AdvanceIcon size={13} className="shrink-0" /><span>{advanceLabel}</span>
			</button>

			<div style={{ position: "relative", flexShrink: 0 }}>
				<button type="button" className="icon-button ztl-btn-card-action min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-2 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); onToggleMenu(e); }} title="Действия" aria-expanded={isMenuOpen} data-testid={`ztl-card-menu-btn-${order.id}`}>
					<MoreHorizontal size={13} />
				</button>
				{isMenuOpen && (
					<DentalLabKanbanCardMenu
						order={order} columnId={columnId} onCloseMenu={onCloseMenu}
						onInspectOrder={onInspectOrder} onPrintBlank={onPrintBlank}
						onAttachBitePhoto={onAttachBitePhoto} onTechnicianComment={onTechnicianComment}
						onRepeatFitting={onRepeatFitting} onRequestWarrantyRework={onRequestWarrantyRework}
						onRescheduleAppointment={onRescheduleAppointment} onPartialDelivery={onPartialDelivery}
					/>
				)}
			</div>
		</div>
	);
}
