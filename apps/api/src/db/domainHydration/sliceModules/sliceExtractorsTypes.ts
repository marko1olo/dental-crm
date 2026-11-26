import type { DomainStateHydrationReport } from "../types.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { type TenantDb, withTenantCtx } from "../../rls.js";
import { eq, type Column } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

const logger = createApiLogger("domainStateHydration");

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
	logger.error(
		{
			table,
			rowId,
			column,
			shownValue: shown,
			organizationId: report.organizationId,
		},
		"Время неизвестно: строка НЕ переносится в рабочее состояние клиники",
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
		safeParse: (input: unknown) => { success: boolean; data?: unknown };
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

export type OrganizationScopedPgTable = PgTable & { organizationId: Column };

/**
 * Читает один срез клиники.
 */
export async function selectByOrganization<T>(
	table: OrganizationScopedPgTable,
	organizationId: string,
	label: string,
	report: DomainStateHydrationReport,
	externalTx?: TenantDb,
): Promise<T[]> {
	try {
		if (externalTx) {
			return (await externalTx
				.select()
				.from(table)
				.where(eq(table.organizationId, organizationId))) as T[];
		}
		return (await withTenantCtx(organizationId, async (tx) =>
			tx
				.select()
				.from(table)
				.where(eq(table.organizationId, organizationId)),
		)) as T[];
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		report.unavailable.push({ slice: label, message });
		report.warnings.push(
			`${label}: не удалось прочитать из базы (${message}).`,
		);
		logger.error(
			{
				err: safeLogError(error),
				slice: label,
				organizationId,
			},
			"Срез клиники не прочитан из базы",
		);
		return [];
	}
}
