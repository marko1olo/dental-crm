import type { DocumentPayload, GeneratedDocument } from "@dental/shared";
import { withDocumentHelpers } from "./documentStateHydrator";
import { buildClinicalPayload } from "./payloadBuildersClinical";
import { buildConsentPayload } from "./payloadBuildersConsent";
import { buildFinancialPayload } from "./payloadBuildersFinancial";
import type { DocumentState } from "./types";

export { buildFinancialPayload } from "./payloadBuildersFinancial";
export { buildConsentPayload } from "./payloadBuildersConsent";
export { buildClinicalPayload } from "./payloadBuildersClinical";

export function documentPayloadForKind(
	kind: GeneratedDocument["kind"],
	incomingState: DocumentState,
): DocumentPayload | null {
	// Чистые помощники, необходимые валидаторам и сборщикам внутри состояния.
	const state = withDocumentHelpers(incomingState);
	return (
		buildFinancialPayload(kind, state) ??
		buildConsentPayload(kind, state) ??
		buildClinicalPayload(kind, state) ??
		null
	);
}
