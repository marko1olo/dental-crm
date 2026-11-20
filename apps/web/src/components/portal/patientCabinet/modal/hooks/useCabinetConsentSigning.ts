import { useCallback, useEffect, useState } from "react";
import {
	sendPortalSmsOtp,
	signConsentViaServerApi,
	signConsentWithPep,
	type PatientPersonalCabinetData,
	type PatientStatutoryConsent,
} from "../../patientCabinetEngine.js";

export function useCabinetConsentSigning(
	data: PatientPersonalCabinetData,
	setData: React.Dispatch<React.SetStateAction<PatientPersonalCabinetData>>,
	initialSigningConsent: PatientStatutoryConsent | null,
	initialConsentSignMode: "sms_otp" | "cabinet_pep",
	onConsentSigned?: (c: PatientStatutoryConsent) => void,
	token?: string,
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
			sendPortalSmsOtp(data.phone, data.organizationId).then((res) => {
				if (!res.success && res.error) {
					setOtpError(res.error);
				}
			});
			setOtpCountdown(60);
		}
	}, [data.phone, data.organizationId]);

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
		sendPortalSmsOtp(data.phone, data.organizationId).then((res) => {
			if (!res.success && res.error) {
				setOtpError(res.error);
			}
		});
		setOtpCountdown(60);
		setOtpError(null);
	}, [data.phone, data.organizationId]);

	const handleConfirmConsentOtp = useCallback(async () => {
		if (!signingConsent) return;
		const code = otpDigits.join("");
		if (code.length < 6) {
			setOtpError("Введите 6-значный SMS-код");
			return;
		}

		// Подписание и проверка кода опираются строго на результат валидации серверного Fastify API /api/portal/consents/:id/sign
		const serverValidation = await signConsentViaServerApi(signingConsent.id, code, token);
		if (!serverValidation.success) {
			setOtpError(serverValidation.error || "Неверный код подтверждения из SMS.");
			return;
		}

		const signed = signConsentWithPep(signingConsent, data.phone, code, data.fullName);
		setData((prev) => ({
			...prev,
			consents: (prev.consents || []).map((c) => (c.id === signed.id ? signed : c)),
		}));
		onConsentSigned?.(signed);
		setSigningConsent(null);
	}, [signingConsent, otpDigits, data.phone, data.fullName, onConsentSigned, setData, token]);

	const handleSignConsentInCabinet = useCallback(async () => {
		if (!signingConsent) return;
		const signed = signConsentWithPep(signingConsent, data.phone, "CABINET_PEP", data.fullName);

		// Реальная отправка на сервер Fastify API
		const effectiveToken = token || (typeof window !== "undefined" ? localStorage.getItem("dente_portal_token") : null);
		if (effectiveToken) {
			try {
				await fetch(`/api/portal/consents/${encodeURIComponent(signingConsent.id)}/sign`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${effectiveToken}`,
					},
					body: JSON.stringify({
						signatureMethod: "portal_pep",
						signatureSvg: signed.signatureAudit?.signatureSvg,
						deviceMeta: typeof navigator !== "undefined" ? navigator.userAgent : "PWA Patient Cabinet",
					}),
				});
			} catch (err) {
				console.warn("[useCabinetConsentSigning] Fallback to local PEP record:", err);
			}
		}

		setData((prev) => ({
			...prev,
			consents: (prev.consents || []).map((c) => (c.id === signed.id ? signed : c)),
		}));
		onConsentSigned?.(signed);
		setSigningConsent(null);
	}, [signingConsent, data.fullName, data.phone, onConsentSigned, setData, token]);

	return {
		signingConsent, setSigningConsent,
		consentSignMode, setConsentSignMode,
		otpDigits, otpError, otpCountdown, sentOtp,
		handleStartConsentSign, handleOtpDigitChange, handleResendOtp,
		handleConfirmConsentOtp, handleSignConsentInCabinet,
	};
}
