import { generateUuidV7, getAdjustedNowIso } from "@dental/shared";

/**
 * Генерация UUID v7 (RFC 9562) с миллисекундной упорядоченностью
 * и криптографической устойчивостью.
 */
export function generateMutationUuid(): string {
	return generateUuidV7();
}

/**
 * Текущая временная метка ISO с миллисекундами, откалиброванная
 * по серверному времени (Clock Skew Compensation).
 */
export function nowIsoWithMs(localTimeMs: number = Date.now()): string {
	return getAdjustedNowIso(localTimeMs);
}
