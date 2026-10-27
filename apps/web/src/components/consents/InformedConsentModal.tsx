import React from "react";
import { createPortal } from "react-dom";
import {
	PACKAGE_SHORT_TITLES,
	TEMPLATE_SHORT_TITLES,
	getConsentTemplate,
} from "./consentTemplates.js";
import { ConsentToolbarAndBanner } from "./ConsentToolbarAndBanner.js";
import { ConsentModalFooter } from "./ConsentModalFooter.js";
import "./informedConsent.css";

import type { InformedConsentModalProps, ConsentModalProps } from "./consentModal/types.js";
import { useInformedConsent } from "./consentModal/useInformedConsent.js";
import { ConsentModalHeader } from "./consentModal/ConsentModalHeader.js";
import { ConsentModalBody } from "./consentModal/ConsentModalBody.js";
import { ConsentFloatingBottomBar } from "./consentModal/ConsentFloatingBottomBar.js";

export { PACKAGE_SHORT_TITLES, TEMPLATE_SHORT_TITLES };
export * from "./consentModal/types.js";
export * from "./consentModal/useInformedConsent.js";
export * from "./consentModal/ConsentDocumentPreview.js";
export * from "./consentModal/ConsentSignaturePad.js";
export * from "./consentModal/ConsentRiskChecklist.js";
export * from "./consentModal/consentSigningExecutor.js";
export * from "./consentSummaryHelper.js";

/**
 * Единый канонический SSOT модального окна информированного согласия (Мандаты 8b, 8e & SSOT)
 * Без трехслойных матрешек. Приоритет бумаги и автономия врача в 1 клик.
 */
export const InformedConsentModal: React.FC<InformedConsentModalProps> = (props) => {
	const { isOpen, onClose, isMinorPatient, initialPackageKey } = props;
	const effectivePackageKey = !initialPackageKey && isMinorPatient ? "PACKAGE_PRIMARY_VISIT" : initialPackageKey;
	const effectiveProps = effectivePackageKey !== initialPackageKey ? { ...props, initialPackageKey: effectivePackageKey } : props;
	const consentState = useInformedConsent(effectiveProps);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="consent-modal-overlay print-layer"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="consent-modal-title"
		>
			<div className="consent-modal-container" onClick={(e) => e.stopPropagation()}>
				<ConsentModalHeader
					activeMode={consentState.activeMode}
					packageDocsCount={consentState.currentPackage.templateKeys.length}
					isMobile={consentState.isMobile}
					onClose={onClose}
				/>

				<ConsentToolbarAndBanner
					activeMode={consentState.activeMode}
					setActiveMode={consentState.setActiveMode}
					activePackageKey={consentState.activePackageKey}
					setActivePackageKey={consentState.setActivePackageKey}
					activeKey={consentState.activeKey}
					setActiveKey={consentState.setActiveKey}
					activeDocKey={consentState.activeDocKey}
					setPreviewTemplateKey={consentState.setPreviewTemplateKey}
					allPackages={consentState.allPackages}
					allTemplates={consentState.allTemplates}
					currentPackage={consentState.currentPackage}
					getConsentTemplate={getConsentTemplate}
					substitutionContext={consentState.substitutionContext}
				/>

				<ConsentModalBody {...consentState} />

				{consentState.isMobile && (
					<ConsentFloatingBottomBar
						activeMode={consentState.activeMode}
						packageDocsCount={consentState.currentPackage.templateKeys.length}
						isSubmitting={consentState.isSubmitting}
						isSigningReady={consentState.isSigningReady}
						onConfirmSign={() => consentState.handleConfirmSign()}
					/>
				)}

				{!consentState.isMobile && (
					<ConsentModalFooter
						activeMode={consentState.activeMode}
						packageDocsCount={consentState.currentPackage.templateKeys.length}
						isSubmitting={consentState.isSubmitting}
						isSigningReady={consentState.isSigningReady}
						onPrint={consentState.handlePrint}
						onPrintBlank={consentState.handlePrintBlank}
						onDownloadPdfA={consentState.handleDownloadPdfA}
						onCopyPatientSummary={consentState.handleCopyPatientSummary}
						onConfirmSign={(method) => consentState.handleConfirmSign(method)}
						onClose={onClose}
					/>
				)}
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};

export const ConsentModal: React.FC<ConsentModalProps> = InformedConsentModal;
export default InformedConsentModal;
