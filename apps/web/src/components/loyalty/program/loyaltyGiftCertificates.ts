export interface GiftCertificate {
	readonly id: string;
	readonly serialNumber: string; // 16 digits: 7701-XXXX-XXXX-XXXC (Luhn verified)
	readonly nominalKop?: number;
	readonly initialBalanceKop: number;
	readonly currentBalanceKop: number;
	readonly initialBalanceRub?: number;
	readonly currentBalanceRub?: number;
	readonly purchaserPatientId?: string;
	readonly purchaserName?: string;
	readonly recipientPatientId?: string;
	readonly recipientName?: string;
	readonly recipientPhone?: string;
	readonly buyerPatientId?: string;
	readonly buyerPatientName?: string;
	readonly issuedAtIso: string;
	readonly expiresAtIso: string;
	readonly status: "active" | "depleted" | "expired" | "cancelled";
	readonly note?: string;
	readonly noteRu?: string;
}

export interface GiftCertificateRedemptionResult {
	readonly success: boolean;
	readonly certificateId: string;
	readonly serialNumber: string;
	readonly previousBalanceKop: number;
	readonly redeemedAmountKop: number;
	readonly newBalanceKop: number;
	readonly coveredInvoiceAmountKop: number;
	readonly remainingInvoiceAmountKop: number;
	readonly newStatus: "active" | "depleted" | "expired" | "cancelled";
	readonly errorMessageRu?: string;
}

/**
 * Generates a 16-digit gift certificate serial number with Luhn check digit
 * Format: 7701-XXXX-XXXX-XXXC (7701 is Moscow Dental Clinic prefix)
 */
export function generateGiftCertificateSerial(randomSeed?: number): string {
	const prefix = "7701";
	let digits = prefix;

	let cryptoBytes: Uint8Array | null = null;
	if (randomSeed === undefined && typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		cryptoBytes = new Uint8Array(11);
		crypto.getRandomValues(cryptoBytes);
	}

	for (let i = 0; i < 11; i++) {
		const rand =
			randomSeed !== undefined
				? (randomSeed * (i + 1) * 7) % 10
				: cryptoBytes
				? cryptoBytes[i]! % 10
				: Math.abs(((Date.now() + i * 17) ^ (i * 31)) % 10);
		digits += rand.toString();
	}

	// Compute Luhn checksum digit
	let sum = 0;
	for (let i = 0; i < 15; i++) {
		let d = parseInt(digits[i]!, 10);
		if (i % 2 === 0) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	const checkDigit = (10 - (sum % 10)) % 10;
	digits += checkDigit.toString();

	// Format into 4-4-4-4
	return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

/**
 * Validates 16-digit gift certificate serial number using Luhn algorithm
 */
export function validateGiftCertificateSerial(formattedSerial: string): boolean {
	const cleaned = formattedSerial.replace(/[\s-]/g, "");
	if (!/^\d{16}$/.test(cleaned)) {
		return false;
	}

	let sum = 0;
	for (let i = 0; i < 16; i++) {
		let d = parseInt(cleaned[i]!, 10);
		if (i % 2 === 0) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	return sum % 10 === 0;
}

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
