import { Camera, Eye, MessageSquare, Printer } from "lucide-react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import { DentalLabKanbanCardMenuItem } from "./DentalLabKanbanCardMenuItem";

export interface DentalLabKanbanStandardItemsProps {
	readonly order: DentalLabWorkflowOrder;
	readonly onCloseMenu: () => void;
	readonly onInspectOrder: (order: DentalLabWorkflowOrder) => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAttachBitePhoto: (order: DentalLabWorkflowOrder) => void;
	readonly onTechnicianComment: (order: DentalLabWorkflowOrder) => void;
}

export function DentalLabKanbanStandardItems({
	order,
	onCloseMenu,
	onInspectOrder,
	onPrintBlank,
	onAttachBitePhoto,
	onTechnicianComment,
}: DentalLabKanbanStandardItemsProps) {
	return (
		<>
			<DentalLabKanbanCardMenuItem
				icon={<Printer size={14} className="text-slate-600" />}
				label="Печать наряда (А4)"
				onClick={() => {
					onPrintBlank(order);
					onCloseMenu();
				}}
				title="Распечатать бланк наряда для курьера лаборатории"
				testId={`ztl-card-print-a4-${order.id}`}
			/>
			<DentalLabKanbanCardMenuItem
				icon={<Eye size={14} className="text-teal-600" />}
				label="Детали наряда"
				onClick={() => {
					onInspectOrder(order);
					onCloseMenu();
				}}
				title="Просмотреть детали и спецификацию наряда"
			/>
			<DentalLabKanbanCardMenuItem
				icon={<Camera size={14} className="text-blue-600" />}
				label="Фото прикуса"
				onClick={() => {
					onAttachBitePhoto(order);
					onCloseMenu();
				}}
				title="Прикрепить фотографию окклюзии и прикуса"
			/>
			<DentalLabKanbanCardMenuItem
				icon={<MessageSquare size={14} className="text-amber-600" />}
				label="Комментарий технику"
				onClick={() => {
					onTechnicianComment(order);
					onCloseMenu();
				}}
				title="Написать клинический комментарий технику"
			/>
		</>
	);
}
