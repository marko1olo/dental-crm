import { generateGiftCertificateSerial, type GiftCertificate } from "../../loyaltyEngine";
import { denteAdminSecretRequestHeaders } from "../../../../../lib/denteRequestHeaders";

export interface IssueCertificateActionParams {
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly recipientName: string;
	readonly certificateNominalRub: number;
}

export async function issueCertificateAction({
	patientId,
	patientName,
	recipientName,
	certificateNominalRub,
}: IssueCertificateActionParams): Promise<{
	readonly certificate: GiftCertificate;
	readonly isOnline: boolean;
}> {
	const targetRecipient = recipientName.trim() || patientName;
	const nominalKop = Math.round(certificateNominalRub * 100);

	try {
		const headers = denteAdminSecretRequestHeaders({
			"Content-Type": "application/json",
		});
		const res = await fetch("/api/loyalty/certificates/issue", {
			method: "POST",
			headers,
			body: JSON.stringify({
				purchaserPatientId: patientId || undefined,
				purchaserName: patientName,
				recipientName: targetRecipient,
				nominalRub: certificateNominalRub,
			}),
		});

		if (res.ok) {
			const data = await res.json();
			if (data.success && data.certificate) {
				const cert: GiftCertificate = {
					id: data.certificate.id,
					serialNumber: data.certificate.serialNumber,
					nominalKop: data.certificate.nominalKop || nominalKop,
					initialBalanceKop: data.certificate.initialBalanceKop || nominalKop,
					currentBalanceKop: data.certificate.currentBalanceKop || nominalKop,
					initialBalanceRub: data.certificate.initialBalanceRub || certificateNominalRub,
					currentBalanceRub: data.certificate.currentBalanceRub || certificateNominalRub,
					status: data.certificate.status || "active",
					issuedAtIso: data.certificate.issuedAtIso?.slice(0, 10) || new Date().toISOString().slice(0, 10),
					expiresAtIso: data.certificate.expiresAtIso?.slice(0, 10) || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
					recipientName: data.certificate.recipientName || targetRecipient,
					buyerPatientName: data.certificate.purchaserName || patientName,
					note: data.certificate.notes || `Подарочный сертификат на сумму ${certificateNominalRub.toLocaleString("ru-RU")} ₽`,
				};
				return { certificate: cert, isOnline: true };
			}
		}
	} catch (err) {
		console.warn("[Loyalty] API issue error, falling back to offline generation:", err);
	}

	// Offline fallback (Mandate 8e: zero dead ends)
	const newSerial = generateGiftCertificateSerial();
	const cert: GiftCertificate = {
		id: `cert-${Date.now()}`,
		serialNumber: newSerial,
		nominalKop,
		initialBalanceKop: nominalKop,
		currentBalanceKop: nominalKop,
		initialBalanceRub: certificateNominalRub,
		currentBalanceRub: certificateNominalRub,
		status: "active",
		issuedAtIso: new Date().toISOString().slice(0, 10),
		expiresAtIso: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
		recipientName: targetRecipient,
		buyerPatientName: patientName,
		note: `Подарочный сертификат на сумму ${certificateNominalRub.toLocaleString("ru-RU")} ₽`,
	};
	return { certificate: cert, isOnline: false };
}
