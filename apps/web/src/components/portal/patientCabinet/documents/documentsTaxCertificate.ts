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

	const payload: FnsNdflXmlPayload = {
		documentNumber: data.cardNumber || "10492",
		documentDate: new Date(),
		taxYear,
		clinic: {
			name: "ООО «Стоматологическая клиника ДЕНТЕ»",
			inn: "7841098765",
			kpp: "784101001",
			ogrn: "1217800012345",
			license: { number: "ЛО-78-01-011842", date: "2021-06-15" },
			phone: "+7 (812) 400-20-20",
			directorName: "Смирнов А. В.",
		},
		payer: {
			fullName: { family, given, patronymic },
			inn: (data as { inn?: string }).inn || "781429810482",
			birthDate: data.birthDate || "1984-05-14",
			identityDocument: { docTypeCode: "21", seriesAndNumber: "4014 982310", issueDate: "2014-06-20" },
		},
		patient: { kinshipCode: "1" },
		receipts,
	};

	return generateFnsNdflPrintHtml(payload);
}

export function downloadPatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = 2026,
): void {
	const html = generatePatientTaxCertificate1151156(data, taxYear);
	const sanitizedName = data.fullName.replace(/\s+/g, "_");
	downloadHtmlFile(html, `Spravka_FNS_KND_1151156_${sanitizedName}_${taxYear}.html`);
}
