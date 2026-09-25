import { useState } from "react";
import {
	generateGiftCertificateSerial,
	redeemGiftCertificate,
	validateGiftCertificateSerial,
	type GiftCertificate,
} from "./loyaltyEngine";

export interface UseLoyaltyCertificatesProps {
	readonly patientName: string;
	readonly invoiceAmountRub: number;
}

export function useLoyaltyCertificates({
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

	const handleGenerateNewCertificate = () => {
		const newSerial = generateGiftCertificateSerial();
		const nominalKop = Math.round(certificateNominalRub * 100);
		const targetRecipient = recipientName.trim() || patientName;
		const cert: GiftCertificate = {
			id: `cert-${Date.now()}`,
			serialNumber: newSerial,
			nominalKop,
			initialBalanceKop: nominalKop,
			currentBalanceKop: nominalKop,
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
			message: `Выпущен новый сертификат ${newSerial} на ${certificateNominalRub} ₽`,
		});
	};

	const handleVerifyAndRedeemCert = () => {
		if (!certVerifyInput) return;
		const isCodeValid = validateGiftCertificateSerial(certVerifyInput);
		if (!isCodeValid) {
			setCertRedeemFeedback({
				isSuccess: false,
				message: "Неверный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
			});
			return;
		}
		if (!activeCertificate) {
			setCertRedeemFeedback({
				isSuccess: false,
				message: "Нет активного сертификата для списания",
			});
			return;
		}
		const res = redeemGiftCertificate(
			activeCertificate,
			Math.round(invoiceAmountRub * 100)
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
				message: `Успешно списано ${(res.redeemedAmountKop / 100).toLocaleString("ru-RU")} ₽ с сертификата. Остаток на карте: ${(res.newBalanceKop / 100).toLocaleString("ru-RU")} ₽`,
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
		handleGenerateNewCertificate,
		handleVerifyAndRedeemCert,
	};
}
