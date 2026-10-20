/**
 * apps/web/src/hooks/appLogic/useSettingsAndIntegrationsLogic.ts
 *
 * Facade hook for Clinic Settings, Profiles, Rules, Imaging, Documents, and Telegram integrations.
 *
 * Decomposed into:
 * - settingsIntegrationsModules/useClinicProfileAndRulesLogic.ts
 * - settingsIntegrationsModules/useImagingAndDicomLogic.ts
 * - domains/useDocumentWorkflowModule.ts
 * - domains/useTelegramModule.ts
 *
 * Mandate 8b: File line count strictly <= 500 lines (facade <= 250 lines).
 */

import type { Dashboard } from "@dental/shared";
import type { OnboardingStep, VisitNoteForm } from "../../AppHelpers";
import { useAppStore } from "../../store/appStore";
import type { AppView } from "../../utils/routeUtils";
import { useDocumentWorkflowModule } from "../domains/useDocumentWorkflowModule";
import { useTelegramModule } from "../domains/useTelegramModule";
import { useClinicProfileAndRulesLogic } from "./settingsIntegrationsModules/useClinicProfileAndRulesLogic";
import { useImagingAndDicomLogic } from "./settingsIntegrationsModules/useImagingAndDicomLogic";
import type { SettingsAndIntegrationsLogicSlice } from "./types";

interface UseSettingsAndIntegrationsLogicProps {
	auth: any;
	dashboard: Dashboard | null;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	loadDashboard: () => Promise<void>;
	setError: (err: string | null) => void;
	currentView: AppView;
	setCurrentView: (view: AppView) => void;
	settingsTab: string;
	onboardingDismissed: boolean;
	onboardingStep: OnboardingStep;
	activePatient: any;
	activeDoctor: any;
	activeAppointment: any;
	documentPatient: any;
	selectedPatientId: string;
	uiPreferencesHydrated: boolean;
	setSelectedDocumentKind: (kind: any) => void;
	activePayments: any[];
	activeTreatmentPlanItems: any[];
	visitNoteForm: VisitNoteForm;
	clinicalAdminSecretSession: string;
	settingsAdminSecretSession: string;
}

export function useSettingsAndIntegrationsLogic({
	auth,
	dashboard,
	setDashboard,
	loadDashboard,
	setError,
	currentView,
	setCurrentView,
	settingsTab,
	onboardingDismissed,
	onboardingStep,
	activePatient,
	activeDoctor,
	activeAppointment,
	documentPatient,
	selectedPatientId,
	uiPreferencesHydrated,
	setSelectedDocumentKind,
	activePayments,
	activeTreatmentPlanItems,
	visitNoteForm,
	clinicalAdminSecretSession,
	settingsAdminSecretSession,
}: UseSettingsAndIntegrationsLogicProps): SettingsAndIntegrationsLogicSlice {
	const { clinicProfileDraft } = useAppStore();

	const clinicProfileAndRules = useClinicProfileAndRulesLogic({
		auth,
		dashboard,
		setDashboard,
		loadDashboard,
		setError,
	});

	const imagingAndDicom = useImagingAndDicomLogic({
		auth,
		currentView,
		dashboard,
		documentPatient,
		selectedPatientId,
	});

	const documentWorkflow = useDocumentWorkflowModule({
		dashboard,
		auth,
		activeDoctor,
		activePayments,
		activeTreatmentPlanItems,
		documentPatient,
		clinicProfileDraft,
		activeAppointment,
		visitNoteForm,
		clinicalAdminSecretSession,
		setError,
		loadDashboard,
		setCurrentView,
	});

	const telegram = useTelegramModule({
		settingsAdminSecretSession,
		loadDashboard,
		setError,
		dashboard,
		currentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
		activePatient,
		activeDoctor,
		activeAppointment,
		uiPreferencesHydrated,
		setCurrentView,
		setSelectedDocumentKind,
	});

	const { telegramSettingsModule } = telegram;

	return {
		saveClinicProfileFromDraft: clinicProfileAndRules.saveClinicProfileFromDraft,
		saveClinicProfileIfDirty: clinicProfileAndRules.saveClinicProfileIfDirty,
		analyzePricelist: clinicProfileAndRules.analyzePricelist,
		completeCommunicationTask: clinicProfileAndRules.completeCommunicationTask,
		createClinicalRuleFromSettings:
			clinicProfileAndRules.createClinicalRuleFromSettings,
		documentWorkflow,
		dicomWorkbenchModule: imagingAndDicom.dicomWorkbenchModule,
		telegram,
		telegramSettingsModule,
		visibleImagingStudies: imagingAndDicom.visibleImagingStudies,
		imagingToothFilter: imagingAndDicom.imagingToothFilter,
		setImagingToothFilter: imagingAndDicom.setImagingToothFilter,
		imagingViewerState: imagingAndDicom.imagingViewerState,
		setImagingViewerState: imagingAndDicom.setImagingViewerState,
		mprProjectionCompass: imagingAndDicom.mprProjectionCompass,
		mprAxisGuidance: imagingAndDicom.mprAxisGuidance,
	};
}
