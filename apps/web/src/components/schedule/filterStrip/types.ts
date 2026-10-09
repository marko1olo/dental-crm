import type React from "react";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { QuickAddChairData } from "../QuickAddChairModal";

export type { QuickAddChairData } from "../QuickAddChairModal";

export interface ScheduleStaffMember {
	id: string;
	fullName?: string;
	active?: boolean;
	role?: string;
	specialties?: string[];
	specialty?: string;
}

export interface ScheduleBranch {
	id: string;
	name: string;
	active?: boolean;
}

export interface ScheduleChair {
	id: string;
	name: string;
	active?: boolean;
	specialization?: string | null;
	room?: string | null;
}

export interface ShiftQueueCounts {
	all?: number;
	arrived?: number;
	inTreatment?: number;
	awaitingPayment?: number;
}

export interface ScheduleFilterStripProps {
	todayIso?: string;
	scheduleDateFilter: string;
	setScheduleDateFilter: (date: string) => void;
	stepScheduleDay: (delta: number) => void;
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	staffMembers?: ScheduleStaffMember[];
	chairs?: ScheduleChair[];
	isSoloDoctor?: boolean;
	branches?: readonly ScheduleBranch[] | ScheduleBranch[];
	selectedBranchId?: string | null;
	onSelectBranch?: (branchId: string | null) => void;
	scheduleDoctorFilterId?: string | null | undefined;
	setScheduleDoctorFilterId?: ((id: string | null) => void) | undefined;
	scheduleChairFilterId?: string | null | undefined;
	setScheduleChairFilterId?: ((id: string | null) => void) | undefined;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	currentDoctorId?: string | null | undefined;
	onSelectMyChair?: (() => void) | undefined;
	scheduleViewMode?: "timeline" | "grid" | "chairs";
	setScheduleViewMode?: (mode: "timeline" | "grid" | "chairs") => void;
	onQuickBooking?: () => void;
	onToggleSmartAi?: () => void;
	isSmartAiOpen?: boolean;
	onOpenDoctorFreeSlots?: (() => void) | undefined;
	onOpenPreventiveInspection?: (() => void) | undefined;
	preventiveInspectionCount?: number | undefined;
	onOpenPatientSearch?: () => void;
	onSelectWholeWeek?: () => void;
	onEmergencyCitoBooking?: () => void;
	onOpenTomorrowReminders?: () => void;
	onQuickBookRepeatOffset?: (daysOffset: 7 | 14 | 30) => void;
	onToggleShiftAnalytics?: () => void;
	showShiftAnalytics?: boolean;
	onOpenShiftRoster?: () => void;
	onOpenWaitlist?: () => void;
	waitlistCount?: number;
	onToggleConfirmations?: () => void;
	showConfirmationsPanel?: boolean;
	onToggleFreedSlots?: () => void;
	showFreedSlotsPanel?: boolean;
	onToggleClipboard?: () => void;
	showClipboardPanel?: boolean;
	onOpenCalendarSync?: () => void;
	onOpenAddChair?: (() => void) | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	gridStepMinutes?: 15 | 30 | 60 | undefined;
	onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
	activeFilterSummary?: React.ReactNode | undefined;
	scheduleStatusFilter?: string | null | undefined;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	queueCounts?: ShiftQueueCounts | undefined;
}
