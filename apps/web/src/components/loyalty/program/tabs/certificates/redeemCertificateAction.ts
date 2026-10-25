import {
	redeemGiftCertificate,
	validateGiftCertificateSerial,
	type GiftCertificate,
} from "../../loyaltyEngine";
import { denteAdminSecretRequestHeaders } from "../../../../../lib/denteRequestHeaders";

export interface RedeemCertificateActionParams {
	readonly certVerifyInput: string;
	readonly invoiceAmountRub: number;
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly activeCertificate: GiftCertificate | null;
}

export interface RedeemCertificateActionResult {
	readonly isSuccess: boolean;
	readonly message: string;
	readonly updatedCertificate?: GiftCertificate | null;
}

export async function redeemCertificateAction({
	certVerifyInput,
	invoiceAmountRub,
	patientId,
	patientName,
	activeCertificate,
}: RedeemCertificateActionParams): Promise<RedeemCertificateActionResult> {
	if (!validateGiftCertificateSerial(certVerifyInput)) {
		return {
			isSuccess: false,
			message: "Неверный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
		};
	}

	try {
		const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
		const res = await fetch("/api/loyalty/certificates/redeem", {
			method: "POST",
			headers,
			body: JSON.stringify({
				serialNumber: certVerifyInput,
				invoiceAmountRub,
				patientId: patientId || undefined,
			}),
		});

		if (res.ok) {
			const data = await res.json();
			if (data.success) {
				const updatedCert: GiftCertificate = activeCertificate
					? {
							...activeCertificate,
							currentBalanceKop: Math.round(data.newBalanceRub * 100),
							currentBalanceRub: data.newBalanceRub,
							status: data.status,
						}
					: {
							id: data.certificateId,
							serialNumber: data.serialNumber,
							initialBalanceKop: Math.round(data.previousBalanceRub * 100),
							currentBalanceKop: Math.round(data.newBalanceRub * 100),
							initialBalanceRub: data.previousBalanceRub,
							currentBalanceRub: data.newBalanceRub,
							status: data.status,
							issuedAtIso: new Date().toISOString().slice(0, 10),
							expiresAtIso: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
							buyerPatientName: patientName,
						};
				return {
					isSuccess: true,
					message: `Успешно списано ${data.redeemedAmountRub.toLocaleString("ru-RU")} ₽ (тег 1215: зачёт аванса). Остаток: ${data.newBalanceRub.toLocaleString("ru-RU")} ₽`,
					updatedCertificate: updatedCert,
				};
			}
		}
	} catch (err) {
		console.warn("[Loyalty] API redemption error, falling back to local calculation:", err);
	}

	// Offline local calculation
	if (!activeCertificate) {
		return { isSuccess: false, message: "Нет активного сертификата для списания" };
	}
	const localRes = redeemGiftCertificate(activeCertificate, Math.round(invoiceAmountRub * 100));
	if (localRes.success) {
		const updatedCert: GiftCertificate = {
			...activeCertificate,
			currentBalanceKop: localRes.newBalanceKop,
			status: localRes.newStatus,
		};
		return {
			isSuccess: true,
			message: `Успешно списано ${(localRes.redeemedAmountKop / 100).toLocaleString("ru-RU")} ₽ с сертификата. Остаток: ${(localRes.newBalanceKop / 100).toLocaleString("ru-RU")} ₽`,
			updatedCertificate: updatedCert,
		};
	}
	return { isSuccess: false, message: `Ошибка: ${localRes.errorMessageRu}` };
}
