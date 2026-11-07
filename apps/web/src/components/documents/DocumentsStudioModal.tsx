/**
 * apps/web/src/components/documents/DocumentsStudioModal.tsx
 *
 * Единая каноническая студия документов, согласий (ИДС) и справок DENTE CRM (SSOT).
 * Объединяет клинические документы и согласия в неразрывный рабочий контур (Мандаты 8e, 8n, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488 (Мандат 8am), ZERO disabled кнопок (Мандат 8e, Автономия врача).
 * Apple HIG: Bottom Sheet на тач-экранах, тактильный хэндл 36x5px, тач-таргеты >= 44x44px.
 * Мандат 8wy: Полная изоляция боевого режима от демо-мокапов. В проде без пациента — чистый стейт.
 * Целевой размер фасада: 320–360 строк (Sweet Spot Mandate 8b, строго <= 420 строк).
 */

import React, { useState, useMemo, useCallback } from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { printTaxCertificate, buildTaxCertificateDocumentData } from "./taxCertificateEngine";
import {
	DEFAULT_CLINIC_REQUISITES,
	DEMO_SAMPLE_PATIENT,
	DEMO_SAMPLE_SERVICES,
	EMPTY_PATIENT_REQUISITES,
	EMPTY_SERVICES,
	type ConsentSubKind,
	type DocumentLegalContext,
	type DocumentPackageKey,
	type DocumentServiceItem,
	type PatientRequisites,
	formatKopecksToRubles,
	generateCardExtractTemplate,
	generateContractTemplate,
	generateInformedConsentTemplate,
	generateIntakePackageTemplate,
	generateTaxCertificateTemplate,
	sumKopecks,
} from "./documentsCatalogData";
import {
	DocumentsStudioHeader,
	DocumentsStudioFooter,
	DocumentsPackageSelector,
	ConsentSignersRow,
	useCanvasSigner,
	usePatientConsents,
} from "./studio";
import "./documentsStudio.css";

export type DocumentTemplateKey = DocumentPackageKey | "contract" | "act" | "consent";

export interface DocumentsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: {
		readonly id?: string;
		readonly fullName?: string;
		readonly birthDate?: string;
		readonly passport?: string;
		readonly phone?: string;
		readonly address?: string;
		readonly inn?: string;
	};
	readonly doctorFullName?: string;
	readonly initialTemplate?: DocumentTemplateKey;
	readonly services?: readonly DocumentServiceItem[];
	readonly diagnosisRu?: string;
	readonly anamnesisRu?: string;
	readonly epicrisisRu?: string;
	readonly onSigned?: (payload: { packageKey: DocumentPackageKey; signedAt: string; isDigital: boolean }) => void;
}

export const NO_PATIENT_SELECTED_PLACEHOLDER =
	"[Пациент не выбран. Выберите пациента в CRM для автоматического заполнения договора и ИДС]";

