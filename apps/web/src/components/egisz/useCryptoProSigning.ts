/**
 * useCryptoProSigning.ts — Electronic Digital Signature (УКЭП) Hook using CryptoPro CSP.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./cryptoPro/
 */

import { useState } from "react";
import { showToast } from "../GlobalToast";
import { signatureService } from "../../lib/cryptopro";
import { parseCryptoProError } from "../../utils/cryptoPro";
import { canonicalizeCdaXml, type GostSignatureInfo } from "./egiszRemdEngine";
import type { UseCryptoProSigningProps, UseCryptoProSigningReturn } from "./cryptoPro/cryptoProTypes";
import { parseDetachedSigFile } from "./cryptoPro/detachedSigParser";
import { buildGostSignatureInfo, validateCertificateWindow } from "./cryptoPro/certValidator";
import { useCertList } from "./cryptoPro/useCertList";

export type { UseCryptoProSigningProps, UseCryptoProSigningReturn } from "./cryptoPro/cryptoProTypes";

export function useCryptoProSigning({
	initialDoctorSig,
	initialMoSig,
	generatedXml,
	doctor,
	clinic,
}: UseCryptoProSigningProps): UseCryptoProSigningReturn {
	const [doctorSig, setDoctorSig] = useState<GostSignatureInfo | undefined>(initialDoctorSig);
	const [moSig, setMoSig] = useState<GostSignatureInfo | undefined>(initialMoSig);
	const [isSigning, setIsSigning] = useState<boolean>(false);
	const { selectedCert, setSelectedCert, availableCerts, isCheckingCerts, refreshCerts } = useCertList();

	const handleUploadDetachedSig = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const sig = await parseDetachedSigFile(file, doctor.doctorFullName || "Врач (открепленная подпись)", false);
		if (sig) setDoctorSig(sig);
	};

	const handleUploadDetachedMoSig = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const sig = await parseDetachedSigFile(file, clinic.clinicName || "Медицинская организация", true);
		if (sig) setMoSig(sig);
	};

	const executeSignature = async (label: string, onSignSuccess: (sig: GostSignatureInfo) => void, subjectOverride?: string) => {
		const certToUse = selectedCert || availableCerts[0];
		if (!certToUse) {
			showToast("Плагин КриптоПро CSP не установлен / Сертификат не выбран. Подключите токен или загрузите .sig / .p7s", "error");
			return;
		}
		if (!validateCertificateWindow(certToUse, label)) return;
		setIsSigning(true);
		try {
			const xmlToSign = canonicalizeCdaXml(generatedXml);
			const { signatureBase64 } = await signatureService.signData(certToUse.thumbprint, xmlToSign, undefined, certToUse.deviceId);
			const newSig = buildGostSignatureInfo(certToUse, signatureBase64, subjectOverride);
			onSignSuccess(newSig);
			showToast(`Документ успешно подписан УКЭП (${newSig.certificateSerialNumber})`, "success");
		} catch (err: unknown) {
			const parsed = parseCryptoProError(err);
			showToast(`Ошибка при наложении электронной подписи: ${parsed.userMessage}`, "error");
		} finally {
			setIsSigning(false);
		}
	};

	const handleSignDocument = () => executeSignature("Сертификат врача", (s) => setDoctorSig(s));
	const handleSignMoDocument = () => executeSignature("Сертификат организации", (s) => setMoSig(s), clinic.clinicName);

	const handleSignBothInOneClick = async () => {
		const certToUse = selectedCert || availableCerts[0];
		if (!certToUse) {
			showToast("Плагин КриптоПро CSP не установлен / Сертификат не выбран. Подключите токен или загрузите .sig / .p7s", "error");
			return;
		}
		if (!validateCertificateWindow(certToUse, "Сертификат врача")) return;

		// Check if a distinct clinic / MO certificate exists in the keystore
		const moCert = availableCerts.find(
			(c) => c.thumbprint !== certToUse.thumbprint &&
				(c.name?.toLowerCase().includes("клиник") || c.name?.toLowerCase().includes("ооо") || c.name?.toLowerCase().includes("ао") || c.issuer?.toLowerCase().includes("ооо")),
		);

		setIsSigning(true);
		try {
			const xmlToSign = canonicalizeCdaXml(generatedXml);
			const { signatureBase64: docSigBase64 } = await signatureService.signData(certToUse.thumbprint, xmlToSign, undefined, certToUse.deviceId);
			const docSig = buildGostSignatureInfo(certToUse, docSigBase64);
			setDoctorSig(docSig);

			if (moCert && validateCertificateWindow(moCert, "Сертификат клиники")) {
				const { signatureBase64: moSigBase64 } = await signatureService.signData(moCert.thumbprint, xmlToSign, undefined, moCert.deviceId);
				const orgSig = buildGostSignatureInfo(moCert, moSigBase64, clinic.clinicName || moCert.name);
				setMoSig(orgSig);
				showToast("Документ успешно подписан УКЭП врача и УКЭП клиники", "success");
			} else {
				showToast("Документ подписан УКЭП врача. Сертификат клиники (МО) не обнаружен — требуется отдельная подпись клиники.", "info");
			}
		} catch (err: unknown) {
			const parsed = parseCryptoProError(err);
			showToast(`Ошибка при подписании УКЭП: ${parsed.userMessage}`, "error");
		} finally {
			setIsSigning(false);
		}
	};

	return {
		doctorSig, setDoctorSig, moSig, setMoSig, selectedCert, setSelectedCert, availableCerts,
		isSigning, isCheckingCerts, refreshCerts, handleUploadDetachedSig, handleUploadDetachedMoSig,
		handleSignDocument, handleSignMoDocument, handleSignBothInOneClick,
	};
}
