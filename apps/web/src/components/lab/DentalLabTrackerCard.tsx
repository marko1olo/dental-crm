import React from "react";
import {
	AlertOctagon,
	CalendarCheck,
	ChevronRight,
	MoreHorizontal,
	Printer,
	RotateCcw,
} from "lucide-react";
import {
	type DentalLabOrderRecord,
	DENTAL_LAB_CONSTRUCTIONS,
	DENTAL_LAB_STATUSES,
	detectLabDeadlineAlert,
	formatFdiTeethDisplay,
	formatRuDate,
	getNextLabStatus,
} from "./dentalLabOrderEngine";
import { money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export interface DentalLabTrackerCardProps {
	readonly order: DentalLabOrderRecord;
	readonly openActionMenuId: string | null;
	readonly setOpenActionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly handleOpenReadyInClinicPrompt: (order: DentalLabOrderRecord) => void;
	readonly handleAdvanceStatus: (orderId: string) => void;
	readonly handleOpenEditOrder: (order: DentalLabOrderRecord) => void;
	readonly handleWarrantyRework: (orderId: string) => void;
}

export const DentalLabTrackerCard: React.FC<DentalLabTrackerCardProps> = ({
	order,
	openActionMenuId,
	setOpenActionMenuId,
	handleOpenReadyInClinicPrompt,
	handleAdvanceStatus,
	handleOpenEditOrder,
	handleWarrantyRework,
}) => {
	const stDef = DENTAL_LAB_STATUSES[order.status];
	const construction = DENTAL_LAB_CONSTRUCTIONS[order.constructionType];
	const nextStatus = getNextLabStatus(order.status);
	const alert = detectLabDeadlineAlert({
		status: order.status,
		deadlineDate: order.deadlineDate,
		scheduledVisitDate: order.scheduledVisitDate,
		patientName: order.patientName,
		toothNotation: formatFdiTeethDisplay(order.teethFdi),
	});

	return (
		<div
			className="bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-teal-500/50 rounded-xl p-3 shadow-2xs transition-all flex flex-col justify-between gap-2.5 relative group"
		>
			{/* Верхняя строка карточки: Номер, зубы FDI и Статус */}
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="flex items-center gap-1.5">
						<span className="font-mono font-bold text-xs text-[var(--ink,#0f172a)]">
							{order.orderNumber}
						</span>
						{order.isWarrantyRemake && (
							<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
								Гарантия 0 ₽
							</span>
						)}
					</div>
					<div className="text-[11px] font-mono text-teal-700 dark:text-teal-300 font-bold mt-0.5">
						Зуб: #{formatFdiTeethDisplay(order.teethFdi)}
					</div>
				</div>

				{/* Бейдж статуса */}
				<span
					className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${stDef.badgeClass}`}
				>
					{stDef.shortLabelRu}
				</span>
			</div>

			{/* Инфо: Пациент и Врач */}
			<div className="text-xs space-y-0.5">
				<div className="font-bold text-[var(--ink,#0f172a)] truncate">
					{order.patientName}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
					{order.doctorName}
				</div>
			</div>

			{/* Конструкция, Материал, Цвет VITA */}
			<div className="p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] text-[11px] space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-[var(--muted,#64748b)]">Вид:</span>
					<span className="font-bold text-[var(--ink,#0f172a)] truncate">
						{construction?.shortNameRu || order.constructionType}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[var(--muted,#64748b)]">VITA:</span>
					<span className="font-bold font-mono text-teal-700 dark:text-teal-300">
						{order.vitaShade}
						{order.translucency ? ` (${order.translucency})` : ""}
						{order.stumpShade ? ` • Культя: ${order.stumpShade}` : ""}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[var(--muted,#64748b)]">Лаб:</span>
					<span className="truncate text-[var(--ink,#0f172a)] font-medium">
						{order.labName}
					</span>
				</div>
			</div>

			{/* Даты: Отправка, Дедлайн, Дата визита */}
			<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] pt-0.5">
				<span>Отпр: {formatRuDate(order.sentDate)}</span>
				<span className="font-bold text-[var(--ink,#0f172a)]">
					Срок: {formatRuDate(order.deadlineDate)}
				</span>
			</div>

			{/* Алерт дедлайна (если есть) */}
			{alert.hasAlert && (
				<div
					className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
						alert.severity === "CRITICAL_TODAY"
							? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
							: alert.severity === "OVERDUE"
							? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
							: "bg-teal-500/10 text-teal-800 dark:text-teal-300"
					}`}
				>
					<AlertOctagon className="w-3 h-3 shrink-0" />
					<span className="truncate">{alert.badgeTextRu}</span>
				</div>
			)}

			{/* Финансы: Выручка и ЗТЛ себестоимость */}
			<div className="pt-1.5 border-t border-[var(--line,#cbd5e1)] flex items-center justify-between text-[11px] font-mono">
				<span className="text-[var(--muted,#64748b)]">
					Пациент: <strong>{money(order.patientPriceKopecks / 100)}</strong>
				</span>
				<span className="text-rose-600 dark:text-rose-400 font-bold">
					ЗТЛ: {money(order.ztlCostKopecks / 100)}
				</span>
			</div>

			{/* Нижняя панель действий (Закон Миллера: ровно 2 прямых действия + «...») */}
			<div className="pt-2 border-t border-[var(--line,#cbd5e1)] flex items-center justify-between gap-1.5">
				<div className="flex items-center gap-1.5 flex-1 min-w-0">
					{/* ПРЯМОЕ ДЕЙСТВИЕ 1: 1-клик перевод на следующий статус или Запись / SMS при готовности */}
					{order.status === "ready_in_clinic" ? (
						<button
							type="button"
							onClick={() => handleOpenReadyInClinicPrompt(order)}
							className="h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
							title="Работа в клинике! Записать пациента на примерку / фиксацию и отправить SMS / WhatsApp"
							data-testid={`lab-tracker-ready-schedule-btn-${order.id}`}
						>
							<CalendarCheck className="w-3 h-3" />
							<span>Запись / SMS</span>
						</button>
					) : nextStatus ? (
						<button
							type="button"
							onClick={() => handleAdvanceStatus(order.id)}
							className="h-7 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
							title={`Перевести наряд в статус: «${DENTAL_LAB_STATUSES[nextStatus].labelRu}»`}
							data-testid={`lab-order-advance-btn-${order.id}`}
						>
							<ChevronRight className="w-3 h-3" />
							<span>{DENTAL_LAB_STATUSES[nextStatus].shortLabelRu}</span>
						</button>
					) : null}

					{/* ПРЯМОЕ ДЕЙСТВИЕ 2: Редактировать / Детали */}
					<button
						type="button"
						onClick={() => handleOpenEditOrder(order)}
						className="h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-medium text-[11px] transition-colors cursor-pointer"
						title="Изменить параметры наряда"
						data-testid={`lab-order-edit-btn-${order.id}`}
					>
						Детали
					</button>

					{/* МЕНЮ «...» ДЛЯ ВТОРИЧНЫХ ДЕЙСТВИЙ */}
					<div className="relative">
						<button
							type="button"
							onClick={() =>
								setOpenActionMenuId((prev) => (prev === order.id ? null : order.id))
							}
							className="w-7 h-7 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] flex items-center justify-center transition-colors cursor-pointer"
							aria-label="Дополнительные действия"
						>
							<MoreHorizontal className="w-3.5 h-3.5" />
						</button>

						{openActionMenuId === order.id && (
							<div className="absolute right-0 bottom-full mb-1 z-50 w-48 p-1 bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-xl shadow-xl flex flex-col gap-0.5 text-xs">
								<button
									type="button"
									onClick={() => {
										setOpenActionMenuId(null);
										handleOpenReadyInClinicPrompt(order);
									}}
									className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer"
									data-testid={`lab-tracker-menu-ready-schedule-btn-${order.id}`}
								>
									<CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
									<span>Запись на примерку / SMS</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setOpenActionMenuId(null);
										handleWarrantyRework(order.id);
									}}
									className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 cursor-pointer"
								>
									<RotateCcw className="w-3.5 h-3.5" />
									<span>Рекламация (0 ₽)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setOpenActionMenuId(null);
										showToast(`Печать бланка наряда ${order.orderNumber} отправлена`, "success");
									}}
									className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 cursor-pointer"
								>
									<Printer className="w-3.5 h-3.5 text-teal-600" />
									<span>Печать заказ-наряда</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
