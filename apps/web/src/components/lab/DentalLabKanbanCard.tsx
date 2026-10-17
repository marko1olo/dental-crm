/**
 * DentalLabKanbanCard.tsx — Каноническая карточка наряда ЗТЛ для канбан-доски.
 * Строго 2 кнопки прямого действия («Открыть» + «Сменить статус»),
 * вторичные действия в меню «...» (Печать А4, Фото прикуса, Комментарий технику, Рекламация).
 */

import React from "react";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	Eye,
	Building2,
	RotateCcw,
	Send,
	ChevronRight,
	MoreHorizontal,
	Sparkles,
} from "lucide-react";
import {
	ORTHOPEDIC_WORK_TYPES,
	type DentalLabWorkflowOrder,
	formatRussianDate,
} from "./dentalLabWorkflowEngine";
import {
	ABUTMENT_TYPE_OPTIONS,
	LAB_TECHNOLOGICAL_STAGES,
} from "./orders/labWorkOrderPresets";
import { DentalLabKanbanCardMenu } from "./DentalLabKanbanCardMenu";

export type CanonicalKanbanStageId =
	| "draft"
	| "sent_to_lab"
	| "fitting_scheduled"
	| "installed_completed";

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

function getPluralDaysRu(count: number): string {
	const abs = Math.abs(count);
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod100 >= 11 && mod100 <= 19) return "дней";
	if (mod10 === 1) return "день";
	if (mod10 >= 2 && mod10 <= 4) return "дня";
	return "дней";
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

	if (diffDays < 0) {
		const overdueDays = Math.abs(diffDays);
		return {
			text: `Примерка просрочена на ${overdueDays} ${getPluralDaysRu(overdueDays)} • ${dateFormatted}`,
			severity: "critical",
		};
	}
	if (diffDays === 0) {
		return {
			text: `Примерка сегодня! • ${dateFormatted}`,
			severity: "critical",
		};
	}
	if (diffDays === 1) {
		return {
			text: `Примерка завтра • ${dateFormatted}`,
			severity: "warning",
		};
	}
	if (diffDays <= 3) {
		return {
			text: `Примерка через ${diffDays} ${getPluralDaysRu(diffDays)} • ${dateFormatted}`,
			severity: "warning",
		};
	}
	return {
		text: `Примерка через ${diffDays} ${getPluralDaysRu(diffDays)} • ${dateFormatted}`,
		severity: "normal",
	};
}

