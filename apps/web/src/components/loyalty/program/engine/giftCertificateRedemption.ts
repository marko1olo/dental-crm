import { validateGiftCertificateSerial } from "./giftCertificateSerials";
import type { GiftCertificate, GiftCertificateRedemptionResult } from "./giftCertificateTypes";

/**
 * Redeems a gift certificate for an invoice (partial or full)
 */
export function redeemGiftCertificate(
	certificate: GiftCertificate,
	invoiceAmountKop: number,
	currentDateIso: string = new Date().toISOString().slice(0, 10)
): GiftCertificateRedemptionResult {
	if (!validateGiftCertificateSerial(certificate.serialNumber)) {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: certificate.currentBalanceKop,
			redeemedAmountKop: 0,
			newBalanceKop: certificate.currentBalanceKop,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: certificate.status,
			errorMessageRu: "Недействительный номер сертификата (ошибка контрольной суммы)",
		};
	}

	if (certificate.status === "depleted") {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: 0,
			redeemedAmountKop: 0,
			newBalanceKop: 0,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: "depleted",
			errorMessageRu: "Баланс сертификата полностью исчерпан",
		};
	}

	if (certificate.status === "cancelled") {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: certificate.currentBalanceKop,
			redeemedAmountKop: 0,
			newBalanceKop: certificate.currentBalanceKop,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: "cancelled",
			errorMessageRu: "Сертификат аннулирован администрацией клиники",
		};
	}

	if (currentDateIso > certificate.expiresAtIso) {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: certificate.currentBalanceKop,
			redeemedAmountKop: 0,
			newBalanceKop: certificate.currentBalanceKop,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: "expired",
			errorMessageRu: `Срок действия сертификата истек ${certificate.expiresAtIso}`,
		};
	}

	const redeemedAmountKop = Math.min(certificate.currentBalanceKop, Math.max(0, invoiceAmountKop));
	const newBalanceKop = certificate.currentBalanceKop - redeemedAmountKop;
	const remainingInvoiceAmountKop = Math.max(0, invoiceAmountKop - redeemedAmountKop);
	const newStatus = newBalanceKop === 0 ? "depleted" : "active";

	return {
		success: true,
		certificateId: certificate.id,
		serialNumber: certificate.serialNumber,
		previousBalanceKop: certificate.currentBalanceKop,
		redeemedAmountKop,
		newBalanceKop,
		coveredInvoiceAmountKop: redeemedAmountKop,
		remainingInvoiceAmountKop,
		newStatus,
	};
}
