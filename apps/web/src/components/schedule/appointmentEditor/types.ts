import type { Appointment, Dashboard } from "@dental/shared";

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
	appointmentPatient: any;
	appointmentDoctor: any;
	appointmentChair: any;
	activePatients: any[];
	activeDoctors: any[];
	activeAssistants: any[];
	activeChairs: any[];
	useManualSelects: boolean;
	collision: {
		hasCollision: boolean;
		conflictType: any;
		conflictingAppointment: any;
		message: string | null;
	};
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
