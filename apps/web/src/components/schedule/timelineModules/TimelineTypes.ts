import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ScheduleSuggestion,
} from "@dental/shared";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import type { ScheduleDayGroup } from "../scheduleDayGrouping";

export interface ScheduleTimelineProps {
	visibleDayGroups: ScheduleDayGroup[];
	dashboard: Dashboard;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentScheduleDrafts: Record<string, any>;
	appointmentScheduleSaveStates: Record<string, string>;
	appointmentScheduleErrors: Record<string, string | null>;
	appointmentScheduleDirtyIds: Set<string>;
	editingAppointmentId: string | null;
	appointmentDraftFromAppointment: (appointment: Appointment) => any;
	appointmentDraftMissingSteps: (draft: any) => string[];
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	openScheduleSuggestion: (section: string) => void;
	formatTime: (value: string) => string;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	openAppointmentEditor: (appointment: Appointment) => void;
	repeatAppointment: (appointment: Appointment) => void;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: unknown,
	) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	onEmptySlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
	onNewAppointmentClick?: (() => void) | undefined;
	stepScheduleDay?: ((delta: number) => void) | undefined;
	scheduleDateFilter?: string | undefined;
	clinicToday?: string | undefined;
	activeScheduleFilterCount?: number | undefined;
	resetScheduleFilters?: (() => void) | undefined;
	setScheduleDateFilter?: ((date: string) => void) | undefined;
	todayScheduleDate?: (() => string) | undefined;
	onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
}

export interface TimelineDayGroupProps {
	group: ScheduleDayGroup;
	rowLimit: number;
	onRowLimitIncrease: () => void;
	onRowLimitShowAll: () => void;
	onEmptySlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
	onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
	dashboard: Dashboard;
	appointmentScheduleDrafts: Record<string, any>;
	appointmentScheduleSaveStates: Record<string, string>;
	appointmentScheduleErrors: Record<string, string | null>;
	appointmentScheduleDirtyIds: Set<string>;
	editingAppointmentId: string | null;
	appointmentDraftFromAppointment: (appointment: Appointment) => any;
	appointmentDraftMissingSteps: (draft: any) => string[];
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	openScheduleSuggestion: (section: string) => void;
	formatTime: (time: string) => string;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	openAppointmentEditor: (appointment: Appointment) => void;
	repeatAppointment: (appointment: Appointment) => void;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: unknown,
	) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
}
