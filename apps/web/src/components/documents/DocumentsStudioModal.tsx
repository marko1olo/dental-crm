/**
 * apps/web/src/components/documents/DocumentsStudioModal.tsx
 *
 * Единая каноническая студия документов, согласий (ИДС) и справок DENTE CRM (SSOT).
 * Объединяет клинические документы и согласия в неразрывный рабочий контур (Мандаты 8e, 8n, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488 (Мандат 8am), ZERO disabled кнопок (Мандат 8e, Автономия врача).
 * Apple HIG: Bottom Sheet на тач-экранах, тактильный хэндл 36x5px, тач-таргеты >= 44x44px.
 * Мандат 8wy: Полная изоляция боевого режима от демо-мокапов. В проде без пациента — чистый стейт.
 * Декомпозированный фасад: ~350 строк (Sweet Spot Mandate 8b, строго <= 420 строк).
 */

import React, { useState, useMemo, useCallback } from "react";
import type { Patient, TaxDeductionRelationship } from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useTaxDeduction, useDocumentStudioSignAndIssue, useDocumentsStudioModel } from "./hooks";
import {
	type DocumentsStudioModalProps,
	type DocumentTemplateKey,
	type TaxDeductionTab,
	NO_PATIENT_SELECTED_PLACEHOLDER,
} from "./types";
import {
	type ConsentSubKind,
	type DocumentPackageKey,
} from "../consents/consentCatalogData";
import { DenteQueryClientProvider } from "../../lib/queryClient";
import {
	DocumentsStudioHeader,
	DocumentsStudioFooter,
	DocumentsPackageSelector,
	ConsentSignersRow,
	DocumentsA4Preview,
	useCanvasSigner,
	usePatientConsents,
} from "./studio";
import "./documentsStudio.css";

export type { DocumentTemplateKey, TaxDeductionTab, DocumentsStudioModalProps };
export { NO_PATIENT_SELECTED_PLACEHOLDER };

