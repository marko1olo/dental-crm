/**
 * useCryptoProSigning.ts
 *
 * Electronic Digital Signature (УКЭП) Hook using CryptoPro CSP & Detached Signatures.
 * Order 947n and Federal Law No. 63-FZ.
 */

import { useCallback, useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	type CertificateInfo,
	signatureService,
} from "../../lib/cryptopro";
import { parseCryptoProError } from "../../utils/cryptoPro";
import {
	type EgiszClinicInfo,
	type EgiszDoctorInfo,
	type GostSignatureInfo,
	canonicalizeCdaXml,
} from "./egiszRemdEngine";

export interface UseCryptoProSigningProps {
	readonly initialDoctorSig?: GostSignatureInfo | undefined;
	readonly initialMoSig?: GostSignatureInfo | undefined;
	readonly generatedXml: string;
	readonly doctor: EgiszDoctorInfo;
	readonly clinic: EgiszClinicInfo;
}

export function useCryptoProSigning({
	initialDoctorSig,
	initialMoSig,
	generatedXml,
	doctor,
	clinic,
}: UseCryptoProSigningProps) {
	const [doctorSig, setDoctorSig] = useState<GostSignatureInfo | undefined>(initialDoctorSig);
	const [moSig, setMoSig] = useState<GostSignatureInfo | undefined>(initialMoSig);
	const [selectedCert, setSelectedCert] = useState<CertificateInfo | null>(null);
	const [availableCerts, setAvailableCerts] = useState<CertificateInfo[]>([]);
	const [isSigning, setIsSigning] = useState<boolean>(false);
	const [isCheckingCerts, setIsCheckingCerts] = useState<boolean>(false);

	const refreshCerts = useCallback(async () => {
		setIsCheckingCerts(true);
		try {
			const certs = await signatureService.getCertificates();
			setAvailableCerts(certs);
			if (certs.length > 0 && !selectedCert) {
				setSelectedCert(certs[0] || null);
			}
		} catch (e) {
			setAvailableCerts([]);
			const parsed = parseCryptoProError(e);
			showToast(`КриптоПро CSP: ${parsed.userMessage}`, "warning");
		} finally {
			setIsCheckingCerts(false);
		}
	}, [selectedCert]);

	useEffect(() => {
		refreshCerts();
	}, [refreshCerts]);

	const handleUploadDetachedSig = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const buf = reader.result as ArrayBuffer;
			const bytes = new Uint8Array(buf);
			let binary = "";
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]!);
			}
			const base64 = btoa(binary);
			const sigInfo: GostSignatureInfo = {
				signatureBase64: base64,
				certificateSerialNumber: `DETACHED-${file.name.slice(0, 16)}`,
				certificateSubject: doctor.doctorFullName || "Врач (открепленная подпись)",
				certificateIssuer: "Открепленная подпись (.sig / .p7s)",
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
				signatureValueHex: file.name,
			};
			setDoctorSig(sigInfo);
			showToast(`Открепленная УКЭП врача загружена: ${file.name}`, "success");
		};
		reader.readAsArrayBuffer(file);
	};

	const handleUploadDetachedMoSig = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const buf = reader.result as ArrayBuffer;
			const bytes = new Uint8Array(buf);
			let binary = "";
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]!);
			}
			const base64 = btoa(binary);
			const sigInfo: GostSignatureInfo = {
				signatureBase64: base64,
				certificateSerialNumber: `MO-SIG-${file.name.slice(0, 14)}`,
				certificateSubject: clinic.clinicName || "Медицинская организация (открепленная подпись)",
				certificateIssuer: "Открепленная подпись организации (.sig / .p7s)",
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
				signatureValueHex: file.name,
			};
			setMoSig(sigInfo);
			showToast(`Открепленная УКЭП организации загружена: ${file.name}`, "success");
		};
		reader.readAsArrayBuffer(file);
	};

	const handleSignDocument = async () => {
		const certToUse = selectedCert || availableCerts[0];
		if (!certToUse) {
			showToast(
				"Плагин КриптоПро CSP не установлен / Сертификат не выбран. Установите плагин или загрузите открепленный файл .sig / .p7s",
				"error",
			);
			return;
		}

		const now = Date.now();
		const validToTime = new Date(certToUse.validTo).getTime();
		const validFromTime = new Date(certToUse.validFrom).getTime();
		if (!Number.isNaN(validToTime) && validToTime < now) {
			showToast(
				`Сертификат «${certToUse.name}» просрочен (${new Date(certToUse.validTo).toLocaleDateString("ru-RU")}). Подписание отклонено`,
				"error",
			);
			return;
		}
		if (!Number.isNaN(validFromTime) && validFromTime > now) {
			showToast(
				`Сертификат «${certToUse.name}» еще не вступил в силу (действителен с ${new Date(certToUse.validFrom).toLocaleDateString("ru-RU")})`,
				"error",
			);
			return;
		}

		setIsSigning(true);
		try {
			const xmlToSign = canonicalizeCdaXml(generatedXml);
			const { signatureBase64 } = await signatureService.signData(
				certToUse.thumbprint,
				xmlToSign,
				undefined,
				certToUse.deviceId,
			);

			const newDocSig: GostSignatureInfo = {
				signatureBase64,
				certificateSerialNumber: certToUse.thumbprint.slice(0, 16).toUpperCase(),
				certificateSubject: certToUse.name,
				certificateIssuer: certToUse.issuer,
				validFrom: certToUse.validFrom,
				validTo: certToUse.validTo,
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
				signatureValueHex: certToUse.thumbprint.toUpperCase(),
			};

			setDoctorSig(newDocSig);
			showToast(`Документ успешно подписан УКЭП (${newDocSig.certificateSerialNumber})`, "success");
		} catch (err: unknown) {
			const parsed = parseCryptoProError(err);
			showToast(`Ошибка при наложении электронной подписи: ${parsed.userMessage}`, "error");
		} finally {
			setIsSigning(false);
		}
	};

	const handleSignMoDocument = async () => {
		const certToUse = selectedCert || availableCerts[0];
		if (!certToUse) {
			showToast(
				"Плагин КриптоПро CSP не установлен / Сертификат не выбран. Выберите сертификат или загрузите открепленный файл .sig / .p7s",
				"error",
			);
			return;
		}

		const now = Date.now();
		const validToTime = new Date(certToUse.validTo).getTime();
		const validFromTime = new Date(certToUse.validFrom).getTime();
		if (!Number.isNaN(validToTime) && validToTime < now) {
			showToast(
				`Сертификат организации «${certToUse.name}» просрочен (${new Date(certToUse.validTo).toLocaleDateString("ru-RU")}). Подписание отклонено`,
				"error",
			);
			return;
		}
		if (!Number.isNaN(validFromTime) && validFromTime > now) {
			showToast(
				`Сертификат организации «${certToUse.name}» еще не вступил в силу (действителен с ${new Date(certToUse.validFrom).toLocaleDateString("ru-RU")})`,
				"error",
			);
			return;
		}

		setIsSigning(true);
		try {
			const xmlToSign = canonicalizeCdaXml(generatedXml);
			const { signatureBase64 } = await signatureService.signData(
				certToUse.thumbprint,
				xmlToSign,
				undefined,
				certToUse.deviceId,
			);

			const newMoSig: GostSignatureInfo = {
				signatureBase64,
				certificateSerialNumber: certToUse.thumbprint.slice(0, 16).toUpperCase(),
				certificateSubject: clinic.clinicName || certToUse.name,
				certificateIssuer: certToUse.issuer,
				validFrom: certToUse.validFrom,
				validTo: certToUse.validTo,
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
				signatureValueHex: certToUse.thumbprint.toUpperCase(),
			};

			setMoSig(newMoSig);
			showToast(`Документ успешно подписан УКЭП организации (${newMoSig.certificateSerialNumber})`, "success");
		} catch (err: unknown) {
			const parsed = parseCryptoProError(err);
			showToast(`Ошибка при наложении подписи организации: ${parsed.userMessage}`, "error");
		} finally {
			setIsSigning(false);
		}
	};

	return {
		doctorSig,
		setDoctorSig,
		moSig,
		setMoSig,
		selectedCert,
		setSelectedCert,
		availableCerts,
		isSigning,
		isCheckingCerts,
		refreshCerts,
		handleUploadDetachedSig,
		handleUploadDetachedMoSig,
		handleSignDocument,
		handleSignMoDocument,
	};
}
