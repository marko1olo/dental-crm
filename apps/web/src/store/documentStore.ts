/**
 * Canonical facade for documentStore, decomposed into modular slices under ./documentStore/
 */
export type {
	MedicalDocumentReleaseChannel,
	DocumentState,
	DocumentSliceState,
	TaxSliceState,
	IntakeConsentSliceState,
	FinancialSliceState,
	ClinicalSliceState,
	MiscSliceState,
} from "./documentStore/index";

export {
	documentFormInitialValues,
	documentFormHasEntries,
	useDocumentStore,
} from "./documentStore/index";
