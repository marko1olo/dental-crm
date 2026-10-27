/**
 * DENTE Dental CRM — Shift Editor Types
 * Fast Shift & Chair-Doctor Binding (Mandates 8d, 8e, 8k, 8n)
 */

import type { ActivePopoverCell, FlatChairItem, WeekDayItem } from "../types";
import type {
	CabinetDefinition,
	DoctorChairRosterTemplateId,
	StaffMember,
} from "../../doctorShiftRosterPresets";
import type { DoctorShift } from "../../doctorShiftRosterEngine";

export type ShiftPresetType = "morning" | "evening" | "full_day" | "clear";

export interface ShiftPresetDefinition {
	id: ShiftPresetType;
	title: string;
	subtitle: string;
	icon: "sun" | "moon" | "building" | "trash";
	color: string;
	testId: string;
}

export interface WeeklyTemplateDefinition {
	id: DoctorChairRosterTemplateId;
	title: string;
	subtitle: string;
	icon: "sun" | "moon" | "calendar" | "building";
	color: string;
	testId: string;
	fullWidth?: boolean;
}

export interface ShiftEditorModalProps {
	activePopover: ActivePopoverCell | null;
	weekDays: WeekDayItem[];
	cabinets: CabinetDefinition[];
	staffList: StaffMember[];
	shifts: DoctorShift[];
	flatChairsList: FlatChairItem[];
	onClosePopover: () => void;
	onApplyPreset: (presetType: ShiftPresetType) => void;
	onApplyWeeklyTemplate: (templateId: DoctorChairRosterTemplateId) => void;
	selectedDocId: string;
	setSelectedDocId: (docId: string) => void;
	selectedChairKey: string;
	setSelectedChairKey: (chairKey: string) => void;
	onOpenEdit: (shift: DoctorShift) => void;
	onOpenCreateInCell: (dateIso: string, cabinetId: string, chairId: string) => void;
}
