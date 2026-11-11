/**
 * Patient Recall & Clinical Prophylaxis Engine Barrel Module (DOMAIN: RECALLS)
 * Architecture: Clean Modular Facade <= 80 lines (Mandate 8b)
 */

export * from "./patientRecallEngine";
export * from "./recallTemplates";
export {
	buildRecallMessageContent,
	type PatientRecallItem,
	type RecallCycleType,
	type CanonicalRecallWorkflowStatus,
	type RecallContactStatus,
	CANONICAL_RECALL_STATUS_CONFIG,
	DEFAULT_RECALL_CANDIDATES,
	DEMO_SHOWCASE_CANDIDATES,
} from "./recallsCatalogData";

export { DirectRecallLauncher } from "./DirectRecallLauncher";

export {
	PatientRecallsHubModal,
	type PatientRecallsHubModalProps,
	default,
} from "./PatientRecallsHubModal";

export * from "./PatientRecallsTaskCallsTab";
export * from "./PatientRecallsKanbanView";
