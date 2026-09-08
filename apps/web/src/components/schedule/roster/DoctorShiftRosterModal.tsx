/**
 * DENTE Dental CRM — Statutory Doctor Schedule Shift Roster & Workload Studio HUD
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Chair Utilization Heatmap
 * Architecture: Modular orchestration via DoctorRosterToolbar and DoctorRosterMatrix (Anti-Monolith <800 lines)
 */

import React, { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
	TimesheetT13Modal,
	type EmployeeInfo,
} from "../../payroll/TimesheetT13Modal";
import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	MEDICAL_STAFF_ROLES,
	type MedicalStaffRole,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	type ShiftArchetypeId,
	type StaffMember,
	type DoctorChairRosterTemplateId,
	type DoctorChairRosterTemplate,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "./doctorShiftRosterPresets";
import {
	calculateStaffRosterStats,
	detectRosterConflicts,
	type DoctorShift,
	exportFormT13ToCsv,
	generateFormT13Matrix,
	generatePrintableRosterHtml,
	type RosterConflict,
} from "./doctorShiftRosterEngine";
import { DoctorRosterToolbar } from "./DoctorRosterToolbar";
import { DoctorRosterMatrix } from "./DoctorRosterMatrix";
import { DoctorShiftDrawer } from "./DoctorShiftDrawer";
import {
	generateWeeklyScheduleForStaffAndCabinets,
	applyDoctorChairWeeklyTemplate,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	addDaysToDateIso,
	getWeekDaysIso,
} from "./doctorWeeklyScheduleGenerator";
import "./doctorShiftRoster.css";

export { DoctorRosterToolbar } from "./DoctorRosterToolbar";
export { DoctorRosterMatrix } from "./DoctorRosterMatrix";
export { DoctorShiftDrawer } from "./DoctorShiftDrawer";
export {
	generateWeeklyScheduleForStaffAndCabinets,
	applyDoctorChairWeeklyTemplate,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	addDaysToDateIso,
	getWeekDaysIso,
} from "./doctorWeeklyScheduleGenerator";
export { DOCTOR_CHAIR_ROSTER_TEMPLATES } from "./doctorShiftRosterPresets";
export type {
	DoctorShift,
	StaffMember,
	CabinetDefinition,
	ShiftArchetypeId,
	MedicalStaffRole,
	DoctorChairRosterTemplateId,
	DoctorChairRosterTemplate,
};

export interface DoctorShiftRosterModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialShifts?: DoctorShift[] | undefined;
	staffList?: StaffMember[] | undefined;
	cabinets?: CabinetDefinition[] | undefined;
	appointments?:
		| Array<{
				chairId: string;
				startsAt: string;
				endsAt: string;
				status?: string | undefined;
		  }>
		| undefined;
	clinicName?: string | undefined;
	onSave?: ((shifts: DoctorShift[]) => Promise<void> | void) | undefined;
	onOpenT13Timesheet?: (() => void) | undefined;
	initialEditingShift?: Partial<DoctorShift> | null | undefined;
	currentDate?: string | undefined;
	weekStartDateIso?: string | undefined;
}

/**
 * Dynamic Monday calculation without hardcoded historical dates (Mandates 8e, 8n)
 */
export function getMondayOfWeekIso(dateIso?: string): string {
	let targetDate: Date;
	if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
		const parts = dateIso.split("-").map(Number);
		targetDate = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
	} else if (dateIso) {
		const parsed = new Date(dateIso);
		if (Number.isNaN(parsed.getTime())) {
			const now = new Date();
			targetDate = new Date(
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
			);
		} else {
			targetDate = new Date(
				Date.UTC(
					parsed.getUTCFullYear(),
					parsed.getUTCMonth(),
					parsed.getUTCDate(),
				),
			);
		}
	} else {
		const now = new Date();
		targetDate = new Date(
			Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
		);
	}

	const day = targetDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
	const diff = targetDate.getUTCDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(
		Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), diff),
	);
	return monday.toISOString().slice(0, 10);
}

/**
 * 1-Click Chair-Doctor Shift Preset Application Engine (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 */
