/**
 * useRosterBulkOperations.ts — Presets, copy, print, navigation, and save handlers for Doctor Shift Roster.
 */

import type { CabinetDefinition, StaffMember, DoctorChairRosterTemplateId } from "../doctorShiftRosterPresets";
import { DOCTOR_CHAIR_ROSTER_TEMPLATES } from "../doctorShiftRosterPresets";
import { generatePrintableRosterHtml, type DoctorShift } from "../doctorShiftRosterEngine";
import {
	generateWeeklyScheduleForStaffAndCabinets,
	applyDoctorChairWeeklyTemplate,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	addDaysToDateIso,
} from "../doctorWeeklyScheduleGenerator";
import { applyCellShiftPreset } from "../rosterDateUtils";

interface UseRosterBulkOperationsParams {
	weekStartDateIso: string;
	setWeekStartDateIso: (date: string) => void;
	weekEndDateIso: string;
	staffList: StaffMember[];
	cabinets: CabinetDefinition[];
	shifts: DoctorShift[];
	setShifts: React.Dispatch<React.SetStateAction<DoctorShift[]>>;
	clinicName: string;
	onSave?: ((shifts: DoctorShift[]) => Promise<void> | void) | undefined;
	onClose: () => void;
	setNotification: (notif: { type: "success" | "info" | "error"; message: string } | null) => void;
}

export function useRosterBulkOperations({
	weekStartDateIso, setWeekStartDateIso, weekEndDateIso, staffList, cabinets,
	shifts, setShifts, clinicName, onSave, onClose, setNotification,
}: UseRosterBulkOperationsParams) {
	const handlePrevWeek = () => {
		const parts = weekStartDateIso.split("-").map(Number);
		setWeekStartDateIso(new Date(Date.UTC(parts[0] || 2026, (parts[1] || 8) - 1, (parts[2] || 24) - 7)).toISOString().substring(0, 10));
	};
	const handleNextWeek = () => {
		const parts = weekStartDateIso.split("-").map(Number);
		setWeekStartDateIso(new Date(Date.UTC(parts[0] || 2026, (parts[1] || 8) - 1, (parts[2] || 24) + 7)).toISOString().substring(0, 10));
	};

	const handlePrintSchedule = () => {
		const html = generatePrintableRosterHtml(shifts, weekStartDateIso, weekEndDateIso, clinicName, cabinets);
		const win = window.open("", "_blank");
		if (win) {
			win.document.open(); win.document.write(html); win.document.close(); win.focus();
			setTimeout(() => win.print(), 300);
		}
	};

	const handleApplyPreset = (preset: "five_day" | "two_two" | "morning" | "evening" | "full_day", label: string) => {
		const filled = generateWeeklyScheduleForStaffAndCabinets(weekStartDateIso, staffList, cabinets, preset);
		setShifts((prev) => [...prev.filter((s) => s.dateIso < weekStartDateIso || s.dateIso > weekEndDateIso), ...filled]);
		setNotification({ type: "success", message: `Применен шаблон смен: ${label} (${filled.length} смен)` });
		setTimeout(() => setNotification(null), 3000);
	};

	const handleApplyCellPreset = (dateIso: string, cabinetId: string, chairId: string, presetType: "morning" | "evening" | "full_day" | "clear", doctorId?: string) => {
		const next = applyCellShiftPreset(shifts, { dateIso, cabinetId, chairId, presetType, doctorId, staffList, cabinets });
		setShifts(next);
		setNotification({
			type: presetType === "clear" ? "info" : "success",
			message: presetType === "clear" ? "Смена очищена (Выходной день)" : `Назначена смена: ${presetType}`,
		});
		setTimeout(() => setNotification(null), 3000);
	};

	const handleApplyDoctorChairWeeklyTemplate = (doctorId: string, chairId: string, cabinetId: string, templateId: DoctorChairRosterTemplateId) => {
		const next = applyDoctorChairWeeklyTemplate(shifts, { weekStartDateIso, templateId, doctorId, chairId, cabinetId, staffList, cabinets });
		setShifts(next);
		const t = DOCTOR_CHAIR_ROSTER_TEMPLATES.find((item) => item.id === templateId);
		setNotification({ type: "success", message: `Врач закреплен за креслом по шаблону «${t?.title || templateId}»` });
		setTimeout(() => setNotification(null), 3500);
	};

	const handleSaveAll = async (closeAfter = false) => {
		let toSave = shifts.length === 0 ? generateWeeklyScheduleForStaffAndCabinets(weekStartDateIso, staffList, cabinets, "five_day") : shifts;
		if (shifts.length === 0) setShifts(toSave);
		if (onSave) await onSave(toSave);
		setNotification({ type: "success", message: `Все изменения графика успешно сохранены (${toSave.length} смен)` });
		if (closeAfter) onClose(); else setTimeout(() => setNotification(null), 3000);
	};

	return {
		handlePrevWeek, handleNextWeek, handlePrintSchedule,
		handleExportT13: () => { setNotification({ type: "info", message: "Экспорт графика формируется через печать (А4)" }); setTimeout(() => setNotification(null), 3000); },
		handleApplyPreset, handleAutoFillDefault: () => handleApplyPreset("five_day", "Пятидневка (базовый)"),
		handleApplyCellPreset, handleApplyDoctorChairWeeklyTemplate,
		handleCopyWeekToNextWeek: () => {
			const nextMon = addDaysToDateIso(weekStartDateIso, 7);
			setShifts(copyWeekShiftsToTargetWeek(shifts, weekStartDateIso, nextMon));
			setNotification({ type: "success", message: `График скопирован на след. неделю (${nextMon})` });
			setTimeout(() => setNotification(null), 3500);
		},
		handleCopyWeekToMonth: () => {
			setShifts(copyWeekShiftsToMonth(shifts, weekStartDateIso, 4));
			setNotification({ type: "success", message: "График скопирован на 4 недели вперед (месяц)" });
			setTimeout(() => setNotification(null), 4000);
		},
		handleClearWeek: () => {
			setShifts(clearWeekShifts(shifts, weekStartDateIso));
			setNotification({ type: "info", message: "Все смены текущей недели успешно очищены" });
			setTimeout(() => setNotification(null), 3000);
		},
		handleRotateShifts: () => {
			setShifts(rotateWeekShifts(shifts, weekStartDateIso));
			setNotification({ type: "success", message: "Ротация смен (Утро ⇄ Вечер) выполнена для всей клиники" });
			setTimeout(() => setNotification(null), 3500);
		},
		handleSaveAll,
	};
}
