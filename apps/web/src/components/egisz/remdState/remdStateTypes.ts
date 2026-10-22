/**
 * remdStateTypes.ts — Interfaces and parameter types for EGISZ REMD and FNS state management.
 * Mandate 8b compliant (<= 120 lines).
 */

import type {
	EgiszDentalCdaPayload,
	FnsTaxCertificatePayload,
	GostSignatureInfo,
} from "../egiszRemdEngine";

export interface UseEgiszRemdStateProps {
	readonly initialPayload?: Partial<EgiszDentalCdaPayload> | undefined;
	readonly initialXmlPayload?: any | undefined;
	readonly initialFnsPayload?: Partial<FnsTaxCertificatePayload> | undefined;
	readonly activeDocType: "cda_semd" | "fns_tax";
	readonly doctorSig?: GostSignatureInfo | undefined;
	readonly moSig?: GostSignatureInfo | undefined;
}
