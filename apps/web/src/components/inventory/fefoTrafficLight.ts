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

export type ExpiryTrafficLight = FefoTrafficLightInfo;

export interface FefoTrafficLightOptions {
	/** Порог критического срока (красная зона) в днях. В складском учете: <= 30 дней. */
	readonly redDays?: number;
	/** Порог приближающегося срока (желтая зона) в днях. В складском учете: <= 180 дней (1-6 месяцев). */
	readonly yellowDays?: number;
	/**
	 * Включить складской режим FEFO:
	 * Красный (<= 30 дней), Желтый (31..180 дней, 1-6 месяцев), Зеленый (> 180 дней, > 6 месяцев).
	 */
	readonly warehouseMode?: boolean;
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
 * По умолчанию (у кресла врача):
 * 1. Зеленый (green): срок в норме (> 30 дней) — плановое использование.
 * 2. Желтый (yellow): истекает скоро (1..30 дней) — первоочередной отпуск/списание по FEFO.
 * 3. Красный (red): просрочено (<= 0 дней) — запрет применения у кресла.
 *
 * Складской режим (warehouseMode):
 * 1. Красный: <= 30 дней (критический срок / просрочено)
 * 2. Желтый: <= 90 дней (31..90 дней — FEFO приоритет)
 * 3. Зеленый: > 90 дней (норма)
 */
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

	const isWarehouse = options?.warehouseMode === true;
	const redThreshold =
		options?.redDays !== undefined
			? options.redDays
			: isWarehouse
				? 30
				: 0;
	const yellowThreshold =
		options?.yellowDays !== undefined
			? options.yellowDays
			: isWarehouse
				? 180
				: 30;

	// 1. Красный (Просрочен / истекает сегодня / критический срок <= redThreshold)
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

	if (daysLeft <= redThreshold) {
		return {
			status: "red",
			daysLeft,
			label: `Годен до ${readable} — ${daysLabel(daysLeft)}`,
			badgeText: "Критический срок (≤30 дн)",
			className: "inventory-expiry-expired",
			dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
			textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30",
			tooltip: `Критический остаточный срок (${daysLabel(daysLeft)}) — приоритетная утилизация или отпуск по FEFO`,
		};
	}

