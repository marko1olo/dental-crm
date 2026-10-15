/**
 * DentalLabKanbanCardMenu.tsx — Вторичное контекстное меню карточки ЗТЛ (Miller Menu).
 * Включает: Печать наряда (А4), Детали наряда, Фото прикуса, Комментарий технику,
 * Повторная примерка, Перенос визита, Частичная сдача, Рекламация (0 ₽).
 */

import React from "react";
import {
	Calendar,
	CheckCircle2,
	Eye,
	RotateCcw,
	Printer,
	Camera,
	MessageSquare,
} from "lucide-react";
import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import type { CanonicalKanbanStageId } from "./DentalLabKanbanCard";

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
	readonly onRescheduleAppointment?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly onPartialDelivery?: ((order: DentalLabWorkflowOrder) => void) | undefined;
}

export const DentalLabKanbanCardMenu: React.FC<DentalLabKanbanCardMenuProps> = ({
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
		if (onRescheduleAppointment) {
			onRescheduleAppointment(order);
		} else if (typeof window !== "undefined") {
			const rescheduleDraft = {
				patientId: order.patientId,
				patientName: order.patientName,
				orderNumber: order.orderNumber,
				dueDate: order.expectedLabDateIso,
				reason: "Перенос приема из-за задержки лаборатории",
			};
			try {
				window.localStorage.setItem(
					"dente_schedule_quick_booking_draft",
					JSON.stringify(rescheduleDraft),
				);
				window.dispatchEvent(
					new CustomEvent("dente-open-quick-booking", {
						detail: rescheduleDraft,
					}),
				);
				window.location.hash = "#schedule";
			} catch {
				// ignore
			}
		}
	};

	return (
		<div
			style={{
				position: "absolute",
				right: 0,
				bottom: "calc(100% + 4px)",
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				boxShadow: "0 10px 25px -5px rgba(0,0,0,0.18)",
				padding: "4px",
				zIndex: 50,
				minWidth: "210px",
				display: "flex",
				flexDirection: "column",
				gap: "2px",
			}}
			role="menu"
			onClick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 10px",
					borderRadius: "6px",
					border: "none",
					background: "transparent",
					color: "var(--ink, #0f172a)",
					fontSize: "12px",
					fontWeight: 500,
					cursor: "pointer",
					width: "100%",
					textAlign: "left",
					minHeight: "36px",
				}}
				onClick={() => {
					onPrintBlank(order);
					onCloseMenu();
				}}
				title="Распечатать бланк наряда для курьера лаборатории"
				role="menuitem"
				data-testid={`ztl-card-print-a4-${order.id}`}
			>
				<Printer size={14} className="shrink-0 text-slate-600" />
				<span>Печать наряда (А4)</span>
			</button>

			<button
				type="button"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 10px",
					borderRadius: "6px",
					border: "none",
					background: "transparent",
					color: "var(--ink, #0f172a)",
					fontSize: "12px",
					fontWeight: 500,
					cursor: "pointer",
					width: "100%",
					textAlign: "left",
					minHeight: "36px",
				}}
				onClick={() => {
					onInspectOrder(order);
					onCloseMenu();
				}}
				title="Просмотреть детали и спецификацию наряда"
				role="menuitem"
			>
				<Eye size={14} className="shrink-0 text-teal-600" />
				<span>Детали наряда</span>
			</button>

			<button
				type="button"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 10px",
					borderRadius: "6px",
					border: "none",
					background: "transparent",
					color: "var(--ink, #0f172a)",
					fontSize: "12px",
					fontWeight: 500,
					cursor: "pointer",
					width: "100%",
					textAlign: "left",
					minHeight: "36px",
				}}
				onClick={() => {
					onAttachBitePhoto(order);
					onCloseMenu();
				}}
				title="Прикрепить фотографию окклюзии и прикуса"
				role="menuitem"
			>
				<Camera size={14} className="shrink-0 text-blue-600" />
				<span>Фото прикуса</span>
			</button>

			<button
				type="button"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 10px",
					borderRadius: "6px",
					border: "none",
					background: "transparent",
					color: "var(--ink, #0f172a)",
					fontSize: "12px",
					fontWeight: 500,
					cursor: "pointer",
					width: "100%",
					textAlign: "left",
					minHeight: "36px",
				}}
				onClick={() => {
					onTechnicianComment(order);
					onCloseMenu();
				}}
				title="Написать клинический комментарий технику"
				role="menuitem"
			>
				<MessageSquare size={14} className="shrink-0 text-amber-600" />
				<span>Комментарий технику</span>
			</button>

			{columnId === "fitting_scheduled" && (
				<button
					type="button"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						padding: "8px 10px",
						borderRadius: "6px",
						border: "none",
						background: "transparent",
						color: "var(--ink, #0f172a)",
						fontSize: "12px",
						fontWeight: 500,
						cursor: "pointer",
						width: "100%",
						textAlign: "left",
						minHeight: "36px",
					}}
					onClick={() => {
						onRepeatFitting(order);
						onCloseMenu();
					}}
					title="Назначить повторную примерку в расписании"
					role="menuitem"
				>
					<Calendar size={14} className="shrink-0 text-indigo-600" />
					<span>Повторная примерка</span>
				</button>
			)}

			<button
				type="button"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 10px",
					borderRadius: "6px",
					border: "none",
					background: "transparent",
					color: "#d97706",
					fontSize: "12px",
					fontWeight: 600,
					cursor: "pointer",
					width: "100%",
					textAlign: "left",
					minHeight: "36px",
				}}
				onClick={handleReschedule}
				title="Перейти к записи пациента для переноса визита"
				role="menuitem"
				data-testid={`ztl-card-reschedule-${order.id}`}
			>
				<Calendar size={14} className="shrink-0 text-amber-600" />
				<span>Перенести запись (задержка лаборатории)</span>
			</button>

			{order.selectedTeeth.length > 1 && (
				<button
					type="button"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						padding: "8px 10px",
						borderRadius: "6px",
						border: "none",
						background: "transparent",
						color: "var(--teal, #0d9488)",
						fontSize: "12px",
						fontWeight: 600,
						cursor: "pointer",
						width: "100%",
						textAlign: "left",
						minHeight: "36px",
					}}
					onClick={() => {
						onCloseMenu();
						if (onPartialDelivery) {
							onPartialDelivery(order);
						} else {
							onRequestWarrantyRework(order);
						}
					}}
					title="Оформить частичную приемку и гарантийную переделку дефектной единицы (0 руб)"
					role="menuitem"
					data-testid={`ztl-card-partial-delivery-${order.id}`}
				>
					<CheckCircle2 size={14} className="shrink-0 text-teal-600" />
					<span>Частичная сдача / Рекламация (0 руб)</span>
				</button>
			)}

			<button
				type="button"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 10px",
					borderRadius: "6px",
					border: "none",
					background: "transparent",
					color: "var(--bad-fg, #e11d48)",
					fontSize: "12px",
					fontWeight: 500,
					cursor: "pointer",
					width: "100%",
					textAlign: "left",
					minHeight: "36px",
				}}
				onClick={() => {
					onRequestWarrantyRework(order);
					onCloseMenu();
				}}
				title="Оформить гарантийную переделку / рекламацию"
				role="menuitem"
			>
				<RotateCcw size={14} className="shrink-0 text-rose-600" />
				<span>Рекламация (0 руб)</span>
			</button>
		</div>
	);
};
