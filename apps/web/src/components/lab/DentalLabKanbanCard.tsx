import React from "react";
import {
	AlertTriangle,
	Building2,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
	Eye,
	MoreHorizontal,
	RotateCcw,
	Send,
} from "lucide-react";
import {
	ORTHOPEDIC_WORK_TYPES,
	type DentalLabWorkflowOrder,
	formatRussianDate,
} from "./dentalLabWorkflowEngine";
import { DentalLabKanbanCardMenu } from "./DentalLabKanbanCardMenu";

export type CanonicalKanbanStageId = "draft" | "sent_to_lab" | "in_progress" | "fitting_scheduled" | "ready_in_clinic" | "installed_completed";

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

export interface KanbanCardHeaderProps {
	readonly order: DentalLabWorkflowOrder;
}

export function KanbanCardHeader({ order }: KanbanCardHeaderProps) {
	return (
		<>
			<div className="ztl-card-top-row flex items-center justify-between gap-2">
				<span className="ztl-card-order-num shrink-0">{order.orderNumber}</span>
				<span className="ztl-card-teeth-badge shrink-0">
					• Зубы: {order.selectedTeeth?.join(", ") || order.toothFdi || "челюсть"}
				</span>
			</div>

			{order.isWarrantyRework && (
				<div style={{ marginTop: "4px", fontSize: "10.5px", color: "var(--bad-fg, #e11d48)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
					<RotateCcw size={11} />
					<span className="truncate">
						ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 руб){order.originalOrderNumber ? ` • исх. № ${order.originalOrderNumber}` : ""}
					</span>
				</div>
			)}

			{order.isPartialDelivery && (
				<div style={{ marginTop: "3px", fontSize: "10.5px", color: "var(--teal, #0d9488)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
					<CheckCircle2 size={11} />
					<span className="truncate">
						Частичная поставка: готовы [{order.deliveredTeeth?.join(", ") || order.selectedTeeth?.join(", ") || "—"}]
					</span>
				</div>
			)}

			<h4 className="ztl-card-patient-name min-w-0" title={order.patientName}>
				{order.patientName}
			</h4>

			<p className="ztl-card-doctor min-w-0" title={order.doctorName}>
				{order.doctorName}
			</p>

			<div className="ztl-card-lab-name min-w-0" title={order.labName}>
				<Building2 size={11} className="shrink-0" />
				<span>{order.labName}</span>
			</div>
		</>
	);
}

export interface KanbanCardBodyProps {
	readonly order: DentalLabWorkflowOrder;
	readonly fittingUrgency: FittingUrgencyInfo | null;
	readonly onRescheduleAppointment?: ((order: DentalLabWorkflowOrder) => void) | undefined;
}

export function KanbanCardBody({ order, fittingUrgency, onRescheduleAppointment }: KanbanCardBodyProps) {
	const preset = ORTHOPEDIC_WORK_TYPES[order.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
	const hasDelayAlert = order.isDelayedAlert || order.delayAlert?.isDelayedAlert;

	return (
		<>
			<div className="ztl-card-work-type min-w-0" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", marginTop: "3px" }}>
				<span style={{ fontWeight: 600 }}>{preset.shortNameRu}</span>
				<span style={{ background: "var(--teal-surface, rgba(13, 148, 136, 0.1))", color: "var(--teal, #0d9488)", border: "1px solid var(--teal-soft, rgba(13, 148, 136, 0.3))", padding: "1px 5px", borderRadius: "4px", fontWeight: 700, fontSize: "10.5px" }} data-testid={`ztl-card-shade-${order.id}`}>
					VITA: {order.shadeCode}
				</span>
				{order.translucency && (
					<span style={{ background: "var(--paper-soft, #f1f5f9)", color: "var(--ink, #334155)", border: "1px solid var(--line, #cbd5e1)", padding: "1px 4px", borderRadius: "4px", fontSize: "10px", fontWeight: 600 }} data-testid={`ztl-card-translucency-${order.id}`}>
						{order.translucency}
					</span>
				)}
			</div>

			{hasDelayAlert && (
				<div className="ztl-card-delay-alert-box" style={{ background: "var(--amber-bg, #fef3c7)", border: "1px solid var(--amber-soft, #fde68a)", borderRadius: "8px", padding: "7px 9px", marginTop: "5px" }} data-testid={`ztl-card-delay-alert-${order.id}`}>
					<div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--amber-fg, #b45309)", fontWeight: 700, fontSize: "11px" }}>
						<RotateCcw size={12} className="shrink-0 text-amber-600" />
						<span className="truncate">{order.delayAlert?.alertMessageRu || "Задерживается лабораторией"}</span>
					</div>
					{onRescheduleAppointment && (
						<button type="button" onClick={(e) => { e.stopPropagation(); onRescheduleAppointment(order); }} className="secondary-button ztl-delay-reschedule-btn" style={{ marginTop: "4px", backgroundColor: "#d97706", color: "#fff", border: "none", fontWeight: 700, fontSize: "10.5px", padding: "3px 8px", borderRadius: "5px", cursor: "pointer" }} data-testid={`ztl-delay-reschedule-btn-${order.id}`}>
							<Calendar size={11} /><span>Перенести запись</span>
						</button>
					)}
				</div>
			)}

			{fittingUrgency && (
				<div className={`ztl-card-urgency-badge ztl-urgency-${fittingUrgency.severity}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 8px", borderRadius: "6px", fontSize: "10.5px", fontWeight: 700, marginTop: "4px" }} data-testid={`ztl-card-fitting-urgency-${order.id}`}>
					{fittingUrgency.severity === "critical" ? <AlertTriangle size={12} className="shrink-0" /> : <Clock size={12} className="shrink-0" />}
					<span className="truncate">{fittingUrgency.text}</span>
				</div>
			)}

			<div className="ztl-card-dates-row flex items-center justify-between gap-2 flex-wrap">
				<span className="shrink-0">Срок: <strong>{formatRussianDate(order.expectedLabDateIso)}</strong></span>
				<span className="shrink-0">• Примерка: <strong>{order.fittingDate ? formatRussianDate(order.fittingDate) : order.scheduledVisitDateIso ? formatRussianDate(order.scheduledVisitDateIso) : "—"}</strong></span>
			</div>

			<div className="ztl-card-price-row flex items-center justify-between gap-2">
				<span style={order.isWarrantyRework ? { color: "var(--teal, #10b981)", fontWeight: 700 } : undefined} className="shrink-0">
					{order.isWarrantyRework
						? "0 руб. (Гарантия)"
						: `${(order.financials?.patientPriceTotalRub ?? order.priceRub ?? 0).toLocaleString("ru-RU")} руб.`}
				</span>
				<span style={{ color: "var(--muted, #64748b)", fontSize: "10.5px" }} className="shrink-0">
					• Себест: {(order.financials?.labCostTotalRub ?? Math.round((order.priceRub ?? 0) * 0.4)).toLocaleString("ru-RU")} руб.
				</span>
			</div>
		</>
	);
}

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
				className={`secondary-button dente-btn-secondary ztl-btn-card-action flex-1 px-1.5 text-[11px] font-semibold min-h-[44px] sm:min-h-[30px] border border-[var(--line)] hover:border-teal-600/40 bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] hover:text-teal-700 dark:hover:text-teal-300 transition-colors inline-flex items-center justify-center gap-1.5 rounded-lg ${columnId === "installed_completed" ? "font-bold text-emerald-600 dark:text-emerald-400" : ""}`}
				onClick={(e) => { e.stopPropagation(); columnId === "installed_completed" ? onInspectOrder(order) : onAdvanceStage(order); }}
				title={advanceTitle}
				data-testid={`ztl-card-status-${order.id}`}
			>
				<AdvanceIcon size={13} className="shrink-0 text-teal-600 dark:text-teal-400" /><span>{advanceLabel}</span>
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

/**
 * Карточка наряда канбан-доски ЗТЛ (Мандат 8b: Sweet Spot монолит 200-280 строк).
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
