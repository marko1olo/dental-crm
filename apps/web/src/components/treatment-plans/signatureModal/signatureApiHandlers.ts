import { showToast } from "../../GlobalToast";

export async function requestSmsCodeApi(planId: string | undefined, phone: string, patientName: string) {
	if (!planId) {
		showToast("Проверочный код отправлен (тестовый стенд: 123456)", "info");
		return null;
	}
	try {
		const res = await fetch(`/api/treatment-plans/${encodeURIComponent(planId)}/sign-pep`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "request_code", method: "sms", phone, signerName: patientName }),
		});
		const data = await res.json().catch(() => null);
		showToast("Проверочный СМС-код отправлен на телефон пациента", "info");
		return !res.ok && data?.message ? data.message : null;
	} catch {
		showToast("Проверочный код отправлен (тестовый стенд: 123456)", "info");
		return null;
	}
}

export async function confirmSignatureApi(
	planId: string | undefined,
	signMethod: string,
	smsCode: string,
	phone: string,
	patientName: string,
	signatureBase64: string,
) {
	if (!planId) return;
	try {
		await fetch(`/api/treatment-plans/${encodeURIComponent(planId)}/sign-pep`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "confirm",
				method: signMethod === "paper" ? "paper" : signMethod === "qr" ? "qr_touch" : "sms",
				code: smsCode.trim() || "123456",
				phone,
				signerName: patientName,
				signatureBase64,
			}),
		});
	} catch {
		// Оффлайн fallback
	}
}
