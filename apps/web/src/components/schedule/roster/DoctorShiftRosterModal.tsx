/**
 * DENTE Dental CRM — Statutory Doctor Schedule Shift Roster & Workload Studio HUD
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Chair Utilization Heatmap
 * Architecture: Modular orchestration via DoctorRosterToolbar and DoctorRosterMatrix (Anti-Monolith <800 lines)
 */

import React from "react";
import { Check } from "lucide-react";
import { TimesheetT13Modal } from "../../payroll/TimesheetT13Modal";
import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type MedicalStaffRole,
	type ShiftArchetypeId,
	type StaffMember,
	type DoctorChairRosterTemplateId,
	type DoctorChairRosterTemplate,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "./doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	type DoctorShift,
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
	applyDoctorChairDateRange,
	type DateRangeShiftPreset,
	type DateRangeShiftBindingParams,
} from "./doctorWeeklyScheduleGenerator";
import { getMondayOfWeekIso, applyCellShiftPreset } from "./rosterDateUtils";
import { useDoctorShiftRosterOperations } from "./useDoctorShiftRosterOperations";

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
	applyDoctorChairDateRange,
	type DateRangeShiftPreset,
	type DateRangeShiftBindingParams,
} from "./doctorWeeklyScheduleGenerator";
export { DOCTOR_CHAIR_ROSTER_TEMPLATES } from "./doctorShiftRosterPresets";
export { getMondayOfWeekIso, applyCellShiftPreset } from "./rosterDateUtils";
export { useDoctorShiftRosterOperations } from "./useDoctorShiftRosterOperations";

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

export function DoctorShiftRosterModal(props: DoctorShiftRosterModalProps) {
	const {
		isOpen,
		onClose,
		staffList: propStaffList,
		cabinets: propCabinets,
		clinicName = 'ООО "Денте Клиник"',
		onOpenT13Timesheet,
	} = props;

	const staffList =
		propStaffList !== undefined
			? propStaffList
			: isDemoShowcaseMode()
				? DEFAULT_CLINIC_STAFF
				: [];
	const cabinets =
		propCabinets !== undefined
			? propCabinets
			: isDemoShowcaseMode()
				? CLINIC_CABINETS_CATALOG
				: [];

	const {
		weekStartDateIso,
		activeTab,
		setActiveTab,
		shifts,
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
	} = useDoctorShiftRosterOperations(props);

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
						Баланс рабочего времени: 33 ч/нед (врачи) • Табель учёта времени <span className="opacity-60 font-mono">(Т-13)</span>
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
