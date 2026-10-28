import type {
	FefoTrafficLightInfo,
	FefoTrafficLightOptions,
} from "./fefoTypes.js";
import { daysLabel } from "./fefoDateUtils.js";
import {
	getWarehouseFefoTrafficLight,
	isBatchExpired,
} from "./fefoWarehouseUtils.js";

export { getWarehouseFefoTrafficLight, isBatchExpired };

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

export function getFefoTrafficLight(
	expirationDateIso: string | null | undefined,
	referenceDate: string | Date = new Date(),
	options?: FefoTrafficLightOptions,
): FefoTrafficLightInfo {
	if (!expirationDateIso || !expirationDateIso.trim()) {
		return {
			status: "green",
			daysLeft: 999,
			label: "Срок не указан",
			badgeText: "Без срока",
			className: "",
			dotColor: "#94a3b8",
			bgClass: "bg-slate-500/10 dark:bg-slate-900/40",
			textClass: "text-slate-600 dark:text-slate-400",
			borderClass: "border-slate-300 dark:border-slate-700",
			tooltip: "Срок годности не указан (бессрочно)",
		};
	}

	const trimmed = expirationDateIso.trim();
	let dateStr = trimmed;

	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [y, m] = trimmed.split("-").map(Number);
		const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
		dateStr = `${trimmed}-${String(lastDay).padStart(2, "0")}`;
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [dd, mm, yyyy] = trimmed.split(".");
		dateStr = `${yyyy}-${mm}-${dd}`;
	}

	const ref =
		referenceDate instanceof Date
			? referenceDate
			: referenceDate
				? new Date(referenceDate)
				: new Date();
	const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

	const exp = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
	if (Number.isNaN(exp.getTime())) {
		return {
			status: "green",
			daysLeft: 999,
			label: "Срок не указан",
			badgeText: "Без срока",
			className: "",
			dotColor: "#94a3b8",
			bgClass: "bg-slate-500/10 dark:bg-slate-900/40",
			textClass: "text-slate-600 dark:text-slate-400",
			borderClass: "border-slate-300 dark:border-slate-700",
			tooltip: "Некорректный формат срока годности",
		};
	}

	const expUtc = Date.UTC(exp.getFullYear(), exp.getMonth(), exp.getDate());
	const daysLeft = Math.round((expUtc - refUtc) / 86400000);
	const readable = exp.toLocaleDateString("ru-RU");

	const isWarehouse = options?.warehouseMode === true;
	const redThreshold = options?.redDays !== undefined ? options.redDays : isWarehouse ? 30 : 0;
	const yellowThreshold = options?.yellowDays !== undefined ? options.yellowDays : isWarehouse ? 180 : 30;

	if (daysLeft < 0) {
		return {
			status: "red", daysLeft, label: `Просрочен с ${readable}`, badgeText: "Просрочен",
			className: "inventory-expiry-expired", dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40", textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30", tooltip: "Срок годности истек — запрещено использовать на пациентах! Подлежит списанию в утиль (Класс Б, СанПиН 3.3686-21)",
		};
	}

	if (daysLeft === 0) {
		return {
			status: "red", daysLeft: 0, label: `Истекает сегодня, ${readable}`, badgeText: "Истекает сегодня",
			className: "inventory-expiry-expired", dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40", textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30", tooltip: "Срок годности истекает сегодня — критично! Использовать сегодня или списать в утиль",
		};
	}

	if (daysLeft <= redThreshold) {
		return {
			status: "red", daysLeft, label: `Годен до ${readable} — ${daysLabel(daysLeft)}`, badgeText: "Критический срок (≤30 дн)",
			className: "inventory-expiry-expired", dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40", textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30", tooltip: `Критический остаточный срок (${daysLabel(daysLeft)}) — приоритетная утилизация или отпуск по FEFO`,
		};
	}

	if (daysLeft <= yellowThreshold) {
		return {
			status: "yellow", daysLeft, label: `Годен до ${readable} — ${daysLabel(daysLeft)}`, badgeText: "FEFO приоритет",
			className: "inventory-expiry-soon", dotColor: "#f59e0b",
			bgClass: "bg-amber-500/10 dark:bg-amber-950/40", textClass: "text-amber-800 dark:text-amber-300",
			borderClass: "border-amber-500/30", tooltip: `Истекает скоро (${daysLabel(daysLeft)}) — приоритет списания по регламенту FEFO (расходовать в первую очередь)`,
		};
	}

	return {
		status: "green", daysLeft, label: `Годен до ${readable}`, badgeText: "FEFO норма",
		className: "", dotColor: "#10b981", bgClass: "bg-emerald-500/10 dark:bg-emerald-950/40",
		textClass: "text-emerald-700 dark:text-emerald-300", borderClass: "border-emerald-500/30",
		tooltip: `Срок годности в норме (осталось ${daysLeft} дн., FEFO OK)`,
	};
}
