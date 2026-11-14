/**
 * apps/web/src/components/consents/InformedConsentModal.tsx
 *
 * Канонический фасад модального окна информированных согласий (SSOT).
 * Делегирует рендеринг в ConsentStudioModal (Мандаты 8b, 8e, 8am).
 */

import React from "react";
import { ConsentStudioModal, type ConsentStudioModalProps } from "./ConsentStudioModal";
import type { ConsentPartyContext, ConsentDocumentId } from "./consentCatalogData";

export interface InformedConsentModalProps extends Partial<ConsentStudioModalProps> {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientContext?: Partial<ConsentPartyContext> | undefined;
	readonly patient?: ConsentStudioModalProps["patient"] | undefined;
	readonly initialDocId?: ConsentDocumentId | undefined;
	readonly initialSelectedIds?: readonly ConsentDocumentId[] | undefined;
	readonly initialPackageKey?: string | undefined;
	readonly initialMode?: "single" | "batch" | undefined;
	readonly initialVerificationMethod?: string | undefined;
	readonly onDocumentSigned?: ConsentStudioModalProps["onDocumentSigned"] | undefined;
	readonly onConsentSigned?: ConsentStudioModalProps["onConsentSigned"] | undefined;
}

export const InformedConsentModal: React.FC<InformedConsentModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		patientName,
		patientContext,
		patient,
		initialDocId,
		initialSelectedIds,
		initialMode,
		onDocumentSigned,
		onConsentSigned,
		...rest
	} = props;

	if (!isOpen) return null;

	const effectiveContext: Partial<ConsentPartyContext> = patientContext || {
		patientName: patient?.fullName || patientName || "Пациент клиники",
		birthDate: patient?.birthDate,
		passport: patient?.passport,
		phone: patient?.phone,
		snils: patient?.snils,
	};

	return (
		<ConsentStudioModal
			isOpen={isOpen}
			onClose={onClose}
			patient={patient}
			patientName={patientName}
			patientContext={effectiveContext}
			initialDocId={initialDocId}
			initialSelectedIds={initialSelectedIds}
			initialMode={initialMode}
			onDocumentSigned={onDocumentSigned}
			onConsentSigned={onConsentSigned}
			{...rest}
		/>
	);
};

export const ConsentModal = InformedConsentModal;
export default InformedConsentModal;