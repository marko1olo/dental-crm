/**
 * inventoryExpiryUtils.ts
 * DENTE Dental CRM — Утилиты расчета сроков годности и категорий материалов склада.
 * Мандаты 8e, 8n, 8v: Контроль FEFO и сроков годности СанПиН 3.3686-21.
 */

import {
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	type FefoTrafficLightInfo,
} from "./fefoTrafficLight.js";

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

/**
 * Расчет светофора срока годности по Мандатам 8e, 8n, 8v:
 * 1. Зеленый: срок годности > 6 месяцев (> 180 дней).
 * 2. Янтарный (предупреждение): срок годности < 30 дней («Истекает скоро — первоочередной отпуск»).
 * 3. Красный (просрочено): daysLeft <= 0. Блокировка отпуска с кнопкой «Акт утилизации по СанПиН 3.3686-21».
 */
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

	// Красный: просрочено (daysLeft <= 0)
	if (daysLeft <= 0) {
		const overdueDays = Math.abs(daysLeft);
		return {
			status: "expired",
			color: "rose",
			daysLeft,
			labelRu:
				daysLeft === 0
					? `Истекает сегодня (${readable})`
					: `Просрочено на ${overdueDays} дн. (${readable})`,
			badgeTextRu: "Просрочено — отпуск заблокирован",
			isBlocked: true,
			className: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/40",
		};
	}

	// Янтарный: < 30 дней — первоочередной отпуск FEFO
	if (daysLeft < 30) {
		return {
			status: "warning_soon",
			color: "amber",
			daysLeft,
			labelRu: `Истекает через ${daysLeft} дн. (${readable})`,
			badgeTextRu: "Истекает скоро — первоочередной отпуск",
			isBlocked: false,
			className: "text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/40",
		};
	}

	// Зеленый: > 6 месяцев (> 180 дней)
	if (daysLeft > 180) {
		return {
			status: "good",
			color: "emerald",
			daysLeft,
			labelRu: `Годен до ${readable}`,
			badgeTextRu: "Срок в норме (> 6 мес)",
			isBlocked: false,
			className: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
		};
	}

	// Промежуточный нормальный срок (от 1 до 6 месяцев)
	return {
		status: "normal",
		color: "teal",
		daysLeft,
		labelRu: `Годен до ${readable}`,
		badgeTextRu: `Срок в норме (${Math.round(daysLeft / 30)} мес)`,
		isBlocked: false,
		className:
			"text-[var(--teal-dark,#0f766e)] dark:text-teal-300 bg-[var(--teal-surface)] border-[var(--teal-soft)]",
	};
}

export { getWarehouseFefoTrafficLight, getFefoTrafficLight, type FefoTrafficLightInfo };

const CATEGORY_MAP: Record<string, { label: string; className: string }> = {
	anesthesia: { label: "Анестезия", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	therapy: { label: "Терапия", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
	composite: { label: "Композиты", className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
	disposables: { label: "Расходники", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
	ppe: { label: "Расходники", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
	surgery: { label: "Хирургия", className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
	hygiene: { label: "Гигиена", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" },
	endo: { label: "Эндодонтия", className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" },
	implant: { label: "Имплантаты", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30" },
	suture: { label: "Шовный матер.", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
};

export function getCategoryBadge(category?: string): { label: string; className: string } {
	if (!category) {
		return { label: "Материалы", className: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]" };
	}
	const norm = category.toLowerCase().trim();
	return CATEGORY_MAP[norm] || { label: category, className: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]" };
}

export function formatExpDate(exp?: string | null): string {
	if (!exp) return "—";
	const trimmed = exp.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const [y, m, d] = trimmed.split("-");
		return `${d}.${m}.${y}`;
	}
	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [y, m, d] = trimmed.split("-");
		return `${m}.${y}`;
	}
	return trimmed;
}
