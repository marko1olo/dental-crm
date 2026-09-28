/**
 * DENTE Dental CRM — Doctor Shift Roster Operations Hook
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13
 * Architecture: Extracted React Hook for state management, computations, and handlers (<800 lines)
 */

import { useEffect, useMemo, useState } from "react";
import type { EmployeeInfo } from "../../payroll/TimesheetT13Modal";
import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	MEDICAL_STAFF_ROLES,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	type StaffMember,
	type DoctorChairRosterTemplateId,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "./doctorShiftRosterPresets";
import {
	calculateStaffRosterStats,
	detectRosterConflicts,
	type DoctorShift,
	exportFormT13ToCsv,
	generateFormT13Matrix,
	generatePrintableRosterHtml,
} from "./doctorShiftRosterEngine";
import {
	generateWeeklyScheduleForStaffAndCabinets,
	applyDoctorChairWeeklyTemplate,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	addDaysToDateIso,
} from "./doctorWeeklyScheduleGenerator";
import { getMondayOfWeekIso, applyCellShiftPreset } from "./rosterDateUtils";

export interface UseDoctorShiftRosterOperationsParams {
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
	onClose: () => void;
	initialEditingShift?: Partial<DoctorShift> | null | undefined;
	currentDate?: string | undefined;
	weekStartDateIso?: string | undefined;
}

export function useDoctorShiftRosterOperations({
	initialShifts,
	staffList = DEFAULT_CLINIC_STAFF,
	cabinets = CLINIC_CABINETS_CATALOG,
	appointments = [],
	clinicName = 'ООО "Денте Клиник"',
	onSave,
	onClose,
	initialEditingShift = null,
	currentDate,
	weekStartDateIso: initialWeekStartDateIso,
}: UseDoctorShiftRosterOperationsParams) {
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
			message: "Табель учёта рабочего времени успешно экспортирован в CSV (UTF-8 BOM)",
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

	return {
		weekStartDateIso,
		setWeekStartDateIso,
		activeTab,
		setActiveTab,
		shifts,
		setShifts,
		editingShift,
		setEditingShift,
		isNewShift,
		notification,
		isT13ModalOpen,
		setIsT13ModalOpen,
		weekDays,
		weekEndDateIso,
		selectedYear,
		selectedMonth,
		monthNormObj,
		conflicts,
		staffStats,
		t13Matrix,
		t13Employees,
		sanitizedAppointments,
		kpis,
		handlePrevWeek,
		handleNextWeek,
		handleOpenEdit,
		handleOpenCreateInCell,
		handleSaveDrawerShift,
		handleDeleteShift,
		handleExportT13,
		handlePrintSchedule,
		handleApplyPreset,
		handleAutoFillDefault,
		handleApplyCellPreset,
		handleApplyDoctorChairWeeklyTemplate,
		handleCopyWeekToNextWeek,
		handleCopyWeekToMonth,
		handleClearWeek,
		handleRotateShifts,
		handleSaveAll,
	};
}
