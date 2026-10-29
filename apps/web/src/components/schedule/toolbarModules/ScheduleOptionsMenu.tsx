import React from "react";
import {
	MoreVertical,
	Plus,
	Calendar,
	Clock,
	RefreshCw,
	Search,
	AlertCircle,
	Bell,
} from "lucide-react";

export interface ScheduleOptionsMenuProps {
	isOpen: boolean;
	onToggle: () => void;
	onClose: () => void;
	menuRef: React.RefObject<HTMLDivElement | null>;
	onQuickBooking?: () => void;
	onSetDate: (date: string) => void;
	localNow: Date;
	onSelectWholeWeek?: () => void;
	statusFilter?: string;
	onSetStatusFilter: (status: any) => void;
	queueCounts?: {
		all?: number;
		arrived?: number;
		inTreatment?: number;
		awaitingPayment?: number;
	};
	onOpenAddChair: () => void;
	onOpenWaitlist?: () => void;
	waitlistCount?: number;
	onOpenPendingOnlineBookings?: () => void;
	pendingOnlineBookingsCount?: number;
	onToggleShiftAnalytics?: () => void;
	onOpenCalendarSync?: () => void;
	onOpenPatientSearch?: () => void;
	onEmergencyCitoBooking?: () => void;
	onOpenTomorrowReminders?: () => void;
	onGridStepChange?: (step: 15 | 30 | 60) => void;
	gridStepMinutes?: number;
}

