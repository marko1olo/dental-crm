import { useEffect, useState } from "react";
import type { DigitalSignatureAgreementData, TreatmentPlanTier } from "../types";
import { confirmSignatureApi, requestSmsCodeApi } from "./signatureApiHandlers";
import {
	PAPER_SIGNATURE_DATA_URL,
	QR_PEP_SIGNATURE_DATA_URL,
	SMS_PEP_SIGNATURE_DATA_URL,
	type TreatmentPlanSignMethod,
} from "./types";

export interface UseSignatureModalLogicParams {
	readonly tier: TreatmentPlanTier;
	readonly patientName: string;
	readonly patientId: string;
	readonly patientPhone?: string;
	readonly planId?: string;
	readonly initialSignMethod?: TreatmentPlanSignMethod;
	readonly doctorFullName?: string;
	readonly clinicName?: string;
	readonly onSignedSuccess: (agreement: DigitalSignatureAgreementData) => void;
}

export function useSignatureModalLogic({
	tier,
	patientName,
	patientId,
	patientPhone = "+7 (999) 000-00-00",
	planId,
	initialSignMethod = "paper",
	doctorFullName = "Лечащий врач стоматолог",
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	onSignedSuccess,
}: UseSignatureModalLogicParams) {
	const [signMethod, setSignMethod] = useState<TreatmentPlanSignMethod>(initialSignMethod);
	const [phone, setPhone] = useState<string>(patientPhone);
	const [smsCode, setSmsCode] = useState<string>("");
	const [smsSent, setSmsSent] = useState<boolean>(false);
	const [countdown, setCountdown] = useState<number>(0);
	const [isRequestingSms, setIsRequestingSms] = useState<boolean>(false);
	const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
	const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorText, setErrorText] = useState<string | null>(null);

	useEffect(() => {
		if (countdown <= 0) return;
		const timer = setInterval(() => setCountdown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
		return () => clearInterval(timer);
	}, [countdown]);

	const handleRequestSmsCode = async () => {
		if (countdown > 0 || isRequestingSms) return;
		setIsRequestingSms(true);
		setErrorText(null);
		const err = await requestSmsCodeApi(planId, phone, patientName);
		if (err) setErrorText(err);
		setSmsSent(true);
		setCountdown(60);
		setIsRequestingSms(false);
	};

	const handleConfirmAgreement = async (forcedSignature?: string) => {
		if (isSubmitting) return;
		if (!termsAccepted) setTermsAccepted(true);
		setErrorText(null);
		setIsSubmitting(true);

		let effectiveSignature = forcedSignature || signatureBase64;
		if (!effectiveSignature) {
			effectiveSignature = signMethod === "sms" ? SMS_PEP_SIGNATURE_DATA_URL : signMethod === "qr" ? QR_PEP_SIGNATURE_DATA_URL : PAPER_SIGNATURE_DATA_URL;
		}

		await confirmSignatureApi(planId, signMethod, smsCode, phone, patientName, effectiveSignature);

		onSignedSuccess({
			patientId,
			patientName,
			planTierId: tier.tierId,
			planTitle: tier.title,
			totalAmountRub: tier.totalRub,
			signatureBase64: effectiveSignature,
			agreedAtIso: new Date().toISOString(),
			doctorFullName,
			clinicName,
			termsAccepted: true,
		});
		setIsSubmitting(false);
	};

	const handlePaperConfirm = () => {
		if (isSubmitting) return;
		setTermsAccepted(true);
		setSignatureBase64(PAPER_SIGNATURE_DATA_URL);
		setErrorText(null);
		handleConfirmAgreement(PAPER_SIGNATURE_DATA_URL);
	};

	return {
		signMethod,
		setSignMethod,
		phone,
		setPhone,
		smsCode,
		setSmsCode,
		smsSent,
		countdown,
		isRequestingSms,
		termsAccepted,
		setTermsAccepted,
		signatureBase64,
		isSubmitting,
		errorText,
		setErrorText,
		handleRequestSmsCode,
		handleConfirmAgreement,
		handlePaperConfirm,
	};
}
