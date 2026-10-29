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
	nextStatus?: string;
	nextActionLabel?: string;
}

function getStatusMeta(status: string): StatusMeta {
	const s = status.toLowerCase();
	switch (s) {
		case "draft":
			return {
				label: "Черновик",
				className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
				nextStatus: "sent",
				nextActionLabel: "Отправить в ЗТЛ",
			};
		case "sent":
		case "sent_to_lab":
			return {
				label: "Отправлен в ЗТЛ",
				className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
				nextStatus: "in_progress",
				nextActionLabel: "Взять в работу",
			};
		case "in_progress":
		case "processing":
			return {
				label: "В работе в ЗТЛ",
				className: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
				nextStatus: "refitting",
				nextActionLabel: "На примерку",
			};
		case "shipped":
		case "fitting":
		case "refitting":
		case "ready_for_fitting":
			return {
				label: "Примерка каркаса / керамики",
				className: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
				nextStatus: "received",
				nextActionLabel: "Готов в клинике",
			};
		case "received":
		case "ready_in_clinic":
		case "in_clinic":
			return {
				label: "Готов в клинике",
				className: "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
				nextStatus: "completed",
				nextActionLabel: "Сдать пациенту",
			};
		case "completed":
		case "installed":
			return {
				label: "Сдан пациенту",
				className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
			};
		case "cancelled":
			return {
				label: "Отменен",
				className: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
			};
		default:
			return {
				label: status,
				className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
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
					<span className="font-mono text-xs font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,#f0fdfa)] px-2 py-0.5 rounded-md border border-[var(--teal,#0d9488)]/20">
						{orderNum}
					</span>
					<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.className}`}>
						{statusMeta.label}
					</span>
					{order.isWarranty && (
						<span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
							Гарантия
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
					{formattedDue ? (
						<span className="inline-flex items-center gap-1 font-medium text-[var(--ink)]">
							<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
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
							<Layers className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
							{toothDisplay}
						</span>
						{order.material && (
							<span className="text-xs text-[var(--muted)]">{`• ${order.material}`}</span>
						)}
					</div>

					<div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted)]">
						{order.colorVita && (
							<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-medium text-[var(--ink)]">
								<Sparkles className="w-3 h-3 text-amber-500" />
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
							className="w-full sm:w-auto min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 hover:border-[var(--teal,#0d9488)] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs"
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
							title="Распечатать бланк наряд-заказа ЗТЛ-1"
						>
							<Printer className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Бланк ЗТЛ-1</span>
						</button>
					)}

					{onCopyPortalLink && order.secureToken && (
						<button
							type="button"
							onClick={() => onCopyPortalLink(order.secureToken)}
							className="secondary-button min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							title="Скопировать ссылку для зуботехнической лаборатории"
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
							title="Открыть этапы и таймлайн наряда ЗТЛ"
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
						title="Редактировать наряд в ЗТЛ"
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
