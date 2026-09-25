/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Today's Patient Shift Queue & Live Operational Board
 *
 * Core Functional Capabilities (StomX Shift Queue Parity):
 * 1. 0-Click Status Progression Pipeline for Solo Doctor & Reception:
 *    - Reception: «Пациент пришел» -> status 'arrived' (ожидает в холле).
 *    - Doctor: «Пригласить в кабинет» -> status 'in_chair' (в кресле).
 *    - Doctor: «Завершить прием и отправить на кассу» -> status 'ready_for_checkout'.
 *    - Cashier: «Чек пробит» -> status 'completed' (прием закрыт).
 * 2. Real-time Wait & Duration Timers:
 *    - Wait in hall timer («Ждет 8 мин», yellow warning >15m, red critical >30m).
 *    - Chair duration timer («В кресле 24 мин (из 30)», overtime warning).
 * 3. Categorized Operational Tabs (PATIENT_SHIFT_QUEUE_TABS_META):
 *    - «Все на сегодня (XX)», «Ожидают в холле (XX)», «В кресле (XX)»,
 *      «Ожидают расчета (XX)», «Прием завершен (XX)».
 * 4. High-Density Clinical Desktop Ergonomics:
 *    - Toolbar button heights strictly 32–36px.
 *    - 100% theme design tokens (var(--paper), var(--ink), var(--line), etc.).
 *    - Zero cartoon emojis (100% Lucide vector icons).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	CalendarCheck,
	CalendarDays,
	CheckCircle2,
	Clock,
	CreditCard,
	DoorOpen,
	Filter,
	Phone,
	RefreshCw,
	RotateCcw,
	Search,
	User,
	UserCheck,
	UserX,
	XCircle,
} from "lucide-react";
import {
	buildPatientShiftQueue,
	OPERATIONAL_STATUS_META,
	PATIENT_SHIFT_QUEUE_TABS_META,
	type Appointment,
	type PatientOperationalStatus,
	type PatientQueueAction,
	type PatientQueueItem,
	type PatientShiftQueueResult,
	type PatientShiftQueueTab,
} from "@dental/shared";

export interface TodayQueueBoardProps {
	/** List of appointments for the day */
	appointments: Array<Partial<Appointment> & Record<string, any>>;
	/** Target date key in YYYY-MM-DD format (defaults to today) */
	targetDateKey?: string;
	/** Callback for 1-click status transitions */
	onStatusChange?: (
		appointmentId: string,
		targetStatus: PatientOperationalStatus,
		actionId?: string,
	) => Promise<void> | void;
	/** Callback to open appointment drawer or editor */
	onOpenAppointment?: (appointmentId: string) => void;
	/** Callback to open patient visit record */
	onOpenVisit?: (appointmentId: string) => void;
	/** Callback to open cashier / payment modal */
	onOpenPayment?: (appointmentId: string) => void;
	/** Selected doctor filter ID */
	selectedDoctorId?: string | null;
	/** Selected chair filter ID */
	selectedChairId?: string | null;
	/** Staff members list for filter dropdown */
	staffList?: Array<{ id: string; name?: string; fullName?: string; specialty?: string }>;
	/** Chairs list for filter dropdown */
	chairsList?: Array<{ id: string; name?: string; title?: string }>;
	/** Current user role */
	userRole?: "doctor" | "reception" | "admin" | "cashier" | string;
	/** Optional CSS class name */
	className?: string;
}