export const DentalLabKanbanCard: React.FC<DentalLabKanbanCardProps> = ({
	order,
	columnId,
	isMenuOpen,
	onToggleMenu,
	onCloseMenu,
	onInspectOrder,
	onAdvanceStage,
	onPrintBlank,
	onAttachBitePhoto,
	onTechnicianComment,
	onRepeatFitting,
	onRequestWarrantyRework,
	onRescheduleAppointment,
	onPartialDelivery,
}) => {
	const isDelayedStage =
		(order as any).currentStage === "delayed" ||
		(order as any).status === "delayed";
	const hasDelay =
		isDelayedStage ||
		order.isDelayedAlert ||
		order.delayAlert?.isDelayedAlert ||
		order.delayAlert?.status === "OVERDUE" ||
		order.delayAlert?.status === "VISIT_CONFLICT";

	const preset =
		ORTHOPEDIC_WORK_TYPES[order.workTypeId] ||
		ORTHOPEDIC_WORK_TYPES.crown_emax;

	const fittingUrgency = getFittingUrgencyInfo(order);

	let advanceLabel = "Далее";
	let advanceTitle = "Передвинуть на следующий клинический статус";
	let AdvanceIcon = ChevronRight;

	if (columnId === "draft") {
		advanceLabel = "В работу";
		advanceTitle = "Передать наряд в работу технику в лабораторию";
		AdvanceIcon = Send;
	} else if (columnId === "sent_to_lab") {
		advanceLabel = "В клинику";
		advanceTitle = "Конструкция готова и доставлена в клинику";
		AdvanceIcon = CheckCircle2;
	} else if (columnId === "fitting_scheduled") {
		advanceLabel = "Сдать";
		advanceTitle = "Зафиксировать и сдать работу пациенту";
		AdvanceIcon = Sparkles;
	} else if (columnId === "installed_completed") {
		advanceLabel = "Сдано";
		advanceTitle = "Работа зафиксирована и сдана пациенту";
		AdvanceIcon = CheckCircle2;
	}

	return (
		<article
			className={`ztl-order-card ${hasDelay ? "has-delay-alert" : ""}`}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: "1px 64px",
				contain: "content",
				cursor: "grab",
			}}
			onClick={() => onInspectOrder(order)}
			draggable={true}
			onDragStart={(e) => {
				e.dataTransfer.setData("text/plain", order.id);
				e.dataTransfer.effectAllowed = "move";
			}}
		>
			<div className="ztl-card-top-row">
				<span className="ztl-card-order-num">{order.orderNumber}</span>
				<span className="ztl-card-teeth-badge">
					Зубы: {order.selectedTeeth.join(", ")}
				</span>
			</div>

			{order.isWarrantyRework && (
				<div
					style={{
						marginTop: "4px",
						fontSize: "10.5px",
						color: "var(--bad-fg, #e11d48)",
						fontWeight: 700,
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<RotateCcw size={11} />
					<span className="truncate">
						ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 руб)
						{order.originalOrderNumber ? ` • исх. № ${order.originalOrderNumber}` : ""}
					</span>
				</div>
			)}

			{(order as any).isPartialDelivery && (
				<div
					style={{
						marginTop: "3px",
						fontSize: "10.5px",
						color: "var(--teal, #0d9488)",
						fontWeight: 700,
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<CheckCircle2 size={11} />
					<span className="truncate">
						Частичная поставка: готовы [
						{(order as any).deliveredTeeth?.join(", ") || order.selectedTeeth.join(", ")}
						]
					</span>
				</div>
			)}

			<h4 className="ztl-card-patient-name min-w-0" title={order.patientName}>
				{order.patientName}
			</h4>

			<p className="ztl-card-doctor min-w-0" title={order.doctorName}>
				{order.doctorName}
			</p>

			{/* Расцветка VITA & оптика */}
			<div
				className="ztl-card-work-type min-w-0"
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					gap: "4px",
					marginTop: "3px",
				}}
				title={`${preset.shortNameRu} • VITA: ${order.shadeCode}`}
			>
				<span style={{ fontWeight: 600 }}>{preset.shortNameRu}</span>
				<span
					style={{
						background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
						color: "var(--teal, #0d9488)",
						border: "1px solid var(--teal-soft, rgba(13, 148, 136, 0.3))",
						padding: "1px 5px",
						borderRadius: "4px",
						fontWeight: 700,
						fontSize: "10.5px",
					}}
					data-testid={`ztl-card-shade-${order.id}`}
				>
					VITA: {order.shadeCode}
				</span>
				{order.translucency && (
					<span
						style={{
							background: "var(--paper-soft, #f1f5f9)",
							color: "var(--ink, #334155)",
							border: "1px solid var(--line, #cbd5e1)",
							padding: "1px 4px",
							borderRadius: "4px",
							fontSize: "10px",
							fontWeight: 600,
						}}
						title="Прозрачность режущего края"
						data-testid={`ztl-card-translucency-${order.id}`}
					>
						{order.translucency}
					</span>
				)}
				{((order as any).mamelons ||
					(order as any).opalescence ||
					(order as any).calcifications) && (
					<span
						style={{
							background: "#ede9fe",
							color: "#6d28d9",
							border: "1px solid #ddd6fe",
							padding: "1px 4px",
							borderRadius: "4px",
							fontSize: "10px",
							fontWeight: 600,
						}}
						title={[
							(order as any).mamelons ? "Мамелоны" : "",
							(order as any).opalescence ? "Опалесценция" : "",
							(order as any).calcifications ? "Кальцификаты" : "",
						]
							.filter(Boolean)
							.join(" • ")}
						data-testid={`ztl-card-effects-${order.id}`}
					>
						{(order as any).opalescence && (order as any).mamelons
							? "Мамелоны+Опалесц."
							: (order as any).mamelons
								? "Мамелоны"
								: (order as any).opalescence
									? "Опалесценция"
									: "Кальцификаты"}
					</span>
				)}
				{(order as any).stumpShadeCode && (
					<span
						style={{
							background: "#fef3c7",
							color: "#92400e",
							border: "1px solid #fde68a",
							padding: "1px 4px",
							borderRadius: "4px",
							fontSize: "10px",
							fontWeight: 600,
						}}
						title="Цвет культи зуба (IPS Natural Die)"
						data-testid={`ztl-card-stump-${order.id}`}
					>
						{(order as any).stumpShadeCode}
					</span>
				)}
			</div>

			<div className="ztl-card-lab-name min-w-0" title={order.labName}>
				<Building2 size={11} className="shrink-0" />
				<span>{order.labName}</span>
			</div>

			{/* Технологический этап ЗТЛ */}
			<div
				style={{
					marginTop: "4px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "6px",
				}}
			>
				<span
					style={{
						fontSize: "10.5px",
						fontWeight: 700,
						color:
							LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]
								?.colorToken || "var(--teal, #3b82f6)",
						background: "var(--teal-surface, rgba(59, 130, 246, 0.08))",
						padding: "2px 6px",
						borderRadius: "4px",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
					className="truncate min-w-0"
					title={`Этап ${
						LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber || 1
					} из 8: ${
						LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]
							?.departmentRu || ""
					}`}
				>
					<span className="shrink-0">
						Этап {LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber || 1}/8:
					</span>
					<span className="truncate">
						{LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.shortTitleRu ||
							order.techStage}
					</span>
				</span>
			</div>

			{/* Платформа имплантата / Абатмент / Фиксация */}
			{(order.implantPlatform || order.abutmentType || order.fixationType) && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "4px",
						marginTop: "4px",
						fontSize: "10px",
					}}
				>
					{order.implantPlatform && (
						<span
							style={{
								background: "var(--paper-soft, #e0f2fe)",
								color: "var(--teal, #0369a1)",
								border: "1px solid var(--line, #bae6fd)",
								padding: "1px 5px",
								borderRadius: "3px",
								fontWeight: 600,
							}}
						>
							{order.implantPlatform === "conical" ? "Конус Морзе" : "Hex"}
						</span>
					)}
					{order.abutmentType && (
						<span
							style={{
								background: "var(--paper-soft, #f3e8ff)",
								color: "var(--ink, #6b21a8)",
								border: "1px solid var(--line, #e9d5ff)",
								padding: "1px 5px",
								borderRadius: "3px",
								fontWeight: 600,
							}}
						>
							{ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)?.nameRu.split(" ")[0] ||
								order.abutmentType}
						</span>
					)}
					{order.fixationType && (
						<span
							style={{
								background: "var(--paper-soft, #fef3c7)",
								color: "var(--amber-fg, #92400e)",
								border: "1px solid var(--line, #fde68a)",
								padding: "1px 5px",
								borderRadius: "3px",
								fontWeight: 600,
							}}
						>
							{order.fixationType === "screw_retained" ? "Винтовая" : "Цементная"}
						</span>
					)}
				</div>
			)}

			{/* 1-Click Delay Alert */}
			{hasDelay && (
				<div
					className="ztl-card-alert-badge ztl-delay-amber-badge"
					role="alert"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "5px",
						backgroundColor: "rgba(245, 158, 11, 0.12)",
						border: "1px solid rgba(245, 158, 11, 0.45)",
						borderRadius: "8px",
						padding: "7px 9px",
						marginTop: "5px",
					}}
					data-testid={`ztl-card-delay-alert-${order.id}`}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "5px",
							color: "var(--amber-fg, #b45309)",
							fontWeight: 700,
							fontSize: "11px",
						}}
					>
						<RotateCcw size={12} className="shrink-0 text-amber-600" />
						<span className="truncate">
							{order.delayAlert?.alertMessageRu ||
								"Задерживается лабораторией. Требуется перенос визита."}
						</span>
					</div>
					<button
						type="button"
						className="secondary-button ztl-btn-card-action ztl-delay-reschedule-btn"
						style={{
							alignSelf: "flex-start",
							backgroundColor: "#d97706",
							color: "#ffffff",
							border: "none",
							fontWeight: 700,
							fontSize: "10.5px",
							padding: "3px 8px",
							borderRadius: "5px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
						}}
						onClick={(e) => {
							e.stopPropagation();
							if (onRescheduleAppointment) {
								onRescheduleAppointment(order);
							} else if (typeof window !== "undefined") {
								const rescheduleDraft = {
									patientId: order.patientId,
									patientName: order.patientName,
									orderNumber: order.orderNumber,
									dueDate: order.expectedLabDateIso,
									reason: "Перенос приёма из-за задержки лаборатории",
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
						}}
						data-testid={`ztl-delay-reschedule-btn-${order.id}`}
						title="Перейти к записи пациента в расписании для переноса"
					>
						<Calendar size={11} />
						<span>Перенести запись</span>
					</button>
				</div>
			)}

			{/* Подсветка срочности примерки: Примерка через N дн. • [Дата] */}
			{fittingUrgency && (
				<div
					className={`ztl-card-urgency-badge ztl-urgency-${fittingUrgency.severity}`}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
						padding: "4px 8px",
						borderRadius: "6px",
						fontSize: "10.5px",
						fontWeight: 700,
						marginTop: "4px",
						...(fittingUrgency.severity === "critical"
							? {
									background: "var(--bad-bg, rgba(239, 68, 68, 0.1))",
									color: "var(--bad-fg, #e11d48)",
									border: "1px solid var(--bad-fg, rgba(239, 68, 68, 0.35))",
								}
							: fittingUrgency.severity === "warning"
								? {
										background: "rgba(245, 158, 11, 0.12)",
										color: "var(--amber-fg, #b45309)",
										border: "1px solid rgba(245, 158, 11, 0.45)",
									}
								: {
										background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
										color: "var(--teal, #0d9488)",
										border: "1px solid var(--teal-soft, rgba(13, 148, 136, 0.3))",
									}),
					}}
					data-testid={`ztl-card-fitting-urgency-${order.id}`}
				>
					{fittingUrgency.severity === "critical" ? (
						<AlertTriangle size={12} className="shrink-0" />
					) : (
						<Clock size={12} className="shrink-0" />
					)}
					<span className="truncate">{fittingUrgency.text}</span>
				</div>
			)}

			{/* Даты готовности и примерки */}
			<div className="ztl-card-dates-row">
				<span title="Срок готовности из лаборатории">
					Срок: <strong>{formatRussianDate(order.expectedLabDateIso)}</strong>
				</span>
				<span title="Дата назначенной примерки в расписании">
					Примерка:{" "}
					<strong>
						{order.fittingDate
							? formatRussianDate(order.fittingDate)
							: order.scheduledVisitDateIso
								? formatRussianDate(order.scheduledVisitDateIso)
								: "—"}
					</strong>
				</span>
			</div>

			{/* Финансы */}
			<div className="ztl-card-price-row">
				<span
					title="Стоимость для пациента"
					style={
						order.isWarrantyRework
							? { color: "var(--teal, #10b981)", fontWeight: 700 }
							: undefined
					}
				>
					{order.isWarrantyRework
						? "0 руб (Гарантия)"
						: `${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} руб`}
				</span>
				<span
					style={{ color: "var(--muted, #64748b)", fontSize: "10px" }}
					title="Себестоимость лаборатории"
				>
					Себест: {order.financials.labCostTotalRub.toLocaleString("ru-RU")} руб
				</span>
			</div>

			{/* Кнопки действий: Открыть + Статус + Меню ... */}
			<div
				className="ztl-card-actions-row"
				style={{ display: "flex", alignItems: "center", gap: "6px" }}
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					className="secondary-button ztl-btn-card-action min-h-[36px] sm:min-h-0"
					onClick={(e) => {
						e.stopPropagation();
						onInspectOrder(order);
					}}
					title="Открыть спецификацию и детали наряда в дравере"
					data-testid={`ztl-card-open-${order.id}`}
				>
					<Eye size={13} />
					<span>Открыть</span>
				</button>

				{columnId === "installed_completed" ? (
					<button
						type="button"
						className="secondary-button ztl-btn-card-action min-h-[36px] sm:min-h-0"
						style={{
							color: "var(--teal, #059669)",
							borderColor: "var(--teal-soft, #a7f3d0)",
							background: "var(--teal-surface, rgba(16, 185, 129, 0.08))",
							fontWeight: 700,
						}}
						onClick={(e) => {
							e.stopPropagation();
							onInspectOrder(order);
						}}
						title={advanceTitle}
						data-testid={`ztl-card-status-${order.id}`}
					>
						<CheckCircle2 size={13} />
						<span>{advanceLabel}</span>
					</button>
				) : (
					<button
						type="button"
						className="primary-button ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
						onClick={(e) => {
							e.stopPropagation();
							onAdvanceStage(order);
						}}
						title={advanceTitle}
						data-testid={`ztl-card-status-${order.id}`}
					>
						<AdvanceIcon size={13} />
						<span>{advanceLabel}</span>
					</button>
				)}

				{/* Меню вторичных действий (...) */}
				<div style={{ position: "relative", flexShrink: 0 }}>
					<button
						type="button"
						className="icon-button ztl-btn-card-action min-h-[36px] sm:min-h-0 px-2"
						style={{ minWidth: "32px", padding: "0 6px", flex: "none" }}
						onClick={(e) => {
							e.stopPropagation();
							onToggleMenu(e);
						}}
						title="Вторичные действия (Печать А4, фото прикуса, комментарий технику, рекламация)"
						aria-expanded={isMenuOpen}
						data-testid={`ztl-card-menu-btn-${order.id}`}
					>
						<MoreHorizontal size={13} />
					</button>

					{isMenuOpen && (
						<DentalLabKanbanCardMenu
							order={order}
							columnId={columnId}
							onCloseMenu={onCloseMenu}
							onInspectOrder={onInspectOrder}
							onPrintBlank={onPrintBlank}
							onAttachBitePhoto={onAttachBitePhoto}
							onTechnicianComment={onTechnicianComment}
							onRepeatFitting={onRepeatFitting}
							onRequestWarrantyRework={onRequestWarrantyRework}
							onRescheduleAppointment={onRescheduleAppointment}
							onPartialDelivery={onPartialDelivery}
						/>
					)}
				</div>
			</div>
		</article>
	);
};
