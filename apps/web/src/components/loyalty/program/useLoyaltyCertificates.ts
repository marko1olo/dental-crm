import { useState } from "react";
import type { GiftCertificate } from "./loyaltyEngine";
import { issueCertificateAction } from "./tabs/certificates/issueCertificateAction";
import { redeemCertificateAction } from "./tabs/certificates/redeemCertificateAction";

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
		setIsLoading(true);
		try {
			const { certificate, isOnline } = await issueCertificateAction({
				patientId,
				patientName,
				recipientName,
				certificateNominalRub,
			});
			setActiveCertificate(certificate);
			setCertVerifyInput(certificate.serialNumber);
			setCertRedeemFeedback({
				isSuccess: true,
				message: `${isOnline ? "Выпущен в базе данных" : "Выпущен новый"} сертификат ${certificate.serialNumber} на ${certificateNominalRub.toLocaleString("ru-RU")} ₽`,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerifyAndRedeemCert = async () => {
		if (!certVerifyInput) return;
		setIsLoading(true);
		try {
			const result = await redeemCertificateAction({
				certVerifyInput,
				invoiceAmountRub,
				patientId,
				patientName,
				activeCertificate,
			});
			if (result.updatedCertificate) {
				setActiveCertificate(result.updatedCertificate);
			}
			setCertRedeemFeedback({
				isSuccess: result.isSuccess,
				message: result.message,
			});
		} finally {
			setIsLoading(false);
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
