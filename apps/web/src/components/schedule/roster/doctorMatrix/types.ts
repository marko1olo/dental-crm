/**
 * DENTE Dental CRM — Doctor Shift Roster Matrix Types (Layer 0)
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Mandates 8e, 8d, 8k, 8n
 */

import type {
	CabinetDefinition,
	StaffMember,
	DoctorChairRosterTemplateId,
} from "../doctorShiftRosterPresets";
import type {
	calculateChairUtilization,
	DoctorShift,
	RosterConflict,
	T13RowData,
} from "../doctorShiftRosterEngine";

export interface ActivePopoverCell {
	dateIso: string;
	cabinetId: string;
	chairId: string;
	doctorId?: string;
}

export interface FlatChairItem {
	cabinetId: string;
	cabinetName: string;
	chairId: string;
	chairName: string;
}

export interface WeekDayItem {
	dateIso: string;
	dayName: string;
	dayNumber: string;
	isWeekend: boolean;
}

export interface MonthNormInfo {
	month: number;
	nameRu: string;
	normHours33: number;
}

export interface DoctorRosterMatrixProps {
	activeTab: "cabinets" | "doctors" | "t13" | "utilization";
	weekDays: WeekDayItem[];
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	selectedMonth: number;
	monthNormObj?: MonthNormInfo | undefined;
	cabinets: CabinetDefinition[];
	staffList: StaffMember[];
	shifts: DoctorShift[];
	conflicts: RosterConflict[];
	t13Matrix: T13RowData[];
	sanitizedAppointments: Parameters<typeof calculateChairUtilization>[1];
	onOpenEdit: (shift: DoctorShift) => void;
	onOpenCreateInCell: (dateIso: string, cabinetId: string, chairId: string) => void;
	onOpenT13Timesheet?: (() => void) | undefined;
	onOpenInternalT13Modal: () => void;
	onExportT13: () => void;
	onClose: () => void;
	onApplyCellPreset?: (
		dateIso: string,
		cabinetId: string,
		chairId: string,
		presetType: "morning" | "evening" | "full_day" | "clear",
		doctorId?: string,
	) => void;
	onApplyDoctorChairWeeklyTemplate?: (
		doctorId: string,
		chairId: string,
		cabinetId: string,
		templateId: DoctorChairRosterTemplateId,
	) => void;
	activePopoverCell?: ActivePopoverCell | null;
	onActivePopoverCellChange?: (cell: ActivePopoverCell | null) => void;
}

export interface RosterHeaderToolbarProps {
	monthNormObj?: MonthNormInfo | undefined;
	selectedYear: number;
	onOpenT13Timesheet?: (() => void) | undefined;
	onOpenInternalT13Modal: () => void;
	onExportT13: () => void;
	onClose: () => void;
}

export interface RosterGridMatrixProps {
	weekDays: WeekDayItem[];
	weekStartDateIso: string;
	cabinets: CabinetDefinition[];
	shifts: DoctorShift[];
	conflicts: RosterConflict[];
	onCellClick: (cell: ActivePopoverCell) => void;
}

export interface ShiftEditorModalProps {
	activePopover: ActivePopoverCell | null;
	weekDays: WeekDayItem[];
	cabinets: CabinetDefinition[];
	staffList: StaffMember[];
	shifts: DoctorShift[];
	flatChairsList: FlatChairItem[];
	onClosePopover: () => void;
	onApplyPreset: (presetType: "morning" | "evening" | "full_day" | "clear") => void;
	onApplyWeeklyTemplate: (templateId: DoctorChairRosterTemplateId) => void;
	selectedDocId: string;
	setSelectedDocId: (docId: string) => void;
	selectedChairKey: string;
	setSelectedChairKey: (chairKey: string) => void;
	onOpenEdit: (shift: DoctorShift) => void;
	onOpenCreateInCell: (dateIso: string, cabinetId: string, chairId: string) => void;
}

export interface RosterStatsBarProps {
	activeTab: "doctors" | "t13" | "utilization";
	weekDays: WeekDayItem[];
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	monthNormObj?: MonthNormInfo | undefined;
	cabinets: CabinetDefinition[];
	staffList: StaffMember[];
	shifts: DoctorShift[];
	t13Matrix: T13RowData[];
	sanitizedAppointments: Parameters<typeof calculateChairUtilization>[1];
	flatChairsList: FlatChairItem[];
	onOpenT13Timesheet?: (() => void) | undefined;
	onOpenInternalT13Modal: () => void;
	onExportT13: () => void;
	onClose: () => void;
	onCellClick: (cell: ActivePopoverCell) => void;
}
