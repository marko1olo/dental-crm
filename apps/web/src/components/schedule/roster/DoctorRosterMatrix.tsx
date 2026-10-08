/**
 * DENTE Dental CRM — Doctor Shift Roster Matrix & Views
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Mandate 8e, Mandate 8d
 * Decomposed Facade (Layer 5): delegates to ./doctorMatrix/ (Anti-Monolith <800 lines per file)
 */

export type {
	ActivePopoverCell,
	FlatChairItem,
	WeekDayItem,
	MonthNormInfo,
	DoctorRosterMatrixProps,
	RosterHeaderToolbarProps,
	RosterGridMatrixProps,
	ShiftEditorModalProps,
	RosterStatsBarProps,
} from "./doctorMatrix";

export {
	DoctorRosterMatrix,
	RosterHeaderToolbar,
	RosterGridMatrix,
	ShiftEditorModal,
	RosterStatsBar,
	MEDICAL_WORKWEEK_NORM_HOURS,
	ASSISTANT_WORKWEEK_NORM_HOURS,
	STANDARD_WORKWEEK_NORM_HOURS,
	SHIFT_PRESET_TIMES,
	WEEKLY_CHAIR_TEMPLATES,
} from "./doctorMatrix";

export * from "./doctorMatrix";
