/**
 * Pure Utility Functions for Analytics Module (Layer 1)
 * Preserves 100% verbatim logic from legacy analytics.ts
 */

/**
 * Извлекает метку времени создания (Unix epoch ms) из UUIDv7.
 * В UUIDv7 первые 48 бит (12 hex-символов) содержат миллисекунды от Unix Epoch.
 */
export function extractCreatedAtFromUuidV7(id: string | null | undefined): Date | null {
	if (!id || typeof id !== "string") return null;
	const clean = id.replace(/-/g, "");
	if (clean.length < 13) return null;
	// Проверяем версию UUID (13-й hex-символ должен быть '7')
	if (clean[12] !== "7") return null;

	const hexTime = clean.slice(0, 12);
	const ms = parseInt(hexTime, 16);
	if (isNaN(ms) || ms < 1577836800000 || ms > 2524608000000) {
		return null;
	}
	return new Date(ms);
}

/**
 * Алгоритм 15-минутного окна конверсии повторной записи (Врач vs Администратор):
 * \Delta t = \text{created\_at} - \text{completed\_at}.
 * Если повторная запись создана в течение 15 минут после завершения визита (\Delta t \le 15 мин),
 * конверсия атрибутируется Врачу (запись создана у кресла).
 * Если \Delta t > 15 мин или визит не предшествовал записи, конверсия атрибутируется Администратору/Ресепшену.
 */
export function calculateRebookingDeltaMinutes(
	createdAt: Date | string,
	completedAt: Date | string,
	isSoloDoctor = false,
): {
	deltaMinutes: number;
	creditedRole: "doctor" | "administrator";
	attributionReason: "chairside_rebooking_under_15m" | "frontdesk_rebooking_over_15m";
} {
	const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
	const completed = typeof completedAt === "string" ? new Date(completedAt) : completedAt;
	const diffMs = created.getTime() - completed.getTime();
	const deltaMinutes = Math.floor(diffMs / 60000);

	// В соло-режиме (1–2 кресла, субаренда, solo doctor) нет администратора на ресепшене (Мандат 8n).
	// Все 100% повторных записей атрибутируются врачу у кресла.
	if (isSoloDoctor) {
		return {
			deltaMinutes: Math.max(0, deltaMinutes),
			creditedRole: "doctor",
			attributionReason: "chairside_rebooking_under_15m",
		};
	}

	if (deltaMinutes <= 15) {
		return {
			deltaMinutes: Math.max(0, deltaMinutes),
			creditedRole: "doctor",
			attributionReason: "chairside_rebooking_under_15m",
		};
	}

	return {
		deltaMinutes,
		creditedRole: "administrator",
		attributionReason: "frontdesk_rebooking_over_15m",
	};
}

export function formatDoctorSpecialty(specialties: unknown): string {
	if (!specialties) return "Стоматолог общей практики";
	if (Array.isArray(specialties)) {
		const str = specialties
			.filter((s) => typeof s === "string" && s.trim())
			.join(", ");
		return str || "Стоматолог общей практики";
	}
	if (typeof specialties === "string" && specialties.trim()) {
		return specialties.trim();
	}
	return "Стоматолог общей практики";
}