export const TodayQueueBoard: React.FC<TodayQueueBoardProps> = ({
	appointments = [],
	targetDateKey,
	onStatusChange,
	onOpenAppointment,
	onOpenVisit,
	onOpenPayment,
	selectedDoctorId: initialDoctorId = null,
	selectedChairId: initialChairId = null,
	staffList = [],
	chairsList = [],
	userRole = "reception",
	className = "",
}) => {
	const [activeTab, setActiveTab] = useState<PatientShiftQueueTab>("all");
	const [doctorFilter, setDoctorFilter] = useState<string | null>(initialDoctorId);
	const [chairFilter, setChairFilter] = useState<string | null>(initialChairId);
	const [searchQuery, setSearchQuery] = useState("");
	const [inFlightActionId, setInFlightActionId] = useState<string | null>(null);

	// Staff and chair lookup maps
	const staffById = useMemo(() => {
		const map = new Map<string, { name?: string; fullName?: string; specialty?: string }>();
		for (const s of staffList) {
			if (s.id) map.set(s.id, s);
		}
		return map;
	}, [staffList]);

	const chairsById = useMemo(() => {
		const map = new Map<string, { name?: string; title?: string }>();
		for (const c of chairsList) {
			if (c.id) map.set(c.id, c);
		}
		return map;
	}, [chairsList]);

	// Build shift queue data
	const queueResult: PatientShiftQueueResult = useMemo(() => {
		return buildPatientShiftQueue(appointments, {
			targetDateKey,
			selectedDoctorId: doctorFilter,
			selectedChairId: chairFilter,
			staffById,
			chairsById,
		});
	}, [appointments, targetDateKey, doctorFilter, chairFilter, staffById, chairsById]);

	// Filter items by active tab and search query
	const displayedItems = useMemo(() => {
		const tabItems = queueResult.itemsByTab[activeTab] || [];
		const query = searchQuery.trim().toLowerCase();
		if (!query) return tabItems;

		return tabItems.filter((item) => {
			return (
				item.patientName.toLowerCase().includes(query) ||
				item.patientPhone.toLowerCase().includes(query) ||
				item.doctorName.toLowerCase().includes(query) ||
				item.chairName.toLowerCase().includes(query) ||
				item.reason.toLowerCase().includes(query)
			);
		});
	}, [queueResult, activeTab, searchQuery]);

	// Handle 1-click status progression
	const handleActionClick = async (
		item: PatientQueueItem,
		action: PatientQueueAction,
	) => {
		if (inFlightActionId) return;
		const actionKey = `${item.id}-${action.actionId}`;
		setInFlightActionId(actionKey);

		try {
			if (onStatusChange) {
				await onStatusChange(item.id, action.targetStatus, action.actionId);
			}
		} finally {
			setInFlightActionId(null);
		}
	};

	// Tab badge counts
	const counts = queueResult.counts;
	const summary = queueResult.summary;

	return (
		<section
			className={`today-queue-board flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-[var(--ink)] shadow-2xs ${className}`.trim()}
			data-testid="today-queue-board"
			aria-label="Табло оперативной очереди пациентов смены"
		>
			{/* ───────────────────────────────────────────────────────────────── */}
			{/* 1. TOP SUMMARY METRICS STRIP                                     */}
			{/* ───────────────────────────────────────────────────────────────── */}
			<header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]">
						<Clock size={16} />
					</div>
					<div>
						<h2 className="text-sm font-bold text-[var(--ink)]">
							Очередь смены дня
						</h2>
						<p className="text-[11px] text-[var(--muted)]">
							{summary.totalToday} записей · Ожидают в холле: {summary.waitingCount} · В кресле: {summary.inChairCount} · На кассе: {summary.checkoutCount}
						</p>
					</div>
				</div>

				{/* Overtime Alerts (if any) */}
				<div className="flex items-center gap-1.5 text-xs">
					{summary.waitingOvertimeCount > 0 && (
						<div
							className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
							title={`Пациенты ждут вызова дольше 15 мин: ${summary.waitingOvertimeCount}`}
						>
							<AlertCircle size={13} className="shrink-0" />
							<span>Задержка в холле: {summary.waitingOvertimeCount}</span>
						</div>
					)}
					{summary.inChairOvertimeCount > 0 && (
						<div
							className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300"
							title={`Прием в кресле превысил план: ${summary.inChairOvertimeCount}`}
						>
							<AlertCircle size={13} className="shrink-0" />
							<span>Превышение времени приема: {summary.inChairOvertimeCount}</span>
						</div>
					)}
					{summary.averageWaitMinutes > 0 && (
						<span className="text-[11px] text-[var(--muted)]">
							Ср. ожидание: {summary.averageWaitMinutes} мин
						</span>
					)}
				</div>
			</header>

			{/* ───────────────────────────────────────────────────────────────── */}
			{/* 2. FILTER & TAB TOOLBAR (STRICT 32–36px HEIGHT)                  */}
			{/* ───────────────────────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				{/* Segmented Queue Tabs (32px height) */}
				<nav
					className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5"
					role="tablist"
					aria-label="Вкладки очереди смены"
				>
					{(
						[
							"all",
							"waiting",
							"in_chair",
							"checkout",
							"completed",
						] as PatientShiftQueueTab[]
					).map((tab) => {
						const meta = PATIENT_SHIFT_QUEUE_TABS_META[tab];
						const isActive = activeTab === tab;
						const count = counts[tab];

						return (
							<button
								key={tab}
								type="button"
								role="tab"
								aria-selected={isActive}
								data-testid={`queue-tab-${tab}`}
								onClick={() => setActiveTab(tab)}
								className={`inline-flex h-8 min-w-[70px] cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all select-none ${
									isActive
										? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
										: "text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
								title={meta.descriptionRu}
							>
								{tab === "all" && <CalendarDays size={13} />}
								{tab === "waiting" && <Clock size={13} />}
								{tab === "in_chair" && <Activity size={13} />}
								{tab === "checkout" && <CreditCard size={13} />}
								{tab === "completed" && <CheckCircle2 size={13} />}
								<span>{meta.shortLabelRu}</span>
								<span
									className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
										isActive
											? "bg-white/30 text-white"
											: "bg-[var(--line)] text-[var(--muted)]"
									}`}
								>
									{count}
								</span>
							</button>
						);
					})}
				</nav>

				{/* Quick Controls: Doctor, Chair, Search (strictly 32–36px height) */}
				<div className="flex flex-wrap items-center gap-1.5">
					{/* Search input */}
					<div className="relative flex items-center">
						<Search
							size={13}
							className="pointer-events-none absolute left-2 text-[var(--muted)]"
						/>
						<input
							type="text"
							placeholder="Поиск по очереди..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="h-8 w-36 rounded-md border border-[var(--line)] bg-[var(--paper)] pl-6 pr-2 text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-hidden sm:w-44"
						/>
					</div>

					{/* Doctor Filter (32px) */}
					{staffList.length > 0 && (
						<select
							value={doctorFilter || ""}
							onChange={(e) => setDoctorFilter(e.target.value || null)}
							className="h-8 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2 text-xs text-[var(--ink)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-hidden"
							title="Фильтр по врачу"
						>
							<option value="">Все врачи</option>
							{staffList.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.name || doc.fullName || "Врач"}
								</option>
							))}
						</select>
					)}

					{/* Chair Filter (32px) */}
					{chairsList.length > 0 && (
						<select
							value={chairFilter || ""}
							onChange={(e) => setChairFilter(e.target.value || null)}
							className="h-8 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2 text-xs text-[var(--ink)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-hidden"
							title="Фильтр по креслу"
						>
							<option value="">Все кабинеты</option>
							{chairsList.map((chair) => (
								<option key={chair.id} value={chair.id}>
									{chair.name || chair.title || "Кабинет"}
								</option>
							))}
						</select>
					)}

					{/* Clear Filters Button (32px) */}
					{(doctorFilter || chairFilter || searchQuery) && (
						<button
							type="button"
							onClick={() => {
								setDoctorFilter(null);
								setChairFilter(null);
								setSearchQuery("");
							}}
							className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2 text-xs text-[var(--muted)] hover:bg-[var(--paper-soft)] hover:text-[var(--ink)]"
							title="Сбросить фильтры"
						>
							<RotateCcw size={12} />
							<span>Сброс</span>
						</button>
					)}
				</div>
			</div>

			{/* ───────────────────────────────────────────────────────────────── */}
			{/* 3. QUEUE ITEMS LIST / CARDS (0-CLICK ACTIONS)                    */}
			{/* ───────────────────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-2" role="region" aria-label="Список пациентов в очереди">
				{displayedItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] py-8 text-center text-xs text-[var(--muted)]">
						<Clock size={24} className="mb-1 text-[var(--muted)] opacity-60" />
						<p className="font-semibold">
							{activeTab === "waiting"
								? "В холле пока никто не ожидает"
								: activeTab === "in_chair"
									? "В креслах сейчас нет активных пациентов"
									: activeTab === "checkout"
										? "Пациентов, ожидающих расчета, нет"
										: activeTab === "completed"
											? "Завершенных приемов пока нет"
											: "Записей на выбранный период не найдено"}
						</p>
						<p className="mt-0.5 text-[11px]">
							{searchQuery
								? "Попробуйте изменить поисковый запрос"
								: "Новые пациенты отобразятся здесь по мере наступления смены"}
						</p>
					</div>
				) : (
					displayedItems.map((item) => {
						const isPrimaryBusy =
							inFlightActionId ===
							`${item.id}-${item.primaryAction?.actionId}`;
						const statusMeta = OPERATIONAL_STATUS_META[item.operationalStatus];

						return (
							<article
								key={item.id}
								data-testid={`queue-item-${item.id}`}
								className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] p-2.5 transition-colors hover:border-[var(--teal,var(--brand-primary))]/40"
							>
								{/* Left: Patient, Time & Operational Status */}
								<div className="flex min-w-[200px] flex-1 items-start gap-2.5">
									{/* Time Range Badge */}
									<div className="flex flex-col items-center justify-center rounded-md border border-[var(--line)] bg-[var(--paper-soft)] px-2 py-1 text-center shrink-0">
										<span className="text-[11px] font-bold text-[var(--ink)]">
											{item.timeRange || "Время не указано"}
										</span>
										<span className="text-[9px] uppercase tracking-wide text-[var(--muted)]">
											{item.chairName}
										</span>
									</div>

									{/* Patient Details */}
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-1.5">
											<span
												onClick={() => onOpenAppointment?.(item.id)}
												className="cursor-pointer font-semibold text-xs text-[var(--ink)] hover:text-[var(--teal,var(--brand-primary))] hover:underline truncate"
												title={item.patientName}
											>
												{item.patientName}
											</span>

											{/* Operational Status Badge */}
											<span
												className={`inline-flex items-center rounded-sm px-1.5 py-0.2 text-[10px] font-bold ${
													statusMeta?.badgeVariant === "warning"
														? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
														: statusMeta?.badgeVariant === "info"
															? "bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] dark:text-teal-200"
															: statusMeta?.badgeVariant === "success"
																? "bg-green-500/15 text-green-800 dark:text-green-200"
																: statusMeta?.badgeVariant === "danger"
																	? "bg-red-500/15 text-red-800 dark:text-red-200"
																	: "bg-[var(--line)] text-[var(--muted)]"
												}`}
											>
												{statusMeta?.labelRu || item.operationalStatus}
											</span>

											{/* Wait Timer Badge (Yellow >15m, Red >30m) */}
											{item.waitFormatted && (
												<span
													className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.2 text-[10px] font-bold ${
														item.waitSeverity === "critical"
															? "border border-red-500/40 bg-red-500/20 text-red-800 dark:text-red-200 animate-pulse"
															: item.waitSeverity === "warning"
																? "border border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200"
																: "bg-[var(--paper-soft)] text-[var(--muted)]"
													}`}
												>
													<Clock size={10} />
													<span>{item.waitFormatted}</span>
												</span>
											)}

											{/* Chair Duration Timer Badge */}
											{item.chairDurationFormatted && (
												<span
													className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.2 text-[10px] font-bold ${
														item.chairDurationSeverity === "overtime"
															? "border border-red-500/40 bg-red-500/20 text-red-800 dark:text-red-200"
															: item.chairDurationSeverity === "warning"
																? "border border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200"
																: "bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] dark:text-teal-200"
													}`}
												>
													<Activity size={10} />
													<span>{item.chairDurationFormatted}</span>
												</span>
											)}
										</div>

										{/* Doctor, Specialty & Reason */}
										<div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
											<span className="flex items-center gap-1">
												<User size={11} />
												<span>{item.doctorName}</span>
												{item.doctorSpecialty && (
													<span className="text-[10px] text-[var(--muted)]">
														({item.doctorSpecialty})
													</span>
												)}
											</span>
											<span>·</span>
											<span className="truncate max-w-[200px]" title={item.reason}>
												{item.reason}
											</span>
											{item.patientPhone && (
												<>
													<span>·</span>
													<span className="flex items-center gap-0.5">
														<Phone size={10} />
														<span>{item.patientPhone}</span>
													</span>
												</>
											)}
										</div>
									</div>
								</div>

								{/* Right: 0-Click Primary Action & Secondary Actions (Height 32–36px) */}
								<div className="flex items-center gap-1.5 shrink-0">
									{/* Quick Action Navigation Buttons */}
									{onOpenVisit && (
										<button
											type="button"
											onClick={() => onOpenVisit(item.id)}
											className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--paper)] px-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)]"
											title="Открыть медицинскую карту / дневник визита 043/у"
										>
											Прием
										</button>
									)}

									{onOpenPayment && item.operationalStatus === "ready_for_checkout" && (
										<button
											type="button"
											onClick={() => onOpenPayment(item.id)}
											className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
											title="Открыть кассу 54-ФЗ для оплаты"
										>
											<CreditCard size={12} />
											Касса
										</button>
									)}

									{/* 0-Click Primary Progression Button (Height 32–36px) */}
									{item.primaryAction && (
										<button
											type="button"
											disabled={isPrimaryBusy}
											data-testid={`queue-primary-action-${item.id}`}
											onClick={() =>
												handleActionClick(item, item.primaryAction!)
											}
											className={`inline-flex h-8.5 min-h-[34px] cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all shadow-2xs select-none ${
												item.primaryAction.buttonVariant === "primary"
													? "bg-[var(--teal,var(--brand-primary))] text-white hover:opacity-90"
													: item.primaryAction.buttonVariant === "success"
														? "bg-green-600 text-white hover:bg-green-700"
														: item.primaryAction.buttonVariant === "warning"
															? "bg-amber-600 text-white hover:bg-amber-700"
															: "bg-slate-700 text-white hover:bg-slate-800"
											} ${isPrimaryBusy ? "opacity-60 cursor-not-allowed" : ""}`}
											title={item.primaryAction.descriptionRu}
										>
											{item.primaryAction.iconName === "UserCheck" && (
												<UserCheck size={14} className="shrink-0" />
											)}
											{item.primaryAction.iconName === "DoorOpen" && (
												<DoorOpen size={14} className="shrink-0" />
											)}
											{item.primaryAction.iconName === "CreditCard" && (
												<CreditCard size={14} className="shrink-0" />
											)}
											{item.primaryAction.iconName === "CheckCircle2" && (
												<CheckCircle2 size={14} className="shrink-0" />
											)}
											{item.primaryAction.iconName === "RotateCcw" && (
												<RotateCcw size={14} className="shrink-0" />
											)}
											<span>{item.primaryAction.labelRu}</span>
										</button>
									)}

									{/* Secondary Revert / Cancel Actions (Height 32px) */}
									{item.secondaryActions.length > 0 &&
										item.secondaryActions.slice(0, 1).map((secAction) => (
											<button
												key={secAction.actionId}
												type="button"
												data-testid={`queue-secondary-action-${item.id}-${secAction.actionId}`}
												onClick={() => handleActionClick(item, secAction)}
												className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--paper-soft)] hover:text-[var(--ink)]"
												title={secAction.labelRu}
											>
												{secAction.iconName === "RotateCcw" && (
													<RotateCcw size={12} />
												)}
												{secAction.iconName === "UserX" && (
													<UserX size={12} />
												)}
												{secAction.iconName === "XCircle" && (
													<XCircle size={12} />
												)}
												{secAction.iconName === "CheckCircle2" && (
													<CheckCircle2 size={12} />
												)}
												<span>{secAction.labelRu}</span>
											</button>
										))}
								</div>
							</article>
						);
					})
				)}
			</div>
		</section>
	);
};

export default TodayQueueBoard;
