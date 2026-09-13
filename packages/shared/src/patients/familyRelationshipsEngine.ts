/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT FAMILY RELATIONSHIPS & SHARED DEPOSIT ENGINE (FACADE)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Transparent facade delegating to canonical SSOT:
 * packages/shared/src/clinical/patientRelationshipsEngine.ts (Mandate 8s)
 */

export {
	PATIENT_RELATIONSHIP_TYPES,
	patientRelationshipTypeSchema,
	type PatientRelationshipType,
	PATIENT_RELATIONSHIP_LABELS_RU,
	PATIENT_INVERSE_RELATIONSHIP_TYPE,
	patientFamilyRelationshipRecordSchema,
	type PatientFamilyRelationshipRecord,
	createRelationshipInputSchema,
	type CreateRelationshipInput,
	patientFamilyTreeMemberSchema,
	type PatientFamilyTreeMember,
	type RelationshipLinkEdge,
	validateRelationshipLink,
	type PayerResolutionCandidate,
	resolveFamilyPrimaryPayer,
	type DepositDeductionAuthParams,
	type DepositDeductionAuthResult,
	authorizeFamilyDepositDeduction,
} from "../clinical/patientRelationshipsEngine.js";


