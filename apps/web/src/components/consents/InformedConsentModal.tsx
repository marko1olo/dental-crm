/**
 * apps/web/src/components/consents/InformedConsentModal.tsx
 *
 * Канонический фасад модального окна информированных согласий (SSOT).
 * Делегирует рендеринг в ConsentStudioModal (Мандаты 8b, 8e, 8am).
 */

import React from "react";
import { ConsentStudioModal, type ConsentStudioModalProps } from "./ConsentStudioModal";
import type { ConsentPartyContext, ConsentDocumentId } from "./consentCatalogData";

export interface InformedConsentModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientContext?: Partial<ConsentPartyContext>;
	readonly patient?: ConsentStudioModalProps["patient"];
	readonly initialDocId?: ConsentDocumentId;
	readonly initialSelectedIds?: readonly ConsentDocumentId[];
	readonly initialPackageKey?: string;
	readonly initialMode?: "single" | "batch";
	readonly onDocumentSigned?: ConsentStudioModalProps["onDocumentSigned"];
	readonly onConsentSigned?: ConsentStudioModalProps["onConsentSigned"];
	readonly [key: string]: any;
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