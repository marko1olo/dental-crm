/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH VIPNET AUTHENTICATION HELPERS
 * (ПРИКАЗ МИНЗДРАВА РФ 911Н / 555-ПП / ГОСТ Р 34.10-2012 / VIPNET ENCRYPTION)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Нормализация заголовка авторизации EventLog API:
 * N3.Health ожидает заголовок вида: `Authorization: N3 <guid-token>`
 */
export function formatEventLogAuthHeader(rawToken: string): string {
	const trimmed = rawToken.trim();
	if (trimmed.startsWith("N3 ")) {
		return trimmed;
	}
	return `N3 ${trimmed}`;
}
