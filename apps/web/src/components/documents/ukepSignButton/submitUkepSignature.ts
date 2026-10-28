import type { CryptoProCertificate } from "../../../utils/cryptoPro";

export async function submitUkepSignature(
	documentId: string,
	signature: string,
	selectedCert: CryptoProCertificate,
): Promise<Response> {
	return fetch(`/api/documents/${documentId}/sign-ukep`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
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
