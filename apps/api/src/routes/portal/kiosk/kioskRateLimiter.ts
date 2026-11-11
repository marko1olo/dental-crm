/**
 * apps/api/src/routes/portal/kiosk/kioskRateLimiter.ts
 *
 * Rate limiting & 152-FZ Privacy Masking for Public Kiosk Self-Checkin
 * (Мандат 8ap: Никаких утечек персональных данных на экране холла клиники).
 */

// Rate limiting store for public kiosk requests (anti brute-force / phone scraping)
export const kioskIpRequestCounts = new Map<string, { count: number; resetAt: number }>();
export const KIOSK_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 минут
export const KIOSK_MAX_ATTEMPTS_PER_IP = 25;

export function resetKioskRateLimitsForTesting(): void {
	kioskIpRequestCounts.clear();
}

/**
 * Anti Brute-Force check: returns true if request is allowed, false if limit exceeded.
 */
export function checkKioskRateLimit(clientIp: string): { allowed: boolean; message?: string } {
	const nowTime = Date.now();
	const currentLimit = kioskIpRequestCounts.get(clientIp);

	if (currentLimit && nowTime < currentLimit.resetAt) {
		if (currentLimit.count >= KIOSK_MAX_ATTEMPTS_PER_IP) {
			return {
				allowed: false,
				message:
					"Превышен лимит запросов к терминалу. Пожалуйста, обратитесь к администратору на ресепшене.",
			};
		}
		currentLimit.count += 1;
	} else {
		kioskIpRequestCounts.set(clientIp, {
			count: 1,
			resetAt: nowTime + KIOSK_RATE_LIMIT_WINDOW_MS,
		});
	}

	return { allowed: true };
}

/**
 * Privacy Masking (Mandate 8ap): В Kiosk-режиме для защиты персональных данных
 * третьим лицам в холле клиники отображается только Имя и первая буква фамилии («Иван И.» / «Анна С.»).
 */
export function maskPatientName(fullName: string | null | undefined): string {
	if (!fullName || typeof fullName !== "string") return "Пациент";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "Пациент";
	if (parts.length === 1) return parts[0]!;

	const p0 = parts[0]!;
	const p1 = parts[1]!;

	// В стандартных записях РФ порядок: Фамилия Имя [Отчество] -> "Имя Ф."
	return `${p1} ${p0[0]?.toUpperCase()}.`;
}


