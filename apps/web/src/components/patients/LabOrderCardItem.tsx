import React from "react";
import {
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	Edit2,
	ExternalLink,
	Eye,
	FileText,
	Layers,
	Printer,
	Sparkles,
} from "lucide-react";
import type { LabOrder } from "./labOrdersTypes";

export interface LabOrderCardItemProps {
	readonly order: LabOrder;
	readonly onOpenPrintOrder?: ((order: LabOrder) => void) | undefined;
	readonly onOpenEditOrder?: ((order: LabOrder) => void) | undefined;
	readonly onOpenTracking?: ((order: LabOrder) => void) | undefined;
	readonly onCopyPortalLink?: ((token: string) => void) | undefined;
	readonly onStatusTransition?: ((orderId: string, nextStatus: string) => void) | undefined;
}

interface StatusMeta {
	label: string;
	className: string;
	nextStatus?: string | undefined;
	nextActionLabel?: string | undefined;
}

function getStatusMeta(status: string): StatusMeta {
	const s = status.toLowerCase();
	switch (s) {
		case "draft":
			return {
				label: "Черновик",
				className: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]",
				nextStatus: "sent",
				nextActionLabel: "Отправить в ЗТЛ",
			};
		case "sent":
		case "sent_to_lab":
			return {
				label: "Отправлен в ЗТЛ",
				className: "bg-[var(--primary-soft,rgba(13,148,136,0.1))] text-[var(--primary,#0d9488)] border-[var(--primary,#0d9488)]/25",
				nextStatus: "in_progress",
				nextActionLabel: "Взять в работу",
			};
		case "in_progress":
		case "processing":
			return {
				label: "В работе в ЗТЛ",
				className: "bg-[var(--warning-soft,rgba(245,158,11,0.12))] text-[var(--warning-ink,#92400e)] border-[var(--warning-line,rgba(245,158,11,0.3))]",
				nextStatus: "received",
				nextActionLabel: "Получен в клинике",
			};
		case "shipped":
		case "fitting":
		case "refitting":
		case "ready_for_fitting":
			return {
				label: "Примерка каркаса / керамики",
				className: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]",
				nextStatus: "received",
				nextActionLabel: "Готов в клинике",
			};
		case "received":
		case "ready_in_clinic":
		case "in_clinic":
			return {
				label: "Готов в клинике",
				className: "bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary,#0d9488)] border-[var(--primary,#0d9488)]/30",
				nextStatus: "completed",
				nextActionLabel: "Сдать пациенту",
			};
		case "completed":
		case "installed":
			return {
				label: "Сдан пациенту",
				className: "bg-[var(--success-soft,rgba(16,185,129,0.14))] text-[var(--success-ink,#065f46)] border-[var(--success-line,rgba(16,185,129,0.3))]",
			};
		case "cancelled":
			return {
				label: "Отменен",
				className: "bg-[var(--danger-soft,rgba(244,63,94,0.12))] text-[var(--danger,#f43f5e)] border-[var(--danger-soft,rgba(244,63,94,0.3))]",
			};
		default:
			return {
				label: status,
				className: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]",
			};
	}
}

