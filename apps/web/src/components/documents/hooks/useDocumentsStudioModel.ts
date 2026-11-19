/**
 * apps/web/src/components/documents/hooks/useDocumentsStudioModel.ts
 *
 * Инкапсулирует вычисление реквизитов, сумм, налоговых чеков и текста документов (SSOT).
 * Мандаты 8b (Sweet Spot декомпозиции), 8e (Автономия врача), 8be (Анти-Any, exactOptionalPropertyTypes).
 */

import { useMemo } from "react";
import type { Patient } from "@dental/shared";
import { resolveTaxDeductionCategory, type TaxDeductionPaymentItem } from "../taxCertificateEngine";
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
	generateInformedConsentTemplate,
	generateIntakePackageTemplate,
	generateTaxCertificateTemplate,
	sumKopecks,
} from "../../consents/consentCatalogData";
import { NO_PATIENT_SELECTED_PLACEHOLDER } from "../types";

export interface UseDocumentsStudioModelOptions {
	readonly patientContext?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly address?: string | undefined;
		readonly phone?: string | undefined;
		readonly inn?: string | undefined;
	} | undefined;
	readonly directPatient?: Patient | Record<string, unknown> | null | undefined;
	readonly directPatientId?: string | undefined;
	readonly directPatientName?: string | undefined;
	readonly directPatientBirthDate?: string | undefined;
	readonly directPatientInn?: string | undefined;
	readonly directDoctorName?: string | undefined;
	readonly directDoctorFullName?: string | undefined;
	readonly taxpayer?: {
		readonly inn?: string | undefined;
		readonly passport?: string | undefined;
	} | undefined;
	readonly directPayerPassport?: string | undefined;
	readonly payments?: readonly unknown[] | undefined;
	readonly services?: readonly DocumentServiceItem[] | undefined;
	readonly clinicProfileDraft?: {
		readonly legalName?: string | undefined;
		readonly clinicName?: string | undefined;
		readonly inn?: string | undefined;
		readonly kpp?: string | undefined;
		readonly ogrn?: string | undefined;
		readonly medicalLicenseNumber?: string | undefined;
		readonly address?: string | undefined;
		readonly phone?: string | undefined;
	} | undefined;
	readonly directClinicName?: string | undefined;
	readonly directClinicInn?: string | undefined;
	readonly directClinicKpp?: string | undefined;
	readonly directClinicOgrn?: string | undefined;
	readonly directClinicAddress?: string | undefined;
	readonly directClinicLicenseNumber?: string | undefined;
	readonly diagnosisRu?: string | undefined;
	readonly anamnesisRu?: string | undefined;
	readonly epicrisisRu?: string | undefined;
	readonly activePackage: DocumentPackageKey;
	readonly activeConsentSubKind: ConsentSubKind;
	readonly taxYear: number;
	readonly backendTaxReceipts?: readonly TaxDeductionPaymentItem[] | undefined;
	readonly isDemo: boolean;
	readonly effectivePatientId?: string | undefined;
}

