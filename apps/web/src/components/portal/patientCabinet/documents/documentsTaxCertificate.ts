import {
	DEFAULT_CLINIC_LEGAL_REQUISITES,
	generateFnsNdflPrintHtml,
	type FnsFiscalReceiptItem,
	type FnsTaxPayload,
} from "@dental/shared";
import type { PatientPersonalCabinetData } from "../patientCabinetEngine.js";
import { downloadHtmlFile } from "./documentsDownloadUtils.js";

export function generatePatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = new Date().getFullYear(),
): string {
	const nameParts = data.fullName.trim().split(/\s+/);
	const family = nameParts[0] || "Пациент";
	const given = nameParts[1] || "Иван";
	const patronymic = nameParts.slice(2).join(" ") || undefined;

	const paidInvoices = data.invoices.filter((inv) => {
		if (inv.status !== "paid") return false;
		if (taxYear) {
			const invYear = parseInt(inv.issueDateIso.slice(0, 4), 10);
			return invYear === taxYear;
		}
		return true;
	});

	const receipts: FnsFiscalReceiptItem[] = [];
	for (const inv of paidInvoices) {
		for (let i = 0; i < inv.items.length; i++) {
			const item = inv.items[i]!;
			const isExpensive =
				item.code.startsWith("A16.07.054") ||
				item.titleRu.toLowerCase().includes("имплант") ||
				item.titleRu.toLowerCase().includes("синус") ||
				item.titleRu.toLowerCase().includes("костн");

			receipts.push({
				id: `rec-${inv.id}-${i}`,
				receiptNumber: inv.fiscalReceiptNumber || `ФД-${inv.invoiceNumber}`,
				fiscalDocumentNumber: inv.fiscalReceiptNumber?.replace(/\D/g, "") || undefined,
				receiptDate: inv.paidAtIso ? inv.paidAtIso.slice(0, 10) : inv.issueDateIso,
				serviceName: `${item.titleRu}${item.toothFdi ? ` (зуб №${item.toothFdi})` : ""}`,
				deductionCode: isExpensive ? "2" : "1",
				amountRub: item.totalRub,
			});
		}
	}

	const clinicName = data.clinicInfo?.legalName || data.clinicInfo?.nameRu || DEFAULT_CLINIC_LEGAL_REQUISITES.clinicFullName;
	const clinicInn = data.clinicInfo?.inn || DEFAULT_CLINIC_LEGAL_REQUISITES.clinicInn;
	const clinicKpp = data.clinicInfo?.kpp || DEFAULT_CLINIC_LEGAL_REQUISITES.clinicKpp;
	const clinicOgrn = data.clinicInfo?.ogrn || DEFAULT_CLINIC_LEGAL_REQUISITES.clinicOgrn;
	const clinicLicense = data.clinicInfo?.licenseNumber || DEFAULT_CLINIC_LEGAL_REQUISITES.medicalLicenseNumber;
	const clinicPhone = data.clinicInfo?.phone || DEFAULT_CLINIC_LEGAL_REQUISITES.clinicPhone;
	const clinicLicenseDate = data.clinicInfo?.licenseDate || DEFAULT_CLINIC_LEGAL_REQUISITES.medicalLicenseDate;

	const payerInn = data.inn || "";
	const payerBirthDate = data.birthDate || data.birthDateIso || "";

	const passportSeriesNum = data.passportSeries && data.passportNumber
		? `${data.passportSeries} ${data.passportNumber}`
		: data.passport
			? String(data.passport)
			: undefined;

	const payload: FnsTaxPayload = {
		documentNumber: data.cardNumber || data.cardNumberRu || data.patientId?.slice(0, 8).toUpperCase() || "1",
		documentDate: new Date(),
		taxYear,
		clinic: {
			name: clinicName,
			inn: clinicInn,
			kpp: clinicKpp,
			ogrn: clinicOgrn,
			license: clinicLicense ? { number: clinicLicense, date: clinicLicenseDate } : undefined,
			phone: clinicPhone,
			directorName: data.curatingDoctor || DEFAULT_CLINIC_LEGAL_REQUISITES.chiefDoctorFullName || "",
		},
		payer: {
			fullName: { family, given, patronymic },
			inn: payerInn || undefined,
			birthDate: payerBirthDate,
			identityDocument: passportSeriesNum
				? { docTypeCode: "21", seriesAndNumber: passportSeriesNum, issueDate: data.passportIssuedDate || undefined }
				: undefined,
		},
		patient: { patientKinshipCode: "1" },
		expenses: {},
		receipts,
	};

	return generateFnsNdflPrintHtml(payload);
}

export async function downloadPatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = new Date().getFullYear(),
	tokenOverride?: string | null,
): Promise<void> {
	const sanitizedName = data.fullName.replace(/\s+/g, "_");
	const filename = `Spravka_FNS_KND_1151156_${sanitizedName}_${taxYear}.html`;

	// Попытка скачивания официального PDF с канонического API бэкенда для ЛК Налогоплательщика
	try {
		const token = tokenOverride || (typeof window !== "undefined" ? localStorage.getItem("dente_portal_token") : null);
		const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
		const pdfResp = await fetch(`/api/portal/tax-certificate/pdf?year=${taxYear}`, { headers });
		if (pdfResp.ok) {
			const blob = await pdfResp.blob();
			if (blob && blob.size > 0 && blob.type.includes("pdf")) {
				const pdfFilename = `Spravka_FNS_KND_1151156_${sanitizedName}_${taxYear}.pdf`;
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = pdfFilename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				return;
			}
		}
		const resp = await fetch(`/api/portal/tax-certificate/html?year=${taxYear}`, { headers });
		if (resp.ok) {
			const html = await resp.text();
			if (html && html.includes("<!DOCTYPE html>")) {
				downloadHtmlFile(html, filename);
				return;
			}
		}
	} catch {
		// Офлайн или изолированный режим — фолбек на гидратированные данные
	}

	const html = generatePatientTaxCertificate1151156(data, taxYear);
	downloadHtmlFile(html, filename);
}
