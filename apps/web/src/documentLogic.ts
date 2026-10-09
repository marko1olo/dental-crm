/**
 * @file documentLogic.ts
 * @description Canonical Facade for DENTE CRM Document Logic.
 * Decomposed into modular DAG layers under ./documentLogic/
 * Preserves 100% backward compatibility for all imports.
 */

export type { DocumentState, TimestampShape } from "./documentLogic/types";
export {
	DOCUMENT_TIMESTAMP_FIELDS,
	formatRuDateTime,
	formatRuDate,
	formatIsoDate,
	formatDateTimeLocal,
	withDocumentCreationTimestamps,
	documentPayloadForKind,
	buildFinancialPayload,
	buildConsentPayload,
	buildClinicalPayload,
	requiredDocumentField,
	confirmedDocumentLiteral,
	withDocumentHelpers,
	validateDocumentPayloadForKind,
	hydrateDocumentStateWithProfiles,
} from "./documentLogic/index";
