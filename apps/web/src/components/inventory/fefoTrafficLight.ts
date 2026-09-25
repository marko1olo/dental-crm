export type FefoTrafficStatus = "green" | "yellow" | "red";

export interface FefoTrafficLightInfo {
	readonly status: FefoTrafficStatus;
	readonly daysLeft: number;
	readonly label: string;
	readonly badgeText: string;
	readonly className: string;
	readonly dotColor: string;
	readonly bgClass: string;
	readonly textClass: string;
	readonly borderClass: string;
	readonly tooltip: string;
}

/** Русское склонение дней: 1 день, 2 дня, 5 дней. */
export function daysLabel(count: number): string {
	const absCount = Math.abs(count);
	const lastTwo = absCount % 100;
	const last = absCount % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return `осталось ${absCount} дней`;
	if (last === 1) return `остался ${absCount} день`;
	if (last >= 2 && last <= 4) return `осталось ${absCount} дня`;
	return `осталось ${absCount} дней`;
}

/**
 * Автоматический FEFO-светофор срока годности расходников и анестетиков.
 * First Expired, First Out (СанПиН 3.3686-21, Мандаты 8e, 8n, 8v):
 * 1. Зеленый (green): срок в норме (> 30 дней) — плановое использование.
 * 2. Желтый (yellow): истекает скоро (1..30 дней) — первоочередной отпуск/списание по FEFO.
 * 3. Красный (red): просрочено (<= 0 дней) — запрет применения у кресла, немедленная утилизация (Класс Б).
 */
export function getFefoTrafficLight(
	expirationDateIso: string | null | undefined,
	referenceDate: string | Date = new Date(),
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

	// Поддержка формата ГГГГ-ММ (например, 2027-06)
	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [y, m] = trimmed.split("-").map(Number);
		const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
		dateStr = `${trimmed}-${String(lastDay).padStart(2, "0")}`;
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		// Поддержка ДД.ММ.ГГГГ
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

	// 1. Красный (Просрочен / истекает сегодня)
	if (daysLeft < 0) {
		return {
			status: "red",
			daysLeft,
			label: `Просрочен с ${readable}`,
			badgeText: "Просрочен",
			className: "inventory-expiry-expired",
			dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
			textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30",
			tooltip:
				"Срок годности истек — запрещено использовать на пациентах! Подлежит списанию в утиль (Класс Б, СанПиН 3.3686-21)",
		};
	}

	if (daysLeft === 0) {
		return {
			status: "red",
			daysLeft: 0,
			label: `Истекает сегодня, ${readable}`,
			badgeText: "Истекает сегодня",
			className: "inventory-expiry-expired",
			dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
			textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30",
			tooltip:
				"Срок годности истекает сегодня — критично! Использовать сегодня или списать в утиль",
		};
	}

	// 2. Желтый (FEFO приоритет — истекает скоро)
	if (daysLeft <= 30) {
		return {
			status: "yellow",
			daysLeft,
			label: `Годен до ${readable} — ${daysLabel(daysLeft)}`,
			badgeText: "FEFO приоритет",
			className: "inventory-expiry-soon",
			dotColor: "#f59e0b",
			bgClass: "bg-amber-500/10 dark:bg-amber-950/40",
			textClass: "text-amber-800 dark:text-amber-300",
			borderClass: "border-amber-500/30",
			tooltip: `Истекает скоро (${daysLabel(daysLeft)}) — приоритет списания по регламенту FEFO (расходовать в первую очередь)`,
		};
	}

	// 3. Зеленый (FEFO норма)
	return {
		status: "green",
		daysLeft,
		label: `Годен до ${readable}`,
		badgeText: "FEFO норма",
		className: "",
		dotColor: "#10b981",
		bgClass: "bg-emerald-500/10 dark:bg-emerald-950/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
		borderClass: "border-emerald-500/30",
		tooltip: `Срок годности в норме (осталось ${daysLeft} дн., FEFO OK)`,
	};
}
