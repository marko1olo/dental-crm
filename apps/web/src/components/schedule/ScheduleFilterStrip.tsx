import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, Sparkles, Bot, Search, Send, AlertCircle, Stethoscope, UserSearch, MoreVertical, Users, UserPlus, PhoneCall, Clock, Clipboard, BarChart3 } from "lucide-react";
import React, { type ReactElement, useState, useRef, useEffect } from "react";
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
	onToggleShiftAnalytics?: () => void;
	showShiftAnalytics?: boolean;
	onOpenShiftRoster?: () => void;
	onOpenWaitlist?: () => void;
	waitlistCount?: number;
	onToggleConfirmations?: () => void;
	showConfirmationsPanel?: boolean;
	onToggleFreedSlots?: () => void;
	showFreedSlotsPanel?: boolean;
	onToggleClipboard?: () => void;
	showClipboardPanel?: boolean;
}

export function formatChairSpecialtyLabel(rawSpec?: string | null): string | null {
	if (!rawSpec) return null;
	const specKey = rawSpec as DentalSpecialty;
	const label = specialtyLabels[specKey] || rawSpec;
	return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * ScheduleFilterStrip component for filtering schedule view by date, doctor, or chair.
 * ZERO-CLUTTER LAW: Compressed into STRICTLY 1 COMPACT ROW (36px) with:
 * - Left: Date stepper (< dd.mm.yyyy 📅 >)
 * - Center: 1-line horizontal scrollable doctor & chair chips
 * - Right: [⋮ Опции] dropdown menu (holding all 15 secondary modes) + STRICTLY 1 Primary "+ Запись" button.
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
	onToggleShiftAnalytics,
	showShiftAnalytics = false,
	onOpenShiftRoster,
	onOpenWaitlist,
	waitlistCount = 0,
	onToggleConfirmations,
	showConfirmationsPanel = false,
	onToggleFreedSlots,
	showFreedSlotsPanel = false,
	onToggleClipboard,
	showClipboardPanel = false,
}: ScheduleFilterStripProps): ReactElement {
	const activeChairs = chairs.filter((chair) => chair?.active);
	const displayChairs: readonly ScheduleChair[] = activeChairs.length > 0 ? activeChairs : DEFAULT_CLINIC_CHAIRS;
	const todayIso = new Date().toISOString().slice(0, 10);
	const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
	const currentDateIso = scheduleDateFilter || todayIso;

	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		if (isOptionsMenuOpen) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isOptionsMenuOpen]);

	// Real selected date formatted as dd.MM.yyyy
	const formattedCurrentDate = (() => {
		const parts = currentDateIso.split("-");
		if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
			return `${parts[2]}.${parts[1]}.${parts[0]}`;
		}
		return currentDateIso;
	})();

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
			className="schedule-filter-strip min-h-[44px] flex items-center justify-between gap-1.5 px-2 sm:px-3 py-1 border-b border-[var(--line)] bg-[var(--paper)] max-w-full overflow-hidden shrink-0 select-none"
			aria-label="Сохраненные фильтры расписания"
		>
			{/* Left: Date Stepper (< dd.mm.yyyy >) with >= 44px touch targets */}
			<div className="schedule-date-picker-group flex items-center gap-1.5 shrink-0 pr-1.5 border-r border-[var(--line)]">
				<button
					type="button"
					className="secondary-button schedule-day-step-prev min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer rounded-lg font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] transition-all p-0 shrink-0"
					onClick={() => stepScheduleDay(-1)}
					aria-label="Показать предыдущий день"
					title="День назад"
				>
					<ChevronLeft size={16} aria-hidden="true" />
				</button>
				<input
					type="date"
					aria-label="Фильтр расписания по дате"
					value={currentDateIso}
					onChange={(event) => setScheduleDateFilter(event.target.value)}
					placeholder={formattedCurrentDate}
					title={`Выбранная дата: ${formattedCurrentDate}`}
					className="schedule-date-input min-h-[44px] px-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none cursor-pointer hover:border-[var(--teal,var(--brand-primary))] transition-all w-[100px] sm:w-[115px] text-center"
				/>
				<button
					type="button"
					className="secondary-button schedule-day-step-next min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer rounded-lg font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] transition-all p-0 shrink-0"
					onClick={() => stepScheduleDay(1)}
					aria-label="Показать следующий день"
					title="День вперёд"
				>
					<ChevronRight size={16} aria-hidden="true" />
				</button>
			</div>

			{/* Center: 1-line horizontal scrollable doctor & chair filters */}
			<div className="schedule-filter-chips flex-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 min-w-0">
				{/* "Все записи" filter chip */}
				<button
					type="button"
					className={`quick-chip ${activeScheduleFilterCount === 0 ? "active" : ""} h-7 px-2.5 min-w-fit whitespace-nowrap text-xs font-semibold shrink-0 cursor-pointer rounded-lg`}
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
								className={`quick-chip ${scheduleDoctorFilterId === member.id ? "active" : ""} h-7 min-w-fit shrink-0 px-2 whitespace-nowrap text-xs font-medium cursor-pointer rounded-lg`}
								onClick={() =>
									setScheduleDoctorFilterId(
										scheduleDoctorFilterId === member.id ? null : member.id,
									)
								}
								title={`Фильтр по врачу: ${member?.fullName || "Врач"}`}
							>
								{member?.fullName
									?.split(" ")
									.map((part, index) => (index === 0 ? part : `${part[0]}.`))
									.join(" ") ||
									member?.fullName ||
									"Врач"}
							</button>
						))}

				{/* Chair filter chips with specializations */}
				{displayChairs.map((chair) => {
					const specName = formatChairSpecialtyLabel(chair?.specialization);
					const chairLabel = specName && !chair.name.includes("(")
						? `${chair.name} (${specName})`
						: chair?.name || "Кресло";

					return (
						<button
							key={chair.id}
							type="button"
							className={`quick-chip ${scheduleChairFilterId === chair.id ? "active" : ""} h-7 min-w-fit shrink-0 px-2 whitespace-nowrap text-xs font-medium cursor-pointer rounded-lg flex items-center gap-1`}
							onClick={() =>
								setScheduleChairFilterId(
									scheduleChairFilterId === chair.id ? null : chair.id,
								)
							}
							title={`Фильтр по кабинету / креслу: ${chairLabel}${chair.room ? ` (${chair.room})` : ""}`}
							aria-label={`Фильтр по кабинету / креслу: ${chairLabel}`}
						>
							<span className="whitespace-nowrap">{chairLabel}</span>
						</button>
					);
				})}
			</div>

			{/* Right: [⊞ Сетка | ☰ Лента] Switcher + [⋮ Опции] Dropdown Menu + STRICTLY 1 Primary [+ Запись] Button */}
			<div className="flex items-center gap-2 sm:gap-1.5 shrink-0 pl-1.5 border-l border-[var(--line)]">
				{/* 1-Click View Mode Switcher: [ ⊞ Сетка | ☰ Лента ] */}
				{setScheduleViewMode && (
					<div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" role="group" aria-label="Режим отображения">
						<button
							type="button"
							onClick={() => setScheduleViewMode("grid")}
							className={`min-h-[44px] min-w-[44px] px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
								scheduleViewMode === "grid"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Сетка по кабинетам и креслам"
							aria-label="Сетка по кабинетам"
							aria-pressed={scheduleViewMode === "grid"}
						>
							<LayoutGrid size={14} className="shrink-0" />
							<span className="hidden md:inline">Сетка</span>
						</button>
						<button
							type="button"
							onClick={() => setScheduleViewMode("timeline")}
							className={`min-h-[44px] min-w-[44px] px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
								scheduleViewMode === "timeline"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Лента приемов по дням"
							aria-label="Лента по дням"
							aria-pressed={scheduleViewMode === "timeline"}
						>
							<List size={14} className="shrink-0" />
							<span className="hidden md:inline">Лента</span>
						</button>
					</div>
				)}

				{/* Secondary Actions Overflow Dropdown Menu */}
				<div className="relative inline-flex items-center" ref={optionsMenuRef}>
					<button
						type="button"
						onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
						className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
						title="Дополнительные режимы и списки расписания"
						aria-label="Опции расписания"
						aria-expanded={isOptionsMenuOpen}
					>
						<MoreVertical size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="hidden sm:inline">Опции</span>
					</button>

					<div
						className={`schedule-options-dropdown absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[240px] max-h-[82vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 text-xs ${
							isOptionsMenuOpen ? "flex" : "hidden"
						}`}
						role="menu"
						aria-hidden={!isOptionsMenuOpen}
					>
							{/* Quick dates */}
							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
								Навигация по датам
							</div>
							<button
								type="button"
								onClick={() => {
									setScheduleDateFilter(tomorrowIso);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
							>
								<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
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
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
							>
								<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
								<span>Вся неделя</span>
							</button>

							{/* Repeat booking offsets */}
							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
								Повторный прием (+Повтор)
							</div>
							<button
								type="button"
								onClick={() => {
									handleRepeatBookingOffset(7);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
								role="menuitem"
							>
								<span>Через 7 дней</span>
								<span className="text-[10px] font-mono opacity-70">+7д</span>
							</button>
							<button
								type="button"
								onClick={() => {
									handleRepeatBookingOffset(14);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
								role="menuitem"
							>
								<span>Через 14 дней</span>
								<span className="text-[10px] font-mono opacity-70">+14д</span>
							</button>
							<button
								type="button"
								onClick={() => {
									handleRepeatBookingOffset(30);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
								role="menuitem"
							>
								<span>Через 1 месяц</span>
								<span className="text-[10px] font-mono opacity-70">+30д</span>
							</button>

							{/* Actions & Utilities */}
							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
								Инструменты расписания
							</div>

							{onOpenPatientSearch && (
								<button
									type="button"
									onClick={() => {
										onOpenPatientSearch();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									title="Мгновенный поиск пациента по телефону или фамилии (Ctrl+K)"
								>
									<UserSearch size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Пациент (Ctrl+K)</span>
								</button>
							)}

							{onToggleSmartAi && (
								<button
									type="button"
									onClick={() => {
										onToggleSmartAi();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Bot size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Записать словами (ИИ)</span>
								</button>
							)}

							{setScheduleViewMode && (
								<button
									type="button"
									onClick={() => {
										setScheduleViewMode(scheduleViewMode === "timeline" ? "grid" : "timeline");
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									{scheduleViewMode === "timeline" ? (
										<>
											<LayoutGrid size={14} className="text-[var(--teal,var(--brand-primary))]" />
											<span>Сетка по креслам</span>
										</>
									) : (
										<>
											<List size={14} className="text-[var(--teal,var(--brand-primary))]" />
											<span>Лента по дням</span>
										</>
									)}
								</button>
							)}

							{onOpenDoctorFreeSlots && (
								<button
									type="button"
									onClick={() => {
										onOpenDoctorFreeSlots();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Search size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Свободные окна</span>
								</button>
							)}

							{onOpenTomorrowReminders && (
								<button
									type="button"
									onClick={() => {
										onOpenTomorrowReminders();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									aria-label="Напомнить всем на завтра: рассылка WhatsApp и СМС"
								>
									<Send size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Напомнить на завтра</span>
								</button>
							)}

							{onEmergencyCitoBooking && (
								<button
									type="button"
									onClick={() => {
										onEmergencyCitoBooking();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									aria-label="Пациент с острой болью CITO: быстрая запись дежурному врачу"
								>
									<AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
									<span>Острая боль (CITO!)</span>
								</button>
							)}

							{/* Secondary Panels and Modes */}
							{onToggleShiftAnalytics && (
								<button
									type="button"
									onClick={() => {
										onToggleShiftAnalytics();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<BarChart3 size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}</span>
								</button>
							)}

							{onOpenShiftRoster && (
								<button
									type="button"
									onClick={() => {
										onOpenShiftRoster();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Users size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>График смен (ТК РФ)</span>
								</button>
							)}

							{onOpenWaitlist && (
								<button
									type="button"
									onClick={() => {
										onOpenWaitlist();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<UserPlus size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Лист ожидания {waitlistCount > 0 ? `(${waitlistCount})` : ""}</span>
								</button>
							)}

							{onToggleConfirmations && (
								<button
									type="button"
									onClick={() => {
										onToggleConfirmations();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<PhoneCall size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>{showConfirmationsPanel ? "Скрыть обзвон" : "Утренний обзвон"}</span>
								</button>
							)}

							{onToggleFreedSlots && (
								<button
									type="button"
									onClick={() => {
										onToggleFreedSlots();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Clock size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>{showFreedSlotsPanel ? "Скрыть окна" : "Освободившиеся окна"}</span>
								</button>
							)}

							{onToggleClipboard && (
								<button
									type="button"
									onClick={() => {
										onToggleClipboard();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Clipboard size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>{showClipboardPanel ? "Скрыть буфер" : "Буфер расписания"}</span>
								</button>
							)}
						</div>
				</div>

				{/* STRICTLY 1 PRIMARY ACTION BUTTON: "+ Запись" */}
				{onQuickBooking && (
					<button
						type="button"
						onClick={onQuickBooking}
						className="primary-button min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-7.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 shadow-sm border border-transparent transition-all cursor-pointer select-none"
						title="Новая запись пациента на прием (горячая клавиша N)"
						aria-label="Добавить запись"
					>
						<Sparkles size={13} className="shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap font-black">+ Запись</span>
						<span className="sm:hidden font-black text-sm leading-none">+</span>
					</button>
				)}
			</div>
		</section>
	);
}

