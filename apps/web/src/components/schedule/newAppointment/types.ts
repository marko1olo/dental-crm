import type { Appointment, Dashboard } from "@dental/shared";
import type { ChangeEvent } from "react";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import type { SmartParsedPayload } from "../../../SmartParsePreview";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

export type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface QuickAppointmentReasonPreset {
	id: string;
	testId: string;
	label: string;
	reason: string;
	durationMinutes: number;
	iconName: "Stethoscope" | "Sparkles" | "Clock" | "AlertTriangle" | "Check";
	tone?: "emergency" | "standard";
}

export type NewAppointmentFormProps = {
	dashboard: Dashboard;
	appointmentLabels: Record<Appointment["status"], string>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newAppointmentDraft: Record<string, any>;
	newAppointmentSaveState: string;
	newAppointmentError: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	updateNewAppointmentDraft: (key: any, value: any) => void;
	createAppointmentFromDraft: (options?: {
		allowOverbooking?: boolean;
		allowEmergencyOverride?: boolean;
	}) => Promise<boolean>;
	resetNewAppointmentDraft: () => void;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	setUseManualSelects: (val: boolean) => void;
	/**
	 * Раскрыта ли форма со всеми полями. Живёт СНАРУЖИ, в ScheduleView, и это не
	 * стилистика.
	 */
	showCreateForm: boolean;
	setShowCreateForm: (value: boolean) => void;
	isSmartAiOpen?: boolean;
	setIsSmartAiOpen?: (value: boolean) => void;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
};

export interface SmartActionNote {
	kind: "cancel" | "reschedule" | "newPatient";
	patientName: string;
	patientPhone: string;
}

export interface BlacklistStatus {
	isBlocked: boolean;
	reason?: string;
	checkFailed?: boolean;
}

export interface AppointmentCollisionInfo {
	hasCollision: boolean;
	isCitoOverbooking?: boolean;
	message?: string;
	overlappingAppointments?: Appointment[];
}
