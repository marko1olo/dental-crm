import {
	generateFnsNdflPrintHtml,
	type FnsNdflFiscalReceiptItem,
	type FnsNdflXmlPayload,
} from "../../../documents/ndflXml/fnsNdflXmlEngine.js";
import type { PatientPersonalCabinetData } from "../patientCabinetEngine.js";
import { downloadHtmlFile } from "./documentsDownloadUtils.js";

export function generatePatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = 2026,
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

	const receipts: FnsNdflFiscalReceiptItem[] = [];
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

	const clinicName = data.clinicInfo?.legalName || data.clinicInfo?.nameRu || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = data.clinicInfo?.inn || "7841098765";
	const clinicOgrn = data.clinicInfo?.ogrn || "1217800012345";
	const clinicLicense = data.clinicInfo?.licenseNumber || "ЛО-78-01-011842";
	const clinicPhone = data.clinicInfo?.phone || "+7 (812) 400-20-20";

	const payerInn = (data as { inn?: string }).inn || "781429810482";
	const payerBirthDate = data.birthDate || data.birthDateIso || "1984-05-14";

	const payload: FnsNdflXmlPayload = {
		documentNumber: data.cardNumber || data.cardNumberRu || "10492",
		documentDate: new Date(),
		taxYear,
		clinic: {
			name: clinicName,
			inn: clinicInn,
			kpp: "784101001",
			ogrn: clinicOgrn,
			license: { number: clinicLicense, date: "2021-06-15" },
			phone: clinicPhone,
			directorName: data.curatingDoctor || "Смирнов А. В.",
		},
		payer: {
			fullName: { family, given, patronymic },
			inn: payerInn,
			birthDate: payerBirthDate,
			identityDocument: { docTypeCode: "21", seriesAndNumber: "4014 982310", issueDate: "2014-06-20" },
		},
		patient: { kinshipCode: "1" },
		receipts,
	};

	return generateFnsNdflPrintHtml(payload);
}

export async function downloadPatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = 2026,
): Promise<void> {
	const sanitizedName = data.fullName.replace(/\s+/g, "_");
	const filename = `Spravka_FNS_KND_1151156_${sanitizedName}_${taxYear}.html`;

	// Попытка гидратации с канонического API бэкенда при наличии сессии
	try {
		const token = typeof window !== "undefined" ? localStorage.getItem("dente_portal_token") : null;
		const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
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
