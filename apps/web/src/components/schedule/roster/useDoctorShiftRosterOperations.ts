/**
 * DENTE Dental CRM — Doctor Shift Roster Operations Hook
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13
 * Architecture: Extracted React Hook for state management, computations, and handlers
 */

import type { UseDoctorShiftRosterOperationsParams, EmployeeInfo } from "./rosterOperations/rosterOperationsTypes";
import { useRosterStateAndDates } from "./rosterOperations/useRosterStateAndDates";
import { useRosterComputations } from "./rosterOperations/useRosterComputations";
import { useRosterDrawerOperations } from "./rosterOperations/useRosterDrawerOperations";
import { useRosterBulkOperations } from "./rosterOperations/useRosterBulkOperations";

export type { EmployeeInfo, UseDoctorShiftRosterOperationsParams };

export function useDoctorShiftRosterOperations(params: UseDoctorShiftRosterOperationsParams) {
	const { appointments = [], clinicName = 'ООО "Денте Клиник"', onSave, onClose, initialEditingShift } = params;

	const {
		staffList, cabinets, weekStartDateIso, setWeekStartDateIso,
		activeTab, setActiveTab, shifts, setShifts,
		notification, setNotification, isT13ModalOpen, setIsT13ModalOpen,
		weekDays, weekEndDateIso,
	} = useRosterStateAndDates(params);

	const {
		selectedYear, selectedMonth, monthNormObj, conflicts, staffStats,
		t13Matrix, t13Employees, sanitizedAppointments, kpis,
	} = useRosterComputations({
		shifts, staffList, appointments, weekStartDateIso, weekEndDateIso,
	});

	const {
		editingShift, setEditingShift, isNewShift,
		handleOpenEdit, handleOpenCreateInCell, handleSaveDrawerShift, handleDeleteShift,
	} = useRosterDrawerOperations({
		staffList, initialEditingShift, setShifts, setNotification,
	});

	const {
		handlePrevWeek, handleNextWeek, handlePrintSchedule, handleExportT13,
		handleApplyPreset, handleAutoFillDefault, handleApplyCellPreset,
		handleApplyDoctorChairWeeklyTemplate, handleCopyWeekToNextWeek,
		handleCopyWeekToMonth, handleClearWeek, handleRotateShifts, handleSaveAll,
	} = useRosterBulkOperations({
		weekStartDateIso, setWeekStartDateIso, weekEndDateIso, staffList, cabinets,
		shifts, setShifts, clinicName, onSave, onClose, setNotification,
	});

	return {
		weekStartDateIso, setWeekStartDateIso, activeTab, setActiveTab,
		shifts, setShifts, editingShift, setEditingShift, isNewShift,
		notification, isT13ModalOpen, setIsT13ModalOpen,
		weekDays, weekEndDateIso, selectedYear, selectedMonth, monthNormObj,
		conflicts, staffStats, t13Matrix, t13Employees, sanitizedAppointments, kpis,
		handlePrevWeek, handleNextWeek, handleOpenEdit, handleOpenCreateInCell,
		handleSaveDrawerShift, handleDeleteShift, handleExportT13, handlePrintSchedule,
		handleApplyPreset, handleAutoFillDefault, handleApplyCellPreset,
		handleApplyDoctorChairWeeklyTemplate, handleCopyWeekToNextWeek,
		handleCopyWeekToMonth, handleClearWeek, handleRotateShifts, handleSaveAll,
	};
}
