import type React from "react";
import type {
	ScheduleBranch,
	ScheduleChair,
	ScheduleStaffMember,
} from "./types";

export interface ScheduleOptionsDropdownProps {
	isOptionsMenuOpen: boolean;
	setIsOptionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	optionsMenuRef: React.RefObject<HTMLDivElement | null>;
	onQuickBooking?: (() => void) | undefined;
	setScheduleViewMode?: ((mode: "timeline" | "grid" | "chairs") => void) | undefined;
	scheduleViewMode?: ("timeline" | "grid" | "chairs") | undefined;
	hasMultipleBranches: boolean;
	selectedBranchId?: string | null | undefined;
	onSelectBranch?: ((branchId: string | null) => void) | undefined;
	activeBranches: ScheduleBranch[];
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	handleSelectMyChair: () => void;
	hasMultipleDoctors: boolean;
	activeDoctors: ScheduleStaffMember[];
	scheduleDoctorFilterId?: string | null | undefined;
	setScheduleDoctorFilterId?: ((id: string | null) => void) | undefined;
	displayChairs: readonly ScheduleChair[];
	scheduleChairFilterId?: string | null | undefined;
	setScheduleChairFilterId?: ((id: string | null) => void) | undefined;
	setScheduleDateFilter: (date: string) => void;
	tomorrowIso: string;
	scheduleStatusFilter?: string | null | undefined;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	onSelectWholeWeek?: (() => void) | undefined;
	handleRepeatBookingOffset: (days: 7 | 14 | 30) => void;
	gridStepMinutes?: (15 | 30 | 60) | undefined;
	onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
	handleOpenAddChair: () => void;
	onOpenPatientSearch?: (() => void) | undefined;
	onToggleSmartAi?: (() => void) | undefined;
	onOpenDoctorFreeSlots?: (() => void) | undefined;
	onOpenPreventiveInspection?: (() => void) | undefined;
	preventiveInspectionCount?: number | undefined;
	onOpenTomorrowReminders?: (() => void) | undefined;
	onEmergencyCitoBooking?: (() => void) | undefined;
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
}
