import type { Appointment, AppointmentLabStatusInfo, Dashboard, Patient } from "@dental/shared";
import type { ScheduleDensityMode, DoctorSpecialtyTheme } from "../appointmentCardHelpers";

export type ScheduleStaffMember = NonNullable<Dashboard["clinicSettings"]>["staff"][number];

export interface ScheduleGridCollision {
	sameDoctor?: boolean | undefined;
	sameChair?: boolean | undefined;
	sameAssistant?: boolean | undefined;
	samePatient?: boolean | undefined;
	conflictWith?: string | undefined;
}

export type AppointmentStatusType =
	| "planned"
	| "confirmed"
	| "arrived"
	| "in_treatment"
	| "completed"
	| "cancelled"
	| "no_show";

export const APPOINTMENT_STATUS_LABELS_RU: Record<AppointmentStatusType, string> = {
	planned: "Запланирован",
	confirmed: "Подтверждён",
	arrived: "В холле",
	in_treatment: "В кресле",
	completed: "Завершён",
	cancelled: "Отменён",
	no_show: "Не явился",
};

export type ClinicalAlertKind = "allergy" | "debt" | "primary" | "cito" | "somatic";

export interface ClinicalAlertBadge {
	id: string;
	kind: ClinicalAlertKind;
	label: string;
	severity: "critical" | "warning" | "info";
	badgeClass: string;
}

export interface GridAppointmentCardProps {
	densityMode?: ScheduleDensityMode;
	appointment: Appointment;
	chair: { id: string; name: string };
	effectiveChairs: Array<{ id: string; name: string; color?: string | null | undefined; colorId?: string | number | undefined; [key: string]: unknown }>;
	doctors: Array<{ id: string; fullName: string; specialties?: string[]; role?: string }>;
	patientLookupMap: Map<string, Patient>;
	staffLookupMap: Map<string, ScheduleStaffMember>;
	collisionMap: Map<string, ScheduleGridCollision>;
	patientNameFn?: ((patients: Dashboard["patients"], patientId: string | null) => string) | undefined;
	getPatientName?: ((patients: Dashboard["patients"], patientId: string | null) => string) | undefined;
	dashboard: Dashboard;
	timezone?: string | null;
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	isHovered: boolean;
	isStatusPickerOpen: boolean;
	isMenuOpen: boolean;
	isNearBottom: boolean;
	isNearRightEdge: boolean;
	onAppointmentClick: (appt: Appointment) => void;
	onAppointmentDoubleClick?: ((appt: Appointment) => void) | undefined;
	onSelectMobileAppt: (appt: Appointment) => void;
	onQuickStatusChange?: ((id: string, status: Appointment["status"]) => void) | undefined;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onReassignChair: (appt: Appointment, chairId: string) => void;
	onReassignDoctor: (appt: Appointment, doctorId: string) => void;
	onFreeSlotToWaitlist: (appt: Appointment) => void;
	onMouseEnter: (apptId: string) => void;
	onMouseLeave: () => void;
	onKeepHovered: (apptId: string) => void;
	onToggleStatusPicker: (apptId: string) => void;
	onToggleMenu: (apptId: string) => void;
	onCloseStatusPicker: () => void;
	onCloseMenu: () => void;
}

export interface AppointmentStatusMarkerProps {
	appointment: Appointment;
	appointmentLabels: Record<Appointment["status"], string>;
	isStatusPickerOpen: boolean;
	pName: string;
	onToggleStatusPicker: (apptId: string) => void;
	onCloseStatusPicker: () => void;
	onQuickStatusChange?: ((id: string, status: Appointment["status"]) => void) | undefined;
}

export interface AppointmentPatientSummaryProps {
	appointment: Appointment;
	pName: string;
	aStart: string;
	aEnd: string;
	isCito: boolean;
	durationMin: number;
	patientAgeLabel: string | null;
	patObj?: Patient | null | undefined;
}

export interface AppointmentProcedureBadgeProps {
	appointment: Appointment;
	procedureLabel: string;
	teethList: string[];
	docTheme: DoctorSpecialtyTheme | null;
	durationMin: number;
	labStatusInfo?: AppointmentLabStatusInfo | null | undefined;
}

export interface AppointmentQuickActionsMenuProps {
	appointment: Appointment;
	pName: string;
	patObj?: Patient | null | undefined;
	docObj?: ScheduleStaffMember | null | undefined;
	effectiveChairs: Array<{ id: string; name: string; color?: string | null | undefined; colorId?: string | number | undefined; [key: string]: unknown }>;
	doctors: Array<{ id: string; fullName: string; specialties?: string[]; role?: string }>;
	dashboard: Dashboard;
	isHovered: boolean;
	isMenuOpen: boolean;
	onAppointmentClick: (appt: Appointment) => void;
	onToggleMenu: (apptId: string) => void;
	onCloseMenu: () => void;
	onQuickStatusChange?: ((id: string, status: Appointment["status"]) => void) | undefined;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onReassignChair: (appt: Appointment, chairId: string) => void;
	onReassignDoctor: (appt: Appointment, doctorId: string) => void;
	onFreeSlotToWaitlist: (appt: Appointment) => void;
}

export function areGridAppointmentCardPropsEqual(
	prev: GridAppointmentCardProps,
	next: GridAppointmentCardProps,
): boolean {
	if (prev.appointment !== next.appointment) return false;
	if (prev.isHovered !== next.isHovered) return false;
	if (prev.isStatusPickerOpen !== next.isStatusPickerOpen) return false;
	if (prev.isMenuOpen !== next.isMenuOpen) return false;
	if (prev.isNearBottom !== next.isNearBottom) return false;
	if (prev.isNearRightEdge !== next.isNearRightEdge) return false;
	if (prev.chair.id !== next.chair.id || prev.chair.name !== next.chair.name) return false;
	if (prev.effectiveChairs !== next.effectiveChairs) return false;
	if (prev.doctors !== next.doctors) return false;
	if (prev.patientLookupMap !== next.patientLookupMap) return false;
	if (prev.staffLookupMap !== next.staffLookupMap) return false;
	if (prev.collisionMap !== next.collisionMap) return false;
	if (prev.appointmentLabels !== next.appointmentLabels) return false;
	if (prev.timezone !== next.timezone) return false;
	if (prev.dashboard.clinicSettings !== next.dashboard.clinicSettings) return false;
	if (prev.densityMode !== next.densityMode) return false;
	return true;
}
