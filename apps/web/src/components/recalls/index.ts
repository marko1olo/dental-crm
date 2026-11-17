/**
 * Patient Recall & Clinical Prophylaxis Engine Barrel Module (DOMAIN: RECALLS)
 * Architecture: Clean Modular Facade <= 80 lines (Mandate 8b)
 */

export * from "./patientRecallEngine";
export {
	INVITATION_TEMPLATES,
	CLINICAL_CALLING_SCRIPTS,
	type RecallScriptObjection,
	type RecallInvitationTemplate,
	type RecallCallingScript,
} from "./recallTemplates";

export { DirectRecallLauncher } from "./DirectRecallLauncher";

export {
	PatientRecallsHubModal,
	type PatientRecallsHubModalProps,
	default,
} from "./PatientRecallsHubModal";

export * from "./PatientRecallsTaskCallsTab";
export * from "./PatientRecallsKanbanView";
