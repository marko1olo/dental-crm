import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, Sparkles, Bot, Search, Send, Flame, Stethoscope, UserSearch } from "lucide-react";
import type { ReactElement } from "react";
import type { DentalSpecialty } from "@dental/shared";
import { specialtyLabels } from "../../workspaceUiLabels";

export interface ScheduleStaffMember {
	id: string;
	fullName?: string;
	active?: boolean;
	role?: string;
}

export interface ScheduleChair {
	id: string;
	name: string;
	active?: boolean;
	specialization?: string | null;
	room?: string | null;
}

export const DEFAULT_CLINIC_CHAIRS: readonly ScheduleChair[] = [
	{ id: "chair-1", name: "Кресло 1", specialization: "therapist", room: "Каб. 1 (Терапия)", active: true },
	{ id: "chair-2", name: "Кресло 2", specialization: "surgeon", room: "Каб. 2 (Хирургия)", active: true },
	{ id: "chair-3", name: "Кресло 3", specialization: "orthodontist", room: "Каб. 3 (Ортодонтия)", active: true },
];

export interface ScheduleFilterStripProps {
	scheduleDateFilter: string;
	setScheduleDateFilter: (date: string) => void;
	stepScheduleDay: (delta: number) => void;
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	staffMembers?: ScheduleStaffMember[];
	chairs?: ScheduleChair[];
	isSoloDoctor?: boolean;
	scheduleDoctorFilterId: string | null;
	setScheduleDoctorFilterId: (id: string | null) => void;
	scheduleChairFilterId: string | null;
	setScheduleChairFilterId: (id: string | null) => void;
	scheduleViewMode?: "timeline" | "grid";
	setScheduleViewMode?: (mode: "timeline" | "grid") => void;
	onQuickBooking?: () => void;
	onToggleSmartAi?: () => void;
	isSmartAiOpen?: boolean;
	onOpenDoctorFreeSlots?: () => void;
	onOpenPatientSearch?: () => void;
	onSelectWholeWeek?: () => void;
	onEmergencyCitoBooking?: () => void;
	onOpenTomorrowReminders?: () => void;
	onQuickBookRepeatOffset?: (daysOffset: 7 | 14 | 30) => void;
}

