/**
 * Patient Recall & Clinical Prophylaxis Engine Barrel Module (DOMAIN: RECALLS)
 * Architecture: Clean Modular Facade <= 80 lines (Mandate 8b)
 */

export * from "./patientRecallEngine";
export * from "./recallTemplates";
export {
	buildRecallMessageContent,
	type PatientRecallItem,
} from "./recallsCatalogData";
export { DirectRecallsLauncher } from "./DirectRecallsLauncher";

export {
	PatientRecallsHubModal,
	type PatientRecallsHubModalProps,
	default,
} from "./PatientRecallsHubModal";

export * from "./PatientRecallsTaskCallsTab";
export * from "./PatientRecallsTableView";
export * from "./PatientRecallsKanbanView";
export * from "./PatientRecallsToolbar";