export function applyCellShiftPreset(
	currentShifts: DoctorShift[],
	params: {
		dateIso: string;
		cabinetId: string;
		chairId: string;
		presetType: "morning" | "evening" | "full_day" | "clear";
		doctorId?: string | undefined;
		assistantId?: string | null | undefined;
		staffList?: StaffMember[] | undefined;
		cabinets?: CabinetDefinition[] | undefined;
	},
): DoctorShift[] {
	const {
		dateIso,
		cabinetId,
		chairId,
		presetType,
		doctorId,
		assistantId,
		staffList = DEFAULT_CLINIC_STAFF,
		cabinets = CLINIC_CABINETS_CATALOG,
	} = params;

	if (presetType === "clear") {
		return currentShifts.filter(
			(s) =>
				!(
					s.dateIso === dateIso &&
					s.chairId === chairId &&
					(!doctorId || s.doctorId === doctorId)
				),
		);
	}

	const doc =
		(doctorId ? staffList.find((s) => s.id === doctorId) : null) ||
		staffList.find((s) => s.isDoctor) ||
		staffList[0] ||
		DEFAULT_CLINIC_STAFF[0]!;

	const asst =
		assistantId !== undefined
			? assistantId
				? staffList.find((s) => s.id === assistantId) || null
				: null
			: doc.defaultAssistantId
				? staffList.find((s) => s.id === doc.defaultAssistantId) || null
				: null;

	let startTime = "08:00";
	let endTime = "14:00";
	let durationHours = 6.0;
	let archetypeId: ShiftArchetypeId = "morning_shift";
	let breakMinutes = 0;
	let customNotes = "";

	if (presetType === "morning") {
		startTime = "08:00";
		endTime = "14:00";
		durationHours = 6.0;
		archetypeId = "morning_shift";
		breakMinutes = 0;
		customNotes = "Утро 08:00–14:00";
	} else if (presetType === "evening") {
		startTime = "14:00";
		endTime = "20:00";
		durationHours = 6.0;
		archetypeId = "evening_shift";
		breakMinutes = 0;
		customNotes = "Вечер 14:00–20:00";
	} else if (presetType === "full_day") {
		startTime = "08:00";
		endTime = "20:00";
		durationHours = 11.0;
		archetypeId = "morning_shift";
		breakMinutes = 60;
		customNotes = "Весь день 08:00–20:00";
	}

	const targetCab =
		cabinets.find((c) => c.id === cabinetId) ||
		cabinets[0] ||
		CLINIC_CABINETS_CATALOG[0]!;
	const targetChair =
		targetCab.chairs.find((ch) => ch.id === chairId) ||
		targetCab.chairs[0] || {
			id: chairId || "chair-1a",
			name: "Кресло 1А",
			equipment: "",
		};

	const newShift: DoctorShift = {
		id: `shift-${dateIso}-${targetChair.id}-${doc.id}-${presetType}-${Date.now()}`,
		doctorId: doc.id,
		doctorName: doc.shortName || doc.fullName,
		doctorRole: doc.role,
		assistantId: asst ? asst.id : null,
		assistantName: asst ? asst.shortName || asst.fullName : null,
		cabinetId: targetCab.id,
		chairId: targetChair.id,
		dateIso,
		archetypeId,
		startTime,
		endTime,
		durationHours,
		breakMinutes,
		isNight: false,
		nightHours: 0,
		status: "scheduled",
		customNotes,
	};

	const filtered = currentShifts.filter((s) => {
		if (s.dateIso !== dateIso || s.chairId !== targetChair.id) {
			return true;
		}
		if (presetType === "full_day") {
			return false;
		}
		if (s.doctorId === doc.id) {
			return false;
		}
		if (
			presetType === "morning" &&
			(s.startTime < "14:00" || s.archetypeId === "morning_shift")
		) {
			return false;
		}
		if (
			presetType === "evening" &&
			(s.startTime >= "14:00" || s.archetypeId === "evening_shift")
		) {
			return false;
		}
		return true;
	});

	return [...filtered, newShift];
}

