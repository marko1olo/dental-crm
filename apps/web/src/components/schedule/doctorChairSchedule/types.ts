/**
 * DENTE Dental CRM — Doctor-to-Chair Schedule Types (Layer 0)
 *
 * Strict Layer 0: pure types and contracts, 0 runtime dependencies.
 */

import type { DentalSpecialty } from "@dental/shared";
import type {
	ChairDoctorShiftAssignment,
	ChairShiftPresetId,
} from "../chairRosterMath";
import type { QuickAddDoctorData } from "../QuickAddDoctorModal";

export type {
	ChairDoctorShiftAssignment,
	ChairDoctorSubShift,
	ChairShiftPresetId,
} from "../chairRosterMath";
export type { QuickAddDoctorData } from "../QuickAddDoctorModal";

export interface ChairModalDoctorItem {
	id: string;
	fullName: string;
	name?: string | undefined;
	shortName?: string | undefined;
	role?: string | undefined;
	specialties?: string[] | undefined;
	color?: string | undefined;
	preferredChairId?: string | null | undefined;
}

export interface ChairModalChairItem {
	id: string;
	name: string;
	roomNumber?: string | null | undefined;
	room?: string | null | undefined;
}

export interface DoctorChairScheduleModalProps {
	isOpen: boolean;
	onClose: () => void;
	chair: ChairModalChairItem | null;
	chairs?: readonly ChairModalChairItem[] | undefined;
	doctors: Array<ChairModalDoctorItem>;
	dateKey: string;
	currentAssignment?: ChairDoctorShiftAssignment | null | undefined;
	onAssign: (
		chairId: string,
		assignment: ChairDoctorShiftAssignment | null,
	) => void;
	onAssignDateRange?: ((params: {
		chairId: string;
		doctorId: string;
		shiftPreset: string;
		startDate: string;
		endDate: string;
	}) => void) | undefined;
	onAddDoctor?: ((doctor: QuickAddDoctorData) => Promise<void> | void) | undefined;
	isSoloDoctor?: boolean | undefined;
}

export type ScheduleModalTab = "day" | "range";

export type RangeRotationPreset =
	| "morning"
	| "evening"
	| "full"
	| "two_two"
	| "five_day";

export interface DoctorChairScheduleState {
	activeChair: ChairModalChairItem;
	activeTab: ScheduleModalTab;
	setActiveTab: (tab: ScheduleModalTab) => void;
	selectedShiftPreset: ChairShiftPresetId;
	setSelectedShiftPreset: (preset: ChairShiftPresetId) => void;
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedEveningDoctorId: string;
	setSelectedEveningDoctorId: (id: string) => void;
	rangeStartDate: string;
	setRangeStartDate: (date: string) => void;
	rangeEndDate: string;
	setRangeEndDate: (date: string) => void;
	rangeRotationPreset: RangeRotationPreset;
	setRangeRotationPreset: (preset: RangeRotationPreset) => void;
	isInlineDoctorFormOpen: boolean;
	setIsInlineDoctorFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
	newDocName: string;
	setNewDocName: (name: string) => void;
	newDocSpecialty: DentalSpecialty;
	setNewDocSpecialty: (specialty: DentalSpecialty) => void;
	newDocColor: string;
	setNewDocColor: (color: string) => void;
	handleSoloDoctorQuickAnchor: () => void;
	handleConfirmDayAssignment: () => void;
	handleConfirmDateRange: () => void;
	handleUnassign: () => void;
	handleInlineDoctorSubmit: () => Promise<void>;
	hasActiveAssignment: boolean;
}
