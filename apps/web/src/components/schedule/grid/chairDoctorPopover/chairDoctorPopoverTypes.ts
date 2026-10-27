/**
 * chairDoctorPopoverTypes.ts — Interfaces and props for ScheduleChairDoctorPopover.
 */

import type { Dashboard } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "../gridTypes";

export type ShiftPresetType =
	| "morning"
	| "morning_9"
	| "evening"
	| "evening_15"
	| "full"
	| "full_9_21"
	| "two_shifts";

export interface ScheduleChairDoctorPopoverProps {
	chair: { id: string; name: string };
	doctors: Array<any>;
	assignment: ChairDoctorShiftAssignment | undefined;
	suggestedDoctor: any | null;
	hasDoctor: boolean;
	dateKey: string;
	dashboard: Dashboard;
	onClose: () => void;
	handleConfirmAssignDoctor: (
		chairId: string,
		docId: string,
		shiftPreset: ShiftPresetType,
		eveningDocId?: string,
	) => void;
	handleAssignDoctorWeek: (
		chairId: string,
		docId: string,
		fullWeek?: boolean,
	) => void;
	handleAssignDoctorMonth: (chairId: string, docId: string) => void;
	handleQuickSubstituteDoctor: (chairId: string, newDoctorId?: string) => void;
	handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
	handleUnassignDoctor: (chairId: string) => void;
	openAssignModal: (chairId: string) => void;
}
