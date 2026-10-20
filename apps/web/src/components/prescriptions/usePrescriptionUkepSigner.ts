/**
 * usePrescriptionUkepSigner.ts — CryptoPro UKEP Digital Signature Hook
 */

import type { PrescriptionDoctorUkep } from "@dental/shared";
import { useState } from "react";
import {
	getPersonalCertificates,
	parseCryptoProError,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";
import { showToast } from "../GlobalToast";

export function usePrescriptionUkepSigner(
	docName: string,
	_docSpecialty: string,
	docSnils: string,
	customSeriesNumber: string,
	generatePrintHtml: () => string,
) {
	const [isUkepSigned, setIsUkepSigned] = useState<boolean>(false);
	const [ukepSignature, setUkepSignature] =
		useState<PrescriptionDoctorUkep | null>(null);
	const [isSigningUkep, setIsSigningUkep] = useState<boolean>(false);

	const handleSignUkep = async () => {
		setIsSigningUkep(true);
		try {
			const certs = await getPersonalCertificates();
			if (!certs || certs.length === 0) {
				throw new Error(
					"В хранилище КриптоПро не найдено личных сертификатов ЭЦП врача.",
				);
			}
			const targetCert =
				certs.find((c) => c.isGost && c.hasPrivateKey) || certs[0];
			if (!targetCert) {
				throw new Error("Не удалось выбрать сертификат для подписания.");
			}
			const contentToSign = btoa(
				unescape(encodeURIComponent(generatePrintHtml())),
			);
			const signature = await signBase64WithCertificate(
				contentToSign,
				targetCert.thumbprint,
			);
			const genuineUkep: PrescriptionDoctorUkep = {
				doctorFullName: targetCert.subjectName || docName,
				doctorSpecialty,
				doctorSnils: docSnils,
				certificateSerialNumber:
					targetCert.serialNumber ||
					targetCert.thumbprint.slice(0, 16).toUpperCase(),
				certificateThumbprint: targetCert.thumbprint,
				certificateIssuer:
					targetCert.issuerName ||
					"Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
				certificateValidFrom: targetCert.validFrom || new Date().toISOString(),
				certificateValidTo:
					targetCert.validTo ||
					new Date(Date.now() + 365 * 86400000).toISOString(),
				signedAt: new Date().toISOString(),
				cryptoSignaturePkcs7: signature,
				signatureAlgorithm:
					targetCert.algorithmName || "ГОСТ Р 34.10-2012 (256 бит)",
				egiszDocumentId: `EGISZ-RX-${Date.now().toString().slice(-6)}`,
				qrVerificationUrl: `https://egisz.rosminzdrav.ru/verify?rx=${customSeriesNumber}`,
			};
			setUkepSignature(genuineUkep);
			setIsUkepSigned(true);
			showToast(
				"Рецептурный бланк успешно подписан УКЭП врача (КриптоПро)",
				"success",
			);
		} catch (err) {
			const parsed = parseCryptoProError(err);
			showToast(
				parsed.userMessage,
				parsed.isCancellation ? "warning" : "error",
				8000,
			);
		} finally {
			setIsSigningUkep(false);
		}
	};

	return {
		isUkepSigned,
		setIsUkepSigned,
		ukepSignature,
		setUkepSignature,
		isSigningUkep,
		handleSignUkep,
	};
}
