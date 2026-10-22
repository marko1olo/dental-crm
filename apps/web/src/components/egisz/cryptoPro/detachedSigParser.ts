/**
 * detachedSigParser.ts — ASN.1 DER CMS PKCS#7 detached signature file validator and loader.
 * Mandate 8b compliant (<= 120 lines).
 */

import { GOST_CRYPTO_OIDS, validateGostCmsPkcs7Signature } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import type { GostSignatureInfo } from "../egiszRemdEngine";

export async function parseDetachedSigFile(
	file: File,
	subjectName: string,
	isMo: boolean,
): Promise<GostSignatureInfo | null> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => {
			const buf = reader.result as ArrayBuffer;
			const bytes = new Uint8Array(buf);
			const label = isMo ? "МО" : "врача";
			if (bytes.byteLength < 64 || bytes[0] !== 0x30) {
				showToast(
					`Файл «${file.name}» не является корректной бинарной подписью CMS/PKCS#7 ${label} (ASN.1 SEQUENCE). Загрузите файл .sig или .p7s по стандарту ГОСТ Р 34.10-2012.`,
					"error",
					7000,
				);
				return resolve(null);
			}
			let binary = "";
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]!);
			}
			const base64 = btoa(binary);
			const cmsCheck = validateGostCmsPkcs7Signature(base64);
			if (!cmsCheck.valid) {
				showToast(
					`Файл «${file.name}» отклонён верификатором CMS/PKCS#7 ${label}: ${cmsCheck.error || "Ошибка структуры подписи"}`,
					"error",
					7000,
				);
				return resolve(null);
			}

			const serialPrefix = isMo ? "MO-SIG" : "DETACHED";
			const issuer = isMo ? "Открепленная подпись организации (.sig / .p7s)" : "Открепленная подпись (.sig / .p7s)";
			const sigInfo: GostSignatureInfo = {
				signatureBase64: base64,
				certificateSerialNumber: `${serialPrefix}-${file.name.slice(0, 14)}`,
				certificateSubject: subjectName,
				certificateIssuer: issuer,
				signedAt: new Date().toISOString(),
				algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
				digestAlgorithmOid: GOST_CRYPTO_OIDS.GOST_3411_2012_256,
				signatureValueHex: file.name,
			};
			showToast(`Открепленная УКЭП ${label} загружена: ${file.name}`, "success");
			resolve(sigInfo);
		};
		reader.onerror = () => {
			showToast(`Ошибка чтения файла: ${file.name}`, "error");
			resolve(null);
		};
		reader.readAsArrayBuffer(file);
	});
}
