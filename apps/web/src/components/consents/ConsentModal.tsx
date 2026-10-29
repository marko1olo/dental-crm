/**
 * apps/web/src/components/consents/ConsentModal.tsx
 * Канонический SSOT модального окна и шторки согласия (Мандаты 8b, 8e, 8n).
 * Дублирующий контур PatientConsentSignDrawer снесён. InformedConsentModal является единым SSOT.
 */

import React from "react";
import {
	InformedConsentModal,
	type InformedConsentModalProps,
	type ConsentModalProps,
	type SignedConsentPayload,
} from "./InformedConsentModal.js";
import type { PatientConsentSignDrawerProps, ConsentKindOption } from "../documents/consentDrawer/types.js";

function mapConsentKindToTemplateKey(kind?: string) {
	if (!kind) return undefined;
	switch (kind) {
		case "therapeutic":
			return "CONSENT_THERAPY" as const;
		case "surgical_implantation":
			return "CONSENT_SURGERY_IMPLANT" as const;
		case "anesthesia":
			return "CONSENT_ANESTHESIA" as const;
		case "orthodontic":
			return "CONSENT_ORTHODONTICS" as const;
		case "orthopedic":
			return "CONSENT_ORTHOPEDICS" as const;
		case "personal_data":
			return "CONSENT_PERSONAL_DATA" as const;
		case "paid_contract":
			return "CONSENT_PAID_CONTRACT" as const;
		default:
			return undefined;
	}
}

export type { ConsentModalProps, InformedConsentModalProps, PatientConsentSignDrawerProps, SignedConsentPayload };

export const ConsentModal: React.FC<ConsentModalProps | PatientConsentSignDrawerProps> = (props) => {
	const rawProps = props as Record<string, any>;
	const initialTemplateKey = rawProps.initialTemplateKey || mapConsentKindToTemplateKey(rawProps.defaultConsentKind);
	const doctorName = rawProps.doctorName || rawProps.doctorFullName;
	const patient = rawProps.patient
		? {
				...rawProps.patient,
				fullName: rawProps.patient.fullName || rawProps.patient.name,
			}
		: undefined;

	const effectiveProps: InformedConsentModalProps = {
		...rawProps,
		isOpen: rawProps.isOpen,
		onClose: rawProps.onClose,
		doctorName,
		patient,
		initialTemplateKey,
		initialMode: rawProps.initialMode || (rawProps.defaultConsentKind ? "single" : (rawProps.initialPackageKey ? "packages" : undefined)),
	};

	return <InformedConsentModal {...effectiveProps} />;
};

export default ConsentModal;
