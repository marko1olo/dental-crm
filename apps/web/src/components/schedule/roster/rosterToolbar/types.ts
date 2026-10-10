/**
 * DENTE Dental CRM — Doctor Shift Roster Toolbar Types
 * Layer 0: Contracts, DTOs & Component Props
 */

import type {
	MonthProductionCalendarNorm2026,
	CabinetDefinition,
	StaffMember,
	DoctorChairRosterTemplateId,
} from "../doctorShiftRosterPresets";
import type { RosterConflict } from "../doctorShiftRosterEngine";

export type {
	MonthProductionCalendarNorm2026,
	CabinetDefinition,
	StaffMember,
	DoctorChairRosterTemplateId,
	RosterConflict,
};

export interface RosterChairOption {
	chairId: string;
	chairName: string;
	cabinetId: string;
	cabinetName: string;
}

export interface DoctorRosterToolbarProps {
	clinicName?: string | undefined;
	kpis: {
		totalWeekShifts: number;
		totalWeeklyHours: number;
		assistantPairingPct: number;
		conflictCount: number;
		errorConflictCount: number;
	};
	monthNormObj?: MonthProductionCalendarNorm2026 | undefined;
	activeTab: "cabinets" | "doctors" | "t13" | "utilization";
	onSelectTab: (tab: "cabinets" | "doctors" | "t13" | "utilization") => void;
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	onAutoFillDefault: () => void;
	onApplyPreset: (
		preset: "five_day" | "two_two" | "morning" | "evening" | "full_day",
		label: string,
	) => void;
	onApplyDoctorChairWeeklyTemplate?: (
		doctorId: string,
		chairId: string,
		cabinetId: string,
		templateId: DoctorChairRosterTemplateId,
	) => void;
	onCopyWeekToNextWeek?: () => void;
	onCopyWeekToMonth?: () => void;
	onClearWeek?: () => void;
	onRotateShifts?: () => void;
	onPrintSchedule: () => void;
	onExportT13: () => void;
	onSaveAll: (closeAfter?: boolean) => void;
	onClose: () => void;
	notification: { type: "success" | "info" | "error"; message: string } | null;
	conflicts: RosterConflict[];
	staffList?: StaffMember[];
	cabinets?: CabinetDefinition[];
}

export interface RosterDateNavigationProps {
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	activeTab: "cabinets" | "doctors" | "t13" | "utilization";
	onSelectTab: (tab: "cabinets" | "doctors" | "t13" | "utilization") => void;
	onAutoFillDefault: () => void;
}

export interface RosterFilterBarProps {
	doctors: StaffMember[];
	allChairs: RosterChairOption[];
	selectedDoctorId: string;
	onSelectDoctorId: (id: string) => void;
	selectedChairKey: string;
	onSelectChairKey: (key: string) => void;
	hasTemplateHandler: boolean;
	specialtyFilter?: string;
	onSelectSpecialty?: (specialty: string) => void;
}

export interface RosterTemplateActionsProps {
	onApplyPreset: (
		preset: "five_day" | "two_two" | "morning" | "evening" | "full_day",
		label: string,
	) => void;
	onAutoFillDefault: () => void;
	onCopyWeekToNextWeek?: (() => void) | undefined;
	onCopyWeekToMonth?: (() => void) | undefined;
	onClearWeek?: (() => void) | undefined;
	onRotateShifts?: (() => void) | undefined;
	isPresetMenuOpen: boolean;
	onTogglePresetMenu: () => void;
	onClosePresetMenu: () => void;
	onApplyTemplate: (templateId: DoctorChairRosterTemplateId) => void;
	hasTemplateHandler: boolean;
}

export interface RosterPresetsStripProps {
	onApplyPreset: (
		preset: "five_day" | "two_two" | "morning" | "evening" | "full_day",
		label: string,
	) => void;
	children?: React.ReactNode;
}
