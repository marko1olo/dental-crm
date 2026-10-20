import type { DomainStateHydrationReport } from "../types.js";
import { db } from "../../client.js";
import { eq } from "drizzle-orm";

export function iso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Время, которое база отдала нечитаемым, — это НЕ «сейчас».
 */
export function reportUnreadableTime(
	table: string,
	rowId: string,
	column: string,
	value: Date | string | null | undefined,
	report: DomainStateHydrationReport,
): void {
	const shown =
		value === null
			? "NULL"
			: value === undefined
				? "колонки нет в строке"
				: `«${String(value)}»`;
	console.error(
		`[domainStateHydration] ${table} ${rowId} (клиника ${report.organizationId}): ` +
			`колонка ${column} прочитана как ${shown} — время неизвестно. Строка НЕ переносится в рабочее ` +
			"состояние клиники. Подставить сюда часы сервера значило бы передвинуть запись на момент " +
			"открытия страницы: приём попал бы в расписание на сейчас, платёж — в кассовый отчёт за сегодня. " +
			"Исправьте значение в базе, после чего строка вернётся сама.",
	);
	report.warnings.push(
		`${table} ${rowId}: колонка ${column} не читается как время (${shown}). Строка пропущена — ` +
			"её время неизвестно, а текущее время вместо него было бы выдумкой.",
	);
}

/**
 * Время строки или `null` с записью причины в журнал. Ни при каких условиях — не
 * текущие часы; разбор в докстринге `reportUnreadableTime` выше.
 */
export function isoOrSkipRow(
	value: Date | string | null | undefined,
	table: string,
	rowId: string,
	column: string,
	report: DomainStateHydrationReport,
): string | null {
	const parsed = iso(value);
	if (parsed !== null) return parsed;
	reportUnreadableTime(table, rowId, column, value, report);
	return null;
}

export function parseJsonArray(value: unknown): string[] {
	if (Array.isArray(value))
		return value.filter((entry): entry is string => typeof entry === "string");
	if (typeof value !== "string" || !value.trim()) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((entry): entry is string => typeof entry === "string")
			: [];
	} catch {
		// Не JSON — трактуем как список через запятую (так хранятся chairs.specializations).
		return value
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
}

export function parseJsonObject<T>(value: unknown, fallback: T): T {
	if (value && typeof value === "object") return value as T;
	if (typeof value !== "string" || !value.trim()) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

/**
 * Проверяет строки по контракту и возвращает только валидные,
 * попутно считая отброшенные.
 */
export function collect<T>(
	rows: unknown[],
	validator: {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		safeParse: (input: unknown) => { success: boolean; data?: any };
	},
	label: string,
	report: DomainStateHydrationReport,
): T[] {
	const accepted: T[] = [];
	let skipped = 0;
	for (const row of rows) {
		const result = validator.safeParse(row);
		if (result.success) accepted.push(result.data as T);
		else skipped += 1;
	}
	report.counts[label] = accepted.length;
	if (skipped > 0) {
		report.skipped[label] = skipped;
		report.warnings.push(
			`${label}: ${skipped} строк(и) не соответствуют контракту и пропущены — проверьте данные в базе.`,
		);
	}
	return accepted;
}

/**
 * Читает один срез клиники.
 */
export async function selectByOrganization<T>(
	// biome-ignore lint/suspicious/noExplicitAny: drizzle-таблицы типизируются по-разному
	table: any,
	organizationId: string,
	label: string,
	report: DomainStateHydrationReport,
): Promise<T[]> {
	try {
		return (await db
			.select()
			.from(table)
			.where(eq(table.organizationId, organizationId))) as T[];
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		report.unavailable.push({ slice: label, message });
		report.warnings.push(
			`${label}: не удалось прочитать из базы (${message}).`,
		);
		console.error(
			`[DomainStateHydration] Срез "${label}" клиники ${organizationId} не прочитан:`,
			error,
		);
		return [];
	}
}
