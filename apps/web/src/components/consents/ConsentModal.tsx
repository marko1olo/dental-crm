import {
	InformedConsentModal,
	type InformedConsentModalProps,
	type ConsentModalProps,
	type SignedConsentPayload,
} from "./InformedConsentModal.js";

/**
 * Канонический алиас для InformedConsentModal (SSOT) без лишних оберток и матрешек (Мандат 8b).
 */
export const ConsentModal = InformedConsentModal;
export type { ConsentModalProps, InformedConsentModalProps, SignedConsentPayload };
export default InformedConsentModal;
