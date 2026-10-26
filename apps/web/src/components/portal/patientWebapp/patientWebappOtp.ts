export function generateSmsOtpForSigning(
	phone: string,
	documentId: string,
	mockCode?: string,
): { code: string; sentTimestamp: number; expiresAt: number } {
	let code = mockCode;
	if (!code) {
		if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
			const arr = new Uint32Array(1);
			crypto.getRandomValues(arr);
			code = String(100000 + (arr[0]! % 900000));
		} else {
			code = String(100000 + (Date.now() % 900000));
		}
	}
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000;

	return {
		code,
		sentTimestamp: now,
		expiresAt,
	};
}

export function verifySmsOtpForSigning(
	inputCode: string,
	expectedCode: string,
	sentTimestamp: number,
	maxAgeMs = 5 * 60 * 1000,
): { isSuccess: boolean; error?: string } {
	const cleanInput = inputCode.replace(/\D/g, "");
	const cleanExpected = expectedCode.replace(/\D/g, "");

	if (!cleanInput || cleanInput.length !== 6) {
		return { isSuccess: false, error: "Код подтверждения должен состоять ровно из 6 цифр." };
	}

	const now = Date.now();
	if (now - sentTimestamp > maxAgeMs) {
		return { isSuccess: false, error: "Срок действия СМС-кода истёк (5 минут). Запросите новый код." };
	}

	if (cleanInput !== cleanExpected) {
		return { isSuccess: false, error: "Неверный код подтверждения из СМС. Проверьте правильность ввода." };
	}

	return { isSuccess: true };
}
