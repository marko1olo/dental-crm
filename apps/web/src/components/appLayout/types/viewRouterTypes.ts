import type React from "react";

export interface AppViewRouterProps {
	currentView: string;
	dashboard: any;
	activeStaffUser: any;
	activeVisitPatient: any;
	activePatient: any;
	activePatientInsight: any;
	activeCommunicationTasks: any;
	activeImagingStudies: any;
	activeUsableDocuments: any;
	patientId: string | null;
	perspective?: string;
	clinicProfileDraft: any;
	appLogicValue: any;
	topBar?: React.ReactNode;
	toastPortal?: React.ReactNode;
}
