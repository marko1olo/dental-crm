import type React from "react";
import type {
	CommunicationTask,
	Dashboard,
	GeneratedDocument,
	ImagingStudy,
	Patient,
	PatientInsight,
} from "@dental/shared";
import type { StaffUser } from "../../auth/staffPinPad/staffPinPadTypes";
import type { ClinicProfileDraft } from "../../onboarding/wizard/types";

export interface AppLogicRouterContext {
	patientName?: string;
	loadDashboard?: () => Promise<void> | void;
	lockTelegramAdminSession?: (scope?: string) => void;
	unlockTelegramAdminSession?: (scope?: string) => void;
	openDoctorShiftCockpit?: () => void;
	[key: string]: unknown;
}

export interface AppViewRouterProps {
	currentView: string;
	dashboard: Dashboard | null | undefined;
	activeStaffUser: StaffUser | null | undefined;
	activeVisitPatient: Patient | null | undefined;
	activePatient: Patient | null | undefined;
	activePatientInsight: PatientInsight | null | undefined;
	activeCommunicationTasks: readonly CommunicationTask[] | readonly unknown[] | null | undefined;
	activeImagingStudies: readonly ImagingStudy[] | null | undefined;
	activeUsableDocuments: readonly GeneratedDocument[] | readonly unknown[] | null | undefined;
	patientId: string | null;
	perspective?: string;
	clinicProfileDraft: ClinicProfileDraft | Record<string, unknown> | null | undefined;
	appLogicValue: AppLogicRouterContext | Record<string, unknown> | null | undefined;
	topBar?: React.ReactNode;
	toastPortal?: React.ReactNode;
}
