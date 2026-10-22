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
		if (!validateCertificateWindow(certToUse, "Сертификат")) return;
		setIsSigning(true);
		try {
			const xmlToSign = canonicalizeCdaXml(generatedXml);
			const { signatureBase64 } = await signatureService.signData(certToUse.thumbprint, xmlToSign, undefined, certToUse.deviceId);
			const docSig = buildGostSignatureInfo(certToUse, signatureBase64);
			const orgSig = buildGostSignatureInfo(certToUse, signatureBase64, clinic.clinicName || certToUse.name);
			setDoctorSig(docSig);
			setMoSig(orgSig);
			showToast(`Документ подписан сразу за врача и клинику (УКЭП ${docSig.certificateSerialNumber})`, "success");
		} catch (err: unknown) {
			const parsed = parseCryptoProError(err);
			showToast(`Ошибка при совмещенном подписании УКЭП: ${parsed.userMessage}`, "error");
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
