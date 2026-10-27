import { useMemo, useState } from "react";
import { rubToKopecks, type Kopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import {
	generateFiscalReceipt54Fz,
	type FiscalReceipt54FzResult,
	type Order804nFiscalReceiptItem,
} from "../fiscalReceiptEngine.js";
import type { CashReceiptPrintModalProps } from "./cashReceiptPrintTypes.js";

export function useCashReceiptPrintState(props: CashReceiptPrintModalProps) {
	const {
		receipt,
		invoice,
		clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn = "",
		clinicAddress = "",
		cashierFullName = "Кассир",
		attendingDoctorName = "Врач-стоматолог",
		defaultFormat = "80mm",
	} = props;

	const [format, setFormat] = useState<"80mm" | "a4">(defaultFormat);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const effectiveReceipt: FiscalReceipt54FzResult = useMemo(() => {
		if (receipt) return receipt;

		if (invoice) {
			const isWarranty =
				invoice.status === "warranty_100" || (invoice.totalAmountRub ?? 0) === 0;

			const invoiceItems: readonly Order804nFiscalReceiptItem[] =
				invoice.items && invoice.items.length > 0
					? invoice.items.map((it, idx) => {
							const priceRub = Number(it.priceRub) || 0;
							const qty = Number(it.quantity) || 1;
							const totalRub = priceRub * qty;
							const priceKop = rubToKopecks(priceRub);
							const totalKop = rubToKopecks(totalRub);

							return {
								id: it.id || `inv-item-${idx}`,
								name: it.name || "Стоматологическая услуга",
								category: "Стоматология",
								code804n: it.code || "A16.07.002",
								toothNumber: undefined,
								stageKind: "stage_1_therapy" as const,
								quantity: qty,
								priceRub: isWarranty ? 0 : priceRub,
								unitPriceRub: isWarranty ? 0 : priceRub,
								unitPriceKopecks: (isWarranty ? 0 : priceKop) as Kopecks,
								discountRub: isWarranty ? priceRub : 0,
								discountKopecks: (isWarranty ? priceKop : 0) as Kopecks,
								grossRub: priceRub * qty,
								grossKopecks: (priceKop * qty) as Kopecks,
								amountRub: isWarranty ? 0 : totalRub,
								amountKopecks: (isWarranty ? 0 : totalKop) as Kopecks,
								vatRate: "vat_none" as const,
								taxRateKopecks: 0 as Kopecks,
								paymentSubject: "service" as const,
								paymentMethod: "full_payment" as const,
								quantityMeasure: "piece" as const,
								taxDeductionCategory: "1" as const,
							};
						})
					: [
							{
								id: `inv-item-${invoice.id}`,
								name: isWarranty
									? "Гарантийное обслуживание (скидка 100%)"
									: "Стоматологические услуги по плану лечения",
								category: "Стоматология",
								code804n: "A16.07.002",
								stageKind: "stage_1_therapy" as const,
								quantity: 1,
								priceRub: isWarranty ? 0 : (invoice.totalAmountRub || 0),
								unitPriceRub: isWarranty ? 0 : (invoice.totalAmountRub || 0),
								unitPriceKopecks: (isWarranty ? 0 : rubToKopecks(invoice.totalAmountRub || 0)) as Kopecks,
								discountRub: isWarranty ? (invoice.totalAmountRub || 0) : 0,
								discountKopecks: (isWarranty ? rubToKopecks(invoice.totalAmountRub || 0) : 0) as Kopecks,
								grossRub: invoice.totalAmountRub || 0,
								grossKopecks: rubToKopecks(invoice.totalAmountRub || 0) as Kopecks,
								amountRub: isWarranty ? 0 : (invoice.totalAmountRub || 0),
								amountKopecks: (isWarranty ? 0 : rubToKopecks(invoice.totalAmountRub || 0)) as Kopecks,
								vatRate: "vat_none" as const,
								taxRateKopecks: 0 as Kopecks,
								paymentSubject: "service" as const,
								paymentMethod: "full_payment" as const,
								quantityMeasure: "piece" as const,
								taxDeductionCategory: "1" as const,
							},
						];

			const splitPayment = isWarranty
				? {}
				: invoice.paymentMethod === "cash"
					? { cashRub: invoice.paidAmountRub ?? invoice.totalAmountRub }
					: invoice.paymentMethod === "sbp"
						? { sbpRub: invoice.paidAmountRub ?? invoice.totalAmountRub }
						: invoice.paymentMethod === "deposit"
							? { depositRub: invoice.paidAmountRub ?? invoice.totalAmountRub }
							: { cardRub: invoice.paidAmountRub ?? invoice.totalAmountRub };

			return generateFiscalReceipt54Fz({
				items: invoiceItems,
				splitPayment,
				patientId: invoice.patientId || "pat-default",
				patientName: invoice.patientName || "Пациент",
				customerContact: invoice.patientPhone || "",
				cashierFullName,
				clinicLegalName: clinicName,
				clinicInn: clinicInn || "",
				clinicAddress: clinicAddress || "",
				customReceiptNumber: invoice.number,
			});
		}

		return generateFiscalReceipt54Fz({
			items: [],
			splitPayment: {},
			patientId: "pat-default",
			patientName: "Пациент",
			customerContact: "",
			cashierFullName,
			clinicLegalName: clinicName,
			clinicInn: clinicInn || "",
			clinicAddress: clinicAddress || "",
			customReceiptNumber: "ЧЕК-0001",
		});
	}, [receipt, invoice, cashierFullName, clinicName, clinicInn, clinicAddress]);

	const handlePrint = () => {
		window.print();
		showToast("Документ отправлен на печать", "info");
	};

	const handleCopyText = async () => {
		const textLines = [
			`=== ${effectiveReceipt.clinicLegalName} ===`,
			`ИНН: ${effectiveReceipt.clinicInn}`,
			`КАССОВЫЙ ЧЕК № ${effectiveReceipt.receiptNumber}`,
			`Дата: ${effectiveReceipt.receiptDateRu}`,
			`Кассир: ${effectiveReceipt.cashierFullName}`,
			`Врач: ${attendingDoctorName}`,
			`Пациент: ${effectiveReceipt.patientName}`,
			"----------------------------------------",
			...effectiveReceipt.items.map(
				(it, i) => `${i + 1}. [${it.code804n}] ${it.name} - ${it.amountRub} руб.`,
			),
			"----------------------------------------",
			`ИТОГО: ${effectiveReceipt.totalRub} руб.`,
			`ФД: ${effectiveReceipt.fiscalDocumentNumber}  ФПД: ${effectiveReceipt.fiscalSign}`,
			`ФН: ${effectiveReceipt.fnSerial}`,
			`Сайт ОФД: ${effectiveReceipt.ofdUrl}`,
		];

		await navigator.clipboard.writeText(textLines.join("\n"));
		setIsCopied(true);
		showToast("Реквизиты чека скопированы в буфер обмена", "success");
		setTimeout(() => setIsCopied(false), 2000);
	};

	return {
		format,
		setFormat,
		isCopied,
		effectiveReceipt,
		attendingDoctorName,
		handlePrint,
		handleCopyText,
	};
}
