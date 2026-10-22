/**
 * certValidator.ts — Certificate validity window check and GostSignatureInfo builder.
 * Mandate 8b compliant (<= 120 lines).
 */

import { GOST_CRYPTO_OIDS } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import type { CertificateInfo } from "../../../lib/cryptopro";
import type { GostSignatureInfo } from "../egiszRemdEngine";

export function validateCertificateWindow(certToUse: CertificateInfo, label: string): boolean {
	const now = Date.now();
	const validToTime = new Date(certToUse.validTo).getTime();
	const validFromTime = new Date(certToUse.validFrom).getTime();
	if (!Number.isNaN(validToTime) && validToTime < now) {
		showToast(
			`${label} «${certToUse.name}» просрочен (${new Date(certToUse.validTo).toLocaleDateString("ru-RU")}). Подписание отклонено`,
			"error",
		);
		return false;
	}
	if (!Number.isNaN(validFromTime) && validFromTime > now) {
		showToast(
			`${label} «${certToUse.name}» еще не вступил в силу (действителен с ${new Date(certToUse.validFrom).toLocaleDateString("ru-RU")})`,
			"error",
		);
		return false;
	}
	return true;
}

export function buildGostSignatureInfo(
	certToUse: CertificateInfo,
	signatureBase64: string,
	subjectOverride?: string,
): GostSignatureInfo {
	return {
		signatureBase64,
		certificateSerialNumber: (certToUse.serialNumber || certToUse.thumbprint.slice(0, 16)).toUpperCase(),
		certificateSubject: subjectOverride || certToUse.name,
		certificateIssuer: certToUse.issuer,
		validFrom: certToUse.validFrom,
		validTo: certToUse.validTo,
		signedAt: new Date().toISOString(),
		algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: GOST_CRYPTO_OIDS.GOST_3411_2012_256,
		signatureValueHex: certToUse.thumbprint.toUpperCase(),
	};
}
