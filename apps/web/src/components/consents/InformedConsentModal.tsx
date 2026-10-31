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
	readonly initialDocId?: ConsentDocumentId;
	readonly initialPackageKey?: string;
	readonly [key: string]: any;
}

export const InformedConsentModal: React.FC<InformedConsentModalProps> = (props) => {
	const { isOpen, onClose, patientName, patientContext, initialDocId } = props;
	if (!isOpen) return null;

	const effectiveContext: Partial<ConsentPartyContext> = patientContext || {
		patientName: patientName || "Пациент клиники",
	};

	return (
		<ConsentStudioModal
			isOpen={isOpen}
			onClose={onClose}
			patientContext={effectiveContext}
			initialDocId={initialDocId}
		/>
	);
};

export const ConsentModal = InformedConsentModal;
export default InformedConsentModal;
