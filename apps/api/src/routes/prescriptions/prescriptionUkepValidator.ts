import {
	extractGostCmsMetadata,
	validateCertificateStatus,
	validateGostCmsPkcs7Signature,
} from "@dental/shared";
import type { z } from "zod";
import type { signUkepBodySchema } from "./prescriptionSchemas.js";

type SignUkepBody = z.infer<typeof signUkepBodySchema>;

export interface UkepValidationResult {
	readonly valid: boolean;
	readonly statusCode?: number;
	readonly error?: string;
	readonly errorCode?: string;
	readonly message?: string;
	readonly meta?: {
		readonly certificateSerialNumber: string;
		readonly certificateThumbprint?: string;
		readonly certificateIssuer: string;
		readonly certificateValidFrom: string;
		readonly certificateValidTo?: string;
		readonly doctorSnils?: string;
		readonly signatureAlgorithm: string;
		readonly egiszDocumentId?: string;
		readonly signedAt: string;
	};
}

export function validateUkepSignaturePayload(data: SignUkepBody): UkepValidationResult {
	const sigValidation = validateGostCmsPkcs7Signature(data.pkcs7Signature);
	if (!sigValidation.valid) {
		return {
			valid: false,
			statusCode: 400,
			error: "SignatureVerificationFailed",
			errorCode: sigValidation.errorCode ?? "SignatureVerificationFailed",
			message: `Предоставленная подпись не является корректной отсоединенной подписью CMS (PKCS#7) по ГОСТ Р 34.10-2012. ${sigValidation.error}`,
		};
	}

	const certStatus = validateCertificateStatus({
		validFrom: data.certificateValidFrom,
		validTo: data.certificateValidTo,
		signedAt: new Date().toISOString(),
		certificateSerialNumber: data.certificateSerialNumber,
	});
	if (!certStatus.valid) {
		return {
			valid: false,
			statusCode: 400,
			error: certStatus.errorCode ?? "InvalidCertificateStatus",
			message: certStatus.error,
		};
	}

	let certSerial = data.certificateSerialNumber;
	let certValidFrom = data.certificateValidFrom;
	let certValidTo = data.certificateValidTo;

	if (!certSerial) {
		try {
			const derBuffer = Buffer.from(data.pkcs7Signature, "base64");
			const meta = extractGostCmsMetadata(derBuffer);
			if (meta.certificateSerialNumber) certSerial = meta.certificateSerialNumber;
			if (!certValidFrom && meta.validFromIso) certValidFrom = meta.validFromIso;
			if (!certValidTo && meta.validToIso) certValidTo = meta.validToIso;
		} catch {
			// DER parsing fallback
		}
	}

	if (!certSerial) {
		return {
			valid: false,
			statusCode: 400,
			error: "MissingCertificateSerialNumber",
			message: "Не удалось определить серийный номер сертификата врача из подписи PKCS#7. Передайте certificateSerialNumber явно или используйте валидный контейнер CAdES.",
		};
	}

	return {
		valid: true,
		meta: {
			certificateSerialNumber: certSerial,
			certificateThumbprint: data.certificateThumbprint,
			certificateIssuer: data.certificateIssuer || "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			certificateValidFrom: certValidFrom || new Date().toISOString(),
			certificateValidTo: certValidTo,
			doctorSnils: data.doctorSnils,
			signatureAlgorithm: data.signatureAlgorithm || "ГОСТ Р 34.10-2012 (256 бит)",
			egiszDocumentId: data.egiszDocumentId,
			signedAt: new Date().toISOString(),
		},
	};
}
