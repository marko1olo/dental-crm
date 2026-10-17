import React from "react";
import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import { formatRussianDate } from "./dentalLabWorkflowEngine";
import { KanbanCardHeader } from "./kanbanCardModules/KanbanCardHeader";
import { KanbanCardBody } from "./kanbanCardModules/KanbanCardBody";
import { KanbanCardActions } from "./kanbanCardModules/KanbanCardActions";

export type CanonicalKanbanStageId = "draft" | "sent_to_lab" | "fitting_scheduled" | "installed_completed";

export interface DentalLabKanbanCardProps {
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

export interface FittingUrgencyInfo {
	readonly text: string;
	readonly severity: "critical" | "warning" | "normal";
}

export function getFittingUrgencyInfo(order: DentalLabWorkflowOrder): FittingUrgencyInfo | null {
	const rawDate = order.fittingDate || order.scheduledVisitDateIso;
	if (!rawDate) return null;
	const targetDate = new Date(rawDate);
	if (isNaN(targetDate.getTime())) return null;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
	const diffDays = Math.round((targetMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
	const dateFormatted = formatRussianDate(rawDate);
	if (diffDays < 0) return { text: `Примерка просрочена • ${dateFormatted}`, severity: "critical" };
	if (diffDays === 0) return { text: `Примерка сегодня! • ${dateFormatted}`, severity: "critical" };
	if (diffDays <= 3) return { text: `Примерка через ${diffDays} дн. • ${dateFormatted}`, severity: "warning" };
	return { text: `Примерка через ${diffDays} дн. • ${dateFormatted}`, severity: "normal" };
}

/**
 * Карточка наряда канбан-доски ЗТЛ (Мандат 8b: <= 120 строк).
 */
export const DentalLabKanbanCard: React.FC<DentalLabKanbanCardProps> = ({
	order, columnId, isMenuOpen, onToggleMenu, onCloseMenu,
	onInspectOrder, onAdvanceStage, onPrintBlank, onAttachBitePhoto,
	onTechnicianComment, onRepeatFitting, onRequestWarrantyRework,
	onRescheduleAppointment, onPartialDelivery,
}) => {
	const hasDelay = order.isDelayedAlert || order.delayAlert?.isDelayedAlert;
	const fittingUrgency = getFittingUrgencyInfo(order);

	return (
		<article
			className={`ztl-order-card ${hasDelay ? "has-delay-alert" : ""}`}
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 64px", contain: "content", cursor: "grab" }}
			onClick={() => onInspectOrder(order)}
			draggable={true}
			onDragStart={(e) => {
				e.dataTransfer.setData("text/plain", order.id);
				e.dataTransfer.effectAllowed = "move";
			}}
		>
			<KanbanCardHeader order={order} />
			<KanbanCardBody order={order} fittingUrgency={fittingUrgency} onRescheduleAppointment={onRescheduleAppointment} />
			<KanbanCardActions
				order={order} columnId={columnId} isMenuOpen={isMenuOpen} onToggleMenu={onToggleMenu}
				onCloseMenu={onCloseMenu} onInspectOrder={onInspectOrder} onAdvanceStage={onAdvanceStage}
				onPrintBlank={onPrintBlank} onAttachBitePhoto={onAttachBitePhoto} onTechnicianComment={onTechnicianComment}
				onRepeatFitting={onRepeatFitting} onRequestWarrantyRework={onRequestWarrantyRework}
				onRescheduleAppointment={onRescheduleAppointment} onPartialDelivery={onPartialDelivery}
			/>
		</article>
	);
};

export default DentalLabKanbanCard;