	// 2. Желтый (FEFO приоритет — истекает скоро, <= yellowThreshold)
	if (daysLeft <= yellowThreshold) {
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

	// 3. Зеленый (FEFO норма — > yellowThreshold)
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

/**
 * Складской FEFO-светофор срока годности (Мандаты 8e, 8n):
 * 1. Красный: <= 30 дней (критический срок < 30 дн. / просрочено)
 * 2. Желтый: 31..180 дней (1-6 месяцев — FEFO приоритет расхода)
 * 3. Зеленый: > 180 дней (> 6 месяцев — срок в норме)
 */
export function getWarehouseFefoTrafficLight(
	expirationDateIso: string | null | undefined,
	referenceDate: string | Date = new Date(),
): FefoTrafficLightInfo {
	return getFefoTrafficLight(expirationDateIso, referenceDate, { warehouseMode: true });
}

// ---------------------------------------------------------------------------
// FEFO CLINICAL VALIDATION & EXPIRED LOT QUARANTINE (Mandate 8e, 8n)
// ---------------------------------------------------------------------------

/** Форматирование даты в канонический формат РФ: ДД.ММ.ГГГГ */
export function formatRuDate(dateInput: Date | string | null | undefined): string {
	if (!dateInput) return "";
	if (typeof dateInput === "string") {
		const trimmed = dateInput.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
			const [y, m, d] = trimmed.slice(0, 10).split("-");
			return `${d}.${m}.${y}`;
		}
		if (/^\d{4}-\d{2}$/.test(trimmed)) {
			const [y, m] = trimmed.split("-");
			const lastDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
			return `${String(lastDay).padStart(2, "0")}.${m}.${y}`;
		}
	}
	const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
	if (Number.isNaN(d.getTime())) return String(dateInput);
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return `${day}.${month}.${year}`;
}

/** Проверка: истек ли срок годности партии (дни остатка <= 0) */
export function isBatchExpired(
	expirationDateIso: string | null | undefined,
	referenceDate: string | Date = new Date(),
): boolean {
	const traffic = getFefoTrafficLight(expirationDateIso, referenceDate);
	return traffic.daysLeft <= 0;
}

export interface ClinicalBatchValidationResult {
	readonly isAllowed: boolean;
	readonly isExpired: boolean;
	readonly alertMessage: string | null;
	readonly formattedExpiry: string;
	readonly status: FefoTrafficStatus;
	readonly daysLeft: number;
}

/**
 * Валидация партии для клинического использования в полости рта пациента (FEFO контроль).
 * КАТЕГОРИЧЕСКИ запрещено списывать просроченные партии пациентам!
 * При просрочке возвращает обязательный нормативный алерт:
 * «Срок годности партии истек ХХ.ХХ.ХХХХ! Партия заблокирована для утилизации»
 */
export function validateBatchForClinicalUse(
	batch: {
		readonly expiryDate?: string | null | undefined;
		readonly expirationDate?: string | null | undefined;
		readonly batchNumber?: string | null | undefined;
		readonly lotNumber?: string | null | undefined;
		readonly name?: string | null | undefined;
	},
	referenceDate: string | Date = new Date(),
): ClinicalBatchValidationResult {
	const rawExp = batch.expiryDate || batch.expirationDate;
	const traffic = getFefoTrafficLight(rawExp, referenceDate);
	const expired = traffic.daysLeft <= 0;
	const formattedExpiry = rawExp ? formatRuDate(rawExp) : "не указан";

	if (expired) {
		return {
			isAllowed: false,
			isExpired: true,
			alertMessage: `Срок годности партии истек ${formattedExpiry}! Партия заблокирована для утилизации`,
			formattedExpiry,
			status: "red",
			daysLeft: traffic.daysLeft,
		};
	}

	return {
		isAllowed: true,
		isExpired: false,
		alertMessage: null,
		formattedExpiry,
		status: traffic.status,
		daysLeft: traffic.daysLeft,
	};
}

/**
 * Сортировка партий строго по принципу FEFO (First-Expired, First-Out):
 * Партии с ближайшим сроком годности расходуются в первую очередь.
 * Бессрочные/неизвестные партии ставятся в конец списка.
 */
export function sortBatchesByFefo<
	T extends {
		readonly expiryDate?: string | null | undefined;
		readonly expirationDate?: string | null | undefined;
	},
>(batches: readonly T[], referenceDate: string | Date = new Date()): T[] {
	return [...batches].sort((a, b) => {
		const expA = a.expiryDate || a.expirationDate;
		const expB = b.expiryDate || b.expirationDate;
		const tA = getFefoTrafficLight(expA, referenceDate);
		const tB = getFefoTrafficLight(expB, referenceDate);

		// Непросроченные сортируются по возрастанию оставшихся дней (ближайшие первыми)
		if (tA.daysLeft > 0 && tB.daysLeft > 0) {
			return tA.daysLeft - tB.daysLeft;
		}
		// Действующие партии всегда перед просроченными
		if (tA.daysLeft > 0 && tB.daysLeft <= 0) return -1;
		if (tA.daysLeft <= 0 && tB.daysLeft > 0) return 1;

		return tA.daysLeft - tB.daysLeft;
	});
}

export interface FefoBatchAllocation<T> {
	readonly batch: T;
	readonly allocatedQuantity: number;
}

export interface FefoDeductionResolutionResult<T> {
	readonly allocatedBatches: ReadonlyArray<FefoBatchAllocation<T>>;
	readonly allocatedTotalQuantity: number;
	readonly remainingDeficit: number;
	readonly blockedExpiredBatches: ReadonlyArray<{
		readonly batch: T;
		readonly alertMessage: string;
	}>;
	readonly hasOverdraft: boolean;
}

/**
 * Подбор партий для списания по правилу FEFO с жесткой блокировкой просроченных партий.
 * Если партия просрочена — она блокируется для утилизации и не списывается пациенту.
 * Если годных остатков не хватает — фиксируется овердрафт для автономии врача.
 */
export function resolveFefoDeductionBatches<
	T extends {
		readonly id?: string | undefined;
		readonly expiryDate?: string | null | undefined;
		readonly expirationDate?: string | null | undefined;
		readonly batchNumber?: string | null | undefined;
		readonly lotNumber?: string | null | undefined;
		readonly stockQuantity?: number | undefined;
	},
>(
	batches: readonly T[],
	requiredQuantity: number,
	referenceDate: string | Date = new Date(),
): FefoDeductionResolutionResult<T> {
	const sorted = sortBatchesByFefo(batches, referenceDate);
	const allocatedBatches: Array<FefoBatchAllocation<T>> = [];
	const blockedExpiredBatches: Array<{ batch: T; alertMessage: string }> = [];

	let remainingNeeded = Math.max(0, requiredQuantity);
	let allocatedTotal = 0;

	for (const b of sorted) {
		const validation = validateBatchForClinicalUse(b, referenceDate);
		if (!validation.isAllowed) {
			blockedExpiredBatches.push({
				batch: b,
				alertMessage: validation.alertMessage!,
			});
			continue;
		}

		if (remainingNeeded <= 0) break;

		const availableQty = Math.max(0, Number(b.stockQuantity) || 0);
		if (availableQty <= 0) continue;

		const deductQty = Math.min(availableQty, remainingNeeded);
		allocatedBatches.push({
			batch: b,
			allocatedQuantity: deductQty,
		});
		allocatedTotal += deductQty;
		remainingNeeded -= deductQty;
	}

	const hasOverdraft = remainingNeeded > 0;

	return {
		allocatedBatches,
		allocatedTotalQuantity: allocatedTotal,
		remainingDeficit: remainingNeeded,
		blockedExpiredBatches,
		hasOverdraft,
	};
}
