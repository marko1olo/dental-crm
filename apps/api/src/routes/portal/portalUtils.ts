import { createHash, randomInt } from "node:crypto";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import {
	DEFAULT_OTP_SMS_TEMPLATE,
	type PortalOtpPolicy,
} from "./types.js";

export function readBoundedInt(
	name: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const raw = process.env[name]?.trim();
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) return fallback;
	// Границы, а не доверие к значению: код длиной 1 или срок в сутки — это не
	// «настройка», это отключённая защита.
	return Math.min(max, Math.max(min, parsed));
}

export function readPortalOtpPolicy(): PortalOtpPolicy {
	return {
		// Шесть цифр — российская норма для SMS-кода: 10^6 вариантов против
		// потолка в 5 попыток даёт шанс подбора 5 на миллион за срок жизни кода.
		codeLength: readBoundedInt("DENTE_PORTAL_OTP_LENGTH", 6, 6, 8),
		// Пять минут: пациенту хватает получить SMS и ввести, а украденный из
		// уведомления на экране код протухает быстрее, чем им воспользуются.
		ttlSeconds: readBoundedInt("DENTE_PORTAL_OTP_TTL_SECONDS", 300, 60, 900),
		maxAttempts: readBoundedInt("DENTE_PORTAL_OTP_MAX_ATTEMPTS", 5, 3, 10),
		// Минута между отправками: столько идёт SMS в худшем случае, и столько же
		// стоит выдержать, чтобы кнопкой «отправить ещё раз» не разоряли клинику.
		resendCooldownSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_RESEND_COOLDOWN_SECONDS",
			60,
			30,
			600,
		),
		// Не более 3 SMS за 10 минут на пациента (защита от флуда и слива баланса шлюза):
		maxPerWindow: readBoundedInt("DENTE_PORTAL_OTP_MAX_PER_WINDOW", 3, 1, 20),
		windowSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_WINDOW_SECONDS",
			600,
			60,
			86_400,
		),
		// Сутки: срок нужен не для проверки кода, а чтобы разобрать инцидент
		// «пациент говорит, что не запрашивал вход».
		retentionSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_RETENTION_SECONDS",
			86_400,
			3600,
			2_592_000,
		),
		smsTemplate:
			process.env.DENTE_PORTAL_OTP_SMS_TEMPLATE?.trim() ||
			DEFAULT_OTP_SMS_TEMPLATE,
	};
}

/**
 * Разрешено ли выводить одноразовый код входа в журнал сервера вместо SMS.
 * Работает, только если ЯВНО назван режим разработки (development/test).
 */
export function developerLogFallbackAllowed(): boolean {
	return namedDevelopmentModeActive();
}

/**
 * Код выдаётся CSPRNG. Math.random() для кода доступа непригоден.
 */
export function generateNumericCode(length: number): string {
	return String(randomInt(0, 10 ** length)).padStart(length, "0");
}

export function renderOtpMessage(policy: PortalOtpPolicy, code: string): string {
	const minutes = Math.max(1, Math.round(policy.ttlSeconds / 60));
	return policy.smsTemplate
		.replace(/\{code\}/g, code)
		.replace(/\{minutes\}/g, String(minutes));
}

export function generateSha256Hex(data: string): string {
	return createHash("sha256").update(data, "utf8").digest("hex");
}

export function generateDeterministicQrSvg(
	content: string,
	size = 180,
	options?: { color?: string; background?: string; margin?: number },
): string {
	const color = options?.color ?? "#0f172a";
	const bg = options?.background ?? "#ffffff";
	const margin = options?.margin ?? 2;
	const matrixSize = 25;
	const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
		Array(matrixSize).fill(false),
	);

	const drawFinder = (startX: number, startY: number) => {
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				if (
					r === 0 ||
					r === 6 ||
					c === 0 ||
					c === 6 ||
					(r >= 2 && r <= 4 && c >= 2 && c <= 4)
				) {
					const y = startY + r;
					const x = startX + c;
					if (matrix[y] && matrix[y][x] !== undefined) {
						matrix[y][x] = true;
					}
				}
			}
		}
	};

	drawFinder(0, 0);
	drawFinder(matrixSize - 7, 0);
	drawFinder(0, matrixSize - 7);

	for (let i = 8; i < matrixSize - 8; i++) {
		const isEven = i % 2 === 0;
		const row6 = matrix[6];
		if (row6) row6[i] = isEven;
		const rowI = matrix[i];
		if (rowI) rowI[6] = isEven;
	}

	const hashHex = generateSha256Hex(content);
	let bitIndex = 0;
	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			const inTopLeft = r < 8 && c < 8;
			const inTopRight = r < 8 && c >= matrixSize - 8;
			const inBottomLeft = r >= matrixSize - 8 && c < 8;
			const inTiming = r === 6 || c === 6;

			if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
				const hexChar = hashHex[bitIndex % hashHex.length] ?? "0";
				const charCode = Number.parseInt(hexChar, 16);
				const isBitSet = (charCode + r * 3 + c * 7) % 3 === 0;
				const rowR = matrix[r];
				if (rowR) {
					rowR[c] = isBitSet;
				}
				bitIndex++;
			}
		}
	}

	const totalSize = matrixSize + margin * 2;
	const scale = size / totalSize;
	const rects: string[] = [];

	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			if (matrix[r]?.[c]) {
				const x = (c + margin) * scale;
				const y = (r + margin) * scale;
				rects.push(
					`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${scale.toFixed(1)}" height="${scale.toFixed(1)}" fill="${color}" />`,
				);
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
		<rect width="${size}" height="${size}" fill="${bg}" />
		${rects.join("\n")}
	</svg>`;
}