export const DocumentsStudioModal: React.FC<DocumentsStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	doctorFullName = "Смирнова Елена Сергеевна",
	initialTemplate = "intake",
	services,
	diagnosisRu,
	anamnesisRu,
	epicrisisRu,
	onSigned,
}) => {
	const isDemo = isDemoShowcaseMode();

	const resolvedInitialPackage = useMemo<DocumentPackageKey>(() => {
		if (initialTemplate === "contract") return "intake";
		if (initialTemplate === "act") return "card_extract";
		if (initialTemplate === "consent") return "informed_consent";
		return (initialTemplate as DocumentPackageKey) || "intake";
	}, [initialTemplate]);

	const [activePackage, setActivePackage] = useState<DocumentPackageKey>(resolvedInitialPackage);
	const [activeConsentSubKind, setActiveConsentSubKind] = useState<ConsentSubKind>("therapy");
	const [taxYear, setTaxYear] = useState<number>(2026);
	const [isSignPadOpen, setIsSignPadOpen] = useState<boolean>(false);
	const [hasSigned, setHasSigned] = useState<boolean>(false);
	const [toastNotice, setToastNotice] = useState<string | null>(null);

	const {
		canvasRef,
		startDrawing,
		draw,
		stopDrawing,
		clearCanvas,
		getSignatureDataUrl,
	} = useCanvasSigner(() => setHasSigned(false));

	const { patientConsentsMap, recordConsentLocally } = usePatientConsents(isOpen, patientContext?.id);

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
	const signedStatusLabel = signedAtTimeStr ? `✓ Подписано пациентом в ${signedAtTimeStr}` : hasSigned ? "✓ Подписано" : undefined;

	const patient: PatientRequisites = useMemo(() => {
		if (patientContext) {
			return {
				fullName: patientContext.fullName || "",
				birthDate: patientContext.birthDate || "",
				passport: patientContext.passport || "",
				address: patientContext.address || "",
				phone: patientContext.phone || "",
				...(patientContext.inn ? { inn: patientContext.inn } : {}),
			};
		}
		return isDemo ? DEMO_SAMPLE_PATIENT : EMPTY_PATIENT_REQUISITES;
	}, [patientContext, isDemo]);

	const currentDate = useMemo(() => {
		return new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	}, []);

	const effectiveServices: readonly DocumentServiceItem[] = useMemo(() => {
		if (services && services.length > 0) return services;
		return isDemo ? DEMO_SAMPLE_SERVICES : EMPTY_SERVICES;
	}, [services, isDemo]);

	const totalAmountKopecks = useMemo(() => sumKopecks(effectiveServices), [effectiveServices]);

	const clinicalTexts = useMemo(() => ({
		diagnosis: diagnosisRu !== undefined ? diagnosisRu : (isDemo ? "К02.1 Кариес дентина зуба 4.6. Интактный зубной ряд." : ""),
		anamnesis: anamnesisRu !== undefined ? anamnesisRu : (isDemo ? "Жалобы на кратковременные боли от температурных раздражителей. Аллергоанамнез чист." : ""),
		epicrisis: epicrisisRu !== undefined ? epicrisisRu : (isDemo ? "Кариозная полость санирована, анатомия восстановлена. Гарантия клиники: 12 месяцев." : ""),
	}), [diagnosisRu, anamnesisRu, epicrisisRu, isDemo]);

	const legalContext: DocumentLegalContext = useMemo(() => ({
		clinic: DEFAULT_CLINIC_REQUISITES,
		patient,
		doctor: { fullName: doctorFullName, specialty: "Врач-стоматолог терапевт" },
		documentNumber: isDemo
			? "КЛ-2026/894"
			: (patientContext?.id ? `Д-2026/${patientContext.id.slice(0, 6)}` : "БЛ-2026/001"),
		documentDate: currentDate,
		taxYear,
		services: effectiveServices,
		totalAmountKopecks,
		diagnosisRu: clinicalTexts.diagnosis,
		anamnesisRu: clinicalTexts.anamnesis,
		epicrisisRu: clinicalTexts.epicrisis,
		consentSubKind: activeConsentSubKind,
	}), [patient, doctorFullName, isDemo, patientContext?.id, currentDate, taxYear, effectiveServices, totalAmountKopecks, clinicalTexts, activeConsentSubKind]);

	// Генерация текста текущего документа в зависимости от выбранного пакета
	const renderedDocumentText = useMemo(() => {
		if (!isDemo && !patient.fullName.trim()) {
			return NO_PATIENT_SELECTED_PLACEHOLDER;
		}
		switch (activePackage) {
			case "informed_consent":
				return generateInformedConsentTemplate(legalContext, activeConsentSubKind);
			case "tax_certificate":
				return generateTaxCertificateTemplate(legalContext);
			case "card_extract":
				return generateCardExtractTemplate(legalContext);
			default:
				return generateIntakePackageTemplate(legalContext);
		}
	}, [isDemo, patient.fullName, activePackage, legalContext, activeConsentSubKind]);

	const showToast = useCallback((msg: string) => {
		setToastNotice(msg);
		setTimeout(() => setToastNotice(null), 3200);
	}, []);

	const handleDownloadTxt = useCallback(() => {
		const blob = new Blob([renderedDocumentText], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const nameSlug = patient.fullName ? patient.fullName.replace(/\s+/g, "_") : "unspecified_patient";
		a.download = `${activePackage}_${nameSlug}.txt`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Документ экспортирован в файл");
	}, [renderedDocumentText, activePackage, patient.fullName, showToast]);

	const handleSendMessenger = useCallback(() => {
		const nameGreeting = patient.fullName ? `, ${patient.fullName}` : "";
		const text = encodeURIComponent(`Здравствуйте${nameGreeting}! Ваш пакет документов клиники «ДЕНТЕ»: готов к ознакомлению.`);
		const phoneClean = (patient.phone || "").replace(/\D/g, "");
		const url = phoneClean ? `https://wa.me/${phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
		window.open(url, "_blank");
		showToast("Ссылка сформирована для WhatsApp");
	}, [patient.fullName, patient.phone, showToast]);

	const handlePrimarySignAndPrint = useCallback(async () => {
		setHasSigned(true);
		const now = new Date();
		const nowStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
		const nowIso = now.toISOString();
		const isDigital = isSignPadOpen;
		const signatureType = isDigital ? "digital_canvas" : "paper_scanned";

		onSigned?.({
			packageKey: activePackage,
			signedAt: nowStr,
			isDigital,
		});

		// Отправка реального сетевого запроса к Fastify API POST /api/patients/:patientId/consents
		if (patientContext?.id) {
			const signatureDataUrl = isDigital ? getSignatureDataUrl() : undefined;

			const consentPayload = {
				consentType: currentConsentKey,
				kind: activePackage === "informed_consent" ? "procedure_specific_consent_packet" : "informed_consent",
				title: activePackage === "informed_consent" ? `Информированное согласие: ${activeConsentSubKind}` : `Документ: ${activePackage}`,
				isSigned: true,
				signedAt: nowIso,
				signatureType,
				verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
				doctorFullName,
				signatureSvg: signatureDataUrl,
				notes: isDigital ? `Подписано пациентом на экране (Canvas, ${nowStr})` : `Подписано на бумажном носителе (${nowStr})`,
			};

			void fetch(`/api/patients/${encodeURIComponent(patientContext.id)}/consents`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(consentPayload),
			})
				.then((res) => {
					if (res.ok) {
						recordConsentLocally(currentConsentKey, nowIso);
					}
				})
				.catch(() => {
					/* offline fallback */
				});
		}

		if (activePackage === "tax_certificate") {
			// Вызов официального генератора справки ФНС КНД 1151156 с QR-кодом и штампом (Мандат 8n)
			printTaxCertificate(
				buildTaxCertificateDocumentData({
					documentNumber: legalContext.documentNumber,
					issueDateIso: nowIso,
					taxYear,
					clinicName: DEFAULT_CLINIC_REQUISITES.name,
					clinicInn: DEFAULT_CLINIC_REQUISITES.inn,
					clinicOgrn: DEFAULT_CLINIC_REQUISITES.ogrn,
					clinicLicense: DEFAULT_CLINIC_REQUISITES.license,
					clinicAddress: DEFAULT_CLINIC_REQUISITES.address,
					doctorFullName,
					patient,
					receiptsCount: effectiveServices.length || 1,
					totalAmountKopecks,
				}),
			);
			showToast("✓ Справка ФНС (КНД 1151156) сформирована и отправлена на печать");
		} else {
			window.print();
			showToast("✓ Комплект документов утвержден и отправлен на печать");
		}
	}, [
		activePackage,
		currentConsentKey,
		activeConsentSubKind,
		isSignPadOpen,
		patientContext?.id,
		doctorFullName,
		onSigned,
		getSignatureDataUrl,
		recordConsentLocally,
		legalContext.documentNumber,
		taxYear,
		patient,
		effectiveServices.length,
		totalAmountKopecks,
		showToast,
	]);

	if (!isOpen) return null;

	return (
		<div
			className="dente-docs-studio-backdrop"
			onClick={onClose}
			data-testid="documents-studio-modal-backdrop"
		>
			<div
				className="dente-docs-studio-container"
				onClick={(e) => e.stopPropagation()}
				data-testid="documents-studio-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dente-docs-studio-title"
			>
				{/* Apple HIG Drag Handle для мобильных (36x5px) */}
				<div className="dente-mobile-drag-handle" aria-hidden="true" />

				{/* Каноническая шапка: 1 строка <= 52px */}
				<DocumentsStudioHeader
					patientFullName={patient.fullName || "Пациент не выбран"}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					onClose={onClose}
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
							clinicName={DEFAULT_CLINIC_REQUISITES.name}
							clinicLicense={DEFAULT_CLINIC_REQUISITES.license}
							doctorFullName={doctorFullName}
							toastNotice={toastNotice}
						/>
					</aside>

					{/* Правая зона: Предпросмотр листа формата А4 */}
					<main className="dente-docs-preview-area">
						<div
							className="dente-a4-paper-sheet print-paper-sheet"
							data-paper-sheet
							data-testid="dente-a4-paper-sheet"
						>
							{/* Шапка бланка А4 */}
							<div className="dente-a4-sheet-header">
								<div>
									<div className="dente-a4-clinic-name">
										{DEFAULT_CLINIC_REQUISITES.name}
									</div>
									<div className="dente-a4-clinic-sub">
										{DEFAULT_CLINIC_REQUISITES.address} · Тел: {DEFAULT_CLINIC_REQUISITES.phone}
									</div>
									<div className="dente-a4-clinic-sub">
										Лицензия: {DEFAULT_CLINIC_REQUISITES.license}
									</div>
								</div>
								<div className="dente-a4-date-badge">
									<div>Дата: {currentDate}</div>
									<div className="text-teal-700 font-medium mt-1">
										Сумма: {formatKopecksToRubles(totalAmountKopecks)}
									</div>
								</div>
							</div>

							{/* Содержимое бланка */}
							<div className="dente-a4-text-body">
								{renderedDocumentText}
							</div>

							{/* Подвал с подписями сторон */}
							<div className="dente-a4-sheet-footer">
								<div>
									<div className="font-semibold text-slate-800">Исполнитель:</div>
									<div className="text-slate-600">{doctorFullName}</div>
									<div className="mt-4 text-slate-400">Подпись: ______________________ М.П.</div>
								</div>

								<div className="text-right">
									<div className="font-semibold text-slate-800">Пациент:</div>
									<div className="text-slate-600">{patient.fullName || "______________________"}</div>
									<div className="mt-4 text-slate-400">
										{effectiveHasSigned
											? `Подписано пациентом ${signedAtTimeStr ? `в ${signedAtTimeStr} ` : ""}[OK]`
											: "Подпись: ______________________"}
									</div>
								</div>
							</div>
						</div>
					</main>
				</div>

				{/* Канонический подвал: Ровно 1 Primary CTA #0d9488 — Мандаты 8am, 8e & Apple HIG */}
				<DocumentsStudioFooter
					onPrimarySignAndPrint={handlePrimarySignAndPrint}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					hasSigned={effectiveHasSigned}
					activePackage={activePackage}
				/>
			</div>
		</div>
	);
};

export default DocumentsStudioModal;