export const LabOrderCardItem: React.FC<LabOrderCardItemProps> = ({
	order,
	onOpenPrintOrder,
	onOpenEditOrder,
	onOpenTracking,
	onCopyPortalLink,
	onStatusTransition,
}) => {
	const statusMeta = getStatusMeta(order.status);
	const orderNum = order.orderNumber || order.gostOrderNumber || (order.id ? `#${order.id.slice(0, 6)}` : "ЗТЛ");
	const toothDisplay = order.toothFdi ? `Зуб ${order.toothFdi}` : "Ортопедическая конструкция";
	const formattedDue = order.dueDate ? new Date(order.dueDate).toLocaleDateString("ru-RU") : null;
	const formattedCreated = order.createdAt ? new Date(order.createdAt).toLocaleDateString("ru-RU") : null;

	return (
		<article
			className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3.5 sm:p-4 shadow-xs transition-shadow hover:shadow-sm"
			data-testid={`patient-lab-order-card-${order.id}`}
		>
			{/* Верхняя строка: Номер наряда, статус и дата */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-subtle,rgba(0,0,0,0.06))] pb-2.5">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-mono text-xs font-bold text-[var(--primary,#0d9488)] bg-[var(--primary-soft,rgba(13,148,136,0.1))] px-2 py-0.5 rounded-md border border-[var(--primary,#0d9488)]/20">
						{orderNum}
					</span>
					<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.className}`}>
						{statusMeta.label}
					</span>
					{order.isWarranty && (
						<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--warning-soft,rgba(245,158,11,0.12))] text-[var(--warning-ink,#92400e)] border border-[var(--warning-line,rgba(245,158,11,0.3))]">
							Гарантия
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
					{formattedDue ? (
						<span className="inline-flex items-center gap-1 font-medium text-[var(--ink)]">
							<Calendar className="w-3.5 h-3.5 text-[var(--primary,#0d9488)]" />
							<span>{`Срок: ${formattedDue}`}</span>
						</span>
					) : formattedCreated ? (
						<span className="inline-flex items-center gap-1">
							<Clock className="w-3 h-3 text-[var(--muted)]" />
							<span>{`Создан: ${formattedCreated}`}</span>
						</span>
					) : null}
				</div>
			</div>

			{/* Средний блок: Зубы, материал, цвет VITA и заметки */}
			<div className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
				<div className="space-y-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Layers className="w-4 h-4 text-[var(--primary,#0d9488)] shrink-0" />
							{toothDisplay}
						</span>
						{order.material && (
							<span className="text-xs text-[var(--muted)]">{`• ${order.material}`}</span>
						)}
					</div>

					<div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted)]">
						{order.colorVita && (
							<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-medium text-[var(--ink)]">
								<Sparkles className="w-3 h-3 text-[var(--warning,#f59e0b)]" />
								<span>{`VITA: ${order.colorVita}`}</span>
							</span>
						)}
						{order.doctorName && (
							<span>{`Врач: ${order.doctorName}`}</span>
						)}
						{typeof order.priceRub === "number" && order.priceRub > 0 && (
							<span className="font-semibold text-[var(--ink)]">
								{`${order.priceRub.toLocaleString("ru-RU")} ₽`}
							</span>
						)}
					</div>

					{order.clinicalNotes && (
						<p className="text-xs text-[var(--muted)] line-clamp-1 italic pt-0.5">
							{order.clinicalNotes}
						</p>
					)}
				</div>

				{/* 1-Click быстрый перевод статуса у кресла (Мандат 8e) */}
				{statusMeta.nextStatus && onStatusTransition && (
					<div className="shrink-0 pt-1 sm:pt-0">
						<button
							type="button"
							onClick={() => onStatusTransition(order.id, statusMeta.nextStatus!)}
							className="w-full sm:w-auto min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--primary-soft,rgba(13,148,136,0.1))] text-[var(--primary,#0d9488)] border border-[var(--primary,#0d9488)]/30 hover:border-[var(--primary,#0d9488)] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs"
							title={`Перевести статус наряд-заказа: ${statusMeta.nextActionLabel}`}
						>
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>{statusMeta.nextActionLabel}</span>
							<ChevronRight className="w-3 h-3 opacity-60" />
						</button>
					</div>
				)}
			</div>

			{/* Нижняя строка действий: Печать, Ссылка технику, Таймлайн, Редактировать */}
			<div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-[var(--line-subtle,rgba(0,0,0,0.06))]">
				<div className="flex items-center gap-1.5 flex-wrap">
					{onOpenPrintOrder && (
						<button
							type="button"
							onClick={() => onOpenPrintOrder(order)}
							className="secondary-button min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							title="Печать заказа (Бланк ЗТЛ-1)"
							aria-label="Печать заказа (Бланк ЗТЛ-1)"
						>
							<Printer className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Печать заказа</span>
						</button>
					)}

					{onCopyPortalLink && order.secureToken && (
						<button
							type="button"
							onClick={() => onCopyPortalLink(order.secureToken)}
							className="secondary-button min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							title="Скопировать ссылку для лаборатории"
						>
							<ExternalLink className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span className="hidden sm:inline">Ссылка технику</span>
							<span className="sm:hidden">Технику</span>
						</button>
					)}

					{onOpenTracking && (
						<button
							type="button"
							onClick={() => onOpenTracking(order)}
							className="secondary-button min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							title="Открыть этапы и таймлайн заказа"
						>
							<Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Этапы</span>
						</button>
					)}
				</div>

				{onOpenEditOrder && (
					<button
						type="button"
						onClick={() => onOpenEditOrder(order)}
						className="secondary-button min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer ml-auto"
						title="Редактировать заказ в лабораторию"
					>
						<Edit2 className="w-3 h-3 text-[var(--muted)]" />
						<span>Изменить</span>
					</button>
				)}
			</div>
		</article>
	);
};

export default LabOrderCardItem;
