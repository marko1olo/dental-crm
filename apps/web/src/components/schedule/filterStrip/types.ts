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
	todayIso?: string | undefined;
	scheduleDateFilter: string;
	setScheduleDateFilter: (date: string) => void;
	stepScheduleDay: (delta: number) => void;
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	staffMembers?: ScheduleStaffMember[] | undefined;
	chairs?: ScheduleChair[] | undefined;
	isSoloDoctor?: boolean | undefined;
	branches?: readonly ScheduleBranch[] | ScheduleBranch[] | undefined;
	selectedBranchId?: string | null | undefined;
	onSelectBranch?: ((branchId: string | null) => void) | undefined;
	scheduleDoctorFilterId?: string | null | undefined;
	setScheduleDoctorFilterId?: ((id: string | null) => void) | undefined;
	scheduleChairFilterId?: string | null | undefined;
	setScheduleChairFilterId?: ((id: string | null) => void) | undefined;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	currentDoctorId?: string | null | undefined;
	onSelectMyChair?: (() => void) | undefined;
	scheduleViewMode?: ("timeline" | "grid" | "chairs") | undefined;
	setScheduleViewMode?: ((mode: "timeline" | "grid" | "chairs") => void) | undefined;
	onQuickBooking?: (() => void) | undefined;
	onToggleSmartAi?: (() => void) | undefined;
	isSmartAiOpen?: boolean | undefined;
	onOpenDoctorFreeSlots?: (() => void) | undefined;
	onOpenPreventiveInspection?: (() => void) | undefined;
	preventiveInspectionCount?: number | undefined;
	onOpenPatientSearch?: (() => void) | undefined;
	onSelectWholeWeek?: (() => void) | undefined;
	onEmergencyCitoBooking?: (() => void) | undefined;
	onOpenTomorrowReminders?: (() => void) | undefined;
	onQuickBookRepeatOffset?: ((daysOffset: 7 | 14 | 30) => void) | undefined;
	onToggleShiftAnalytics?: (() => void) | undefined;
	showShiftAnalytics?: boolean | undefined;
	onOpenShiftRoster?: (() => void) | undefined;
	onOpenDoctorShiftDrawer?: (() => void) | undefined;
	onOpenChairDateRangeModal?: (() => void) | undefined;
	onOpenWaitlist?: (() => void) | undefined;
	waitlistCount?: number | undefined;
	onToggleConfirmations?: (() => void) | undefined;
	showConfirmationsPanel?: boolean | undefined;
	onToggleFreedSlots?: (() => void) | undefined;
	showFreedSlotsPanel?: boolean | undefined;
	onToggleClipboard?: (() => void) | undefined;
	showClipboardPanel?: boolean | undefined;
	onOpenCalendarSync?: (() => void) | undefined;
	onOpenAddChair?: (() => void) | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	gridStepMinutes?: (15 | 30 | 60) | undefined;
	onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
	activeFilterSummary?: React.ReactNode | undefined;
	scheduleStatusFilter?: string | null | undefined;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	queueCounts?: ShiftQueueCounts | undefined;
}
