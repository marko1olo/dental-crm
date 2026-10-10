import {
	ShieldCheck,
	X,
	Zap,
} from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import {
	PACKAGE_SHORT_TITLES,
	TEMPLATE_SHORT_TITLES,
	getConsentTemplate,
} from "../consentTemplates.js";
import { showToast } from "../../GlobalToast.js";
import {
	buildPatientConsentSummary,
} from "../consentSummaryHelper.js";
import { ConsentToolbarAndBanner } from "../ConsentToolbarAndBanner.js";
import { ConsentModalFooter } from "../ConsentModalFooter.js";
import "../informedConsent.css";

import type { InformedConsentModalProps } from "./types.js";
import { useInformedConsent } from "./useInformedConsent.js";
import { ConsentDocumentPreview } from "./ConsentDocumentPreview.js";
import {
	ConsentSignaturePad,
	ConsentIntegrityCard,
} from "./ConsentSignaturePad.js";
import { ConsentRiskChecklist } from "./ConsentRiskChecklist.js";

export { PACKAGE_SHORT_TITLES, TEMPLATE_SHORT_TITLES };
export { buildPatientConsentSummary };
export * from "./types.js";
export * from "./useInformedConsent.js";
export * from "./ConsentDocumentPreview.js";
export * from "./ConsentSignaturePad.js";
export * from "./ConsentRiskChecklist.js";
export * from "./consentSigningExecutor.js";

/**
 * InformedConsentModal
 *
 * Чистая Print-First консоль информированных добровольных согласий (ИДС)
 * по Федеральному закону № 323-ФЗ ст. 20 и Приказу Минздрава РФ № 1051н.
 *
 * В амбулаторной стоматологии (Мандаты 8e, 8i, 8k, 8n) согласия строго
 * РАСПЕЧАТЫВАЮТСЯ НА БУМАГЕ («ТОК ПЕЧАТЬ»), подписываются шариковой ручкой
 * и подшиваются в медицинскую карту пациента формы № 043/у на 25 лет.
 */
