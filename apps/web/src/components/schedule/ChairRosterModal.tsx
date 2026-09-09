/**
 * DENTE Dental CRM — Compact Chair Roster Week Matrix (StomX / IDENT Parity)
 *
 * Compliance & Standards:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-tap weekly shift assignment, copy week/month)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (compact 32-36px toolbar, touch targets >= 44x44px)
 */

import React, { useState, useEffect, useMemo } from "react";
import {
	AlertTriangle,
	Armchair,
	CalendarRange,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Copy,
	Layers,
	RotateCcw,
	Save,
	Sparkles,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import QuickAddDoctorModal from "./QuickAddDoctorModal";
import {
	DoctorShiftRosterModal,
	type DoctorShiftRosterModalProps,
	type DoctorShift,
	type StaffMember,
	type CabinetDefinition,
	type ShiftArchetypeId,
	type DoctorChairRosterTemplateId,
	type DoctorChairRosterTemplate,
	getMondayOfWeekIso,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
	applyDoctorChairWeeklyTemplate,
	applyCellShiftPreset,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	addDaysToDateIso,
	getWeekDaysIso,
	applyDoctorChairDateRange,
	type DateRangeShiftPreset,
	type DateRangeShiftBindingParams,
} from "./roster/DoctorShiftRosterModal";
import {
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	type MedicalStaffRole,
} from "./roster/doctorShiftRosterPresets";
import {
	generateWeeklyScheduleForStaffAndCabinets,
} from "./roster/doctorWeeklyScheduleGenerator";
import { detectRosterConflicts } from "./roster/doctorShiftRosterEngine";
import "./roster/doctorShiftRoster.css";

export interface ChairRosterModalProps extends DoctorShiftRosterModalProps {
	/**
	 * Focus on a specific chair ID when opening the roster modal
	 */
	focusedChairId?: string | null;
	/**
	 * Optional callback when doctor is quickly added
	 */
	onAddDoctor?: (doctor: any) => void;
}

export const ChairRosterModal: React.FC<ChairRosterModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		initialShifts,
		staffList = DEFAULT_CLINIC_STAFF,
		cabinets = CLINIC_CABINETS_CATALOG,
		clinicName = 'ООО "Денте Клиник"',
		onSave,
		currentDate,
		focusedChairId,
	} = props;

	// View mode: 'matrix' (compact StomX chair-by-week grid) or 'studio' (full DoctorShiftRosterModal)
	const [viewMode, setViewMode] = useState<"matrix" | "studio">("matrix");
	const [isQuickAddDoctorOpen, setIsQuickAddDoctorOpen] = useState(false);
	const [localStaffList, setLocalStaffList] = useState<StaffMember[]>(staffList);

	useEffect(() => {
		setLocalStaffList(staffList);
	}, [staffList]);

	// Active week Monday
	const defaultMonday = useMemo(
		() => getMondayOfWeekIso(currentDate),
		[currentDate],
	);
	const [weekStartDateIso, setWeekStartDateIso] = useState<string>(defaultMonday);

	useEffect(() => {
		if (currentDate) {
			setWeekStartDateIso(getMondayOfWeekIso(currentDate));
		}
	}, [currentDate]);

	// Shifts state
	const [shifts, setShifts] = useState<DoctorShift[]>(() => {
		if (initialShifts && initialShifts.length > 0) return initialShifts;
		if (Array.isArray(initialShifts) && initialShifts.length === 0) return [];
		return generateWeeklyScheduleForStaffAndCabinets(
			defaultMonday,
			localStaffList,
			cabinets,
			"five_day",
		);
	});

	useEffect(() => {
		if (initialShifts) {
			setShifts(initialShifts);
		}
	}, [initialShifts]);

	// Notification banner
	const [notification, setNotification] = useState<{
		type: "success" | "info" | "error";
		message: string;
	} | null>(null);

	// Selected active doctor per chair for 1-tap shift assignment
	const doctors = useMemo(
		() => localStaffList.filter((s) => s.isDoctor),
		[localStaffList],
	);
	const fallbackDoctor = doctors[0] || localStaffList[0] || DEFAULT_CLINIC_STAFF[0]!;

	const [selectedDoctorByChair, setSelectedDoctorByChair] = useState<
		Record<string, string>
	>({});

	// State for multi-day date range shift binding (StomX / DentalPRO parity)
	const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
	const [rangeDoctorId, setRangeDoctorId] = useState<string>("");
	const [rangeChairId, setRangeChairId] = useState<string>("");
	const [rangeStartDate, setRangeStartDate] = useState<string>(weekStartDateIso);
	const [rangeEndDate, setRangeEndDate] = useState<string>(addDaysToDateIso(weekStartDateIso, 6));
	const [rangePreset, setRangePreset] = useState<DateRangeShiftPreset>("morning");

	useEffect(() => {
		if (!rangeDoctorId && (doctors[0]?.id || fallbackDoctor.id)) {
			setRangeDoctorId(doctors[0]?.id || fallbackDoctor.id);
		}
		if (!rangeChairId && cabinets[0]?.chairs[0]?.id) {
			setRangeChairId(cabinets[0].chairs[0].id);
		}
	}, [doctors, fallbackDoctor, cabinets, rangeDoctorId, rangeChairId]);

	useEffect(() => {
		setRangeStartDate(weekStartDateIso);
		setRangeEndDate(addDaysToDateIso(weekStartDateIso, 6));
	}, [weekStartDateIso]);

	const getActiveDoctorForChair = (chairId: string): StaffMember => {
		const docId = selectedDoctorByChair[chairId];
		if (docId) {
			const found = localStaffList.find((s) => s.id === docId);
			if (found) return found;
		}
		const pref = doctors.find((d) => d.preferredChairId === chairId);
		return pref || fallbackDoctor;
	};

	// 7 days of the active week (Monday to Sunday)
	const weekDays = useMemo(() => {
		const dayNamesRu = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
		const days: Array<{
			dateIso: string;
			dayName: string;
			dayNumber: string;
			isWeekend: boolean;
		}> = [];
		for (let i = 0; i < 7; i++) {
			const dateIso = addDaysToDateIso(weekStartDateIso, i);
			const parts = dateIso.split("-").map(Number);
			const d = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
			const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
			days.push({
				dateIso,
				dayName: dayNamesRu[i] || "Пн",
				dayNumber: dateIso.substring(8, 10),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			});
		}
		return days;
	}, [weekStartDateIso]);

	const weekEndDateIso = weekDays[6]?.dateIso || weekStartDateIso;

	// Week navigation handlers
	const handlePrevWeek = () => {
		setWeekStartDateIso((prev) => addDaysToDateIso(prev, -7));
	};

	const handleNextWeek = () => {
		setWeekStartDateIso((prev) => addDaysToDateIso(prev, 7));
	};

	// 1-Click Copy Week to Next Week
	const handleCopyWeekToNextWeek = () => {
		const nextMondayIso = addDaysToDateIso(weekStartDateIso, 7);
		const nextShifts = copyWeekShiftsToTargetWeek(
			shifts,
			weekStartDateIso,
			nextMondayIso,
		);
		setShifts(nextShifts);
		const weekShiftsCount = shifts.filter(
			(s) =>
				s.dateIso >= weekStartDateIso &&
				s.dateIso <= weekEndDateIso &&
				s.status !== "cancelled",
		).length;
		setNotification({
			type: "success",
			message: `Сетка кресел скопирована на след. неделю (${nextMondayIso}): перенесено ${weekShiftsCount} смен`,
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// 1-Click Copy Week to 4 Weeks (Month)
	const handleCopyWeekToMonth = () => {
		const nextShifts = copyWeekShiftsToMonth(shifts, weekStartDateIso, 4);
		setShifts(nextShifts);
		const weekShiftsCount = shifts.filter(
			(s) =>
				s.dateIso >= weekStartDateIso &&
				s.dateIso <= weekEndDateIso &&
				s.status !== "cancelled",
		).length;
		setNotification({
			type: "success",
			message: `Сетка кресел скопирована на 4 недели вперед (месяц): перенесено ${weekShiftsCount * 4} смен`,
		});
		setTimeout(() => setNotification(null), 4000);
	};

	// 1-Click Clear Week Shifts
	const handleClearWeek = () => {
		const nextShifts = clearWeekShifts(shifts, weekStartDateIso);
		setShifts(nextShifts);
		setNotification({
			type: "info",
			message: "Все смены текущей недели очищены (чистая сетка кресел)",
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// 1-Click Rotate Shifts for a specific chair (Утро ⇄ Вечер)
	const handleRotateChairShifts = (chairId: string) => {
		const nextShifts = rotateWeekShifts(shifts, weekStartDateIso, { chairId });
		setShifts(nextShifts);
		setNotification({
			type: "success",
			message: "Ротация смен (Утро ⇄ Вечер) выполнена для кресла",
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// 1-Click Global Rotate Shifts for all chairs in the week (Утро ⇄ Вечер)
	const handleGlobalRotateShifts = () => {
		const nextShifts = rotateWeekShifts(shifts, weekStartDateIso);
		setShifts(nextShifts);
		setNotification({
			type: "success",
			message: "Ротация смен (Утро ⇄ Вечер) выполнена для всех кресел недели",
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// 1-Tap Fast Cell Shift Assignment
	const handleCellPreset = (
		dateIso: string,
		cabinetId: string,
		chairId: string,
		presetType: "morning" | "morning_9" | "evening" | "evening_15" | "full_day" | "clear",
	) => {
		const activeDoc = getActiveDoctorForChair(chairId);
		const nextShifts = applyCellShiftPreset(shifts, {
			dateIso,
			cabinetId,
			chairId,
			presetType,
			doctorId: activeDoc.id,
			staffList: localStaffList,
			cabinets,
		});
		setShifts(nextShifts);

		const presetLabels: Record<string, string> = {
			morning: `1 смена 08:00–14:00 (${activeDoc.shortName})`,
			morning_9: `1 смена 09:00–15:00 (${activeDoc.shortName})`,
			evening: `2 смена 14:00–20:00 (${activeDoc.shortName})`,
			evening_15: `2 смена 15:00–21:00 (${activeDoc.shortName})`,
			full_day: `Весь день 08:00–20:00 (${activeDoc.shortName})`,
			clear: "Выходной (смена очищена)",
		};

		setNotification({
			type: presetType === "clear" ? "info" : "success",
			message: presetLabels[presetType] || "Смена обновлена",
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// 1-Click Fast Date Range Assignment (StomX / DentalPRO parity, Mandates 8e, 8k, 8n)
	const handleApplyDateRange = () => {
		const targetDocId = rangeDoctorId || doctors[0]?.id || fallbackDoctor.id;
		const targetChairId = rangeChairId || cabinets[0]?.chairs[0]?.id || "chair-1a";
		if (!rangeStartDate || !rangeEndDate || !targetDocId || !targetChairId) {
			setNotification({
				type: "error",
				message: "Укажите даты, врача и кресло для назначения",
			});
			return;
		}
		const doc = localStaffList.find((s) => s.id === targetDocId) || fallbackDoctor;
		const targetChairObj = cabinets.flatMap((c) => c.chairs).find((ch) => ch.id === targetChairId);
		const targetCabObj = cabinets.find((c) => c.chairs.some((ch) => ch.id === targetChairId));

		const nextShifts = applyDoctorChairDateRange(shifts, {
			startDateIso: rangeStartDate,
			endDateIso: rangeEndDate,
			doctorId: targetDocId,
			chairId: targetChairId,
			cabinetId: targetCabObj?.id,
			shiftPreset: rangePreset,
			staffList: localStaffList,
			cabinets,
		});
		setShifts(nextShifts);
		setIsDateRangeOpen(false);

		setNotification({
			type: "success",
			message: `Врач ${doc.shortName} назначен на кресло «${targetChairObj?.name || targetChairId}» (${rangeStartDate} — ${rangeEndDate})`,
		});
		setTimeout(() => setNotification(null), 4000);
	};

	// 1-Click Chair Weekly Template (StomX / DentalPRO parity)
	const handleApplyChairTemplate = (
		chairId: string,
		cabinetId: string,
		templateId: DoctorChairRosterTemplateId,
	) => {
		const activeDoc = getActiveDoctorForChair(chairId);
		const nextShifts = applyDoctorChairWeeklyTemplate(shifts, {
			weekStartDateIso,
			templateId,
			doctorId: activeDoc.id,
			chairId,
			cabinetId,
			staffList: localStaffList,
			cabinets,
		});
		setShifts(nextShifts);

		const templateObj = DOCTOR_CHAIR_ROSTER_TEMPLATES.find(
			(t) => t.id === templateId,
		);
		setNotification({
			type: "success",
			message: `Кресло закреплено: «${templateObj?.title || templateId}» • ${activeDoc.shortName}`,
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// Save all changes
	const handleSaveAll = async (closeAfter = false) => {
		let shiftsToSave = shifts;
		if (shiftsToSave.length === 0) {
			shiftsToSave = generateWeeklyScheduleForStaffAndCabinets(
				weekStartDateIso,
				localStaffList,
				cabinets,
				"five_day",
			);
			setShifts(shiftsToSave);
		}
		if (onSave) {
			await onSave(shiftsToSave);
		}
		setNotification({
			type: "success",
			message: `График сменности кресел сохранен (${shiftsToSave.length} смен)`,
		});
		if (closeAfter) {
			onClose();
		} else {
			setTimeout(() => setNotification(null), 3000);
		}
	};

	// Run conflict detection
	const conflicts = useMemo(
		() => detectRosterConflicts(shifts, localStaffList),
		[shifts, localStaffList],
	);

	if (!isOpen) return null;

	// If user toggled to full studio view, render DoctorShiftRosterModal
	if (viewMode === "studio") {
		return (
			<DoctorShiftRosterModal
				{...props}
				initialShifts={shifts}
				onSave={async (savedShifts) => {
					setShifts(savedShifts);
					if (onSave) await onSave(savedShifts);
				}}
				onClose={() => setViewMode("matrix")}
			/>
		);
	}

	return (
		<div
			className="roster-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Сетка кресел и график врачей"
		>
			<div className="roster-modal-container">
				{/* Top Header Strip */}
				<div className="roster-header">
					<div className="roster-header-top">
						<div className="roster-title-block">
							<span className="roster-title-badge">StomX / DentalPRO</span>
							<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
								Сетка кресел — график врачей по дням недели
							</h2>
							{clinicName && (
								<span
									style={{
										fontSize: "0.8125rem",
										color: "var(--muted, #64748b)",
										fontWeight: 500,
									}}
								>
									• {clinicName}
								</span>
							)}
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<button
								type="button"
								data-testid="btn-roster-add-doctor"
								className="roster-btn roster-btn-secondary"
								onClick={() => setIsQuickAddDoctorOpen(true)}
								style={{ minHeight: "44px" }}
								title="Быстро добавить врача в график (+ Врач)"
							>
								<UserPlus size={16} />
								<span>+ Врач</span>
							</button>
							<button
								type="button"
								data-testid="chair-view-mode-toggle"
								className="roster-btn roster-btn-secondary"
								onClick={() => setViewMode("studio")}
								style={{ minHeight: "44px" }}
								title="Переключиться в расширенный табель учета (Т-13, баланс часов)"
							>
								<Clock size={16} />
								<span>Табель Т-13 / Студия</span>
							</button>
							<button
								type="button"
								data-testid="chair-save-btn"
								className="roster-btn roster-btn-primary"
								onClick={() => handleSaveAll(false)}
								style={{ minHeight: "44px" }}
								title="Сохранить изменения сетки кресел (Мандат 8e)"
							>
								<Save size={16} />
								<span>Сохранить</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onClose}
								style={{ minHeight: "44px" }}
								title="Закрыть окно (Esc)"
							>
								<X size={16} />
								<span>Закрыть</span>
							</button>
						</div>
					</div>

					{/* Notification Toast Strip */}
					{notification && (
						<div
							className={`roster-notification roster-notification-${notification.type}`}
						>
							{notification.type === "success" && <Check size={16} />}
							{notification.type === "error" && <AlertTriangle size={16} />}
							{notification.type === "info" && <Clock size={16} />}
							<span>{notification.message}</span>
						</div>
					)}

					{/* Navigation & 1-Click Week Copy Action Strip */}
					<div className="roster-nav-strip">
						<div className="roster-week-nav">
							<button
								type="button"
								className="roster-btn-icon"
								onClick={handlePrevWeek}
								title="Предыдущая неделя"
								style={{ minHeight: "44px", minWidth: "44px" }}
							>
								<ChevronLeft size={18} />
							</button>
							<div className="roster-week-label">
								<span className="roster-week-dates">
									{weekStartDateIso} — {weekEndDateIso}
								</span>
							</div>
							<button
								type="button"
								className="roster-btn-icon"
								onClick={handleNextWeek}
								title="Следующая неделя"
								style={{ minHeight: "44px", minWidth: "44px" }}
							>
								<ChevronRight size={18} />
							</button>
						</div>

						{/* 1-Click Copy & Clear Actions (StomX / DentalPRO parity, Mandates 8e, 8k, 8n) */}
						<div className="roster-actions-group">
							<button
								type="button"
								data-testid="chair-date-range-trigger-btn"
								className={`roster-btn ${isDateRangeOpen ? "roster-btn-primary" : "roster-btn-secondary"}`}
								onClick={() => setIsDateRangeOpen((prev) => !prev)}
								style={{ minHeight: "44px" }}
								title="Быстрое назначение врача на кресло по диапазону дат (StomX / DentalPRO Parity)"
							>
								<CalendarRange size={16} />
								<span>Диапазон дат...</span>
							</button>
							<button
								type="button"
								data-testid="chair-copy-next-week-btn"
								className="roster-btn roster-btn-secondary"
								onClick={handleCopyWeekToNextWeek}
								style={{ minHeight: "44px" }}
								title="Копировать все смены текущей недели на следующую неделю (+7 дней) в 1 клик"
							>
								<Copy size={16} />
								<span>Копировать на след. неделю</span>
							</button>
							<button
								type="button"
								data-testid="chair-copy-month-btn"
								className="roster-btn roster-btn-secondary"
								onClick={handleCopyWeekToMonth}
								style={{ minHeight: "44px" }}
								title="Копировать график текущей недели на следующие 4 недели вперед (месяц) в 1 клик"
							>
								<CalendarRange size={16} />
								<span>Копировать на 4 недели (месяц)</span>
							</button>
							<button
								type="button"
								data-testid="chair-clear-week-btn"
								className="roster-btn roster-btn-secondary"
								onClick={handleClearWeek}
								style={{ minHeight: "44px", color: "var(--bad-fg, #ef4444)" }}
								title="Очистить все смены текущей недели в 1 клик"
							>
								<RotateCcw size={16} />
								<span>Очистить неделю</span>
							</button>
							<button
								type="button"
								data-testid="chair-global-rotate-shifts-btn"
								className="roster-btn roster-btn-secondary"
								onClick={handleGlobalRotateShifts}
								style={{ minHeight: "44px" }}
								title="Ротация смен (Утро ⇄ Вечер) для всех кресел текущей недели в 1 клик"
							>
								<RotateCcw size={16} />
								<span>Ротация (Утро ⇄ Вечер)</span>
							</button>
						</div>
					</div>
				</div>

				{/* Collapsible Date Range Shift Assignment Panel (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n) */}
				{isDateRangeOpen && (
					<div
						data-testid="chair-date-range-panel"
						style={{
							background: "var(--paper-soft, #f8fafc)",
							borderBottom: "1px solid var(--line, #e2e8f0)",
							padding: "1rem 1.5rem",
							display: "flex",
							flexDirection: "column",
							gap: "0.75rem",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<CalendarRange size={18} color="var(--teal, #0d9488)" />
								<span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
									Назначение врача на кресло по диапазону дат (StomX Parity)
								</span>
							</div>
							<button
								type="button"
								onClick={() => setIsDateRangeOpen(false)}
								className="roster-btn roster-btn-secondary"
								style={{ minHeight: "36px", padding: "0 0.5rem" }}
							>
								<X size={14} />
								<span>Свернуть</span>
							</button>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
								gap: "0.75rem",
								alignItems: "flex-end",
							}}
						>
							<div>
								<label
									htmlFor="chair-range-doctor-select"
									style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem" }}
								>
									Врач
								</label>
								<select
									id="chair-range-doctor-select"
									data-testid="chair-range-doctor-select"
									value={rangeDoctorId}
									onChange={(e) => setRangeDoctorId(e.target.value)}
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.375rem 0.5rem",
										borderRadius: "8px",
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										color: "var(--ink, #0f172a)",
										fontWeight: 600,
										fontSize: "0.8125rem",
									}}
								>
									{doctors.map((d) => (
										<option key={d.id} value={d.id}>
											{d.fullName} ({d.shortName})
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="chair-range-chair-select"
									style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem" }}
								>
									Кресло
								</label>
								<select
									id="chair-range-chair-select"
									data-testid="chair-range-chair-select"
									value={rangeChairId}
									onChange={(e) => setRangeChairId(e.target.value)}
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.375rem 0.5rem",
										borderRadius: "8px",
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										color: "var(--ink, #0f172a)",
										fontWeight: 600,
										fontSize: "0.8125rem",
									}}
								>
									{cabinets.flatMap((cab) =>
										cab.chairs.map((ch) => (
											<option key={ch.id} value={ch.id}>
												{cab.name} — {ch.name}
											</option>
										)),
									)}
								</select>
							</div>

							<div>
								<label
									htmlFor="chair-range-start-date"
									style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem" }}
								>
									Начальная дата
								</label>
								<input
									id="chair-range-start-date"
									data-testid="chair-range-start-date"
									type="date"
									value={rangeStartDate}
									onChange={(e) => setRangeStartDate(e.target.value)}
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.375rem 0.5rem",
										borderRadius: "8px",
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										color: "var(--ink, #0f172a)",
										fontWeight: 600,
										fontSize: "0.8125rem",
									}}
								/>
							</div>

							<div>
								<label
									htmlFor="chair-range-end-date"
									style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem" }}
								>
									Конечная дата
								</label>
								<input
									id="chair-range-end-date"
									data-testid="chair-range-end-date"
									type="date"
									value={rangeEndDate}
									onChange={(e) => setRangeEndDate(e.target.value)}
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.375rem 0.5rem",
										borderRadius: "8px",
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										color: "var(--ink, #0f172a)",
										fontWeight: 600,
										fontSize: "0.8125rem",
									}}
								/>
							</div>
						</div>

						{/* Shift Preset Selector Chips */}
						<div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
							<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
								Смена / График:
							</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
								{[
									{ id: "morning", label: "1 смена (08:00–14:00)", testId: "chair-range-preset-morning" },
									{ id: "morning_9", label: "1 смена (09:00–15:00)", testId: "chair-range-preset-morning-9" },
									{ id: "evening", label: "2 смена (14:00–20:00)", testId: "chair-range-preset-evening" },
									{ id: "evening_15", label: "2 смена (15:00–21:00)", testId: "chair-range-preset-evening-15" },
									{ id: "full", label: "Весь день (08:00–20:00)", testId: "chair-range-preset-full" },
									{ id: "two_two", label: "2 через 2 (08–20)", testId: "chair-range-preset-two-two" },
									{ id: "five_day", label: "Пятидневка Пн–Пт", testId: "chair-range-preset-five-day" },
								].map((preset) => (
									<button
										key={preset.id}
										type="button"
										data-testid={preset.testId}
										onClick={() => setRangePreset(preset.id as DateRangeShiftPreset)}
										className={`roster-btn ${rangePreset === preset.id ? "roster-btn-primary" : "roster-btn-secondary"}`}
										style={{ minHeight: "44px", fontSize: "0.75rem" }}
									>
										{preset.label}
									</button>
								))}
							</div>
						</div>

						{/* Action Apply Button */}
						<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.25rem" }}>
							<button
								type="button"
								data-testid="chair-apply-date-range-btn"
								className="roster-btn roster-btn-primary"
								onClick={handleApplyDateRange}
								style={{ minHeight: "44px" }}
								title="Заполнить смены на выбранный диапазон дат в 1 клик (StomX Parity)"
							>
								<Check size={16} />
								<span>Применить график на диапазон</span>
							</button>
						</div>
					</div>
				)}

				{/* Compact Chair Matrix Body */}
				<div
					style={{
						flex: 1,
						overflowY: "auto",
						padding: "1rem 1.5rem",
						display: "flex",
						flexDirection: "column",
						gap: "1.25rem",
					}}
				>
					{cabinets.map((cab) => (
						<div key={cab.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									paddingBottom: "0.25rem",
									borderBottom: "2px solid var(--line, #e2e8f0)",
								}}
							>
								<span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
									{cab.name}
								</span>
								<span
									style={{
										fontSize: "0.75rem",
										color: "var(--muted, #64748b)",
									}}
								>
									({cab.chairs.length} {cab.chairs.length === 1 ? "кресло" : "кресла"})
								</span>
							</div>

							{cab.chairs.map((chair) => {
								const isFocused = focusedChairId === chair.id;
								const activeDoc = getActiveDoctorForChair(chair.id);

								return (
									<div
										key={chair.id}
										style={{
											background: "var(--paper, #ffffff)",
											border: isFocused
												? "2px solid var(--teal, #0d9488)"
												: "1px solid var(--line, #e2e8f0)",
											borderRadius: "12px",
											padding: "0.875rem",
											boxShadow: isFocused ? "var(--shadow-2)" : "var(--shadow-1)",
										}}
									>
										{/* Chair Top Info Strip */}
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "0.75rem",
												marginBottom: "0.75rem",
												flexWrap: "wrap",
											}}
										>
											<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
												<Armchair size={18} color="var(--teal, #0d9488)" />
												<span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
													{chair.name}
												</span>
												{chair.equipment && (
													<span
														style={{
															fontSize: "0.75rem",
															color: "var(--muted, #64748b)",
															background: "var(--paper-soft, #f8fafc)",
															padding: "0.125rem 0.5rem",
															borderRadius: "6px",
															border: "1px solid var(--line, #e2e8f0)",
														}}
													>
														{chair.equipment}
													</span>
												)}
											</div>

											{/* Active Doctor Selector for 1-tap presets on this chair */}
											<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
												<span
													style={{
														fontSize: "0.75rem",
														fontWeight: 600,
														color: "var(--muted, #64748b)",
													}}
												>
													Врач для смен:
												</span>
												<select
													data-testid={`chair-doctor-select-${chair.id}`}
													value={activeDoc.id}
													onChange={(e) => {
														const newDocId = e.target.value;
														setSelectedDoctorByChair((prev) => ({
															...prev,
															[chair.id]: newDocId,
														}));
													}}
													style={{
														padding: "0.25rem 0.5rem",
														borderRadius: "6px",
														border: "1px solid var(--line, #cbd5e1)",
														background: "var(--paper, #fff)",
														color: "var(--ink, #0f172a)",
														fontSize: "0.8125rem",
														fontWeight: 600,
														minHeight: "36px",
													}}
												>
													{doctors.map((d) => (
														<option key={d.id} value={d.id}>
															{d.shortName} ({d.role})
														</option>
													))}
												</select>

												{/* Quick chair template buttons */}
												<div
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "0.25rem",
														marginLeft: "0.25rem",
													}}
												>
													<button
														type="button"
														data-testid={`chair-template-mon-wed-fri-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"mon_wed_fri_morning",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="Пн/Ср/Пт (Утро 08:00–14:00)"
													>
														Пн/Ср/Пт
													</button>
													<button
														type="button"
														data-testid={`chair-template-tue-thu-sat-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"tue_thu_sat_evening",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="Вт/Чт/Сб (Вечер 14:00–20:00)"
													>
														Вт/Чт/Сб
													</button>
													<button
														type="button"
														data-testid={`chair-template-two-two-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"two_two_full",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="2/2 (Полный день 08:00–20:00)"
													>
														2/2
													</button>
													<button
														type="button"
														data-testid={`chair-template-even-odd-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"even_odd_month",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="Чётные / Нечётные дни месяца (Врач А/Б)"
													>
														Чёт/Нечёт
													</button>
													<button
														type="button"
														data-testid={`chair-template-five-day-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() =>
															handleApplyChairTemplate(
																chair.id,
																cab.id,
																"five_day_standard",
															)
														}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="Пятидневка (5/2, Пн-Пт 09:00–18:00)"
													>
														5/2
													</button>
													<button
														type="button"
														data-testid={`chair-rotate-shifts-${chair.id}`}
														className="roster-btn roster-btn-secondary"
														onClick={() => handleRotateChairShifts(chair.id)}
														style={{
															minHeight: "36px",
															height: "36px",
															padding: "0 0.5rem",
															fontSize: "0.75rem",
														}}
														title="Ротация смен на этом кресле (Утро ⇄ Вечер)"
													>
														Утро ⇄ Вечер
													</button>
												</div>
											</div>
										</div>

										{/* 7 Days Matrix (Пн, Вт, Ср, Чт, Пт, Сб, Вс) */}
										<div
											style={{
												display: "grid",
												gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
												gap: "0.5rem",
											}}
										>
											{weekDays.map((day) => {
												const dayShifts = shifts.filter(
													(s) =>
														s.chairId === chair.id &&
														s.dateIso === day.dateIso &&
														s.status !== "cancelled",
												);

												return (
													<div
														key={day.dateIso}
														style={{
															border: "1px solid var(--line, #e2e8f0)",
															borderRadius: "8px",
															padding: "0.5rem",
															background: day.isWeekend
																? "var(--paper-soft, #fef2f2)"
																: "var(--paper, #ffffff)",
															display: "flex",
															flexDirection: "column",
															gap: "0.375rem",
															minHeight: "140px",
														}}
													>
														{/* Day Header */}
														<div
															style={{
																display: "flex",
																alignItems: "center",
																justifyContent: "space-between",
																borderBottom: "1px solid var(--line-subtle, #f1f5f9)",
																paddingBottom: "0.25rem",
															}}
														>
															<span
																style={{
																	fontSize: "0.75rem",
																	fontWeight: 800,
																	color: day.isWeekend
																		? "var(--bad-fg, #ef4444)"
																		: "var(--ink, #0f172a)",
																}}
															>
																{day.dayName}
															</span>
															<span
																style={{
																	fontSize: "0.6875rem",
																	color: "var(--muted, #64748b)",
																}}
															>
																{day.dayNumber}
															</span>
														</div>

														{/* Active Shifts in cell */}
														<div
															style={{
																flex: 1,
																display: "flex",
																flexDirection: "column",
																gap: "0.25rem",
															}}
														>
															{dayShifts.length === 0 ? (
																<div
																	style={{
																		fontSize: "0.6875rem",
																		color: "var(--muted, #94a3b8)",
																		padding: "0.25rem 0",
																		fontStyle: "italic",
																	}}
																>
																	Выходной
																</div>
															) : (
																dayShifts.map((s) => {
																	const isMorning = s.startTime < "14:00";
																	const isFull = s.durationHours >= 8;
																	const bg = isFull
																		? "var(--purple-soft, rgba(168, 85, 247, 0.12))"
																		: isMorning
																			? "var(--gold-soft, rgba(245, 158, 11, 0.12))"
																			: "var(--teal-soft, rgba(20, 184, 166, 0.12))";
																	const fg = isFull
																		? "var(--purple-fg, #a855f7)"
																		: isMorning
																			? "var(--gold-dark, #d97706)"
																			: "var(--teal-dark, #0d9488)";
																	const border = isFull
																		? "1px solid rgba(168, 85, 247, 0.25)"
																		: isMorning
																			? "1px solid rgba(245, 158, 11, 0.25)"
																			: "1px solid rgba(20, 184, 166, 0.25)";

																	return (
																		<div
																			key={s.id}
																			style={{
																				background: bg,
																				color: fg,
																				padding: "0.25rem 0.375rem",
																				borderRadius: "6px",
																				fontSize: "0.6875rem",
																				lineHeight: 1.2,
																				border,
																			}}
																		>
																			<div style={{ fontWeight: 700 }}>
																				{s.startTime}–{s.endTime}
																			</div>
																			<div
																				style={{
																					whiteSpace: "nowrap",
																					overflow: "hidden",
																					textOverflow: "ellipsis",
																				}}
																				title={s.doctorName}
																			>
																				{s.doctorName}
																			</div>
																		</div>
																	);
																})
															)}
														</div>

														{/* 1-Tap Fast Preset Actions (StomX Parity) */}
														<div
															style={{
																display: "grid",
																gridTemplateColumns: "1fr 1fr",
																gap: "0.375rem",
																marginTop: "auto",
																paddingTop: "0.375rem",
																borderTop: "1px solid var(--line)",
															}}
														>
															<button
																type="button"
																data-testid={`chair-btn-morning-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"morning",
																	)
																}
																style={{
																	minHeight: "36px",
																	padding: "0 0.25rem",
																	fontSize: "0.75rem",
																	fontWeight: 600,
																	borderRadius: "6px",
																	border: "1px solid var(--line)",
																	background: "var(--paper-soft)",
																	color: "var(--ink)",
																	cursor: "pointer",
																	display: "inline-flex",
																	alignItems: "center",
																	justifyContent: "center",
																}}
																title="Назначить утреннюю смену (08:00–14:00)"
															>
																Утро
															</button>
															<button
																type="button"
																data-testid={`chair-btn-morning-9-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"morning_9",
																	)
																}
																style={{
																	minHeight: "36px",
																	padding: "0 0.25rem",
																	fontSize: "0.75rem",
																	fontWeight: 600,
																	borderRadius: "6px",
																	border: "1px solid var(--line)",
																	background: "var(--paper-soft)",
																	color: "var(--ink)",
																	cursor: "pointer",
																	display: "inline-flex",
																	alignItems: "center",
																	justifyContent: "center",
																}}
																title="Назначить смену 09:00–15:00"
															>
																09–15
															</button>
															<button
																type="button"
																data-testid={`chair-btn-evening-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"evening",
																	)
																}
																style={{
																	minHeight: "36px",
																	padding: "0 0.25rem",
																	fontSize: "0.75rem",
																	fontWeight: 600,
																	borderRadius: "6px",
																	border: "1px solid var(--line)",
																	background: "var(--paper-soft)",
																	color: "var(--ink)",
																	cursor: "pointer",
																	display: "inline-flex",
																	alignItems: "center",
																	justifyContent: "center",
																}}
																title="Назначить вечернюю смену (14:00–20:00)"
															>
																Вечер
															</button>
															<button
																type="button"
																data-testid={`chair-btn-evening-15-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"evening_15",
																	)
																}
																style={{
																	minHeight: "36px",
																	padding: "0 0.25rem",
																	fontSize: "0.75rem",
																	fontWeight: 600,
																	borderRadius: "6px",
																	border: "1px solid var(--line)",
																	background: "var(--paper-soft)",
																	color: "var(--ink)",
																	cursor: "pointer",
																	display: "inline-flex",
																	alignItems: "center",
																	justifyContent: "center",
																}}
																title="Назначить смену 15:00–21:00"
															>
																15–21
															</button>
															<button
																type="button"
																data-testid={`chair-btn-full-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"full_day",
																	)
																}
																style={{
																	minHeight: "36px",
																	padding: "0 0.25rem",
																	fontSize: "0.75rem",
																	fontWeight: 600,
																	borderRadius: "6px",
																	border: "1px solid var(--line)",
																	background: "var(--paper-soft)",
																	color: "var(--ink)",
																	cursor: "pointer",
																	display: "inline-flex",
																	alignItems: "center",
																	justifyContent: "center",
																}}
																title="Назначить полный день (08:00–20:00)"
															>
																День
															</button>
															<span
																data-testid={`chair-btn-full-day-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"full_day",
																	)
																}
																style={{ display: "none" }}
																aria-hidden="true"
															/>
															<button
																type="button"
																data-testid={`chair-btn-off-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"clear",
																	)
																}
																style={{
																	minHeight: "36px",
																	padding: "0 0.25rem",
																	fontSize: "0.75rem",
																	fontWeight: 600,
																	borderRadius: "6px",
																	border: "1px solid var(--bad-fg)30",
																	background: "var(--bad-bg, rgba(239, 68, 68, 0.08))",
																	color: "var(--bad-fg)",
																	cursor: "pointer",
																	display: "inline-flex",
																	alignItems: "center",
																	justifyContent: "center",
																}}
																title="Очистить смену (Выходной день)"
															>
																Вых
															</button>
															<span
																data-testid={`chair-btn-clear-${chair.id}-${day.dateIso}`}
																onClick={() =>
																	handleCellPreset(
																		day.dateIso,
																		cab.id,
																		chair.id,
																		"clear",
																	)
																}
																style={{ display: "none" }}
																aria-hidden="true"
															/>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>

				{/* Footer Strip */}
				<div className="roster-footer">
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Сетка кресел (StomX Parity) • 1-тап назначение смен врачей
					</div>
					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onClose}
							style={{ minHeight: "44px" }}
						>
							Закрыть
						</button>
						<button
							type="button"
							data-testid="chair-apply-close-btn"
							className="roster-btn roster-btn-primary"
							onClick={() => handleSaveAll(true)}
							style={{ minHeight: "44px" }}
						>
							<Check size={16} />
							<span>Применить и закрыть</span>
						</button>
					</div>
				</div>
			</div>

			<QuickAddDoctorModal
				isOpen={isQuickAddDoctorOpen}
				onClose={() => setIsQuickAddDoctorOpen(false)}
				chairs={cabinets.map((c) => ({
					id: c.id,
					name: c.name,
					room: c.name,
				}))}
				onDoctorAdded={(newDoc) => {
					const doctorRole: MedicalStaffRole =
						newDoc.specialty === "periodontist"
							? "therapist"
							: (newDoc.specialty as MedicalStaffRole);
					const docId = newDoc.id || `doc-${Date.now()}`;
					const newStaffMember: StaffMember = {
						id: docId,
						fullName: newDoc.fullName || newDoc.name || "Врач",
						shortName: newDoc.shortName,
						role: doctorRole,
						tabNumber: `Т-${Math.floor(100 + Math.random() * 900)}`,
						isDoctor: true,
						isAssistant: false,
						weeklyHourLimit: 40,
						avatarColor: newDoc.color,
						...(newDoc.preferredChairId ? { preferredChairId: newDoc.preferredChairId } : {}),
					};
					setLocalStaffList((prev) => [...prev, newStaffMember]);
					if (newDoc.preferredChairId) {
						const targetChairId = newDoc.preferredChairId;
						setSelectedDoctorByChair((prev) => ({
							...prev,
							[targetChairId]: docId,
						}));
					}
					props.onAddDoctor?.(newDoc);
					setNotification({
						type: "success",
						message: `Врач ${newDoc.shortName} добавлен в график`,
					});
				}}
			/>
		</div>
	);
};

export {
	DoctorShiftRosterModal,
	getMondayOfWeekIso,
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
	applyDoctorChairWeeklyTemplate,
	applyCellShiftPreset,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	addDaysToDateIso,
	getWeekDaysIso,
	applyDoctorChairDateRange,
};
export type {
	DoctorShiftRosterModalProps,
	DoctorShift,
	StaffMember,
	CabinetDefinition,
	ShiftArchetypeId,
	DoctorChairRosterTemplateId,
	DoctorChairRosterTemplate,
	DateRangeShiftPreset,
	DateRangeShiftBindingParams,
};

export default ChairRosterModal;

