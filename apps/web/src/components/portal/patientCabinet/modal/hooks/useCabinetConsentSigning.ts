import { useCallback, useEffect, useState } from "react";
import {
	generateSmsOtp,
	signConsentWithPep,
	verifySmsOtp,
	type PatientPersonalCabinetData,
	type PatientStatutoryConsent,
} from "../../patientCabinetEngine.js";

export function useCabinetConsentSigning(
	data: PatientPersonalCabinetData,
	setData: React.Dispatch<React.SetStateAction<PatientPersonalCabinetData>>,
	initialSigningConsent: PatientStatutoryConsent | null,
	initialConsentSignMode: "sms_otp" | "cabinet_pep",
	onConsentSigned?: (c: PatientStatutoryConsent) => void,
) {
	const [signingConsent, setSigningConsent] = useState<PatientStatutoryConsent | null>(initialSigningConsent);
	const [consentSignMode, setConsentSignMode] = useState<"sms_otp" | "cabinet_pep">(initialConsentSignMode);
	const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
	const [otpError, setOtpError] = useState<string | null>(null);
	const [otpCountdown, setOtpCountdown] = useState<number>(0);
	const [sentOtp, setSentOtp] = useState<{ code: string; sentTimestamp: number; expiresAt: number } | null>(null);

	useEffect(() => {
		if (otpCountdown > 0) {
			const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [otpCountdown]);

	const handleStartConsentSign = useCallback((
		consent: PatientStatutoryConsent,
		mode: "sms_otp" | "cabinet_pep" = "sms_otp",
	) => {
		setSigningConsent(consent);
		setConsentSignMode(mode);
		setOtpDigits(["", "", "", "", "", ""]);
		setOtpError(null);
		if (mode === "sms_otp") {
			const otp = generateSmsOtp(data.phone);
			setSentOtp(otp);
			setOtpCountdown(60);
		}
	}, [data.phone]);

	const handleOtpDigitChange = useCallback((index: number, val: string) => {
		const clean = val.replace(/\D/g, "").slice(-1);
		setOtpDigits((prev) => {
			const next = [...prev];
			next[index] = clean;
			return next;
		});
		if (clean && index < 5) {
			document.getElementById(`pc-otp-${index + 1}`)?.focus();
		}
	}, []);

	const handleResendOtp = useCallback(() => {
		const otp = generateSmsOtp(data.phone);
		setSentOtp(otp);
		setOtpCountdown(60);
		setOtpError(null);
	}, [data.phone]);

	const handleConfirmConsentOtp = useCallback(() => {
		if (!signingConsent) return;
		const code = otpDigits.join("");
		if (code.length < 6) {
			setOtpError("Введите 6-значный SMS-код");
			return;
		}
		if (!sentOtp) {
			setOtpError("Запросите код подтверждения через SMS");
			return;
		}
		const verifyResult = verifySmsOtp(code, sentOtp.code, sentOtp.sentTimestamp);
		if (!verifyResult.success) {
			setOtpError(verifyResult.error || "Неверный код подтверждения из SMS.");
			return;
		}
		const signed = signConsentWithPep(signingConsent, data.phone, code, data.fullName);
		setData((prev) => ({
			...prev,
			consents: prev.consents.map((c) => (c.id === signed.id ? signed : c)),
		}));
		onConsentSigned?.(signed);
		setSigningConsent(null);
	}, [signingConsent, otpDigits, sentOtp, data.phone, data.fullName, onConsentSigned, setData]);

	const handleSignConsentInCabinet = useCallback(() => {
		if (!signingConsent) return;
		const signed = signConsentWithPep(signingConsent, data.phone, "CABINET_PEP", data.fullName);
		setData((prev) => ({
			...prev,
			consents: prev.consents.map((c) => (c.id === signed.id ? signed : c)),
		}));
		onConsentSigned?.(signed);
		setSigningConsent(null);
	}, [signingConsent, data.fullName, data.phone, onConsentSigned, setData]);

	return {
		signingConsent, setSigningConsent,
		consentSignMode, setConsentSignMode,
		otpDigits, otpError, otpCountdown, sentOtp,
		handleStartConsentSign, handleOtpDigitChange, handleResendOtp,
		handleConfirmConsentOtp, handleSignConsentInCabinet,
	};
}
