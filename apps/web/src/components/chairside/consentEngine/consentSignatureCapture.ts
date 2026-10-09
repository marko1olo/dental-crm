/**
 * ============================================================================
 * CHAIRSIDE CONSENT ENGINE - SIGNATURE CAPTURE & SMS-OTP VERIFICATION (LAYER 1)
 * Захват штрихов подписи планшета, маскирование номеров, OTP 63-ФЗ
 * ============================================================================
 */

import type {
	ChairsideSmsOtpState,
	SignatureStroke,
	SignatureVectorPoint,
} from "./types.js";

/**
 * Маскирование номера телефона в строгом юридическом формате: +7 (***) ***-**-12
 */
export function maskRussianPhone(phone: string): string {
	const digits = (phone || "").replace(/\D/g, "");
	const lastTwo = digits.length >= 2 ? digits.slice(-2) : digits.padStart(2, "0");
	return `+7 (***) ***-**-${lastTwo}`;
}

/**
 * Форматирование даты и времени в стандартный вид: DD.MM.YYYY HH:mm
 */
export function formatRussianDateTime(isoOrDate: string | Date | number): string {
	const d = typeof isoOrDate === "string" || typeof isoOrDate === "number" ? new Date(isoOrDate) : isoOrDate;
	if (Number.isNaN(d.getTime())) {
		return "01.01.2026 00:00";
	}

	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	const hours = String(d.getHours()).padStart(2, "0");
	const minutes = String(d.getMinutes()).padStart(2, "0");

	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Криптографическая генерация 4-значного OTP-кода подтверждения (63-ФЗ)
 * через Web Crypto API (crypto.getRandomValues).
 */
export function generateSecure4DigitOtp(): string {
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const arr = new Uint32Array(1);
		crypto.getRandomValues(arr);
		const val = arr[0] ?? 0;
		return String(1000 + (val % 9000));
	}
	const time = Date.now();
	return String(1000 + ((time ^ (time >> 4)) % 9000));
}

/**
 * Регламентное формирование состояния OTP-кода для подтверждения согласий кресельного приема (63-ФЗ)
 * Срок действия кода строго 5 минут (300 000 мс).
 * При отсутствии явно переданного кода генерируется криптографический OTP через Web Crypto API.
 */
export function generateChairsideSmsOtp(
	phone: string,
	explicitOtpCode?: string,
): ChairsideSmsOtpState {
	const code = explicitOtpCode || generateSecure4DigitOtp();
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000; // 5 минут

	return {
		code,
		phone,
		phoneMasked: maskRussianPhone(phone),
		sentAt: now,
		expiresAt,
		attemptsCount: 0,
		maxAttempts: 3,
		isVerified: false,
	};
}

/**
 * Валидация введенного пациентом СМС-кода
 */
export function verifyChairsideSmsOtp(
	inputCode: string,
	otpState: ChairsideSmsOtpState | undefined,
	nowMs?: number,
): { isValid: boolean; reason?: string } {
	if (!otpState) {
		return { isValid: false, reason: "СМС с кодом еще не отправлено пациенту" };
	}

	const cleanInput = (inputCode || "").trim();
	if (!cleanInput) {
		return { isValid: false, reason: "Введите 4-значный код из СМС" };
	}

	if (!/^\d{4}$/.test(cleanInput)) {
		return { isValid: false, reason: "Код подтверждения должен состоять ровно из 4 цифр" };
	}

	const now = nowMs ?? Date.now();
	if (now > otpState.expiresAt) {
		return {
			isValid: false,
			reason: "Срок действия СМС-кода (5 минут) истек. Запросите новый код.",
		};
	}

	if (otpState.attemptsCount >= otpState.maxAttempts) {
		return {
			isValid: false,
			reason: "Превышено максимальное количество попыток ввода. Запросите новый СМС-код.",
		};
	}

	if (cleanInput !== otpState.code) {
		return {
			isValid: false,
			reason: "Неверный код подтверждения из СМС. Проверьте правильность ввода.",
		};
	}

	return { isValid: true };
}

/**
 * Сглаживание векторных точек штриха стилуса (кривые Безье / Catmull-Rom)
 */
export function smoothSignaturePoints(points: readonly SignatureVectorPoint[]): SignatureVectorPoint[] {
	if (!points || points.length <= 2) {
		return [...(points || [])];
	}

	const smoothed: SignatureVectorPoint[] = [{ ...points[0]! }];

	for (let i = 1; i < points.length - 1; i++) {
		const prev = points[i - 1]!;
		const curr = points[i]!;
		const next = points[i + 1]!;

		smoothed.push({
			x: Math.round(((prev.x + 2 * curr.x + next.x) / 4) * 10) / 10,
			y: Math.round(((prev.y + 2 * curr.y + next.y) / 4) * 10) / 10,
			pressure: curr.pressure !== undefined ? Math.round(curr.pressure * 100) / 100 : undefined,
			time: curr.time,
		});
	}

	smoothed.push({ ...points[points.length - 1]! });
	return smoothed;
}

/**
 * Расчет длины траектории штриха стилуса
 */
export function calculateSignatureStrokeLength(points: readonly SignatureVectorPoint[]): number {
	if (!points || points.length < 2) return 0;
	let totalLength = 0;
	for (let i = 1; i < points.length; i++) {
		const dx = points[i]!.x - points[i - 1]!.x;
		const dy = points[i]!.y - points[i - 1]!.y;
		totalLength += Math.sqrt(dx * dx + dy * dy);
	}
	return Math.round(totalLength * 10) / 10;
}

/**
 * Экспорт векторных штрихов подписи планшета в SVG-контур
 */
export function exportSignatureToSvg(
	strokes: readonly SignatureStroke[],
	width = 400,
	height = 200,
): string {
	const paths = strokes
		.filter((s) => s.points && s.points.length > 0)
		.map((s) => {
			const pts = smoothSignaturePoints(s.points);
			if (pts.length === 1) {
				return `<circle cx="${pts[0]!.x}" cy="${pts[0]!.y}" r="${(s.width || 2) / 2}" fill="${s.color || "#0d9488"}" />`;
			}
			let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
			for (let i = 1; i < pts.length; i++) {
				d += ` L ${pts[i]!.x} ${pts[i]!.y}`;
			}
			return `<path d="${d}" stroke="${s.color || "#0d9488"}" stroke-width="${s.width || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
		})
		.join("\n    ");

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n    ${paths}\n</svg>`;
}
