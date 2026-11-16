import type { Appointment, Dashboard, Patient } from "@dental/shared";

export type ScheduleStaffMember = NonNullable<Dashboard["clinicSettings"]>["staff"][number];
export type ScheduleChairMember = NonNullable<Dashboard["clinicSettings"]>["chairs"][number];

export interface AppointmentEditorCollision {
	hasCollision: boolean;
	conflictType: "doctor" | "chair" | "assistant" | "patient" | null;
	conflictingAppointment: Appointment | null;
	message: string | null;
}

export interface AppointmentCardEditorProps {
	appointment: Appointment;
	dashboard: Dashboard;
	appointmentDraft: Record<string, string | number | boolean | null | undefined>;
	appointmentSaveState: string;
	appointmentSaveError: string | null;
	appointmentDirty: boolean;
	appointmentHasOpenVisit: boolean;
	appointmentMissingSteps: string[];
	appointmentReadyToSave: boolean;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentPatientName: string;
	appointmentPatient?: Patient | null | undefined;
	appointmentDoctor?: ScheduleStaffMember | null | undefined;
	appointmentChair?: ScheduleChairMember | null | undefined;
	activePatients: Patient[];
	activeDoctors: ScheduleStaffMember[];
	activeAssistants: ScheduleStaffMember[];
	activeChairs: ScheduleChairMember[];
	useManualSelects: boolean;
	collision: AppointmentEditorCollision;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: string | number | boolean | null | undefined,
	) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	closeAppointmentEditor: (appointmentId: string) => void;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
}