export function DoctorShiftRosterModal({
	isOpen,
	onClose,
	initialShifts,
	staffList = DEFAULT_CLINIC_STAFF,
	cabinets = CLINIC_CABINETS_CATALOG,
	appointments = [],
	clinicName = 'ООО "Денте Клиник"',
	onSave,
	onOpenT13Timesheet,
	initialEditingShift = null,
	currentDate,
	weekStartDateIso: initialWeekStartDateIso,
}: DoctorShiftRosterModalProps) {
	// Base date: Monday of current/active week
	const defaultMonday = useMemo(
		() => getMondayOfWeekIso(initialWeekStartDateIso || currentDate),
		[initialWeekStartDateIso, currentDate],
	);
	const [weekStartDateIso, setWeekStartDateIso] =
		useState<string>(defaultMonday);
	const [activeTab, setActiveTab] = useState<
		"cabinets" | "doctors" | "t13" | "utilization"
	>("cabinets");

	useEffect(() => {
		if (initialWeekStartDateIso || currentDate) {
			setWeekStartDateIso(getMondayOfWeekIso(initialWeekStartDateIso || currentDate));
		}
	}, [initialWeekStartDateIso, currentDate]);

	// Internal Shifts State
	const [shifts, setShifts] = useState<DoctorShift[]>(() => {
		if (initialShifts && initialShifts.length > 0) return initialShifts;
		if (Array.isArray(initialShifts) && initialShifts.length === 0) return [];
		return generateWeeklyScheduleForStaffAndCabinets(
			defaultMonday,
			staffList,
			cabinets,
			"five_day",
		);
	});

	useEffect(() => {
		if (initialShifts) {
			setShifts(initialShifts);
		}
	}, [initialShifts]);

	// Quick Shift Editor Drawer
	const [editingShift, setEditingShift] = useState<Partial<DoctorShift> | null>(
		initialEditingShift ?? null,
	);
	const [isNewShift, setIsNewShift] = useState(false);

	// Notification banner
	const [notification, setNotification] = useState<{
		type: "success" | "info" | "error";
		message: string;
	} | null>(null);

	const [isT13ModalOpen, setIsT13ModalOpen] = useState<boolean>(false);

	// 7 days of the selected week (Timezone-safe UTC arithmetic)
	const weekDays = useMemo(() => {
		const days: Array<{
			dateIso: string;
			dayName: string;
			dayNumber: string;
			isWeekend: boolean;
		}> = [];
		const parts = weekStartDateIso.split("-").map(Number);
		const startYear = parts[0] || 2026;
		const startMonth = parts[1] || 8;
		const startDay = parts[2] || 24;

		const dayNamesRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

		for (let i = 0; i < 7; i++) {
			const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + i));
			const dateIso = d.toISOString().substring(0, 10);
			const dayOfWeek = d.getUTCDay();
			days.push({
				dateIso,
				dayName: dayNamesRu[dayOfWeek] || "Пн",
				dayNumber: dateIso.substring(8, 10),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			});
		}
		return days;
	}, [weekStartDateIso]);

	const weekEndDateIso = weekDays[6]?.dateIso || weekStartDateIso;

	// Month & Year parsed from current week
	const selectedYear =
		Number.parseInt(weekStartDateIso.substring(0, 4), 10) || 2026;
	const selectedMonth =
		Number.parseInt(weekStartDateIso.substring(5, 7), 10) || 8;
	const monthNormObj = RUSSIAN_PRODUCTION_CALENDAR_2026[selectedMonth];

	// Run conflict detection (private outpatient practice defaults: no false statutory overtime or surgery assistant warnings)
	const conflicts = useMemo(() => {
		return detectRosterConflicts(shifts, staffList, {
			practiceType: "private_outpatient",
			checkSurgeryAssistant: false,
			checkWeeklyOvertime: false,
			allowWeeklyOvertime: true,
		});
	}, [shifts, staffList]);

	// Run staff statistics
	const staffStats = useMemo(() => {
		return calculateStaffRosterStats(
			staffList,
			shifts,
			selectedYear,
			selectedMonth,
		);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	// Run Form T-13 matrix
	const t13Matrix = useMemo(() => {
		return generateFormT13Matrix(
			staffList,
			shifts,
			selectedYear,
			selectedMonth,
		);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	// Form T-13 Employees mapped from real roster staffList (Mandate 8e, 8n)
	const t13Employees: EmployeeInfo[] = useMemo(() => {
		return staffList.map((s, index) => {
			const roleDef = MEDICAL_STAFF_ROLES[s.role];
			const positionRu = roleDef
				? roleDef.nameRu
				: s.isDoctor
					? "Врач-стоматолог"
					: "Ассистент врача-стоматолога";
			const departmentRu = s.isDoctor
				? "Лечебное отделение"
				: "Сестринская служба";
			const defaultShiftHours = s.isDoctor
				? 6.0
				: s.role === "assistant"
					? 7.8
					: 6.0;
			const tabNumber = s.tabNumber || String(101 + index).padStart(5, "0");

			return {
				id: s.id,
				tabNumber,
				name: s.fullName,
				positionRu,
				departmentRu,
				defaultShiftHours,
			};
		});
	}, [staffList]);

	// Sanitize appointments to satisfy exactOptionalPropertyTypes for calculateChairUtilization
	const sanitizedAppointments = useMemo(() => {
		return appointments.map((a) => {
			const item: {
				chairId: string;
				startsAt: string;
				endsAt: string;
				status?: string;
			} = {
				chairId: a.chairId,
				startsAt: a.startsAt,
				endsAt: a.endsAt,
			};
			if (a.status) {
				item.status = a.status;
			}
			return item;
		});
	}, [appointments]);

	// Overall KPIs
	const kpis = useMemo(() => {
		const weekShifts = shifts.filter(
			(s) =>
				s.dateIso >= weekStartDateIso &&
				s.dateIso <= weekEndDateIso &&
				s.status !== "cancelled" &&
				s.durationHours > 0,
		);

		const totalWeeklyHours = weekShifts.reduce(
			(sum, s) => sum + s.durationHours,
			0,
		);
		const totalWithAssistants = weekShifts.filter((s) => s.assistantId).length;
		const assistantPairingPct =
			weekShifts.length > 0
				? Math.round((totalWithAssistants / weekShifts.length) * 100)
				: 0;

		return {
			totalWeekShifts: weekShifts.length,
			totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
			assistantPairingPct,
			conflictCount: conflicts.length,
			errorConflictCount: conflicts.filter((c) => c.severity === "error")
				.length,
		};
	}, [shifts, weekStartDateIso, weekEndDateIso, conflicts]);

	// Navigation handlers
	const handlePrevWeek = () => {
		const parts = weekStartDateIso.split("-").map(Number);
		const cur = new Date(
			Date.UTC(parts[0] || 2026, (parts[1] || 8) - 1, (parts[2] || 24) - 7),
		);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	const handleNextWeek = () => {
		const parts = weekStartDateIso.split("-").map(Number);
		const cur = new Date(
			Date.UTC(parts[0] || 2026, (parts[1] || 8) - 1, (parts[2] || 24) + 7),
		);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	// Open Edit Drawer
	const handleOpenEdit = (shift: DoctorShift) => {
		setEditingShift({ ...shift });
		setIsNewShift(false);
	};

	const handleOpenCreateInCell = (
		dateIso: string,
		cabinetId: string,
		chairId: string,
	) => {
		const defaultDoc =
			staffList.find((s) => s.isDoctor) ||
			staffList[0] ||
			DEFAULT_CLINIC_STAFF[0]!;
		const defaultAsst = defaultDoc.defaultAssistantId
			? staffList.find((s) => s.id === defaultDoc.defaultAssistantId) || null
			: null;

		setEditingShift({
			id: `shift-${Date.now()}`,
			doctorId: defaultDoc.id,
			doctorName: defaultDoc.shortName,
			doctorRole: defaultDoc.role,
			assistantId: defaultAsst ? defaultAsst.id : null,
			assistantName: defaultAsst ? defaultAsst.shortName : null,
			cabinetId,
			chairId,
			dateIso,
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		});
		setIsNewShift(true);
	};

	// Save Edited Shift (Non-blocking Mandate 8e)
	const handleSaveDrawerShift = (finalizedShift: DoctorShift, isNew: boolean) => {
		if (isNew) {
			setShifts((prev) => [...prev, finalizedShift]);
		} else {
			setShifts((prev) =>
				prev.map((s) => (s.id === finalizedShift.id ? finalizedShift : s)),
			);
		}

		setEditingShift(null);
		setNotification({
			type: "success",
			message: "Смена успешно сохранена в графике",
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// Delete Shift
	const handleDeleteShift = (shiftId: string) => {
		setShifts((prev) => prev.filter((s) => s.id !== shiftId));
		setEditingShift(null);
		setNotification({ type: "info", message: "Смена удалена из графика" });
		setTimeout(() => setNotification(null), 3000);
	};

	// Export Form T-13 to CSV
	const handleExportT13 = () => {
		const csvContent = exportFormT13ToCsv(
			t13Matrix,
			selectedYear,
			selectedMonth,
			clinicName,
		);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`Form_T13_Tabele_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		setNotification({
			type: "success",
			message: "Табель Т-13 успешно экспортирован в CSV (UTF-8 BOM)",
		});
		setTimeout(() => setNotification(null), 4000);
	};

	// Print Official Schedule (A4 Landscape)
	const handlePrintSchedule = () => {
		const html = generatePrintableRosterHtml(
			shifts,
			weekStartDateIso,
			weekEndDateIso,
			clinicName,
			cabinets,
		);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	// Apply weekly allocation preset (Mandates 8e, 8k, 8n)
	const handleApplyPreset = (
		preset: "five_day" | "two_two" | "morning" | "evening" | "full_day",
		label: string,
	) => {
		const filled = generateWeeklyScheduleForStaffAndCabinets(
			weekStartDateIso,
			staffList,
			cabinets,
			preset,
		);
		setShifts((prev) => {
			const otherShifts = prev.filter(
				(s) => s.dateIso < weekStartDateIso || s.dateIso > weekEndDateIso,
			);
			return [...otherShifts, ...filled];
		});
		setNotification({
			type: "success",
			message: `Применен шаблон смен: ${label} (${filled.length} смен)`,
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// Reset / Auto-fill schedule
	const handleAutoFillDefault = () => {
		handleApplyPreset("five_day", "Пятидневка (базовый)");
	};

	// 1-Click shift preset application in cell (StomX / DentalPRO parity, Mandates 8e, 8k, 8n)
	const handleApplyCellPreset = (
		dateIso: string,
		cabinetId: string,
		chairId: string,
		presetType: "morning" | "evening" | "full_day" | "clear",
		doctorId?: string,
	) => {
		const nextShifts = applyCellShiftPreset(shifts, {
			dateIso,
			cabinetId,
			chairId,
			presetType,
			doctorId,
			staffList,
			cabinets,
		});
		setShifts(nextShifts);

		const presetLabels = {
			morning: "Утро (08:00–14:00)",
			evening: "Вечер (14:00–20:00)",
			full_day: "Весь день (08:00–20:00)",
			clear: "Выходной",
		};

		setNotification({
			type: presetType === "clear" ? "info" : "success",
			message:
				presetType === "clear"
					? "Смена очищена (Выходной день)"
					: `Назначена смена: ${presetLabels[presetType]}`,
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// 1-Click Doctor-to-Chair Weekly Shift Binding Templates (StomX / DentalPRO parity, Mandates 8e, 8k, 8n)
	const handleApplyDoctorChairWeeklyTemplate = (
		doctorId: string,
		chairId: string,
		cabinetId: string,
		templateId: DoctorChairRosterTemplateId,
	) => {
		const nextShifts = applyDoctorChairWeeklyTemplate(shifts, {
			weekStartDateIso,
			templateId,
			doctorId,
			chairId,
			cabinetId,
			staffList,
			cabinets,
		});
		setShifts(nextShifts);

		const templateObj = DOCTOR_CHAIR_ROSTER_TEMPLATES.find((t) => t.id === templateId);
		const doc = staffList.find((s) => s.id === doctorId);
		setNotification({
			type: "success",
			message: `Врач ${doc?.shortName || doc?.fullName || "врач"} закреплен за креслом по шаблону «${templateObj?.title || templateId}»`,
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// 1-Click Copy week to next week (StomX / DentalPRO parity, Mandates 8e, 8k, 8n)
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
			message: `График скопирован на след. неделю (${nextMondayIso}): перенесено смен — ${weekShiftsCount}`,
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// 1-Click Copy week to 4 weeks / month (StomX / DentalPRO parity, Mandates 8e, 8k, 8n)
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
			message: `График скопирован на 4 недели вперед (месяц): перенесено смен — ${weekShiftsCount * 4}`,
		});
		setTimeout(() => setNotification(null), 4000);
	};

	// 1-Click Clear current week shifts (StomX / DentalPRO parity, Mandates 8e, 8k, 8n)
	const handleClearWeek = () => {
		const nextShifts = clearWeekShifts(shifts, weekStartDateIso);
		setShifts(nextShifts);
		setNotification({
			type: "info",
			message: "Все смены текущей недели успешно очищены",
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// 1-Click Shift Rotation (Утро ⇄ Вечер) (StomX / DentalPRO parity, Mandates 8e, 8k, 8n)
	const handleRotateShifts = () => {
		const nextShifts = rotateWeekShifts(shifts, weekStartDateIso);
		setShifts(nextShifts);
		setNotification({
			type: "success",
			message: "Ротация смен (Утро ⇄ Вечер) выполнена для всей клиники",
		});
		setTimeout(() => setNotification(null), 3500);
	};

	// Save changes (Non-blocking Mandate 8e)
	const handleSaveAll = async (closeAfter = false) => {
		let shiftsToSave = shifts;
		if (shiftsToSave.length === 0) {
			shiftsToSave = generateWeeklyScheduleForStaffAndCabinets(
				weekStartDateIso,
				staffList,
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
			message: `Все изменения графика успешно сохранены (${shiftsToSave.length} смен)`,
		});
		if (closeAfter) {
			onClose();
		} else {
			setTimeout(() => setNotification(null), 3000);
		}
	};

	if (!isOpen) return null;

	// Anti-Matryoshka (Sin 6, Mandate 8d): Render TimesheetT13Modal sequentially (depth strictly 1).
	if (isT13ModalOpen) {
		return (
			<TimesheetT13Modal
				isOpen={true}
				onClose={() => setIsT13ModalOpen(false)}
				clinicName={clinicName}
				employees={t13Employees}
			/>
		);
	}

	return (
		<div
			className="roster-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Студия графиков сменности"
		>
			<div className="roster-modal-container">
				{/* Top Header, KPIs, Period Selector, 1-Click Presets & Conflict Ribbon */}
				<DoctorRosterToolbar
					clinicName={clinicName}
					kpis={kpis}
					monthNormObj={monthNormObj}
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					weekStartDateIso={weekStartDateIso}
					weekEndDateIso={weekEndDateIso}
					selectedYear={selectedYear}
					onPrevWeek={handlePrevWeek}
					onNextWeek={handleNextWeek}
					onAutoFillDefault={handleAutoFillDefault}
					onApplyPreset={handleApplyPreset}
					onApplyDoctorChairWeeklyTemplate={handleApplyDoctorChairWeeklyTemplate}
					onCopyWeekToNextWeek={handleCopyWeekToNextWeek}
					onCopyWeekToMonth={handleCopyWeekToMonth}
					onClearWeek={handleClearWeek}
					onRotateShifts={handleRotateShifts}
					onPrintSchedule={handlePrintSchedule}
					onExportT13={handleExportT13}
					onSaveAll={handleSaveAll}
					onClose={onClose}
					notification={notification}
					conflicts={conflicts}
					staffList={staffList}
					cabinets={cabinets}
				/>

				{/* Main Content Workspace: Cabinets, Doctors, T-13, Utilization */}
				<DoctorRosterMatrix
					activeTab={activeTab}
					weekDays={weekDays}
					weekStartDateIso={weekStartDateIso}
					weekEndDateIso={weekEndDateIso}
					selectedYear={selectedYear}
					selectedMonth={selectedMonth}
					monthNormObj={monthNormObj}
					cabinets={cabinets}
					staffList={staffList}
					shifts={shifts}
					conflicts={conflicts}
					t13Matrix={t13Matrix}
					sanitizedAppointments={sanitizedAppointments}
					onOpenEdit={handleOpenEdit}
					onOpenCreateInCell={handleOpenCreateInCell}
					onOpenT13Timesheet={onOpenT13Timesheet}
					onOpenInternalT13Modal={() => setIsT13ModalOpen(true)}
					onExportT13={handleExportT13}
					onClose={onClose}
					onApplyCellPreset={handleApplyCellPreset}
					onApplyDoctorChairWeeklyTemplate={handleApplyDoctorChairWeeklyTemplate}
				/>

				{/* Quick Shift Edit Drawer */}
				<DoctorShiftDrawer
					editingShift={editingShift}
					isNewShift={isNewShift}
					staffList={staffList}
					cabinets={cabinets}
					weekStartDateIso={weekStartDateIso}
					onClose={() => setEditingShift(null)}
					onChangeEditingShift={setEditingShift}
					onSaveShift={handleSaveDrawerShift}
					onDeleteShift={handleDeleteShift}
				/>

				{/* Footer */}
				<div className="roster-footer">
					<div
						style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}
					>
						Баланс рабочего времени: 33 ч/нед (врачи) • Форма Т-13
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
							data-testid="roster-apply-close-btn"
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
		</div>
	);
}