export function ScheduleOptionsMenu({
	isOpen,
	onToggle,
	onClose,
	menuRef,
	onQuickBooking,
	onSetDate,
	localNow,
	onSelectWholeWeek,
	statusFilter,
	onSetStatusFilter,
	queueCounts,
	onOpenAddChair,
	onOpenWaitlist,
	waitlistCount,
	onOpenPendingOnlineBookings,
	pendingOnlineBookingsCount,
	onToggleShiftAnalytics,
	onOpenCalendarSync,
	onOpenPatientSearch,
	onEmergencyCitoBooking,
	onOpenTomorrowReminders,
	onGridStepChange,
	gridStepMinutes,
}: ScheduleOptionsMenuProps) {
	return (
		<div className="relative inline-flex items-center shrink-0" ref={menuRef}>
			<button
				type="button"
				onClick={onToggle}
				className="schedule-toolbar-options-btn secondary-button h-8 min-h-[32px] sm:h-9 sm:min-h-[36px] max-h-8 sm:max-h-9 px-2 sm:px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-[12.5px] font-medium shrink-0 inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors"
				title="Дополнительные режимы и списки расписания"
				aria-label="Опции расписания"
				aria-expanded={isOpen}
				data-testid="schedule-toolbar-options-btn"
			>
				<MoreVertical size={14} className="shrink-0" aria-hidden="true" />
				<span className="hidden sm:inline font-medium">Опции</span>
			</button>

			<div
				className={`schedule-options-dropdown absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-1 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[240px] max-w-[320px] max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 text-xs ${
					isOpen ? "flex" : "hidden"
				}`}
				role="menu"
				aria-hidden={!isOpen}
			>
				{/* 1. Быстрая запись дубль в меню */}
				{onQuickBooking && (
					<button
						type="button"
						onClick={() => {
							onClose();
							onQuickBooking();
						}}
						className="w-full py-2 text-left px-2.5 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,#f0fdfa)] hover:bg-[var(--teal,#0d9488)] hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
						role="menuitem"
						data-testid="schedule-options-quick-booking-btn"
						title="Новая запись на прием (+ Новая запись)"
					>
						<Plus size={14} className="shrink-0" />
						<span>Быстрая запись</span>
					</button>
				)}

				{/* 2. Быстрые даты */}
				<div className="pt-1 border-t border-[var(--line)] flex flex-col gap-0.5">
					<div className="text-[11px] font-bold text-[var(--muted)] px-2 py-0.5">Навигация по датам</div>
					<button
						type="button"
						onClick={() => {
							onClose();
							const tom = new Date(localNow.getTime() + 86400000).toISOString().slice(0, 10);
							onSetDate(tom);
						}}
						className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
					>
						<span>Завтра</span>
						<Calendar size={13} className="text-[var(--muted)]" />
					</button>
					<button
						type="button"
						onClick={() => {
							onClose();
							onSelectWholeWeek?.();
						}}
						className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
					>
						<span>Вся неделя</span>
						<Calendar size={13} className="text-[var(--muted)]" />
					</button>
				</div>

				{/* 3. Статусы смены (тихая телеметрия) */}
				<div className="pt-1 border-t border-[var(--line)] flex flex-col gap-0.5">
					<div className="text-[11px] font-bold text-[var(--muted)] px-2 py-0.5">Очередь смены</div>
					<button
						type="button"
						data-testid="schedule-status-filter-arrived"
						onClick={() => {
							onClose();
							onSetStatusFilter(statusFilter === "arrived" ? "all" : "arrived");
						}}
						className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
					>
						<span>Ожидает приёма</span>
						{queueCounts?.arrived !== undefined && (
							<span data-testid="schedule-queue-count-arrived" className="text-[11px] font-bold text-[var(--muted)]">
								{queueCounts.arrived}
							</span>
						)}
					</button>
					<button
						type="button"
						data-testid="schedule-status-filter-in-treatment"
						onClick={() => {
							onClose();
							onSetStatusFilter(statusFilter === "in_treatment" ? "all" : "in_treatment");
						}}
						className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
					>
						<span>На приёме</span>
						{queueCounts?.inTreatment !== undefined && (
							<span data-testid="schedule-queue-count-in-treatment" className="text-[11px] font-bold text-[var(--muted)]">
								{queueCounts.inTreatment}
							</span>
						)}
					</button>
					<button
						type="button"
						data-testid="schedule-status-filter-completed"
						onClick={() => {
							onClose();
							onSetStatusFilter(statusFilter === "awaiting_payment" ? "all" : "awaiting_payment");
						}}
						className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
					>
						<span>Ожидает оплаты</span>
						{queueCounts?.awaitingPayment !== undefined && (
							<span data-testid="schedule-queue-count-completed" className="text-[11px] font-bold text-[var(--muted)]">
								{queueCounts.awaitingPayment}
							</span>
						)}
					</button>
				</div>

				{/* 4. Вторичные инструменты и списки */}
				<div className="pt-1 border-t border-[var(--line)] flex flex-col gap-0.5">
					<div className="text-[11px] font-bold text-[var(--muted)] px-2 py-0.5">Инструменты и списки</div>

					{/* Добавить кресло */}
					<button
						type="button"
						onClick={() => {
							onClose();
							onOpenAddChair();
						}}
						className="w-full min-h-[44px] py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
						style={{ minHeight: "44px" }}
						data-testid="schedule-options-add-chair-btn"
					>
						<span>Добавить кресло (+ Кресло)</span>
					</button>

					{/* Лист ожидания */}
					{onOpenWaitlist && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onOpenWaitlist();
							}}
							className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
						>
							<span className="flex items-center gap-1.5">
								<Clock size={13} className="text-[var(--muted)]" />
								<span>Лист ожидания</span>
							</span>
							{(waitlistCount ?? 0) > 0 && (
								<span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">{waitlistCount}</span>
							)}
						</button>
					)}

					{/* Онлайн-заявки */}
					{onOpenPendingOnlineBookings && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onOpenPendingOnlineBookings();
							}}
							className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
						>
							<span>Онлайн-заявки</span>
							{(pendingOnlineBookingsCount ?? 0) > 0 && (
								<span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">{pendingOnlineBookingsCount}</span>
							)}
						</button>
					)}

					{/* Аналитика смены */}
					{onToggleShiftAnalytics && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onToggleShiftAnalytics();
							}}
							className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
						>
							<span>Аналитика смены</span>
						</button>
					)}

					{/* Синхронизация календаря */}
					{onOpenCalendarSync && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onOpenCalendarSync();
							}}
							className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
						>
							<span className="flex items-center gap-1.5">
								<RefreshCw size={13} className="text-[var(--muted)]" />
								<span>Синхронизация календаря</span>
							</span>
						</button>
					)}

					{/* Поиск пациента */}
					{onOpenPatientSearch && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onOpenPatientSearch();
							}}
							className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
							title="Пациент (Ctrl+K)"
						>
							<span className="flex items-center gap-1.5">
								<Search size={13} className="text-[var(--muted)]" />
								<span>Пациент (Ctrl+K)</span>
							</span>
						</button>
					)}

					{/* Острая боль (CITO!) */}
					{onEmergencyCitoBooking && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onEmergencyCitoBooking();
							}}
							className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-red-600 dark:text-red-400 cursor-pointer"
							aria-label="Пациент с острой болью: быстрая запись дежурному врачу"
						>
							<span className="flex items-center gap-1.5 font-semibold">
								<AlertCircle size={13} />
								<span>Острая боль (срочно)</span>
							</span>
						</button>
					)}

					{/* Напомнить на завтра */}
					{onOpenTomorrowReminders && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onOpenTomorrowReminders();
							}}
							className="w-full py-1.5 px-2.5 rounded-md hover:bg-[var(--paper-soft)] text-left flex items-center justify-between text-[var(--ink)] cursor-pointer"
						>
							<span className="flex items-center gap-1.5">
								<Bell size={13} className="text-[var(--muted)]" />
								<span>Напомнить на завтра</span>
							</span>
						</button>
					)}
				</div>

				{/* 5. Шаг сетки (15 / 30 / 60 мин) */}
				{onGridStepChange && (
					<div className="pt-1 border-t border-[var(--line)]">
						<div className="text-[11px] font-bold text-[var(--muted)] px-2 py-0.5">Шаг сетки</div>
						<div className="grid grid-cols-3 gap-1 px-1 py-1">
							{([15, 30, 60] as const).map((step) => (
								<button
									key={step}
									type="button"
									onClick={() => {
										onGridStepChange(step);
										onClose();
									}}
									className={`py-1 text-center rounded text-xs font-semibold border ${
										gridStepMinutes === step
											? "bg-[var(--paper)] text-[var(--ink)] border-[var(--line-strong,var(--line))]"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-transparent"
									}`}
								>
									{step} мин
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
