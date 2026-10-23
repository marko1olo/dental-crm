import React from "react";
import { createPortal } from "react-dom";
import {
	PACKAGE_SHORT_TITLES,
	TEMPLATE_SHORT_TITLES,
	getConsentTemplate,
} from "../consentTemplates.js";
import { ConsentToolbarAndBanner } from "../ConsentToolbarAndBanner.js";
import { ConsentModalFooter } from "../ConsentModalFooter.js";
import "../informedConsent.css";

import type { InformedConsentModalProps } from "./types.js";
import { useInformedConsent } from "./useInformedConsent.js";
import { ConsentModalHeader } from "./ConsentModalHeader.js";
import { ConsentModalBody } from "./ConsentModalBody.js";
import { ConsentFloatingBottomBar } from "./ConsentFloatingBottomBar.js";

export { PACKAGE_SHORT_TITLES, TEMPLATE_SHORT_TITLES };
export * from "./types.js";
export * from "./useInformedConsent.js";
export * from "./ConsentDocumentPreview.js";
export * from "./ConsentSignaturePad.js";
export * from "./ConsentRiskChecklist.js";
export * from "./consentSigningExecutor.js";

export const InformedConsentModal: React.FC<InformedConsentModalProps> = (props) => {
	const { isOpen, onClose } = props;
	const consentState = useInformedConsent(props);

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
						onConfirmSign={() => consentState.handleConfirmSign()}
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
