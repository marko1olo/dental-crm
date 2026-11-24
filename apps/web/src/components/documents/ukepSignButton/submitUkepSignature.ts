import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import type { CryptoProCertificate } from "../../../utils/cryptoPro";

export async function submitUkepSignature(
	documentId: string,
	signature: string,
	selectedCert: CryptoProCertificate,
): Promise<Response> {
	return fetch(`/api/documents/${encodeURIComponent(documentId)}/sign-ukep`, {
		method: "POST",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": generateUuidV7(),
		}),
		body: JSON.stringify({
			pkcs7Signature: signature,
			certificateSerialNumber: selectedCert.serialNumber,
			certificateSubject: selectedCert.subjectName,
			validFrom: selectedCert.validFrom,
			validTo: selectedCert.validTo,
			signatureType: "ukep",
		}),
	});
}