const DocumentsStudioModalContent: React.FC<DocumentsStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	patient: directPatient,
	patientId: directPatientId,
	patientName: directPatientName,
	patientBirthDate: directPatientBirthDate,
	patientInn: directPatientInn,
	doctorName: directDoctorName,
	doctorFullName: directDoctorFullName,
	taxpayer,
	payerFullName: directPayerFullName,
	payerInn: directPayerInn,
	payerBirthDate: directPayerBirthDate,
	payerPassport: directPayerPassport,
	payerRelationship: directPayerRelationship,
	initialTemplate = "intake",
	initialDocId,
	selectedYear,
	initialYear,
	payments,
	clinicProfileDraft,
	clinicName: directClinicName,
	clinicInn: directClinicInn,
	clinicKpp: directClinicKpp,
	clinicOgrn: directClinicOgrn,
	clinicAddress: directClinicAddress,
	clinicLicenseNumber: directClinicLicenseNumber,
	services,
	diagnosisRu,
	anamnesisRu,
	epicrisisRu,
	onSigned,
	onDocumentSigned,
	onConsentSigned,
}) => {
	const isDemo = isDemoShowcaseMode();

	const resolvedInitialPackage = useMemo<DocumentPackageKey>(() => {
		if (initialTemplate === "contract") return "intake";
		if (initialTemplate === "act") return "card_extract";
		if (initialTemplate === "consent" || initialDocId) return "informed_consent";
		if (initialTemplate === "tax_deduction" || initialTemplate === "tax_certificate") return "tax_certificate";
		return (initialTemplate as DocumentPackageKey) || "intake";
	}, [initialTemplate, initialDocId]);

	const [activePackage, setActivePackage] = useState<DocumentPackageKey>(resolvedInitialPackage);
	const [activeConsentSubKind, setActiveConsentSubKind] = useState<ConsentSubKind>(
		(initialDocId as ConsentSubKind) || "therapy",
	);
	const [taxYear, setTaxYear] = useState<number>(selectedYear || initialYear || 2026);
	const [isSignPadOpen, setIsSignPadOpen] = useState<boolean>(false);
	const [hasSigned, setHasSigned] = useState<boolean>(false);
	const [toastNotice, setToastNotice] = useState<string | null>(null);
	const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

	const {
		canvasRef,
		startDrawing,
		draw,
		stopDrawing,
		clearCanvas,
		getSignatureDataUrl,
	} = useCanvasSigner(() => setHasSigned(false));

	const effectivePatientId = patientContext?.id || (directPatient as Patient)?.id || directPatientId;
	const { data: backendTaxReceipts = [] } = useTaxDeduction(isOpen, activePackage, effectivePatientId, taxYear);
	const { patientConsentsMap, recordConsentLocally } = usePatientConsents(isOpen, effectivePatientId);

	const currentConsentKey = useMemo<string>(() => {
		if (activePackage === "informed_consent") return activeConsentSubKind;
		return activePackage;
	}, [activePackage, activeConsentSubKind]);

	const existingConsent = patientConsentsMap[currentConsentKey] || patientConsentsMap[activePackage];

	const signedAtTimeStr = useMemo(() => {
		if (!existingConsent?.grantedAt) return null;
		return new Date(existingConsent.grantedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
	}, [existingConsent]);

	const effectiveHasSigned = hasSigned || Boolean(existingConsent);
	const signedStatusLabel = signedAtTimeStr ? `Подписано пациентом в ${signedAtTimeStr}` : hasSigned ? "Подписано" : undefined;

	const {
		patient,
		currentDate,
		effectiveDoctorName,
		clinicRequisites,
		effectiveServices,
		totalAmountKopecks,
		taxReceiptItems,
		taxTotalAmountKopecks,
		taxCode01Kopecks,
		taxCode02Kopecks,
		legalContext,
		hasNoConfirmedPayments,
		renderedDocumentText,
	} = useDocumentsStudioModel({
		patientContext,
		directPatient,
		directPatientId,
		directPatientName,
		directPatientBirthDate,
		directPatientInn,
		directDoctorName,
		directDoctorFullName,
		taxpayer,
		directPayerPassport,
		payments,
		services,
		clinicProfileDraft,
		directClinicName,
		directClinicInn,
		directClinicKpp,
		directClinicOgrn,
		directClinicAddress,
		directClinicLicenseNumber,
		diagnosisRu,
		anamnesisRu,
		epicrisisRu,
		activePackage,
		activeConsentSubKind,
		taxYear,
		backendTaxReceipts,
		isDemo,
		effectivePatientId,
	});

	const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
		setToastNotice(msg);
		setToastType(type);
		setTimeout(() => {
			setToastNotice(null);
			setToastType("info");
		}, 3200);
	}, []);

	const {
		handlePrimarySignAndPrint,
		handleDownloadTxt,
		handleSendMessenger,
		handlePrintBlank,
		handleDownloadXml,
		handleDownloadNoMedopl,
		handlePaperConfirm,
	} = useDocumentStudioSignAndIssue({
		activePackage,
		activeConsentSubKind,
		currentConsentKey,
		isSignPadOpen,
		effectivePatientId,
		effectiveDoctorName,
		patient,
		clinicRequisites,
		currentDate,
		taxYear,
		totalAmountKopecks,
		taxTotalAmountKopecks,
		taxCode01Kopecks,
		taxCode02Kopecks,
		taxReceiptItems,
		renderedDocumentText,
		legalContext,
		taxpayer,
		directPayerFullName,
		directPayerInn,
		directPayerBirthDate,
		directPayerPassport,
		directPayerRelationship: directPayerRelationship as TaxDeductionRelationship | undefined,
		onSigned,
		onDocumentSigned,
		onConsentSigned,
		getSignatureDataUrl,
		recordConsentLocally,
		setHasSigned,
		showToast,
	});

	if (!isOpen) return null;

	const stampBadgeElement = (
		<div
			data-testid="tax-certificate-stamp-badge"
			className="dente-tax-stamp-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
		>
			{effectiveHasSigned || (!hasNoConfirmedPayments && totalAmountKopecks > 0) ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
		</div>
	);

	const totalDisplayAmountKopecks = activePackage === "tax_certificate" ? taxTotalAmountKopecks : totalAmountKopecks;

	return (
		<div
			className="dente-docs-studio-backdrop"
			onClick={onClose}
			data-testid="documents-studio-modal-backdrop"
		>
			<div
				className={`dente-docs-studio-container rounded-t-[24px] overflow-x-clip ${activePackage === "tax_certificate" ? "fns-tax-certificate-modal" : ""} ${activePackage === "informed_consent" ? "consent-studio-modal" : ""}`}
				onClick={(e) => e.stopPropagation()}
				data-testid={
					activePackage === "informed_consent"
						? "consent-studio-modal"
						: activePackage === "tax_certificate"
							? "tax-deduction-modal fns-tax-certificate-modal"
							: "documents-studio-modal"
				}
				role="dialog"
				aria-modal="true"
				aria-labelledby="dente-docs-studio-title"
			>
				{/* Apple HIG Drag Handle для мобильных (36x5px) */}
				<div className="dente-mobile-drag-handle w-9 h-1.5 mx-auto" aria-hidden="true" />

				{/* Каноническая шапка: 1 строка <= 52px */}
				<DocumentsStudioHeader
					patientFullName={patient.fullName || "Пациент не выбран"}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					onClose={onClose}
					activePackage={activePackage}
					stampBadge={activePackage === "tax_certificate" ? stampBadgeElement : undefined}
				/>

				{/* Рабочее пространство: Пакеты слева, Лист А4 справа */}
				<div className="dente-docs-studio-body">
					{/* Боковая панель выбора пакета */}
					<aside className="dente-docs-studio-sidebar">
						<DocumentsPackageSelector
							activePackage={activePackage}
							onSelectPackage={setActivePackage}
							activeConsentSubKind={activeConsentSubKind}
							onSelectConsentSubKind={setActiveConsentSubKind}
							taxYear={taxYear}
							onSelectTaxYear={setTaxYear}
						/>

						{/* Интерактивная подпись пальцем/стилусом и реквизиты клиники */}
						<ConsentSignersRow
							isSignPadOpen={isSignPadOpen}
							onToggleSignPad={() => setIsSignPadOpen(!isSignPadOpen)}
							hasSigned={effectiveHasSigned}
							signedStatusText={signedStatusLabel}
							onClearCanvas={clearCanvas}
							canvasRef={canvasRef}
							onStartDrawing={startDrawing}
							onDraw={draw}
							onStopDrawing={stopDrawing}
							clinicName={clinicRequisites.name}
							clinicLicense={clinicRequisites.license}
							doctorFullName={effectiveDoctorName}
							toastNotice={toastNotice}
							toastType={toastType}
						/>
					</aside>

					{/* Правая зона: Предпросмотр листа формата А4 */}
					<DocumentsA4Preview
						clinic={clinicRequisites}
						patient={patient}
						effectiveDoctorName={effectiveDoctorName}
						currentDate={currentDate}
						totalDisplayAmountKopecks={totalDisplayAmountKopecks}
						renderedDocumentText={renderedDocumentText}
						effectiveHasSigned={effectiveHasSigned}
						signedAtTimeStr={signedAtTimeStr}
					/>
				</div>

				{/* Канонический подвал: Ровно 1 Primary CTA #0d9488 — Мандаты 8am, 8e & Apple HIG */}
				<DocumentsStudioFooter
					onPrimarySignAndPrint={handlePrimarySignAndPrint}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					onPrintBlank={handlePrintBlank}
					onConfirmPaper={handlePaperConfirm}
					onDownloadXml={handleDownloadXml}
					onDownloadNoMedopl={handleDownloadNoMedopl}
					hasSigned={effectiveHasSigned}
					activePackage={activePackage}
				/>
			</div>
		</div>
	);
};

export const DocumentsStudioModal: React.FC<DocumentsStudioModalProps> = (props) => {
	if (!props.isOpen) return null;
	return (
		<DenteQueryClientProvider>
			<DocumentsStudioModalContent {...props} />
		</DenteQueryClientProvider>
	);
};

// Canonical drop-in aliases guaranteeing zero disruption to all callers (Mandate 8e, 8aq)
export const ConsentStudioModal: React.FC<DocumentsStudioModalProps> = (props) => {
	return <DocumentsStudioModal {...props} initialTemplate={props.initialTemplate || "informed_consent"} />;
};

export const InformedConsentModal: React.FC<DocumentsStudioModalProps> = (props) => {
	return <DocumentsStudioModal {...props} initialTemplate={props.initialTemplate || "informed_consent"} />;
};

export const TaxDeductionCertificateModal: React.FC<DocumentsStudioModalProps> = (props) => {
	return <DocumentsStudioModal {...props} initialTemplate={props.initialTemplate || "tax_certificate"} />;
};

export const FnsTaxCertificateModal = TaxDeductionCertificateModal;

export default DocumentsStudioModal;
