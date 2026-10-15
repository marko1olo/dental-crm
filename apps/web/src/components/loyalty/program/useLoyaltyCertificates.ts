import { useState } from "react";
import {
	generateGiftCertificateSerial,
	redeemGiftCertificate,
	validateGiftCertificateSerial,
	type GiftCertificate,
} from "./loyaltyEngine";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export interface UseLoyaltyCertificatesProps {
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly invoiceAmountRub: number;
}

export function useLoyaltyCertificates({
	patientId,
	patientName,
	invoiceAmountRub,
}: UseLoyaltyCertificatesProps) {
	const [certificateNominalRub, setCertificateNominalRub] = useState<number>(5000);
	const [recipientName, setRecipientName] = useState<string>("");
	const [activeCertificate, setActiveCertificate] = useState<GiftCertificate | null>(null);
	const [certVerifyInput, setCertVerifyInput] = useState<string>("");
	const [certRedeemFeedback, setCertRedeemFeedback] = useState<{
		isSuccess: boolean;
		message: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const handleGenerateNewCertificate = async () => {
		const targetRecipient = recipientName.trim() || patientName;
		const nominalKop = Math.round(certificateNominalRub * 100);
		setIsLoading(true);

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
					setActiveCertificate(cert);
					setCertVerifyInput(cert.serialNumber);
					setCertRedeemFeedback({
						isSuccess: true,
						message: `Выпущен в базе данных сертификат ${cert.serialNumber} на ${certificateNominalRub.toLocaleString("ru-RU")} ₽`,
					});
					return;
				}
			}
		} catch (err) {
			console.warn("[Loyalty] API issue error, falling back to offline generation:", err);
		} finally {
			setIsLoading(false);
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
		setActiveCertificate(cert);
		setCertVerifyInput(newSerial);
		setCertRedeemFeedback({
			isSuccess: true,
			message: `Выпущен новый сертификат ${newSerial} на ${certificateNominalRub.toLocaleString("ru-RU")} ₽`,
		});
	};

	const handleVerifyAndRedeemCert = async () => {
		if (!certVerifyInput) return;
		const isCodeValid = validateGiftCertificateSerial(certVerifyInput);
		if (!isCodeValid) {
			setCertRedeemFeedback({
				isSuccess: false,
				message: "Неверный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
			});
			return;
		}

		setIsLoading(true);
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			});
			const res = await fetch("/api/loyalty/certificates/redeem", {
				method: "POST",
				headers,
				body: JSON.stringify({
					serialNumber: certVerifyInput,
					invoiceAmountRub,
					patientId: patientId || undefined,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					setActiveCertificate((prev) =>
						prev
							? {
									...prev,
									currentBalanceKop: Math.round(data.newBalanceRub * 100),
									currentBalanceRub: data.newBalanceRub,
									status: data.status,
								}
							: {
									id: data.certificateId,
									serialNumber: data.serialNumber,
									initialBalanceKop: Math.round(data.previousBalanceRub * 100),
									currentBalanceKop: Math.round(data.newBalanceRub * 100),
									initialBalanceRub: data.previousBalanceRub,
									currentBalanceRub: data.newBalanceRub,
									status: data.status,
									issuedAtIso: new Date().toISOString().slice(0, 10),
									expiresAtIso: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
									buyerPatientName: patientName,
								},
					);
					setCertRedeemFeedback({
						isSuccess: true,
						message: `Успешно списано ${data.redeemedAmountRub.toLocaleString("ru-RU")} ₽ (тег 1215: зачёт аванса). Остаток: ${data.newBalanceRub.toLocaleString("ru-RU")} ₽`,
					});
					return;
				}
			} else {
				const errData = await res.json().catch(() => null);
				if (errData?.message) {
					setCertRedeemFeedback({
						isSuccess: false,
						message: `Ошибка: ${errData.message}`,
					});
					return;
				}
			}
		} catch (err) {
			console.warn("[Loyalty] API redemption error, falling back to local calculation:", err);
		} finally {
			setIsLoading(false);
		}

		// Fallback to local calculation if offline
		if (!activeCertificate) {
			setCertRedeemFeedback({
				isSuccess: false,
				message: "Нет активного сертификата для списания",
			});
			return;
		}
		const res = redeemGiftCertificate(
			activeCertificate,
			Math.round(invoiceAmountRub * 100),
		);
		if (res.success) {
			setActiveCertificate((prev) =>
				prev
					? {
							...prev,
							currentBalanceKop: res.newBalanceKop,
							status: res.newStatus,
						}
					: null,
			);
			setCertRedeemFeedback({
				isSuccess: true,
				message: `Успешно списано ${(res.redeemedAmountKop / 100).toLocaleString("ru-RU")} ₽ с сертификата. Остаток: ${(res.newBalanceKop / 100).toLocaleString("ru-RU")} ₽`,
			});
		} else {
			setCertRedeemFeedback({
				isSuccess: false,
				message: `Ошибка: ${res.errorMessageRu}`,
			});
		}
	};

	return {
		certificateNominalRub,
		setCertificateNominalRub,
		recipientName,
		setRecipientName,
		activeCertificate,
		setActiveCertificate,
		certVerifyInput,
		setCertVerifyInput,
		certRedeemFeedback,
		setCertRedeemFeedback,
		isLoading,
		handleGenerateNewCertificate,
		handleVerifyAndRedeemCert,
	};
}
