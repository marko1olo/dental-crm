import { generateQrCodeSvg } from "@dental/shared";
import type { PatientInvoiceItem, SbpBankMember, SbpQrPayload } from "./patientCabinetTypes.js";

export const SBP_POPULAR_BANKS: readonly SbpBankMember[] = [
	{ id: "sber", nameRu: "СберБанк Онлайн", schemaPrefix: "sberpay://qr/sub?qrId=", brandColorHex: "#21a038", popular: true },
	{ id: "tbank", nameRu: "Т-Банк (Тинькофф)", schemaPrefix: "tinkoffbank://qr?id=", brandColorHex: "#ffdd2d", popular: true },
	{ id: "alfa", nameRu: "Альфа-Банк", schemaPrefix: "alfabank://qr/pay?qrId=", brandColorHex: "#ef3124", popular: true },
	{ id: "vtb", nameRu: "ВТБ Онлайн", schemaPrefix: "vtb://sbp/pay?qrId=", brandColorHex: "#0a2896", popular: true },
	{ id: "sbp_generic", nameRu: "Другой банк (СБП)", schemaPrefix: "https://qr.nspk.ru/", brandColorHex: "#1a56db", popular: false },
];

export function generateSbpQrPayload(
	invoice: PatientInvoiceItem,
	clinicDetails?: { legalName?: string; inn?: string; account?: string; bic?: string },
): SbpQrPayload {
	const recipientLegalName = clinicDetails?.legalName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const recipientInn = clinicDetails?.inn || "7704123456";
	const recipientAccount = clinicDetails?.account || "40702810938000123456";
	const bankBic = clinicDetails?.bic || "044525225";
	const amountRub = invoice.remainingAmountRub > 0 ? invoice.remainingAmountRub : invoice.totalAmountRub;
	const amountKopecks = Math.round(amountRub * 100);
	const qrId = `SBPA${Date.now().toString(36).toUpperCase()}${invoice.invoiceNumber.replace(/\D/g, "")}`;
	const paymentPurpose = `Оплата стоматологических услуг по счету № ${invoice.invoiceNumber} (НДС не облагается)`;

	const sbpNspkPayloadString = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${amountKopecks}&cur=RUB&crc=84A2`;
	const qrSvg = generateQrCodeSvg(sbpNspkPayloadString, { size: 180 });

	const expiresDate = new Date();
	expiresDate.setHours(expiresDate.getHours() + 72);

	return {
		qrId,
		invoiceNumber: invoice.invoiceNumber,
		amountRub,
		amountKopecks,
		recipientLegalName,
		recipientInn,
		recipientAccount,
		bankBic,
		paymentPurpose,
		sbpNspkPayloadString,
		qrSvg,
		expiresAtIso: expiresDate.toISOString(),
		availableBanks: SBP_POPULAR_BANKS,
	};
}

export function processSbpPayment(
	invoice: PatientInvoiceItem,
	transactionId?: string,
	receiptNumber?: string,
): PatientInvoiceItem {
	const nowIso = new Date().toISOString();
	const cleanTx = (transactionId || invoice.id).replace(/\D/g, "").slice(0, 6);
	const receiptNum = receiptNumber || `ФД-${cleanTx ? cleanTx.padStart(6, "0") : "100001"}`;

	return {
		...invoice,
		status: "paid",
		paidAmountRub: invoice.totalAmountRub,
		remainingAmountRub: 0,
		paymentMethod: "sbp",
		paidAtIso: nowIso,
		fiscalReceiptNumber: receiptNum,
		fiscalReceiptUrl: `https://receipt.nalog.ru/v1/check/${transactionId || invoice.id}`,
	};
}
