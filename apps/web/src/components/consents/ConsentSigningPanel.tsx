import React from "react";
import type { ConsentSigningPanelProps } from "./panel/types";
import { ConsentMethodTabs } from "./panel/ConsentMethodTabs";
import { ConsentRiskToggles } from "./panel/ConsentRiskToggles";
import { ConsentTabletSection } from "./panel/ConsentTabletSection";
import { ConsentSmsOtpSection } from "./panel/ConsentSmsOtpSection";
import { ConsentPaperSection } from "./panel/ConsentPaperSection";

export type { ConsentSigningPanelProps };

export const ConsentSigningPanel: React.FC<ConsentSigningPanelProps> = ({
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
	packageDocsCount,
	isSubmitting,
	onConfirmSign,
	onPrint,
	onPrintBlank,
	onDownloadPdfA,
	planAndRisksAccepted,
	setPlanAndRisksAccepted,
	alternativesUnderstood,
	setAlternativesUnderstood,
	isMobile = false,
	patientPhone,
	smsOtpCode = "",
	setSmsOtpCode,
	paperScanFile = null,
	setPaperScanFile,
}) => {
	const isDarkMode = typeof document !== "undefined" && Boolean(
		document.documentElement?.getAttribute?.("data-theme") === "dark" ||
		document.documentElement?.classList?.contains?.("dark") ||
		document.body?.classList?.contains?.("dark-mode")
	);
	const strokeColor = isDarkMode ? "#f8fafc" : "#0f172a";

	const boxStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "column",
		gap: "0.85rem",
		background: "var(--paper-soft)",
		border: "1px solid var(--line-strong, var(--teal))",
		borderRadius: "var(--radius-lg, 16px)",
		padding: isMobile ? "0.85rem" : "1.25rem",
	};

	return (
		<div className="consent-paper-box" style={boxStyle}>
			<ConsentMethodTabs verificationMethod={verificationMethod} setVerificationMethod={setVerificationMethod} />
			<ConsentRiskToggles
				planAndRisksAccepted={planAndRisksAccepted}
				setPlanAndRisksAccepted={setPlanAndRisksAccepted}
				alternativesUnderstood={alternativesUnderstood}
				setAlternativesUnderstood={setAlternativesUnderstood}
			/>

			{verificationMethod === "tablet_stylus" && (
				<ConsentTabletSection
					isMobile={isMobile}
					strokeColor={strokeColor}
					strokes={strokes}
					setStrokes={setStrokes}
					currentPoints={currentPoints}
					setCurrentPoints={setCurrentPoints}
					isDrawing={isDrawing}
					setIsDrawing={setIsDrawing}
					activeMode={activeMode}
					packageDocsCount={packageDocsCount}
					isSubmitting={isSubmitting}
					onConfirmSign={onConfirmSign}
					onDownloadPdfA={onDownloadPdfA}
					setVerificationMethod={setVerificationMethod}
				/>
			)}

			{verificationMethod === "sms_otp" && (
				<ConsentSmsOtpSection
					patientPhone={patientPhone}
					smsOtpCode={smsOtpCode}
					setSmsOtpCode={setSmsOtpCode}
					isMobile={isMobile}
					isSubmitting={isSubmitting}
					onConfirmSign={onConfirmSign}
				/>
			)}

			{verificationMethod === "paper_physical" && (
				<ConsentPaperSection
					paperOriginalConfirmed={paperOriginalConfirmed}
					setPaperOriginalConfirmed={setPaperOriginalConfirmed}
					paperScanFile={paperScanFile}
					setPaperScanFile={setPaperScanFile}
					activeMode={activeMode}
					packageDocsCount={packageDocsCount}
					isSubmitting={isSubmitting}
					onConfirmSign={onConfirmSign}
					onPrint={onPrint}
					onPrintBlank={onPrintBlank}
					onDownloadPdfA={onDownloadPdfA}
					setVerificationMethod={setVerificationMethod}
				/>
			)}
		</div>
	);
};