export function useDocumentsStudioModel(options: UseDocumentsStudioModelOptions) {
	const {
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
		backendTaxReceipts = [],
		isDemo,
		effectivePatientId,
	} = options;

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
			const dpInn = (typeof dp["inn"] === "string" ? (dp["inn"] as string) : undefined) || directPatientInn || taxpayer?.inn;
			const dpPassport = taxpayer?.passport || (typeof dp["passport"] === "string" ? (dp["passport"] as string) : "") || "";
			const dpAddress = typeof dp["address"] === "string" ? (dp["address"] as string) : "";
			return {
				fullName: (typeof dp["fullName"] === "string" ? (dp["fullName"] as string) : "") || directPatientName || "",
				birthDate: (typeof dp["birthDate"] === "string" ? (dp["birthDate"] as string) : "") || directPatientBirthDate || "",
				passport: dpPassport,
				address: dpAddress,
				phone: (typeof dp["phone"] === "string" ? (dp["phone"] as string) : "") || "",
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

	const paymentServices: readonly DocumentServiceItem[] = useMemo(() => {
		if (Array.isArray(payments) && payments.length > 0) {
			return payments.map(
				(
					pmt: unknown,
					idx: number,
				) => {
					const p = (pmt && typeof pmt === "object") ? (pmt as Record<string, unknown>) : {};
					const amtKopecks =
						typeof p["amountKopecks"] === "number"
							? (p["amountKopecks"] as number)
							: Math.round(Number(p["amountRub"] || p["amount"] || 0) * 100);
					const code804n = typeof p["code804n"] === "string" ? (p["code804n"] as string) : undefined;
					const srvName = typeof p["serviceName"] === "string" ? (p["serviceName"] as string) : typeof p["description"] === "string" ? (p["description"] as string) : undefined;
					const rcptNo = typeof p["receiptNumber"] === "string" ? (p["receiptNumber"] as string) : undefined;
					return {
						id: `payment-srv-${idx + 1}`,
						code: code804n || `PAY-${idx + 1}`,
						title:
							srvName ||
							`Оплата медицинских услуг (чек №${rcptNo || idx + 1})`,
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

	const taxReceiptItems = useMemo<readonly TaxDeductionPaymentItem[]>(() => {
		if (backendTaxReceipts.length > 0) return backendTaxReceipts;
		if (Array.isArray(payments) && payments.length > 0) {
			return payments.map((pmt: unknown, idx: number) => {
				const p = (pmt && typeof pmt === "object") ? (pmt as Record<string, unknown>) : {};
				const amtKop =
					typeof p["amountKopecks"] === "number"
						? (p["amountKopecks"] as number)
						: Math.round(Number(p["amountRub"] || p["amount"] || 0) * 100);
				const code804n = typeof p["code804n"] === "string" ? (p["code804n"] as string) : undefined;
				const serviceName = typeof p["serviceName"] === "string" ? (p["serviceName"] as string) : typeof p["description"] === "string" ? (p["description"] as string) : "Оплата медицинских услуг";
				const rawTaxCode = typeof p["taxCode"] === "string" ? (p["taxCode"] as string) : resolveTaxDeductionCategory(code804n || "", serviceName);
				const receiptNumber = typeof p["receiptNumber"] === "string" ? (p["receiptNumber"] as string) : undefined;
				const fiscalDocumentNumber = typeof p["fiscalDocumentNumber"] === "string" ? (p["fiscalDocumentNumber"] as string) : undefined;
				const fiscalSign = typeof p["fiscalSign"] === "string" ? (p["fiscalSign"] as string) : undefined;
				const dateIso = typeof p["dateIso"] === "string" ? (p["dateIso"] as string) : typeof p["paidAt"] === "string" ? (p["paidAt"] as string) : new Date().toISOString();
				return {
					id: typeof p["id"] === "string" ? (p["id"] as string) : `pmt-${idx + 1}`,
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

	const hasNoConfirmedPayments = activePackage === "tax_certificate"
		? taxReceiptItems.length === 0
		: (Array.isArray(payments) && payments.length === 0) && (!effectiveServices || effectiveServices.length === 0);

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
					return `Справка об оплате медицинских услуг для налогового органа (вычет 13% НДФЛ)\n\n${patientLine}Нет подтвержденных фискальных оплат за ${taxYear} год.\n\nЗа выбранный налоговый период по данному пациенту не зарегистрировано подтверждённых кассовых оплат.\nДля формирования официальной справки необходимы зарегистрированные чеки ККТ.\n\n[Доступна печать чистого бланка справки со штампом клиники для ручного заполнения]`;
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
	}, [isDemo, patient.fullName, patient.birthDate, patient.passport, hasNoConfirmedPayments, activePackage, legalContext, activeConsentSubKind, taxpayer?.passport, directPayerPassport, taxReceiptItems, taxYear, taxTotalAmountKopecks, taxCode01Kopecks, taxCode02Kopecks]);

	return {
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
	};
}
