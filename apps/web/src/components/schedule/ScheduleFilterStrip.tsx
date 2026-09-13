import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, Sparkles, Bot, Search, Send, AlertCircle, UserSearch, MoreVertical, Users, UserPlus, PhoneCall, Clock, Clipboard, BarChart3, Printer, Plus, Armchair } from "lucide-react";
import React, { type ReactElement, useState, useRef, useEffect, useMemo } from "react";
import type { DentalSpecialty } from "@dental/shared";
import { specialtyLabels } from "../../workspaceUiLabels";
import { printBlankMedicalContract } from "../patients/blankContractPrint";
import { QuickAddChairModal, type QuickAddChairData } from "./QuickAddChairModal";
import type { ChairDoctorShiftAssignment } from "./ScheduleGrid";

export { QuickAddChairModal, type QuickAddChairData } from "./QuickAddChairModal";

export interface ScheduleStaffMember {
	id: string;
	fullName?: string;
	active?: boolean;
	role?: string;
	specialties?: string[];
	specialty?: string;
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
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	currentDoctorId?: string | null | undefined;
	onSelectMyChair?: (() => void) | undefined;
	scheduleViewMode?: "timeline" | "grid" | "chairs";
	setScheduleViewMode?: (mode: "timeline" | "grid" | "chairs") => void;
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
	onOpenCalendarSync?: () => void;
	onOpenAddChair?: (() => void) | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	gridStepMinutes?: 15 | 30 | 60 | undefined;
	onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
	activeFilterSummary?: React.ReactNode | undefined;
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
 * - Left: Date stepper (< dd.mm.yyyy [Календарь] >)
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
	chairDoctorAssignments,
	currentDoctorId,
	onSelectMyChair,
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
	onOpenCalendarSync,
	onOpenAddChair,
	onAddChair,
	gridStepMinutes = 30,
	onGridStepChange,
	activeFilterSummary,
}: ScheduleFilterStripProps): ReactElement {
	const activeChairs = chairs.filter((chair) => chair?.active);
	const displayChairs: readonly ScheduleChair[] = activeChairs.length > 0 ? activeChairs : DEFAULT_CLINIC_CHAIRS;
	const todayIso = new Date().toISOString().slice(0, 10);
	const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
	const currentDateIso = scheduleDateFilter || todayIso;

	// Doctor's on-duty chair detection for 1-click "Моё кресло" filter (StomX / DentalPRO parity, Mandates 8e, 8n)
	const effectiveDoctorIdForMyChair =
		currentDoctorId ||
		scheduleDoctorFilterId ||
		(staffMembers.find(
			(member) =>
				member?.active &&
				(member?.role === "doctor" || member?.role === "owner"),
		)?.id ?? null);

	const myChair = useMemo(() => {
		if (displayChairs.length === 0) return null;

		// 1. If chairDoctorAssignments are provided, look for chair bound to effective doctor
		if (chairDoctorAssignments && effectiveDoctorIdForMyChair) {
			const assignedChairId = Object.keys(chairDoctorAssignments).find(
				(cId) =>
					chairDoctorAssignments[cId]?.doctorId === effectiveDoctorIdForMyChair ||
					chairDoctorAssignments[cId]?.subShifts?.some(
						(s) => s.doctorId === effectiveDoctorIdForMyChair,
					),
			);
			if (assignedChairId) {
				const matching = displayChairs.find((c) => c.id === assignedChairId);
				if (matching) return matching;
			}
		}

		// 2. Fallback to localStorage assignments for this date if present
		if (typeof window !== "undefined" && effectiveDoctorIdForMyChair) {
			try {
				const raw = localStorage.getItem(`dente_chair_doctor_assignments_${currentDateIso}`);
				if (raw) {
					const parsed = JSON.parse(raw);
					const assignedChairId = Object.keys(parsed).find(
						(cId) =>
							parsed[cId]?.doctorId === effectiveDoctorIdForMyChair ||
							parsed[cId]?.subShifts?.some(
								// biome-ignore lint/suspicious/noExplicitAny: sub-shift check
								(s: any) => s.doctorId === effectiveDoctorIdForMyChair,
							),
					);
					if (assignedChairId) {
						const matching = displayChairs.find((c) => c.id === assignedChairId);
						if (matching) return matching;
					}
				}
			} catch {}
		}

		// 3. Solo doctor or single chair: first chair is always their chair
		if (isSoloDoctor || displayChairs.length === 1) {
			return displayChairs[0] || null;
		}

		// 4. If doctor filter is active, find first chair matching their specialty or default
		if (scheduleDoctorFilterId) {
			const doc = staffMembers.find((m) => m.id === scheduleDoctorFilterId);
			const docTyped = doc as unknown as { specialties?: string[]; specialty?: string } | undefined;
			const docSpecs = docTyped?.specialties || (docTyped?.specialty ? [docTyped.specialty] : []);
			if (docSpecs.length) {
				const specMatch = displayChairs.find(
					(c) => c.specialization && docSpecs.includes(c.specialization),
				);
				if (specMatch) return specMatch;
			}
			return displayChairs[0] || null;
		}

		return displayChairs[0] || null;
	}, [
		displayChairs,
		chairDoctorAssignments,
		effectiveDoctorIdForMyChair,
		currentDateIso,
		isSoloDoctor,
		scheduleDoctorFilterId,
		staffMembers,
	]);

	const isMyChairActive = Boolean(
		myChair && scheduleChairFilterId === myChair.id,
	);

	const handleSelectMyChair = () => {
		if (onSelectMyChair) {
			onSelectMyChair();
			return;
		}
		if (!myChair) return;

		if (scheduleChairFilterId === myChair.id) {
			// Toggle off back to all chairs
			setScheduleChairFilterId(null);
		} else {
			// 1-Click: filter directly to on-duty chair
			setScheduleChairFilterId(myChair.id);
			if (effectiveDoctorIdForMyChair && !scheduleDoctorFilterId) {
				setScheduleDoctorFilterId(effectiveDoctorIdForMyChair);
			}
		}
	};

	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
	const [isAddChairModalOpen, setIsAddChairModalOpen] = useState(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	const handleOpenAddChair = () => {
		if (typeof onOpenAddChair === "function") {
			onOpenAddChair();
		} else {
			setIsAddChairModalOpen(true);
		}
	};

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOptionsMenuOpen(false);
			}
		};
		if (isOptionsMenuOpen) {
			document.addEventListener("mousedown", handleOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
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
		<>
			<section
				className="schedule-filter-strip min-h-[44px] sm:min-h-[36px] sm:h-9 sm:max-h-9 flex items-center justify-between gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1 border-b border-[var(--line)] bg-[var(--paper)] max-w-full overflow-hidden shrink-0 select-none"
				aria-label="Сохраненные фильтры расписания"
				data-testid="schedule-toolbar"
				role="toolbar"
			>
			{/* Left: Date Stepper (< dd.mm.yyyy >) with >= 44px touch targets on mobile, 32-36px on desktop (HIG) */}
			<div className="schedule-date-picker-group flex items-center gap-1 sm:gap-1.5 shrink-0 pr-1 sm:pr-1.5 border-r border-[var(--line)]">
				<button
					type="button"
					className="secondary-button schedule-day-step-prev min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-7.5 sm:min-w-[30px] inline-flex items-center justify-center cursor-pointer rounded-lg font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] transition-all p-0 shrink-0"
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
					className="schedule-date-input min-h-[44px] sm:min-h-0 sm:h-7.5 px-1 sm:px-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none cursor-pointer hover:border-[var(--teal,var(--brand-primary))] transition-all w-[130px] min-w-[130px] sm:w-[135px] sm:min-w-[135px] text-center tracking-tight"
				/>
				<button
					type="button"
					className="secondary-button schedule-day-step-next min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-7.5 sm:min-w-[30px] inline-flex items-center justify-center cursor-pointer rounded-lg font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] transition-all p-0 shrink-0"
					onClick={() => stepScheduleDay(1)}
					aria-label="Показать следующий день"
					title="День вперёд"
				>
					<ChevronRight size={16} aria-hidden="true" />
				</button>
			</div>

			{/* Center: 1-line horizontal scrollable doctor & chair filters */}
			<div
				className="schedule-filter-chips flex-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 min-w-0"
				onWheel={(e) => {
					if (e.deltaY !== 0) {
						e.currentTarget.scrollLeft += e.deltaY;
					}
				}}
			>
				{/* "Все записи" filter chip */}
				<button
					type="button"
					className={`quick-chip ${activeScheduleFilterCount === 0 ? "active" : ""} min-h-[44px] sm:min-h-0 sm:h-7 px-2 sm:px-2.5 min-w-fit whitespace-nowrap text-xs font-semibold shrink-0 cursor-pointer rounded-lg inline-flex items-center justify-center`}
					onClick={resetScheduleFilters}
				>
					<span className="sm:hidden">Все</span>
					<span className="hidden sm:inline">Все записи</span>
				</button>

				{/* 1-Click "Моё кресло" filter chip (StomX / DentalPRO parity, Mandates 8e, 8n) */}
				{myChair && (() => {
					const cleanChairName = myChair.name.replace(/\s*\(.*\)/, "").trim();
					return (
						<button
							type="button"
							className={`quick-chip schedule-my-chair-chip ${isMyChairActive ? "active font-bold border-[var(--teal,var(--brand-primary))] text-white bg-[var(--teal,var(--brand-primary))]" : ""} min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 min-w-max whitespace-nowrap text-xs font-semibold shrink-0 flex-shrink-0 cursor-pointer rounded-lg inline-flex items-center gap-1.5 transition-all select-none`}
							onClick={handleSelectMyChair}
							title={`Моё дежурное кресло: ${cleanChairName}. Нажмите для быстрой фильтрации (1 клик)`}
							aria-label={`Моё дежурное кресло: ${cleanChairName}`}
							data-testid="schedule-my-chair-btn"
						>
							<Armchair size={13} className="shrink-0 text-current" aria-hidden="true" />
							<span className="whitespace-nowrap shrink-0 flex-shrink-0">
								Моё кресло ({cleanChairName})
							</span>
						</button>
					);
				})()}

				{/* 1-Click "Автодозвон" confirmation panel chip (Mandates 8d, 8p, 8n) */}
				{onToggleConfirmations && (
					<button
						type="button"
						className={`quick-chip schedule-auto-call-chip ${showConfirmationsPanel ? "active font-bold border-[var(--teal,var(--brand-primary))] text-white bg-[var(--teal,var(--brand-primary))]" : ""} min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 min-w-max whitespace-nowrap text-xs font-semibold shrink-0 flex-shrink-0 cursor-pointer rounded-lg inline-flex items-center gap-1.5 transition-all select-none`}
						onClick={onToggleConfirmations}
						title="Утренний автодозвон и подтверждение визитов (1 клик)"
						aria-label="Автодозвон и подтверждения"
						data-testid="schedule-auto-call-chip-btn"
					>
						<PhoneCall size={13} className="shrink-0 text-current" aria-hidden="true" />
						<span className="whitespace-nowrap shrink-0 flex-shrink-0">Автодозвон</span>
					</button>
				)}

				{/* Doctor filter chips */}
				{!isSoloDoctor &&
					staffMembers
						.filter(
							(member) =>
								member?.active &&
								(member?.role === "doctor" || member?.role === "owner"),
						)
						.map((member) => {
							const rawName = member?.fullName || "Врач";
							const parts = rawName.trim().split(/\s+/);
							const formattedShort =
								parts.length > 1
									? `${parts[0]} ${parts.slice(1).map((p) => (p[0] ? `${p[0].toUpperCase()}.` : "")).join("")}`
									: rawName;

							return (
								<button
									key={member.id}
									type="button"
									className={`quick-chip schedule-doctor-chip ${scheduleDoctorFilterId === member.id ? "active" : ""} min-h-[44px] sm:min-h-0 sm:h-7 min-w-fit shrink-0 px-2.5 whitespace-nowrap text-xs font-medium cursor-pointer rounded-lg inline-flex items-center justify-center flex-shrink-0 select-none`}
									onClick={() =>
										setScheduleDoctorFilterId(
											scheduleDoctorFilterId === member.id ? null : member.id,
										)
									}
									title={`Фильтр по врачу: ${member?.fullName || "Врач"}`}
								>
									<span className="shrink-0 whitespace-nowrap min-w-fit font-medium">
										{formattedShort}
									</span>
								</button>
							);
						})}

				{/* Chair filter chips with specializations */}
				{displayChairs.length > 0 && (
					<span
						className="sr-only"
						data-testid="chair-view-count-badge"
					>
						{displayChairs.length}
					</span>
				)}
				{displayChairs.map((chair) => {
					const specName = formatChairSpecialtyLabel(chair?.specialization);
					const chairLabel = specName && !chair.name.includes("(")
						? `${chair.name} (${specName})`
						: chair?.name || "Кресло";

					return (
						<button
							key={chair.id}
							type="button"
							data-testid={`chair-view-badge-${chair.id}`}
							className={`quick-chip ${scheduleChairFilterId === chair.id ? "active" : ""} min-h-[44px] sm:min-h-0 sm:h-7 min-w-fit shrink-0 px-2 whitespace-nowrap text-xs font-medium cursor-pointer rounded-lg inline-flex items-center gap-1`}
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

				{/* 1-Click Inline "+ Кресло" addition button (StomX / DentalPRO parity, Mandates 8e, 8n) */}
				<button
					type="button"
					onClick={handleOpenAddChair}
					className="schedule-add-chair-chip-btn min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-7 sm:min-w-0 shrink-0 px-2.5 rounded-lg border border-dashed border-[var(--teal,var(--brand-primary))] bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-[var(--paper)] text-[var(--teal-dark)] dark:text-[var(--teal)] dark:bg-[var(--teal-soft)] text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 select-none"
					title="Быстрое добавление кресла или кабинета в расписание (1 клик)"
					aria-label="Добавить кресло в расписание"
					data-testid="schedule-add-chair-btn"
				>
					<span className="whitespace-nowrap font-bold">+ Кресло</span>
				</button>
			</div>

			{/* Right: [Сетка | Лента] Switcher + [Опции] Dropdown Menu + STRICTLY 1 Primary [+ Запись] Button */}
			<div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-1 sm:pl-1.5 border-l border-[var(--line)]">
				{/* 1-Click View Mode Switcher: [ Лента | Сетка | По креслам ] (desktop & tablet, on mobile embedded in options dropdown) */}
				{setScheduleViewMode && (
					<div className="hidden sm:flex items-center gap-0.5 sm:gap-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" role="group" aria-label="Режим отображения">
						<button
							type="button"
							onClick={() => setScheduleViewMode("timeline")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 min-w-[34px] sm:min-w-0 px-1.5 sm:px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
								scheduleViewMode === "timeline"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
									: "bg-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							title="Лента приемов по дням"
							aria-label="Лента по дням"
							aria-pressed={scheduleViewMode === "timeline"}
							data-testid="schedule-view-mode-timeline"
						>
							<List size={14} className="shrink-0" />
							<span className="hidden md:inline">Лента</span>
						</button>
						<button
							type="button"
							onClick={() => setScheduleViewMode("grid")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 min-w-[34px] sm:min-w-0 px-1.5 sm:px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
								scheduleViewMode === "grid"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
									: "bg-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							title="Сетка по кабинетам и креслам"
							aria-label="Сетка по кабинетам"
							aria-pressed={scheduleViewMode === "grid"}
							data-testid="schedule-view-mode-grid"
						>
							<LayoutGrid size={14} className="shrink-0" />
							<span className="hidden md:inline">Сетка</span>
						</button>
						<button
							type="button"
							onClick={() => setScheduleViewMode("chairs")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 min-w-[34px] sm:min-w-0 px-1.5 sm:px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
								scheduleViewMode === "chairs"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
									: "bg-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							title="Режим расписания по креслам (StomX паритет)"
							aria-label="По креслам"
							aria-pressed={scheduleViewMode === "chairs"}
							data-testid="schedule-view-mode-chairs"
						>
							<Armchair size={14} className="shrink-0" />
							<span className="hidden md:inline">По креслам</span>
						</button>
					</div>
				)}

				{/* Secondary Actions Overflow Dropdown Menu */}
				<div className="relative inline-flex items-center" ref={optionsMenuRef}>
					<button
						type="button"
						onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-7.5 sm:min-w-0 px-1.5 sm:px-2.5 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)] transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 shrink-0"
						title="Дополнительные режимы и списки расписания"
						aria-label="Опции расписания"
						aria-expanded={isOptionsMenuOpen}
						data-testid="schedule-toolbar-options-btn"
					>
						<MoreVertical size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="hidden sm:inline">Опции</span>
					</button>

					<div
						className={`schedule-options-dropdown absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[220px] max-w-[calc(100vw-16px)] max-h-[82vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 text-xs ${
							isOptionsMenuOpen ? "flex" : "hidden"
						}`}
						role="menu"
						aria-hidden={!isOptionsMenuOpen}
					>
							{/* Mobile View Mode Switcher (visible strictly on < sm) */}
							{setScheduleViewMode && (
								<div className="sm:hidden mb-1.5 pb-1.5 border-b border-[var(--line)]">
									<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
										Режим отображения
									</div>
									<div className="flex items-center gap-1 p-0.5 bg-[var(--paper-soft)] rounded-lg">
										<button
											type="button"
											onClick={() => {
												setScheduleViewMode("timeline");
												setIsOptionsMenuOpen(false);
											}}
											className={`flex-1 min-h-[44px] px-2 py-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
												scheduleViewMode === "timeline"
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
													: "bg-transparent text-[var(--ink)]"
											}`}
										>
											<List size={13} className="shrink-0" />
											<span>Лента</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setScheduleViewMode("grid");
												setIsOptionsMenuOpen(false);
											}}
											className={`flex-1 min-h-[44px] px-2 py-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
												scheduleViewMode === "grid"
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
													: "bg-transparent text-[var(--ink)]"
											}`}
										>
											<LayoutGrid size={13} className="shrink-0" />
											<span>Сетка</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setScheduleViewMode("chairs");
												setIsOptionsMenuOpen(false);
											}}
											className={`flex-1 min-h-[44px] px-2 py-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
												scheduleViewMode === "chairs"
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
													: "bg-transparent text-[var(--ink)]"
											}`}
										>
											<Armchair size={13} className="shrink-0" />
											<span>Кресла</span>
										</button>
									</div>
								</div>
							)}

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

							{/* Grid Step Selector (15 / 30 / 60 min, Feature 192, StomX Parity, Mandate 8p) */}
							<div className="flex items-center justify-between px-2.5 py-1 text-xs">
								<span className="font-bold text-[var(--muted)]">Шаг сетки:</span>
								<div className="flex items-center gap-1" role="group" aria-label="Шаг сетки расписания" data-testid="schedule-filter-grid-step-selector">
									{([15, 30, 60] as const).map((step) => (
										<button
											key={step}
											type="button"
											onClick={() => {
												onGridStepChange?.(step);
												setIsOptionsMenuOpen(false);
											}}
											className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
												(gridStepMinutes ?? 30) === step
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
													: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--teal-soft)]"
											}`}
											data-testid={`filter-strip-step-${step}`}
										>
											{step}м
										</button>
									))}
								</div>
							</div>

							<button
								type="button"
								onClick={() => {
									setIsOptionsMenuOpen(false);
									handleOpenAddChair();
								}}
								className="w-full min-h-[44px] text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
								data-testid="schedule-options-add-chair-btn"
								title="Быстрое добавление кресла или кабинета в расписание (1 клик)"
								style={{ minHeight: "44px" }}
							>
								<Plus size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" aria-hidden="true" />
								<span>Добавить кресло (+ Кресло)</span>
							</button>

							{onQuickBooking && (
								<button
									type="button"
									onClick={() => {
										onQuickBooking();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									data-testid="schedule-toolbar-quick-booking-btn"
									title="Новая запись пациента на прием (горячая клавиша N)"
								>
									<Sparkles size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Быстрая запись (N)</span>
								</button>
							)}

							{onOpenPatientSearch && (
								<button
									type="button"
									onClick={() => {
										onOpenPatientSearch();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									data-testid="schedule-search-patient-btn"
									title="Мгновенный поиск пациента по телефону или фамилии (Ctrl+K)"
								>
									<UserSearch size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Пациент (Ctrl+K)</span>
								</button>
							)}

							<button
								type="button"
								onClick={() => {
									setIsOptionsMenuOpen(false);
									void printBlankMedicalContract(null);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
								title="Распечатать пустой договор со строками _______ для ручного заполнения"
								data-testid="schedule-toolbar-print-blank-contract-btn"
							>
								<Printer size={14} className="text-[var(--teal,var(--brand-primary))]" />
								<span>Бланк договора (_______)</span>
							</button>

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
										const nextMode =
											scheduleViewMode === "timeline"
												? "grid"
												: scheduleViewMode === "grid"
													? "chairs"
													: "timeline";
										setScheduleViewMode(nextMode);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									data-testid="schedule-options-mode-toggle"
								>
									{scheduleViewMode === "timeline" ? (
										<>
											<LayoutGrid size={14} className="text-[var(--teal,var(--brand-primary))]" />
											<span>Сетка по кабинетам</span>
										</>
									) : scheduleViewMode === "grid" ? (
										<>
											<Armchair size={14} className="text-[var(--teal,var(--brand-primary))]" />
											<span>По креслам (StomX)</span>
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

							{onOpenCalendarSync && (
								<button
									type="button"
									onClick={() => {
										onOpenCalendarSync();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									data-testid="open-calendar-sync-modal-btn"
									title="Синхронизация с Яндекс Календарём, Apple Calendar и Google Calendar (iCal/CalDAV)"
								>
									<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Синхронизация календарей (iCal)</span>
								</button>
							)}
						</div>
				</div>
			</div>
		</section>

		{!onOpenAddChair && isAddChairModalOpen && (
			<QuickAddChairModal
				isOpen={isAddChairModalOpen}
				onClose={() => setIsAddChairModalOpen(false)}
				existingChairsCount={chairs.length || displayChairs.length}
				{...(onAddChair ? { onAddChair } : {})}
			/>
		)}
	</>
);
}