export function formatChairSpecialtyLabel(rawSpec?: string | null): string | null {
	if (!rawSpec) return null;
	const specKey = rawSpec as DentalSpecialty;
	const label = specialtyLabels[specKey] || rawSpec;
	return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * ScheduleFilterStrip component for filtering schedule view by date, doctor, or chair,
 * with integrated view mode switcher, emergency CITO booking, and quick booking trigger.
 * Ensures strict vertical alignment and >=44px touch targets on mobile viewports.
 */
export function ScheduleFilterStrip({
	scheduleDateFilter,
	setScheduleDateFilter,
	stepScheduleDay,
	activeScheduleFilterCount,
	resetScheduleFilters,
	staffMembers = [],
	chairs = [],
	isSoloDoctor = false,
	scheduleDoctorFilterId,
	setScheduleDoctorFilterId,
	scheduleChairFilterId,
	setScheduleChairFilterId,
	scheduleViewMode = "timeline",
	setScheduleViewMode,
	onQuickBooking,
	onToggleSmartAi,
	isSmartAiOpen = false,
	onOpenDoctorFreeSlots,
	onOpenPatientSearch,
	onSelectWholeWeek,
	onEmergencyCitoBooking,
	onOpenTomorrowReminders,
	onQuickBookRepeatOffset,
}: ScheduleFilterStripProps): ReactElement {
	const activeChairs = chairs.filter((chair) => chair?.active);
	const displayChairs: readonly ScheduleChair[] = activeChairs.length > 0 ? activeChairs : DEFAULT_CLINIC_CHAIRS;
	const todayIso = new Date().toISOString().slice(0, 10);
	const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

	const handleRepeatBookingOffset = (days: 7 | 14 | 30) => {
		if (onQuickBookRepeatOffset) {
			onQuickBookRepeatOffset(days);
		} else {
			const target = new Date(scheduleDateFilter || todayIso);
			target.setDate(target.getDate() + days);
			const targetIso = target.toISOString().slice(0, 10);
			setScheduleDateFilter(targetIso);
			onOpenDoctorFreeSlots?.();
		}
	};

	return (
		<section
			className="schedule-filter-strip flex flex-col gap-2 px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--paper)] max-w-full"
			aria-label="Сохраненные фильтры расписания"
		>
			{/* Row 1: Date picker, Quick date offsets & Action Controls */}
			<div className="flex flex-wrap items-center justify-between gap-2 w-full">
				<div className="flex items-center gap-2 flex-wrap">
					{/* Date control group */}
					<div className="schedule-date-picker-group flex items-center gap-1.5 shrink-0 pr-2 border-r border-[var(--line)]">
						<div className="schedule-date-stepper inline-flex items-center gap-1">
							<button
								type="button"
								className="secondary-button schedule-day-step-prev min-h-[44px] min-w-[44px] px-2 inline-flex items-center justify-center cursor-pointer rounded-xl font-bold"
								onClick={() => stepScheduleDay(-1)}
								aria-label="Показать предыдущий день"
								title="День назад"
							>
								<ChevronLeft size={18} aria-hidden="true" />
							</button>
							<input
								type="date"
								aria-label="Фильтр расписания по дате"
								value={scheduleDateFilter}
								onChange={(event) => setScheduleDateFilter(event.target.value)}
								className="schedule-date-input min-h-[44px] px-3 py-1 text-xs sm:text-sm font-bold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none cursor-pointer"
							/>
							<button
								type="button"
								className="secondary-button schedule-day-step-next min-h-[44px] min-w-[44px] px-2 inline-flex items-center justify-center cursor-pointer rounded-xl font-bold"
								onClick={() => stepScheduleDay(1)}
								aria-label="Показать следующий день"
								title="День вперёд"
							>
								<ChevronRight size={18} aria-hidden="true" />
							</button>
						</div>

						{/* Quick Day Switchers: [📅 Сегодня], [Завтра], [Вся неделя] */}
						<div className="hidden sm:inline-flex items-center gap-1 shrink-0">
							<button
								type="button"
								onClick={() => setScheduleDateFilter(todayIso)}
								className={`min-h-[44px] px-2.5 min-w-fit whitespace-nowrap rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1 ${
									scheduleDateFilter === todayIso
										? "bg-[var(--teal-dark)] text-white shadow-xs"
										: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))]"
								}`}
								title="Расписание на сегодня"
							>
								<span>📅 Сегодня</span>
							</button>
							<button
								type="button"
								onClick={() => setScheduleDateFilter(tomorrowIso)}
								className={`min-h-[44px] px-2.5 min-w-fit whitespace-nowrap rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1 ${
									scheduleDateFilter === tomorrowIso
										? "bg-[var(--teal-dark)] text-white shadow-xs"
										: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))]"
								}`}
								title="Расписание на завтра"
							>
								<span>Завтра</span>
							</button>
							<button
								type="button"
								onClick={() => {
									if (onSelectWholeWeek) {
										onSelectWholeWeek();
									} else if (setScheduleViewMode) {
										setScheduleViewMode("timeline");
									}
								}}
								className="min-h-[44px] px-2.5 min-w-fit whitespace-nowrap rounded-xl text-xs sm:text-sm font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] transition-all cursor-pointer flex items-center gap-1"
								title="Обзор на всю неделю"
							>
								<span>Вся неделя</span>
							</button>
						</div>

						{/* 1-Click Fast Repeat Booking Presets: [+ Через 7 дней], [+ Через 14 дней], [+ Через 1 месяц] */}
						<div className="hidden xl:inline-flex items-center gap-1 pl-1 border-l border-[var(--line)] shrink-0">
							<button
								type="button"
								onClick={() => handleRepeatBookingOffset(7)}
								className="min-h-[44px] px-2 min-w-fit whitespace-nowrap rounded-xl text-xs font-bold border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-all cursor-pointer flex items-center gap-1 shrink-0"
								title="1-Клик: Быстрая повторная запись через 7 дней у того же врача"
								aria-label="Записать через 7 дней"
							>
								<Calendar size={13} className="text-[var(--teal,var(--brand-primary))]" />
								<span>+ Через 7 дней</span>
							</button>
							<button
								type="button"
								onClick={() => handleRepeatBookingOffset(14)}
								className="min-h-[44px] px-2 min-w-fit whitespace-nowrap rounded-xl text-xs font-bold border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-all cursor-pointer flex items-center gap-1 shrink-0"
								title="1-Клик: Быстрая повторная запись через 14 дней у того же врача"
								aria-label="Записать через 14 дней"
							>
								<Calendar size={13} className="text-[var(--teal,var(--brand-primary))]" />
								<span>+ Через 14 дней</span>
							</button>
							<button
								type="button"
								onClick={() => handleRepeatBookingOffset(30)}
								className="min-h-[44px] px-2 min-w-fit whitespace-nowrap rounded-xl text-xs font-bold border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-all cursor-pointer flex items-center gap-1 shrink-0"
								title="1-Клик: Быстрая повторная запись через 1 месяц (30 дней) у того же врача"
								aria-label="Записать через 1 месяц"
							>
								<Calendar size={13} className="text-[var(--teal,var(--brand-primary))]" />
								<span>+ Через 1 месяц</span>
							</button>
						</div>
					</div>
				</div>

				{/* Integrated View Switcher & Action Controls */}
				<div className="flex items-center gap-2 shrink-0">
					{onOpenPatientSearch && (
						<button
							type="button"
							onClick={onOpenPatientSearch}
							className="secondary-button min-h-[44px] px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))] text-[var(--ink)] hover:text-[var(--teal,var(--brand-primary))] shrink-0"
							title="Мгновенный поиск пациента по телефону или фамилии (Ctrl+K)"
							aria-label="Поиск пациента"
						>
							<UserSearch size={16} className="text-[var(--teal,var(--brand-primary))]" />
							<span className="hidden md:inline">Пациент</span>
						</button>
					)}
					{onToggleSmartAi && (
						<button
							type="button"
							onClick={onToggleSmartAi}
							className={`secondary-button min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
								isSmartAiOpen ? "border-[var(--teal,var(--brand-primary))] text-[var(--teal,var(--brand-primary))] bg-[var(--teal-soft,var(--paper-soft))]" : ""
							}`}
							title="Голосовой и текстовый ИИ ввод записи"
						>
							<Bot size={16} className="text-[var(--teal,var(--brand-primary))]" />
							<span className="hidden md:inline">Записать словами</span>
						</button>
					)}

					{setScheduleViewMode && (
						<div
							className="flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)]"
							role="tablist"
							aria-label="Вид расписания"
						>
							<button
								type="button"
								onClick={() => setScheduleViewMode("timeline")}
								className={`min-h-[44px] px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
									scheduleViewMode === "timeline"
										? "bg-[var(--teal-dark)] text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="tab"
								aria-selected={scheduleViewMode === "timeline"}
								title="Лента по дням"
							>
								<List size={16} />
								<span className="hidden lg:inline">Лента</span>
							</button>
							<button
								type="button"
								onClick={() => setScheduleViewMode("grid")}
								className={`min-h-[44px] px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
									scheduleViewMode === "grid"
										? "bg-[var(--teal-dark)] text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="tab"
								aria-selected={scheduleViewMode === "grid"}
								title="Сетка по креслам"
							>
								<LayoutGrid size={16} />
								<span className="hidden lg:inline">Сетка</span>
							</button>
						</div>
					)}

					{onOpenDoctorFreeSlots && (
						<button
							type="button"
							onClick={onOpenDoctorFreeSlots}
							className="secondary-button min-h-[44px] px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-[var(--teal,var(--brand-primary))]/30 text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))] shrink-0"
							title="Поиск свободных окон врача на 7–14 дней"
						>
							<Search size={16} className="text-[var(--teal,var(--brand-primary))]" />
							<span className="hidden md:inline">Свободные окна</span>
						</button>
					)}

					{onOpenTomorrowReminders && (
						<button
							type="button"
							onClick={onOpenTomorrowReminders}
							className="secondary-button min-h-[44px] px-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer border-2 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0 shadow-xs"
							title="1-клик массовая рассылка напоминаний и инструкций пациентам на завтра"
							aria-label="Напомнить всем на завтра: рассылка WhatsApp и СМС"
						>
							<Send size={15} className="text-emerald-600 dark:text-emerald-400" />
							<span className="hidden sm:inline">Напомнить на завтра</span>
							<span className="sm:hidden">Напомнить</span>
						</button>
					)}

					{onEmergencyCitoBooking && (
						<button
							type="button"
							onClick={onEmergencyCitoBooking}
							className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 border border-rose-500/50"
							title="Пациент с острой болью (CITO!) — экстренная 1-клик вставка слота дежурному врачу (Горячая клавиша C)"
							aria-label="Пациент с острой болью CITO: быстрая запись дежурному врачу"
						>
							<Flame size={16} className="text-amber-300 animate-pulse" />
							<span className="truncate hidden sm:inline">Острая боль (CITO!)</span>
							<span className="truncate sm:hidden">CITO!</span>
						</button>
					)}

					{onQuickBooking && (
						<button
							type="button"
							onClick={onQuickBooking}
							className="primary-button min-h-[44px] px-4 py-2 rounded-xl bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
							title="Быстрая 1-клик запись на прием (горячая клавиша N)"
						>
							<Sparkles size={16} />
							<span className="truncate hidden sm:inline">+ Быстрая запись (N)</span>
							<span className="truncate sm:hidden">+ Запись</span>
						</button>
					)}
				</div>
			</div>

			{/* Row 2: Horizontal Scrollable Chips Container */}
			<div className="schedule-filter-chips flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none w-full py-1 border-t border-[var(--line)]/50 pt-2">
				{/* "Все записи" filter chip button */}
				<button
					type="button"
					className={`quick-chip ${activeScheduleFilterCount === 0 ? "active" : ""} min-h-[44px] px-3.5 min-w-fit whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 cursor-pointer`}
					onClick={resetScheduleFilters}
				>
					Все записи
				</button>

				{/* Doctor filter chips */}
				{!isSoloDoctor &&
					staffMembers
						.filter(
							(member) =>
								member?.active &&
								(member?.role === "doctor" || member?.role === "owner"),
						)
						.map((member) => (
							<button
								key={member.id}
								type="button"
								className={`quick-chip ${scheduleDoctorFilterId === member.id ? "active" : ""} min-h-[44px] min-w-fit flex-shrink-0 px-3 whitespace-nowrap text-xs sm:text-sm font-semibold cursor-pointer`}
								onClick={() =>
									setScheduleDoctorFilterId(
										scheduleDoctorFilterId === member.id ? null : member.id,
									)
								}
							>
								{member?.fullName
									?.split(" ")
									.map((part, index) => (index === 0 ? part : `${part[0]}.`))
									.join(" ") ||
									member?.fullName ||
									"Врач"}
							</button>
						))}

				{/* Chair filter chips */}
				{displayChairs.map((chair) => {
					const specName = formatChairSpecialtyLabel(chair?.specialization);
					const chairLabel = specName && !chair.name.includes("(")
						? `${chair.name} (${specName})`
						: chair?.name || "Кресло";

					return (
						<button
							key={chair.id}
							type="button"
							className={`quick-chip ${scheduleChairFilterId === chair.id ? "active" : ""} min-h-[44px] min-w-fit flex-shrink-0 px-3 whitespace-nowrap text-xs sm:text-sm font-semibold cursor-pointer flex items-center gap-1.5`}
							onClick={() =>
								setScheduleChairFilterId(
									scheduleChairFilterId === chair.id ? null : chair.id,
								)
							}
							title={`Фильтр по кабинету / креслу: ${chairLabel}${chair.room ? ` (${chair.room})` : ""}`}
							aria-label={`Фильтр по кабинету / креслу: ${chairLabel}`}
						>
							<span className="whitespace-nowrap">{chairLabel}</span>
							{chair.room && (
								<span className="text-[10px] opacity-75 font-normal px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 shrink-0 whitespace-nowrap">
									{chair.room.split(" ")[0]}
								</span>
							)}
						</button>
					);
				})}
			</div>
		</section>
	);
}
