/**
 * Patient Merge Modules SSOT Index.
 * Modular sweet-spot architecture conforming to Mandates 8b and 8zi.
 */

export {
	SAFE_IDENTIFIER,
	patientReferenceColumns,
	UNIQUE_CONFLICT_TABLES,
	rowCount,
	type PatientReferenceColumn,
} from "./patientReferenceInspector.js";

export {
	resolveUniqueConflicts,
	mergeBonusBalances,
	removeSelfReferralLoops,
	reconcileFamilyGroups,
	reconcilePatientProfiles,
	type PatientRecord,
	type PatientFillPayload,
} from "./patientMergeReconciliation.js";

export {
	mergePatients,
	mergePatientCards,
	dismissDuplicatePair,
	formatMergeSummary,
	type MergeResult,
	type MergePatientsInput,
} from "./patientMergeExecutor.js";