export const InformedConsentModal: React.FC<InformedConsentModalProps> = (props) => {
	const {
		isOpen,
		onClose,
	} = props;

	const {
		activeMode,
		setActiveMode,
		activePackageKey,
		setActivePackageKey,
		activeKey,
		setActiveKey,
		activeDocKey,
		setPreviewTemplateKey,
		paperOriginalConfirmed,
		setPaperOriginalConfirmed,
		paperScanFile,
		setPaperScanFile,
		verificationMethod,
		setVerificationMethod,
		strokes,
		setStrokes,
		currentPoints,
		setCurrentPoints,
		isDrawing,
		setIsDrawing,
		isMobile,
		planAndRisksAccepted,
		setPlanAndRisksAccepted,
		alternativesUnderstood,
		setAlternativesUnderstood,
		isDocumentTextExpanded,
		setIsDocumentTextExpanded,
		smsOtpCode,
		setSmsOtpCode,
		copiedHash,
		isSubmitting,
		isClosedOrSigned,
		effectiveWatermark,
		stampColor,
		substitutionContext,
		effectiveContext,
		allPackages,
		allTemplates,
		currentPackage,
		currentTemplate,
		rendered,
		scopeMismatch,
		integrityRecord,
		isSigningReady,
		handleDownloadPdfA,
		handleCopyHash,
		handleCopyPatientSummary,
		handlePrint,
		handlePrintBlank,
		handleConfirmSign,
	} = useInformedConsent(props);

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
				{/* Тактильный Drag Handle для Apple iOS Bottom Sheet (<= 768px) */}
				<div className="consent-mobile-drag-handle" aria-hidden="true">
					<div className="consent-mobile-drag-handle-bar" />
				</div>

				{/* Header */}
				<header className="consent-header">
					<div className="consent-header-titles min-w-0 flex-1">
						<div className="consent-header-badge-row">
							<span className="consent-statutory-badge shrink-0">
								<ShieldCheck size={14} />
								Официальная медицинская форма
							</span>
							<span className="consent-code-badge shrink-0">
								{activeMode === "packages" ? `Пакет (${currentPackage.templateKeys.length} док.)` : "Бланк согласия"}
							</span>
						</div>
						<h2 id="consent-modal-title" className="consent-title truncate">
							{isMobile
								? (activeMode === "packages" ? "Пакет согласий ИДС" : "Согласие на лечение (ИДС)")
								: (activeMode === "packages"
									? "Пакет информированных добровольных согласий (ИДС)"
									: "Информированное добровольное согласие (ИДС)")}
						</h2>
					</div>
					<button
						type="button"
						className="consent-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно согласия"
					>
						<X size={22} />
					</button>
				</header>

				{/* Toolbar row with mode buttons, scrollable tabs, package banner & meta info */}
				<ConsentToolbarAndBanner
					activeMode={activeMode}
					setActiveMode={setActiveMode}
					activePackageKey={activePackageKey}
					setActivePackageKey={setActivePackageKey}
					activeKey={activeKey}
					setActiveKey={setActiveKey}
					activeDocKey={activeDocKey}
					setPreviewTemplateKey={setPreviewTemplateKey}
					allPackages={allPackages}
					allTemplates={allTemplates}
					currentPackage={currentPackage}
					getConsentTemplate={getConsentTemplate}
					substitutionContext={substitutionContext}
				/>

				{/* Тело модального окна */}
				<div className="consent-modal-body">
					{/* Индикатор изменения процедур (Consent Scope Mismatch по Приказу 1051н) */}
					<ConsentRiskChecklist
						scopeMismatch={scopeMismatch}
						onResolveScopeMismatch={() => {
							if (scopeMismatch.uncoveredTemplateKeys[0]) {
								setActiveMode("single");
								setActiveKey(scopeMismatch.uncoveredTemplateKeys[0]);
								showToast("Сформировано доп. согласие на добавленную процедуру", "info");
							}
						}}
					/>

					{/* НА МОБИЛЬНОМ У КРЕСЛА: HOT PATH РОСПИСИ ПАЛЬЦЕМ В ПЕРВУЮ ОЧЕРЕДЬ */}
					{isMobile && (
						<ConsentSignaturePad
							verificationMethod={verificationMethod}
							setVerificationMethod={setVerificationMethod}
							paperOriginalConfirmed={paperOriginalConfirmed}
							setPaperOriginalConfirmed={setPaperOriginalConfirmed}
							strokes={strokes}
							setStrokes={setStrokes}
							currentPoints={currentPoints}
							setCurrentPoints={setCurrentPoints}
							isDrawing={isDrawing}
							setIsDrawing={setIsDrawing}
							activeMode={activeMode}
							packageDocsCount={currentPackage.templateKeys.length}
							isSubmitting={isSubmitting}
							onConfirmSign={handleConfirmSign}
							onPrint={handlePrint}
							onPrintBlank={handlePrintBlank}
							onDownloadPdfA={handleDownloadPdfA}
							planAndRisksAccepted={planAndRisksAccepted}
							setPlanAndRisksAccepted={setPlanAndRisksAccepted}
							alternativesUnderstood={alternativesUnderstood}
							setAlternativesUnderstood={setAlternativesUnderstood}
							isMobile={true}
							patientPhone={substitutionContext.phone ?? null}
							smsOtpCode={smsOtpCode}
							setSmsOtpCode={setSmsOtpCode}
							paperScanFile={paperScanFile}
							setPaperScanFile={setPaperScanFile}
						/>
					)}

					{/* Просмотр текста согласия: на мобиле сворачиваемый аккордеон, на ПК полный лист */}
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

					{/* НА ДЕСКТОПЕ: ПАНЕЛЬ ПОДПИСАНИЯ ПОД ДОКУМЕНТОМ */}
					{!isMobile && (
						<ConsentSignaturePad
							verificationMethod={verificationMethod}
							setVerificationMethod={setVerificationMethod}
							paperOriginalConfirmed={paperOriginalConfirmed}
							setPaperOriginalConfirmed={setPaperOriginalConfirmed}
							strokes={strokes}
							setStrokes={setStrokes}
							currentPoints={currentPoints}
							setCurrentPoints={setCurrentPoints}
							isDrawing={isDrawing}
							setIsDrawing={setIsDrawing}
							activeMode={activeMode}
							packageDocsCount={currentPackage.templateKeys.length}
							isSubmitting={isSubmitting}
							onConfirmSign={handleConfirmSign}
							onPrint={handlePrint}
							onPrintBlank={handlePrintBlank}
							onDownloadPdfA={handleDownloadPdfA}
							planAndRisksAccepted={planAndRisksAccepted}
							setPlanAndRisksAccepted={setPlanAndRisksAccepted}
							alternativesUnderstood={alternativesUnderstood}
							setAlternativesUnderstood={setAlternativesUnderstood}
							isMobile={false}
							patientPhone={substitutionContext.phone ?? null}
							smsOtpCode={smsOtpCode}
							setSmsOtpCode={setSmsOtpCode}
							paperScanFile={paperScanFile}
							setPaperScanFile={setPaperScanFile}
						/>
					)}

					{/* Панель криптографической целостности SHA-256 */}
					<ConsentIntegrityCard
						integrityHash={integrityRecord.hash}
						copiedHash={copiedHash}
						onCopyHash={handleCopyHash}
					/>
				</div>

				{/* Floating Bottom Bar на смартфонах (Natural Thumb Zone CTA) */}
				{isMobile && (
					<div className="consent-floating-bottom-bar">
						<button
							type="button"
							className="consent-mobile-primary-cta"
							data-testid="btn-confirm-sign-mobile"
							onClick={() => handleConfirmSign()}
							disabled={isSubmitting || !isSigningReady}
							style={{
								background: isSigningReady ? "var(--teal)" : "var(--muted)",
								cursor: isSigningReady ? "pointer" : "not-allowed",
								opacity: isSigningReady ? 1 : 0.65,
							}}
						>
							<Zap size={20} />
							<span>
								{isSigningReady
									? (activeMode === "packages"
										? `Подтвердить и подписать пакет (${currentPackage.templateKeys.length} док.)`
										: "Подтвердить и подписать ИДС")
									: "Ожидает росписи пальцем / кода / бланка"}
							</span>
						</button>
					</div>
				)}

				{/* Desktop Footer */}
				{!isMobile && (
					<ConsentModalFooter
						activeMode={activeMode}
						packageDocsCount={currentPackage.templateKeys.length}
						isSubmitting={isSubmitting}
						isSigningReady={isSigningReady}
						onPrint={handlePrint}
						onPrintBlank={handlePrintBlank}
						onDownloadPdfA={handleDownloadPdfA}
						onCopyPatientSummary={handleCopyPatientSummary}
						onConfirmSign={() => handleConfirmSign()}
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
