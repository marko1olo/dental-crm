import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import { showToast } from "../../../../GlobalToast";
import type { FiscalReceipt54Fz, TaxDeductionCertificateData } from "../../../fiscalReceiptEngine";
import {
	renderOfficialTaxCertificateKnd1151156Html,
	type TaxDeductionCertificateParams,
} from "../../../taxDeductionEngine";
import { hardwarePrinter } from "../../../../../services/hardware/HardwarePrinter";

export interface PrintTaxCertInput {
	taxDeductionCert: TaxDeductionCertificateData;
	taxYear: number;
	clinicName: string;
	oneCClinicInn?: string | undefined;
	oneCClinicKpp?: string | undefined;
	cashierFullName: string;
	payerFullName: string;
	payerInn: string;
	payerRelationship: string;
	patientName: string;
	activeItems: readonly TreatmentPlanItem[];
	fiscalReceipt: FiscalReceipt54Fz;
}

export async function printTaxDeductionCertHtml(p: PrintTaxCertInput): Promise<void> {
	const certParams: TaxDeductionCertificateParams = {
		certificateNumber: p.taxDeductionCert.certificateNumber,
		issueDateIso: new Date().toISOString(),
		taxYear: p.taxYear,
		taxOfficeCode: "7701",
		clinic: {
			legalName: p.clinicName,
			inn: p.oneCClinicInn || p.taxDeductionCert.clinicInn || "7707083893",
			kpp: p.oneCClinicKpp || p.taxDeductionCert.clinicKpp || "770101001",
			ogrn: p.taxDeductionCert.clinicOgrn || "1027700132195",
			licenseNumber: "ЛО41-01137-77/00368421",
			licenseDate: "12.10.2021",
			address: p.taxDeductionCert.clinicAddress || "г. Москва, ул. Профсоюзная, д. 42",
			chiefDoctorName: p.cashierFullName,
		},
		payer: {
			fullName: p.payerFullName.trim() || p.patientName,
			inn: p.payerInn.trim() || undefined,
			relationship: (p.payerRelationship === "self" ? "patient" : p.payerRelationship) as TaxDeductionCertificateParams["payer"]["relationship"],
		},
		patient: {
			fullName: p.patientName,
		},
		payments: p.activeItems.map((it, idx) => ({
			id: it.id || `pmt-${idx + 1}`,
			dateIso: new Date().toISOString(),
			receiptNumber: p.fiscalReceipt.receiptNumber || `CHK-${p.taxYear}-${idx + 1}`,
			fiscalDocumentNumber: p.fiscalReceipt.fiscalDocumentNumber || "1001",
			fiscalSign: p.fiscalReceipt.fiscalSign || "1234567890",
			serviceName: it.name,
			code804n: it.code804n || "A16.07.002",
			amountRub: Math.max(0, it.priceRub * (it.quantity || 1) - (it.discountRub || 0)),
			taxCode: it.category === "implantology" || it.category === "surgery" ? "2" : "1",
		})),
	};

	const html = renderOfficialTaxCertificateKnd1151156Html(certParams);
	try {
		await hardwarePrinter.printHtmlWithPopupFallback(html, {
			title: `Справка КНД 1151156 № ${p.taxDeductionCert.certificateNumber}`,
			downloadFilename: `spravka_knd_1151156_${p.taxDeductionCert.certificateNumber}.html`,
		});
		showToast("Справка для налогового вычета отправлена на печать", "success", 3000);
	} catch (err) {
		console.warn("[FiscalReceipt54FzModal] Print tax certificate failed:", err);
		showToast("Ошибка отправки справки на печать", "error");
	}
}
