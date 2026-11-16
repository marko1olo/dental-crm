import { showToast } from "../../GlobalToast";

export async function requestSmsCodeApi(planId: string | null | undefined, phone: string, patientName: string): Promise<string | null> {
	if (!planId) {
		const msg = "Идентификатор плана лечения не определен. Сохраните план перед отправкой СМС-кода.";
		showToast(msg, "warning");
		return msg;
	}
	try {
		const res = await fetch(`/api/treatment-plans/${encodeURIComponent(planId)}/sign-pep`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "request_code", method: "sms", phone, signerName: patientName }),
		});
		const data = await res.json().catch(() => null);
		if (!res.ok) {
			const errMsg = data?.message || "Ошибка отправки проверочного СМС-кода.";
			showToast(errMsg, "warning");
			return errMsg;
		}
		showToast("Проверочный СМС-код отправлен на телефон пациента", "info");
		return null;
	} catch {
		const errMsg = "Сетевая ошибка при запросе СМС-кода. Проверьте подключение к серверу.";
		showToast(errMsg, "warning");
		return errMsg;
	}
}

export async function confirmSignatureApi(
	planId: string | null | undefined,
	signMethod: string,
	smsCode: string,
	phone: string,
	patientName: string,
	signatureBase64: string,
): Promise<void> {
	if (!planId) {
		throw new Error("Идентификатор плана лечения не определен. Сохраните план перед подтверждением.");
	}
	const res = await fetch(`/api/treatment-plans/${encodeURIComponent(planId)}/sign-pep`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: "confirm",
			method: signMethod === "paper" ? "paper" : signMethod === "qr" ? "qr_touch" : "sms",
			code: smsCode.trim(),
			phone,
			signerName: patientName,
			signatureBase64,
		}),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.message || "Неверный код подтверждения");
	}
}
