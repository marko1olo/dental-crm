import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { showToast } from "../../../GlobalToast";
import type { FiscalReceipt54FzResult, TaxDeductionCertificatePayload } from "../../fiscalReceiptEngine";
import { generateCompletedActAndWarrantyHtml, type CompletedWorksActParams } from "../../invoiceEngine";
import { renderOfficialTaxCertificateKnd1151156Html, type TaxDeductionCertificateParams } from "../../taxDeductionEngine";
import { hardwarePrinter } from "../../../../services/hardware/HardwarePrinter";
import { generateSalesSlipHtml } from "./generateSalesSlipHtml";

export interface UseFiscalPrintActionsParams {
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly totalSumRub: number;
	readonly clinicName: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly cashierFullName: string;
	readonly actNumber: string;
	readonly contractNumber: string;
	readonly oneCClinicInn: string;
	readonly oneCClinicKpp: string;
	readonly oneCPatientAddress: string;
	readonly taxYear: number;
	readonly payerFullName: string;
	readonly payerInn: string;
	readonly payerRelationship: string;
	readonly fiscalReceipt: FiscalReceipt54FzResult;
	readonly taxDeductionCert: TaxDeductionCertificatePayload;
}

export function useFiscalPrintAndCopyActions(p: UseFiscalPrintActionsParams) {
	const handlePrintSalesSlip = async () => {
		const docNum = `ТЧ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
		});
		const html = generateSalesSlipHtml({
			docNum, nowStr,
			clinicName: p.clinicName,
			patientName: p.patientName,
			patientPhone: p.patientPhone,
			cashierFullName: p.cashierFullName,
			totalSumRub: p.totalSumRub,
			items: p.activeItems,
		});

		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Товарный чек № ${docNum}`,
				downloadFilename: `tovarniy_check_${docNum}.html`,
			});
			showToast("Товарный чек отправлен на печать (без фискализации)", "success", 3000);
		} catch (printErr: unknown) {
			console.warn("[FiscalReceipt54FzModal] Print tovarniy check failed:", printErr);
			showToast("Ошибка отправки товарного чека на печать", "error");
		}
	};

	const handlePrintAct = async () => {
		const actParams: CompletedWorksActParams = {
			actNumber: p.actNumber,
			contractNumber: p.contractNumber,
			contractDateIso: new Date().toISOString(),
			actDateIso: new Date().toISOString(),
			clinic: {
				name: p.clinicName || "Стоматологическая клиника ДЕНТЕ",
				legalName: p.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: p.oneCClinicInn || "7707083893",
				kpp: p.oneCClinicKpp || "770101001",
				ogrn: "1027700132195",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
				address: "г. Москва, ул. Профсоюзная, д. 42",
				phone: "+7 (495) 789-01-23",
				chiefDoctorName: p.cashierFullName || "Смирнов Александр Владимирович",
			},
			patient: {
				id: p.patientId,
				fullName: p.patientName,
				phone: p.patientPhone || "",
				address: p.oneCPatientAddress || "",
				medicalCardNumber: `043/у-${(p.patientId || "patient").slice(0, 4)}`,
			},
			doctor: {
				fullName: p.cashierFullName || "Лечащий врач",
				specialty: "Врач-стоматолог терапевт-ортопед",
			},
			items: p.activeItems.map((it, idx) => ({
				id: it.id || `srv-${idx + 1}`,
				name: it.name,
				category: (it.category as CompletedWorksActParams["items"][number]["category"]) || "therapy",
				toothNumber: it.toothNumber ? String(it.toothNumber) : undefined,
				code804n: it.code804n || "A16.07.002",
				priceRub: it.priceRub,
				quantity: it.quantity || 1,
				discountRub: it.discountRub || 0,
				warrantyMonths: it.isWarranty ? 12 : undefined,
				isWarranty: it.isWarranty,
			})),
		};

		const html = generateCompletedActAndWarrantyHtml(actParams);
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Акт выполненных работ № ${p.actNumber}`,
				downloadFilename: `act_${p.actNumber}.html`,
			});
			showToast("Акт выполненных работ отправлен на печать", "success", 3000);
		} catch (err) {
			console.warn("[FiscalReceipt54FzModal] Print act failed:", err);
			showToast("Ошибка отправки акта на печать", "error");
		}
	};

	const handlePrintTaxCertificate = async () => {
		const certParams: TaxDeductionCertificateParams = {
			certificateNumber: p.taxDeductionCert.certificateNumber,
			issueDateIso: new Date().toISOString(),
			taxYear: p.taxYear,
			taxOfficeCode: "7701",
			clinic: {
				legalName: p.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: p.oneCClinicInn || p.taxDeductionCert.clinicInn || "7707083893",
				kpp: p.oneCClinicKpp || p.taxDeductionCert.clinicKpp || "770101001",
				ogrn: p.taxDeductionCert.clinicOgrn || "1027700132195",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
				address: p.taxDeductionCert.clinicAddress || "г. Москва, ул. Профсоюзная, д. 42",
				chiefDoctorName: p.cashierFullName || "Смирнов Александр Владимирович",
			},
			payer: {
				fullName: p.payerFullName.trim() || p.patientName,
				inn: p.payerInn.trim() || undefined,
				relationship: (p.payerRelationship === "self" ? "patient" : p.payerRelationship) as TaxDeductionCertificateParams["payer"]["relationship"],
			},
			patient: { fullName: p.patientName },
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
	};

	return { handlePrintSalesSlip, handlePrintAct, handlePrintTaxCertificate };
}
