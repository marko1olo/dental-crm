import React from "react";
import { Calendar, CheckCircle2, RotateCcw } from "lucide-react";
import type { CanonicalKanbanStageId } from "./DentalLabKanbanCard";
import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import { DentalLabKanbanCardMenuItem } from "./kanbanModules/DentalLabKanbanCardMenuItem";
import { DentalLabKanbanStandardItems } from "./kanbanModules/DentalLabKanbanStandardItems";
import { triggerLabOrderReschedule } from "./kanbanModules/dentalLabRescheduleHelper";

export interface DentalLabKanbanCardMenuProps {
	readonly order: DentalLabWorkflowOrder;
	readonly columnId: CanonicalKanbanStageId;
	readonly onCloseMenu: () => void;
	readonly onInspectOrder: (order: DentalLabWorkflowOrder) => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAttachBitePhoto: (order: DentalLabWorkflowOrder) => void;
	readonly onTechnicianComment: (order: DentalLabWorkflowOrder) => void;
	readonly onRepeatFitting: (order: DentalLabWorkflowOrder) => void;
	readonly onRequestWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onRescheduleAppointment?:
		| ((order: DentalLabWorkflowOrder) => void)
		| undefined;
	readonly onPartialDelivery?:
		| ((order: DentalLabWorkflowOrder) => void)
		| undefined;
}

export const DentalLabKanbanCardMenu: React.FC<
	DentalLabKanbanCardMenuProps
> = ({
	order,
	columnId,
	onCloseMenu,
	onInspectOrder,
	onPrintBlank,
	onAttachBitePhoto,
	onTechnicianComment,
	onRepeatFitting,
	onRequestWarrantyRework,
	onRescheduleAppointment,
	onPartialDelivery,
}) => {
	const handleReschedule = () => {
		onCloseMenu();
		triggerLabOrderReschedule(order, onRescheduleAppointment);
	};

	return (
		<div
			className="absolute right-0 bottom-[calc(100%+4px)] bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg shadow-xl p-1 z-50 min-w-[210px] flex flex-col gap-0.5"
			role="menu"
			tabIndex={-1}
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => {
				if (e.key === "Escape") onCloseMenu();
			}}
		>
			<DentalLabKanbanStandardItems
				order={order}
				onCloseMenu={onCloseMenu}
				onInspectOrder={onInspectOrder}
				onPrintBlank={onPrintBlank}
				onAttachBitePhoto={onAttachBitePhoto}
				onTechnicianComment={onTechnicianComment}
			/>
			{columnId === "fitting_scheduled" && (
				<DentalLabKanbanCardMenuItem
					icon={<Calendar size={14} className="text-indigo-600" />}
					label="Повторная примерка"
					onClick={() => {
						onRepeatFitting(order);
						onCloseMenu();
					}}
					title="Назначить повторную примерку в расписании"
				/>
			)}
			<DentalLabKanbanCardMenuItem
				icon={<Calendar size={14} className="text-amber-600" />}
				label="Перенести запись (задержка лаборатории)"
				onClick={handleReschedule}
				title="Перейти к записи пациента для переноса визита"
				testId={`ztl-card-reschedule-${order.id}`}
				textColor="#d97706"
			/>
			{order.selectedTeeth.length > 1 && (
				<DentalLabKanbanCardMenuItem
					icon={<CheckCircle2 size={14} className="text-teal-600" />}
					label="Частичная сдача / Переделка (0 ₽)"
					onClick={() => {
						onCloseMenu();
						if (onPartialDelivery) onPartialDelivery(order);
						else onRequestWarrantyRework(order);
					}}
					title="Оформить частичную приемку и гарантийную переделку дефектной единицы (0 ₽)"
					testId={`ztl-card-partial-delivery-${order.id}`}
					textColor="var(--teal, #0d9488)"
				/>
			)}
			<DentalLabKanbanCardMenuItem
				icon={<RotateCcw size={14} className="text-rose-600" />}
				label="Отправить на переделку (0 ₽)"
				onClick={() => {
					onRequestWarrantyRework(order);
					onCloseMenu();
				}}
				title="Отправить наряд в ЗТЛ на повторную переделку по гарантии (0 ₽)"
				textColor="var(--bad-fg, #e11d48)"
			/>
		</div>
	);
};
