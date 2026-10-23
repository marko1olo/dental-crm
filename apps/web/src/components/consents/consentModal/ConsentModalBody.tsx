import React from "react";
import { showToast } from "../../GlobalToast.js";
import { ConsentDocumentPreview } from "./ConsentDocumentPreview.js";
import { ConsentSignaturePad, ConsentIntegrityCard } from "./ConsentSignaturePad.js";
import { ConsentRiskChecklist } from "./ConsentRiskChecklist.js";
import type { useInformedConsent } from "./useInformedConsent.js";

export type ConsentModalBodyProps = ReturnType<typeof useInformedConsent>;

export const ConsentModalBody: React.FC<ConsentModalBodyProps> = (props) => {
	const {
		scopeMismatch,
		setActiveMode,
		setActiveKey,
		isMobile,
		verificationMethod,
		setVerificationMethod,
		paperOriginalConfirmed,
		setPaperOriginalConfirmed,
		strokes,
		setStrokes,
		currentPoints,
		setCurrentPoints,
		isDrawing,
		setIsDrawing,
		activeMode,
		currentPackage,
		isSubmitting,
		handleConfirmSign,
		handlePrint,
		handlePrintBlank,
		handleDownloadPdfA,
		planAndRisksAccepted,
		setPlanAndRisksAccepted,
		alternativesUnderstood,
		setAlternativesUnderstood,
		substitutionContext,
		smsOtpCode,
		setSmsOtpCode,
		paperScanFile,
		setPaperScanFile,
		isDocumentTextExpanded,
		setIsDocumentTextExpanded,
		rendered,
		effectiveContext,
		effectiveWatermark,
		stampColor,
		isClosedOrSigned,
		integrityRecord,
		copiedHash,
		handleCopyHash,
	} = props;

	const padProps = {
		verificationMethod,
		setVerificationMethod,
		paperOriginalConfirmed,
		setPaperOriginalConfirmed,
		strokes,
		setStrokes,
		currentPoints,
		setCurrentPoints,
		isDrawing,
		setIsDrawing,
		activeMode,
		packageDocsCount: currentPackage.templateKeys.length,
		isSubmitting,
		onConfirmSign: handleConfirmSign,
		onPrint: handlePrint,
		onPrintBlank: handlePrintBlank,
		onDownloadPdfA: handleDownloadPdfA,
		planAndRisksAccepted,
		setPlanAndRisksAccepted,
		alternativesUnderstood,
		setAlternativesUnderstood,
		patientPhone: substitutionContext.phone ?? null,
		smsOtpCode,
		setSmsOtpCode,
		paperScanFile,
		setPaperScanFile,
	};

	const onResolveScope = () => {
		if (scopeMismatch.uncoveredTemplateKeys[0]) {
			setActiveMode("single");
			setActiveKey(scopeMismatch.uncoveredTemplateKeys[0]);
			showToast("Сформировано доп. согласие на добавленную процедуру", "info");
		}
	};

	return (
		<div className="consent-modal-body">
			<ConsentRiskChecklist scopeMismatch={scopeMismatch} onResolveScopeMismatch={onResolveScope} />
			{isMobile && <ConsentSignaturePad {...padProps} isMobile={true} />}
			<ConsentDocumentPreview
				isMobile={isMobile}
				isDocumentTextExpanded={isDocumentTextExpanded}
				setIsDocumentTextExpanded={setIsDocumentTextExpanded}
				rendered={rendered}
				effectiveContext={effectiveContext}
				effectiveWatermark={effectiveWatermark}
				stampColor={stampColor}
				isClosedOrSigned={isClosedOrSigned}
			/>
			{!isMobile && <ConsentSignaturePad {...padProps} isMobile={false} />}
			<ConsentIntegrityCard
				integrityHash={integrityRecord.hash}
				copiedHash={copiedHash}
				onCopyHash={handleCopyHash}
			/>
		</div>
	);
};
