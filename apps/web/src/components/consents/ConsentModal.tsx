import React from "react";
import {
	PatientConsentSignDrawer,
	type PatientConsentSignDrawerProps,
} from "../documents/PatientConsentSignDrawer.js";
import {
	InformedConsentModal,
	type InformedConsentModalProps,
	type ConsentModalProps,
	type SignedConsentPayload,
} from "./InformedConsentModal.js";

/**
 * Канонический SSOT модального окна и шторки согласия (Мандаты 8b, 8e, 8x).
 * Поддерживает планшетный Bottom Sheet у кресла и пакетный режим без лишних матрешек.
 */
export const ConsentModal: React.FC<ConsentModalProps | PatientConsentSignDrawerProps> = (props) => {
	if ("initialPackageKey" in props && props.initialPackageKey) {
		return <InformedConsentModal {...(props as InformedConsentModalProps)} />;
	}
	return <PatientConsentSignDrawer {...(props as PatientConsentSignDrawerProps)} />;
};

export type { ConsentModalProps, InformedConsentModalProps, PatientConsentSignDrawerProps, SignedConsentPayload };
export default ConsentModal;
