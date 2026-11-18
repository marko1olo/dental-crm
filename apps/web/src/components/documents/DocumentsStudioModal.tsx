/**
 * apps/web/src/components/documents/DocumentsStudioModal.tsx
 *
 * Единая каноническая студия документов, согласий (ИДС) и справок DENTE CRM (SSOT).
 * Объединяет клинические документы и согласия в неразрывный рабочий контур (Мандаты 8e, 8n, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488 (Мандат 8am), ZERO disabled кнопок (Мандат 8e, Автономия врача).
 * Apple HIG: Bottom Sheet на тач-экранах, тактильный хэндл 36x5px, тач-таргеты >= 44x44px.
 * Мандат 8wy: Полная изоляция боевого режима от демо-мокапов. В проде без пациента — чистый стейт.
 * Целевой размер фасада: 320–380 строк (Sweet Spot Mandate 8b, строго <= 420 строк).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import type { Patient, TaxDeductionRelationship } from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	printTaxCertificate,
	buildTaxCertificateDocumentData,
	resolveTaxDeductionCategory,
} from "./taxCertificateEngine";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";
import { printHtmlViaIframe } from "./printHtmlViaIframe";
import {
	downloadFnsTaxXmlFile,
	downloadFnsNoMedoplXmlFile,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
} from "../finance/taxDeductionEngine";
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
} from "../consents/consentCatalogData";
import {
	DocumentsStudioHeader,
	DocumentsStudioFooter,
	DocumentsPackageSelector,
	ConsentSignersRow,
	useCanvasSigner,
	usePatientConsents,
} from "./studio";
import "./documentsStudio.css";

export type DocumentTemplateKey = DocumentPackageKey | "contract" | "act" | "consent" | "tax_deduction";
export type TaxDeductionTab = "form" | "checks" | "family" | "xml" | "registry";

function generateA4PrintHtml(options: {
	clinic: { name: string; inn: string; license: string; address: string; phone: string };
	patient: PatientRequisites;
	doctorFullName: string;
	currentDate: string;
	totalAmountKopecks: number;
	documentText: string;
	hasSigned?: boolean | undefined;
	signedAtTimeStr?: string | null | undefined;
}): string {
	const escapeHtml = (str: string) =>
		(str || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(options.clinic.name)} — ${escapeHtml(options.patient.fullName || "Документ")}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #0f172a; margin: 0; padding: 24px; }
    .sheet-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
    .clinic-title { font-size: 16px; font-weight: 700; text-transform: uppercase; }
    .clinic-sub { font-size: 11px; color: #475569; margin-top: 3px; }
    .date-badge { text-align: right; font-size: 12px; }
    .total-cost { font-weight: 600; color: #0d9488; margin-top: 4px; }
    .doc-content { white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.65; margin: 24px 0; min-height: 500px; }
    .sheet-footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; }
    .sig-block { max-width: 45%; }
  </style>
</head>
<body>
  <div class="sheet-header">
    <div>
      <div class="clinic-title">${escapeHtml(options.clinic.name)}</div>
      <div class="clinic-sub">${escapeHtml(options.clinic.address)} · Тел: ${escapeHtml(options.clinic.phone)}</div>
      <div class="clinic-sub">Лицензия: ${escapeHtml(options.clinic.license)}</div>
    </div>
    <div class="date-badge">
      <div>Дата: ${options.currentDate}</div>
      <div class="total-cost">Сумма: ${formatKopecksToRubles(options.totalAmountKopecks)}</div>
    </div>
  </div>
  <div class="doc-content">${escapeHtml(options.documentText)}</div>
  <div class="sheet-footer">
    <div class="sig-block">
      <div style="font-weight: 600;">Исполнитель:</div>
      <div>${escapeHtml(options.doctorFullName)}</div>
      <div style="margin-top: 18px; color: #64748b;">Подпись: ______________________ М.П.</div>
    </div>
    <div class="sig-block" style="text-align: right;">
      <div style="font-weight: 600;">Пациент:</div>
      <div>${escapeHtml(options.patient.fullName || "______________________")}</div>
      <div style="margin-top: 18px; color: #64748b;">
        ${options.hasSigned ? `Подписано пациентом ${options.signedAtTimeStr ? `в ${options.signedAtTimeStr} ` : ""}[OK]` : "Подпись: ______________________"}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const NO_PATIENT_SELECTED_PLACEHOLDER =
	"[Бланк для ручного заполнения — Пациент: ____________________________________]";

export interface DocumentsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly phone?: string | undefined;
		readonly address?: string | undefined;
		readonly inn?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly patient?: {
		readonly id?: string | null | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly passport?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly inn?: string | null | undefined;
		readonly snils?: string | null | undefined;
		readonly [key: string]: unknown;
	} | Patient | null | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly patientSnils?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly isMinorPatient?: boolean | undefined;
	readonly initialTemplate?: DocumentTemplateKey | undefined;
	readonly initialDocId?: string | undefined;
	readonly initialTab?: string | undefined;
	readonly selectedYear?: number | undefined;
	readonly initialYear?: number | undefined;
	readonly payments?: readonly unknown[] | undefined;
	readonly allPayments?: readonly unknown[] | undefined;
	readonly clinicProfileDraft?: {
		readonly clinicName?: string | undefined;
		readonly legalName?: string | undefined;
		readonly inn?: string | undefined;
		readonly kpp?: string | undefined;
		readonly ogrn?: string | undefined;
		readonly address?: string | undefined;
		readonly phone?: string | undefined;
		readonly medicalLicenseNumber?: string | undefined;
		readonly directorFullName?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly services?: readonly DocumentServiceItem[] | undefined;
	readonly diagnosisRu?: string | undefined;
	readonly anamnesisRu?: string | undefined;
	readonly epicrisisRu?: string | undefined;
	readonly taxpayer?: {
		readonly fullName?: string | undefined;
		readonly inn?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly relationship?: TaxDeductionRelationship | undefined;
	} | undefined;
	readonly payerFullName?: string | undefined;
	readonly payerInn?: string | undefined;
	readonly payerBirthDate?: string | undefined;
	readonly payerPassport?: string | undefined;
	readonly payerRelationship?: TaxDeductionRelationship | undefined;
	readonly onSigned?: ((payload: { packageKey: DocumentPackageKey; signedAt: string; isDigital: boolean }) => void) | undefined;
	readonly onDocumentSigned?: ((payload: unknown) => void) | undefined;
	readonly onConsentSigned?: ((payload: unknown) => void) | undefined;
	readonly [key: string]: unknown;
}

export const DocumentsStudioModal: React.FC<DocumentsStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	patient: directPatient,
	patientId: directPatientId,
	patientName: directPatientName,
	patientBirthDate: directPatientBirthDate,
	patientInn: directPatientInn,
	patientSnils: directPatientSnils,
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
	const [backendTaxReceipts, setBackendTaxReceipts] = useState<readonly TaxDeductionPaymentItem[]>([]);

	const {
		canvasRef,
		startDrawing,
		draw,
		stopDrawing,
		clearCanvas,
		getSignatureDataUrl,
	} = useCanvasSigner(() => setHasSigned(false));

	const effectivePatientId = patientContext?.id || directPatient?.id || directPatientId;

	useEffect(() => {
		if (!isOpen || activePackage !== "tax_certificate" || !effectivePatientId) {
			setBackendTaxReceipts([]);
			return;
		}

		let isMounted = true;
		const headers = denteAdminSecretRequestHeaders();

		fetch(`/api/documents/tax-deduction/preview/${encodeURIComponent(effectivePatientId)}?year=${taxYear}`, {
			headers,
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!isMounted) return;
				const payload = data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data;
				if (payload && typeof payload === "object" && Array.isArray((payload as { receipts?: unknown[] }).receipts)) {
					const rawList = (payload as { receipts: Array<{
						id?: string;
						receiptNumber?: string;
						fiscalDocumentNumber?: string;
						receiptDate?: string;
						serviceName?: string;
						amountRub?: number;
						deductionCode?: string;
						isExcluded?: boolean;
					}> }).receipts;
					const activeList = rawList.filter((r) => !r.isExcluded);
					const mapped: TaxDeductionPaymentItem[] = activeList.map((r, idx) => {
						const rub = Number(r.amountRub) || 0;
						return {
							id: r.id || `preview-rcpt-${idx + 1}`,
							dateIso: r.receiptDate || new Date().toISOString(),
							receiptNumber: r.receiptNumber || String(idx + 1),
							fiscalDocumentNumber: r.fiscalDocumentNumber || "0",
							fiscalSign: "0",
							serviceName: r.serviceName || "Стоматологические медицинские услуги",
							amountRub: rub,
							amountKopecks: Math.round(rub * 100),
							taxCode: r.deductionCode === "2" ? "2" : "1",
						};
					});
					setBackendTaxReceipts(mapped);
				} else {
					setBackendTaxReceipts([]);
				}
			})
			.catch(() => {
				if (isMounted) setBackendTaxReceipts([]);
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen, activePackage, effectivePatientId, taxYear]);
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

	const patient: PatientRequisites = useMemo(() => {
		if (patientContext) {
			const ctxPassport = taxpayer?.passport || (typeof patientContext.passport === "string" ? patientContext.passport : "") || "";
			return {
				fullName: patientContext.fullName || directPatientName || "",
				birthDate: patientContext.birthDate || directPatientBirthDate || "",
				passport: ctxPassport,
				address: patientContext.address || "",
				phone: patientContext.phone || "",
				...(patientContext.inn || directPatientInn || taxpayer?.inn ? { inn: taxpayer?.inn || patientContext.inn || directPatientInn } : {}),
			};
		}
		if (directPatient) {
			const dp = directPatient as Record<string, unknown>;
			const dpInn = (typeof dp.inn === "string" ? dp.inn : undefined) || directPatientInn || taxpayer?.inn;
			const dpPassport = taxpayer?.passport || (typeof dp.passport === "string" ? dp.passport : "") || "";
			const dpAddress = typeof dp.address === "string" ? dp.address : "";
			return {
				fullName: directPatient.fullName || directPatientName || "",
				birthDate: directPatient.birthDate || directPatientBirthDate || "",
				passport: dpPassport,
				address: dpAddress,
				phone: directPatient.phone || "",
				...(dpInn ? { inn: dpInn } : {}),
			};
		}
		if (directPatientName || directPatientBirthDate || directPatientInn || taxpayer?.passport) {
			return {
				fullName: directPatientName || "",
				birthDate: directPatientBirthDate || "",
				passport: taxpayer?.passport || "",
				address: "",
				phone: "",
				...(directPatientInn || taxpayer?.inn ? { inn: taxpayer?.inn || directPatientInn } : {}),
			};
		}
		return isDemo ? DEMO_SAMPLE_PATIENT : EMPTY_PATIENT_REQUISITES;
	}, [patientContext, directPatient, directPatientName, directPatientBirthDate, directPatientInn, taxpayer, isDemo]);

	const currentDate = useMemo(() => {
		return new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	}, []);

	const effectiveDoctorName = directDoctorFullName || directDoctorName || (isDemo ? "Смирнова Елена Сергеевна" : "______________________");

	const clinicRequisites = useMemo(() => {
		return {
			name: clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName || directClinicName || DEFAULT_CLINIC_REQUISITES.name,
			inn: clinicProfileDraft?.inn || directClinicInn || DEFAULT_CLINIC_REQUISITES.inn,
			kpp: clinicProfileDraft?.kpp || directClinicKpp || DEFAULT_CLINIC_REQUISITES.kpp,
			ogrn: clinicProfileDraft?.ogrn || directClinicOgrn || DEFAULT_CLINIC_REQUISITES.ogrn,
			license: clinicProfileDraft?.medicalLicenseNumber || directClinicLicenseNumber || DEFAULT_CLINIC_REQUISITES.license,
			address: clinicProfileDraft?.address || directClinicAddress || DEFAULT_CLINIC_REQUISITES.address,
			phone: clinicProfileDraft?.phone || DEFAULT_CLINIC_REQUISITES.phone,
		};
	}, [clinicProfileDraft, directClinicName, directClinicInn, directClinicKpp, directClinicOgrn, directClinicLicenseNumber, directClinicAddress]);

	// Адаптация переданных платежей для расчета справок ФНС
	const paymentServices: readonly DocumentServiceItem[] = useMemo(() => {
		if (Array.isArray(payments) && payments.length > 0) {
			return payments.map(
				(
					pmt: {
						amountKopecks?: number | null;
						amountRub?: number | string | null;
						amount?: number | string | null;
						code804n?: string | null;
						serviceName?: string | null;
						description?: string | null;
						receiptNumber?: string | null;
					},
					idx: number,
				) => {
					const amtKopecks =
						typeof pmt.amountKopecks === "number"
							? pmt.amountKopecks
							: Math.round(Number(pmt.amountRub || pmt.amount || 0) * 100);
					return {
						id: `payment-srv-${idx + 1}`,
						code: pmt.code804n || `PAY-${idx + 1}`,
						title:
							pmt.serviceName ||
							pmt.description ||
							`Оплата медицинских услуг (чек №${pmt.receiptNumber || idx + 1})`,
						quantity: 1,
						priceKopecks: amtKopecks,
						amountKopecks: amtKopecks,
					};
				},
			);
		}
		return [];
	}, [payments]);

	const effectiveServices: readonly DocumentServiceItem[] = useMemo(() => {
		if (paymentServices.length > 0) return paymentServices;
		if (services && services.length > 0) return services;
		return isDemo ? DEMO_SAMPLE_SERVICES : EMPTY_SERVICES;
	}, [paymentServices, services, isDemo]);

	const totalAmountKopecks = useMemo(() => sumKopecks(effectiveServices), [effectiveServices]);

	const { code01Kopecks, code02Kopecks } = useMemo(() => {
		let c1 = 0;
		let c2 = 0;
		for (const s of effectiveServices) {
			const cat = resolveTaxDeductionCategory(s.code, s.title);
			const amt = s.amountKopecks || (s.priceKopecks * (s.quantity || 1)) || 0;
			if (cat === "2") {
				c2 += amt;
			} else {
				c1 += amt;
			}
		}
		if (c1 === 0 && c2 === 0 && totalAmountKopecks > 0) {
			c1 = totalAmountKopecks;
		}
		return { code01Kopecks: c1, code02Kopecks: c2 };
	}, [effectiveServices, totalAmountKopecks]);

	const clinicalTexts = useMemo(() => ({
		diagnosis: diagnosisRu !== undefined ? diagnosisRu : (isDemo ? "К02.1 Кариес дентина зуба 4.6. Интактный зубной ряд." : ""),
		anamnesis: anamnesisRu !== undefined ? anamnesisRu : (isDemo ? "Жалобы на кратковременные боли от температурных раздражителей. Аллергоанамнез чист." : ""),
		epicrisis: epicrisisRu !== undefined ? epicrisisRu : (isDemo ? "Кариозная полость санирована, анатомия восстановлена. Гарантия клиники: 12 месяцев." : ""),
	}), [diagnosisRu, anamnesisRu, epicrisisRu, isDemo]);

	const legalContext: DocumentLegalContext = useMemo(() => ({
		clinic: clinicRequisites,
		patient,
		doctor: { fullName: effectiveDoctorName, specialty: "Врач-стоматолог терапевт" },
		documentNumber: isDemo
			? "КЛ-2026/894"
			: (effectivePatientId ? `Д-2026/${effectivePatientId.slice(0, 6)}` : "БЛ-2026/001"),
		documentDate: currentDate,
		taxYear,
		services: effectiveServices,
		totalAmountKopecks,
		diagnosisRu: clinicalTexts.diagnosis,
		anamnesisRu: clinicalTexts.anamnesis,
		epicrisisRu: clinicalTexts.epicrisis,
		consentSubKind: activeConsentSubKind,
	}), [clinicRequisites, patient, effectiveDoctorName, isDemo, effectivePatientId, currentDate, taxYear, effectiveServices, totalAmountKopecks, clinicalTexts, activeConsentSubKind]);

	const taxReceiptItems = useMemo<readonly TaxDeductionPaymentItem[]>(() => {
		if (backendTaxReceipts.length > 0) return backendTaxReceipts;
		if (Array.isArray(payments) && payments.length > 0) {
			return payments.map((pmt: unknown, idx: number) => {
				const p = (pmt && typeof pmt === "object") ? (pmt as Record<string, unknown>) : {};
				const amtKop =
					typeof p.amountKopecks === "number"
						? p.amountKopecks
						: Math.round(Number(p.amountRub || p.amount || 0) * 100);
				const code804n = typeof p.code804n === "string" ? p.code804n : undefined;
				const serviceName = typeof p.serviceName === "string" ? p.serviceName : typeof p.description === "string" ? p.description : "Оплата медицинских услуг";
				const rawTaxCode = typeof p.taxCode === "string" ? p.taxCode : resolveTaxDeductionCategory(code804n || "", serviceName);
				const receiptNumber = typeof p.receiptNumber === "string" ? p.receiptNumber : undefined;
				const fiscalDocumentNumber = typeof p.fiscalDocumentNumber === "string" ? p.fiscalDocumentNumber : undefined;
				const fiscalSign = typeof p.fiscalSign === "string" ? p.fiscalSign : undefined;
				const dateIso = typeof p.dateIso === "string" ? p.dateIso : typeof p.paidAt === "string" ? p.paidAt : new Date().toISOString();
				return {
					id: typeof p.id === "string" ? p.id : `pmt-${idx + 1}`,
					dateIso,
					receiptNumber: receiptNumber || String(idx + 1),
					fiscalDocumentNumber: fiscalDocumentNumber || "0",
					fiscalSign: fiscalSign || "0",
					serviceName,
					...(code804n ? { code804n } : {}),
					amountRub: amtKop / 100,
					amountKopecks: amtKop,
					taxCode: (rawTaxCode === "2" ? "2" : "1") as "1" | "2",
				};
			});
		}
		return [];
	}, [backendTaxReceipts, payments]);

	const taxTotalAmountKopecks = useMemo(() => {
		return taxReceiptItems.reduce((acc, p) => acc + (p.amountKopecks || 0), 0);
	}, [taxReceiptItems]);

	const { taxCode01Kopecks, taxCode02Kopecks } = useMemo(() => {
		let c1 = 0;
		let c2 = 0;
		for (const p of taxReceiptItems) {
			const amt = p.amountKopecks || Math.round(p.amountRub * 100);
			if (p.taxCode === "2") {
				c2 += amt;
			} else {
				c1 += amt;
			}
		}
		return { taxCode01Kopecks: c1, taxCode02Kopecks: c2 };
	}, [taxReceiptItems]);

	const hasNoConfirmedPayments = activePackage === "tax_certificate"
		? taxReceiptItems.length === 0
		: (Array.isArray(payments) && payments.length === 0) && (!effectiveServices || effectiveServices.length === 0);

	// Генерация текста текущего документа в зависимости от выбранного пакета
	const renderedDocumentText = useMemo(() => {
		const blankNotice = (!isDemo && !patient.fullName.trim() && !hasNoConfirmedPayments)
			? `${NO_PATIENT_SELECTED_PLACEHOLDER}\n\n`
			: "";

		switch (activePackage) {
			case "informed_consent":
				return `${blankNotice}${generateInformedConsentTemplate(legalContext, activeConsentSubKind)}`;
			case "tax_certificate": {
				const effectivePassport = taxpayer?.passport || directPayerPassport || patient.passport || "";
				if (taxReceiptItems.length === 0) {
					const passportLine = effectivePassport ? `\nДокумент, удостоверяющий личность (паспорт): ${effectivePassport}` : "";
					const patientLine = patient.fullName ? `Пациент: ${patient.fullName}, ${patient.birthDate || "дата рождения не указана"}${passportLine}\n\n` : "";
					return `Справка об оплате медицинских услуг для представления в налоговый орган Российской Федерации (ФНС России)\nФорма по КНД 1151156 (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@)\n\n${patientLine}Нет подтверждённых платежей за ${taxYear} год.\n\nЗа выбранный налоговый период по данному пациенту не зарегистрировано подтверждённых кассовых оплат.\nДля формирования официальной справки по форме КНД 1151156 необходимы зарегистрированные чеки ККТ.\n\n[Доступна печать чистого бланка справки со штампом клиники для ручного заполнения]`;
				}
				const baseText = generateTaxCertificateTemplate({
					...legalContext,
					patient: {
						...patient,
						passport: effectivePassport || patient.passport,
					},
					totalAmountKopecks: taxTotalAmountKopecks,
				});
				const codeBreakdown = `\n[РАЗДЕЛЕНИЕ ПО КОДАМ УСЛУГ ДЛЯ ФНС]:\nКод 1 (стандартные медицинские услуги): ${formatKopecksToRubles(taxCode01Kopecks)}\nКод 2 (дорогостоящее лечение): ${formatKopecksToRubles(taxCode02Kopecks)}\n`;
				return `${blankNotice}Справка об оплате медицинских услуг для налогового вычета (ФНС России)\n${baseText}${codeBreakdown}`;
			}
			case "card_extract":
				return `${blankNotice}${generateCardExtractTemplate(legalContext)}`;
			default:
				return `${blankNotice}${generateIntakePackageTemplate(legalContext)}`;
		}
	}, [isDemo, patient.fullName, hasNoConfirmedPayments, activePackage, legalContext, activeConsentSubKind, taxReceiptItems, taxYear, taxTotalAmountKopecks, taxCode01Kopecks, taxCode02Kopecks]);

	const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
		setToastNotice(msg);
		setToastType(type);
		setTimeout(() => {
			setToastNotice(null);
			setToastType("info");
		}, 3200);
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

	const handlePrintBlank = useCallback(() => {
		if (activePackage === "tax_certificate") {
			const payerFullName = taxpayer?.fullName || directPayerFullName || undefined;
			const payerInn = taxpayer?.inn || directPayerInn || undefined;
			const payerBirthDate = taxpayer?.birthDate || directPayerBirthDate || undefined;
			const payerPassport = taxpayer?.passport || directPayerPassport || undefined;
			const payerRelationship = taxpayer?.relationship || directPayerRelationship || "patient";

			printTaxCertificate(
				buildTaxCertificateDocumentData({
					documentNumber: `БЛ-${taxYear}/001`,
					issueDateIso: new Date().toISOString(),
					taxYear,
					clinicName: clinicRequisites.name,
					clinicInn: clinicRequisites.inn,
					clinicOgrn: clinicRequisites.ogrn,
					clinicLicense: clinicRequisites.license,
					clinicAddress: clinicRequisites.address,
					doctorFullName: effectiveDoctorName,
					patient: {
						fullName: patient.fullName || "____________________________________",
						birthDate: patient.birthDate || "____.____.________",
						passport: patient.passport || "серия _____ № ___________",
						inn: patient.inn || undefined,
					},
					taxpayer: {
						fullName: payerFullName,
						inn: payerInn,
						birthDate: payerBirthDate,
						passport: payerPassport,
						relationship: payerRelationship,
					},
					receiptsCount: 0,
					totalAmountKopecks: 0,
					code01Kopecks: 0,
					code02Kopecks: 0,
				}),
			);
			showToast("Чистый бланк справки для налогового вычета отправлен на печать", "success");
		} else if (activePackage === "intake") {
			printPrimaryIntakePackage({
				patient: {
					fullName: patient.fullName || "____________________________________",
					birthDate: patient.birthDate || "",
					phone: patient.phone || "",
					address: patient.address || "",
				},
				clinic: clinicRequisites,
				doctorFullName: effectiveDoctorName,
			});
			showToast("Чистый бланк первичного приёма отправлен на печать", "success");
		} else {
			const a4Html = generateA4PrintHtml({
				clinic: clinicRequisites,
				patient,
				doctorFullName: effectiveDoctorName,
				currentDate,
				totalAmountKopecks,
				documentText: renderedDocumentText,
			});
			printHtmlViaIframe(a4Html, "dente-docs-studio-print-iframe");
			showToast("Чистый бланк отправлен на печать", "success");
		}
	}, [activePackage, taxYear, clinicRequisites, effectiveDoctorName, patient, currentDate, totalAmountKopecks, renderedDocumentText, showToast]);

	const handlePaperConfirm = useCallback(() => {
		setHasSigned(true);
		const nowIso = new Date().toISOString();
		recordConsentLocally(currentConsentKey, nowIso);
		onConsentSigned?.({
			verificationMethod: "paper_signed",
			paperOriginalStored: true,
			status: "signed_paper",
			signedAt: nowIso,
			patientName: patient.fullName,
		});
		showToast("Подписание на бумаге подтверждено и зарегистрировано в истории", "success");
	}, [currentConsentKey, recordConsentLocally, onConsentSigned, patient.fullName, showToast]);

	const buildCertParams = useCallback((): TaxDeductionCertificateParams => {
		const payerFullName = taxpayer?.fullName || directPayerFullName || patient.fullName.trim() || "Пациент Не Указан";
		const payerInn = taxpayer?.inn || directPayerInn || patient.inn || undefined;
		const payerBirthDate = taxpayer?.birthDate || directPayerBirthDate || patient.birthDate || undefined;
		const payerRelationship = taxpayer?.relationship || directPayerRelationship || "patient";

		return {
			certificateNumber: `СПР-${taxYear}/001`,
			issueDateIso: new Date().toISOString(),
			taxYear,
			clinic: {
				legalName: clinicRequisites.name,
				inn: clinicRequisites.inn,
				kpp: clinicRequisites.kpp || undefined,
				ogrn: clinicRequisites.ogrn || undefined,
				licenseNumber: clinicRequisites.license,
				address: clinicRequisites.address,
				chiefDoctorName: effectiveDoctorName,
			},
			payer: {
				fullName: payerFullName,
				inn: payerInn,
				birthDate: payerBirthDate,
				relationship: payerRelationship,
			},
			patient: {
				fullName: patient.fullName.trim() || "Пациент Не Указан",
				inn: patient.inn || undefined,
				birthDate: patient.birthDate || undefined,
			},
			payments: [...taxReceiptItems],
		};
	}, [taxReceiptItems, taxpayer, directPayerFullName, directPayerInn, directPayerBirthDate, directPayerRelationship, patient, taxYear, clinicRequisites, effectiveDoctorName]);

	const handleDownloadXml = useCallback(() => {
		try {
			const certParams = buildCertParams();
			if (!certParams.payments || certParams.payments.length === 0) {
				showToast("Нет подтверждённых платежей за выбранный год", "error");
				return;
			}
			downloadFnsTaxXmlFile(certParams);
			showToast("XML-файл справки выгружен для ТКС", "success");
		} catch (err) {
			console.error("[DocumentsStudioModal] Сбой генерации XML справки:", err);
			showToast("Ошибка формирования XML справки", "error");
		}
	}, [buildCertParams, showToast]);

	const handleDownloadNoMedopl = useCallback(() => {
		try {
			const certParams = buildCertParams();
			if (!certParams.payments || certParams.payments.length === 0) {
				showToast("Нет подтверждённых платежей за выбранный год", "error");
				return;
			}
			downloadFnsNoMedoplXmlFile(certParams);
			showToast("Файл электронного реестра NO_MEDOPL (5.01) выгружен", "success");
		} catch (err) {
			console.error("[DocumentsStudioModal] Сбой генерации NO_MEDOPL:", err);
			showToast("Ошибка формирования реестра NO_MEDOPL", "error");
		}
	}, [buildCertParams, showToast]);

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
		onDocumentSigned?.({
			packageKey: activePackage,
			signedAt: nowIso,
			status: "signed",
		});
		onConsentSigned?.({
			verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
			signedAt: nowIso,
			status: "signed",
		});

		// Единый канонический флоу: регистрация документа в generated_documents и выдача (/issue)
		if (effectivePatientId) {
			const signatureDataUrl = isDigital ? getSignatureDataUrl() : undefined;
			const docKind = activePackage === "informed_consent"
				? "informed_consent"
				: activePackage === "tax_certificate"
					? "tax_deduction_certificate"
					: activePackage === "card_extract"
						? "completed_works_act"
						: "paid_medical_services_contract";

			const docTitle = activePackage === "informed_consent"
				? `Информированное согласие: ${activeConsentSubKind}`
				: activePackage === "tax_certificate"
					? `Справка для налогового вычета за ${taxYear} г.`
					: activePackage === "card_extract"
						? "Выписка из медицинской карты"
						: "Договор на оказание платных медицинских услуг";

			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const createPayload: Record<string, unknown> = {
				patientId: effectivePatientId,
				kind: docKind,
				title: docTitle,
				totalAmountRub: totalAmountKopecks > 0 ? totalAmountKopecks / 100 : 0,
			};
			if (activePackage === "tax_certificate") {
				createPayload.taxYear = taxYear;
				if (patient.inn) createPayload.taxPayerInn = patient.inn;
			}

			void fetch("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify(createPayload),
			})
				.then(async (res) => {
					if (res.ok) {
						const createdDoc = await res.json();
						if (createdDoc?.id) {
							await fetch(`/api/documents/${encodeURIComponent(createdDoc.id)}/issue`, {
								method: "POST",
								headers,
								body: JSON.stringify({
									signatureAttestation: {
										staffFullName: effectiveDoctorName || "Врач-стоматолог",
										staffRole: "врач",
										signedAt: nowIso,
										verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
									},
								}),
							});
						}
						recordConsentLocally(currentConsentKey, nowIso);
					} else {
						console.warn("[DocumentsStudioModal] Ошибка регистрации документа в реестре:", res.status);
					}
				})
				.catch((err) => {
					console.warn("[DocumentsStudioModal] Сбой сети при регистрации документа:", err);
				});

			// Синхронизация согласия в истории пациента
			const consentPayload = {
				consentType: currentConsentKey,
				kind: activePackage === "informed_consent" ? "procedure_specific_consent_packet" : "informed_consent",
				title: docTitle,
				isSigned: true,
				signedAt: nowIso,
				signatureType,
				verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
				doctorFullName: effectiveDoctorName,
				signatureSvg: signatureDataUrl,
				notes: isDigital ? `Подписано пациентом на экране (Canvas, ${nowStr})` : `Подписано на бумажном носителе (${nowStr})`,
			};

			void fetch(`/api/patients/${encodeURIComponent(effectivePatientId)}/consents`, {
				method: "POST",
				headers,
				body: JSON.stringify(consentPayload),
			}).catch(() => {});
		}

		if (activePackage === "tax_certificate") {
			const payerFullName = taxpayer?.fullName || directPayerFullName || patient.fullName || undefined;
			const payerInn = taxpayer?.inn || directPayerInn || patient.inn || undefined;
			const payerBirthDate = taxpayer?.birthDate || directPayerBirthDate || patient.birthDate || undefined;
			const payerPassport = taxpayer?.passport || directPayerPassport || undefined;
			const payerRelationship = taxpayer?.relationship || directPayerRelationship || "patient";

			printTaxCertificate(
				buildTaxCertificateDocumentData({
					documentNumber: legalContext.documentNumber,
					issueDateIso: nowIso,
					taxYear,
					clinicName: clinicRequisites.name,
					clinicInn: clinicRequisites.inn,
					clinicOgrn: clinicRequisites.ogrn,
					clinicLicense: clinicRequisites.license,
					clinicAddress: clinicRequisites.address,
					doctorFullName: effectiveDoctorName,
					patient,
					taxpayer: {
						fullName: payerFullName,
						inn: payerInn,
						birthDate: payerBirthDate,
						passport: payerPassport,
						relationship: payerRelationship,
					},
					receiptsCount: taxReceiptItems.length,
					totalAmountKopecks: taxTotalAmountKopecks,
					code01Kopecks: taxCode01Kopecks,
					code02Kopecks: taxCode02Kopecks,
				}),
			);
			showToast("Справка для налогового вычета сформирована и отправлена на печать", "success");
		} else if (activePackage === "intake") {
			printPrimaryIntakePackage({
				patient: {
					fullName: patient.fullName || "____________________________________",
					birthDate: patient.birthDate || "",
					phone: patient.phone || "",
					address: patient.address || "",
				},
				clinic: clinicRequisites,
				doctorFullName: effectiveDoctorName,
			});
			showToast("Комплект документов первичного приёма отправлен на печать", "success");
		} else {
			const a4Html = generateA4PrintHtml({
				clinic: clinicRequisites,
				patient,
				doctorFullName: effectiveDoctorName,
				currentDate,
				totalAmountKopecks,
				documentText: renderedDocumentText,
				hasSigned: true,
				signedAtTimeStr: nowStr,
			});
			printHtmlViaIframe(a4Html, "dente-docs-studio-print-iframe");
			showToast("Комплект документов утвержден и отправлен на печать", "success");
		}
	}, [
		activePackage,
		currentConsentKey,
		activeConsentSubKind,
		isSignPadOpen,
		effectivePatientId,
		effectiveDoctorName,
		onSigned,
		onDocumentSigned,
		onConsentSigned,
		getSignatureDataUrl,
		recordConsentLocally,
		legalContext.documentNumber,
		taxYear,
		patient,
		effectiveServices.length,
		totalAmountKopecks,
		code01Kopecks,
		code02Kopecks,
		clinicRequisites,
		currentDate,
		renderedDocumentText,
		showToast,
	]);

	if (!isOpen) return null;

	const stampBadgeElement = (
		<div
			data-testid="tax-certificate-stamp-badge"
			className="dente-tax-stamp-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
		>
			{effectiveHasSigned || (!hasNoConfirmedPayments && totalAmountKopecks > 0) ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
		</div>
	);

	const extraTestId = [
		activePackage === "tax_certificate" ? "tax-deduction-modal fns-tax-certificate-modal" : "",
		activePackage === "informed_consent" ? "consent-studio-modal" : "",
	].filter(Boolean).join(" ");

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
										{clinicRequisites.name}
									</div>
									<div className="dente-a4-clinic-sub">
										{clinicRequisites.address} · Тел: {clinicRequisites.phone}
									</div>
									<div className="dente-a4-clinic-sub">
										Лицензия: {clinicRequisites.license}
									</div>
								</div>
								<div className="dente-a4-date-badge">
									<div>Дата: {currentDate}</div>
									<div className="text-teal-700 font-medium mt-1">
										Сумма: {formatKopecksToRubles(activePackage === "tax_certificate" ? taxTotalAmountKopecks : totalAmountKopecks)}
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
									<div className="font-semibold text-[var(--ink)]">Исполнитель:</div>
									<div className="text-[var(--ink-secondary)]">{effectiveDoctorName}</div>
									<div className="mt-4 text-[var(--ink-muted)]">Подпись: ______________________ М.П.</div>
								</div>

								<div className="text-right">
									<div className="font-semibold text-[var(--ink)]">Пациент:</div>
									<div className="text-[var(--ink-secondary)]">{patient.fullName || "______________________"}</div>
									<div className="mt-4 text-[var(--ink-muted)]">
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
