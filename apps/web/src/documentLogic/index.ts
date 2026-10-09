export type { DocumentState, TimestampShape } from "./types";
export { DOCUMENT_TIMESTAMP_FIELDS } from "./types";

export {
	formatRuDateTime,
	formatRuDate,
	formatIsoDate,
	formatDateTimeLocal,
	withDocumentCreationTimestamps,
} from "./timestampHelpers";

export {
	documentPayloadForKind,
	buildFinancialPayload,
	buildConsentPayload,
	buildClinicalPayload,
} from "./payloadBuilders";

export {
	requiredDocumentField,
	confirmedDocumentLiteral,
	withDocumentHelpers,
	validateDocumentPayloadForKind,
	hydrateDocumentStateWithProfiles,
} from "./documentStateHydrator";
