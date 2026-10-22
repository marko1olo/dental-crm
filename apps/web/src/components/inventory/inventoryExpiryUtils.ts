/**
 * inventoryExpiryUtils.ts
 * DENTE Dental CRM — Утилиты расчета сроков годности и категорий материалов склада.
 */

import {
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	type FefoTrafficLightInfo,
} from "./fefoTrafficLight.js";
import { formatExpDate } from "./formatExpDate.js";

export type ExpiryTrafficStatus = "good" | "warning_soon" | "expired" | "normal" | "unknown";

export interface ExpiryTrafficLightInfo {
	readonly status: ExpiryTrafficStatus;
	readonly color: "emerald" | "amber" | "rose" | "teal" | "neutral";
	readonly daysLeft: number | null;
	readonly labelRu: string;
	readonly badgeTextRu: string;
	readonly isBlocked: boolean;
	readonly className: string;
}

export function getExpiryTrafficLight(
	expirationDate: string | null | undefined,
	referenceDate: Date = new Date(),
): ExpiryTrafficLightInfo {
	if (!expirationDate || !expirationDate.trim()) {
		return {
			status: "unknown",
			color: "neutral",
			daysLeft: null,
			labelRu: "Срок не указан",
			badgeTextRu: "Бессрочно / Не указан",
			isBlocked: false,
			className: "text-[var(--muted)] bg-[var(--paper-soft)] border-[var(--line)]",
		};
	}

	const trimmed = expirationDate.trim();
	let isoCandidate: string;
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		isoCandidate = trimmed;
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [dd, mm, yyyy] = trimmed.split(".");
		isoCandidate = `${yyyy}-${mm}-${dd}`;
	} else {
		isoCandidate = trimmed;
	}

	const expires = new Date(`${isoCandidate}T00:00:00Z`);
	if (Number.isNaN(expires.getTime())) {
		return {
			status: "unknown",
			color: "neutral",
			daysLeft: null,
			labelRu: "Некорректная дата",
			badgeTextRu: "Некорректная дата",
			isBlocked: false,
			className: "text-[var(--muted)] bg-[var(--paper-soft)] border-[var(--line)]",
		};
	}

	const startOfDay = (d: Date) =>
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	const daysLeft = Math.round(
		(startOfDay(expires) - startOfDay(referenceDate)) / (1000 * 60 * 60 * 24),
	);

	const readable = `${String(expires.getUTCDate()).padStart(2, "0")}.${String(expires.getUTCMonth() + 1).padStart(2, "0")}.${expires.getUTCFullYear()}`;

	if (daysLeft <= 0) {
		const overdueDays = Math.abs(daysLeft);
		return {
			status: "expired", color: "rose", daysLeft, isBlocked: true,
			labelRu: daysLeft === 0 ? `Истекает сегодня (${readable})` : `Просрочено на ${overdueDays} дн. (${readable})`,
			badgeTextRu: "Просрочено — отпуск заблокирован",
			className: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/40",
		};
	}

	if (daysLeft < 30) {
		return {
			status: "warning_soon", color: "amber", daysLeft, isBlocked: false,
			labelRu: `Истекает через ${daysLeft} дн. (${readable}) — первоочередной отпуск`,
			badgeTextRu: "Истекает скоро (FEFO)",
			className: "text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/40",
		};
	}

	if (daysLeft > 180) {
		return {
			status: "good", color: "emerald", daysLeft, isBlocked: false,
			labelRu: `Годен до ${readable}`,
			badgeTextRu: "Срок в норме (> 6 мес)",
			className: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
		};
	}

	return {
		status: "normal", color: "teal", daysLeft, isBlocked: false,
		labelRu: `Годен до ${readable}`,
		badgeTextRu: `Срок в норме (${Math.round(daysLeft / 30)} мес)`,
		className: "text-[var(--teal-dark,#0f766e)] dark:text-teal-300 bg-[var(--teal-surface)] border-[var(--teal-soft)]",
	};
}

export { getWarehouseFefoTrafficLight, getFefoTrafficLight, type FefoTrafficLightInfo };
export { getCategoryBadge } from "./inventoryCategoryBadges.js";
export { formatExpDate };
