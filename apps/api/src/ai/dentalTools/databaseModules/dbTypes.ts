/**
 * dbTypes.ts — Базовые типы, валидация и утилиты для CRM Database AI Tools.
 * Соответствует Мандатам 8b (<= 120 строк), 8e (автономия врача), 8n (целочисленные копейки).
 */

import { rublesToKopecks, kopecksToRubles } from "@dental/shared";
import type { db as defaultDb } from "../../../db/client.js";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import type { DentalToolContext } from "../types.js";

export type { DentalToolContext };

export type TwoPhaseGuardStatus = "confirmation_required" | "executed";
export type ToolDbClient = TenantDb | typeof defaultDb;

/**
 * Выполняет запрос или мутацию БД-тула в изолированном RLS-контексте `withTenantCtx`.
 * Если вызывающий код (например, unit-тест) передал явный `context.db`, использует его
 * (и при наличии `.transaction` оборачивает выполнение в транзакцию).
 */
export async function withToolTenantDb<T>(
	context: DentalToolContext,
	fn: (activeDb: ToolDbClient) => Promise<T>,
): Promise<T> {
	if (context.db) {
		const activeDb = context.db;
		if ("transaction" in activeDb && typeof activeDb.transaction === "function") {
			return await activeDb.transaction(async (tx) => fn(tx));
		}
		return await fn(activeDb);
	}
	return await withTenantCtx(context.organizationId, async (tx) => fn(tx));
}

/**
 * Валидация номера зуба по международной системе FDI (ISO 3950):
 * - Постоянные зубы: квадранты 1-4, зубы 1-8 (11-18, 21-28, 31-38, 41-48)
 * - Молочные зубы: квадранты 5-8, зубы 1-5 (51-55, 61-65, 71-75, 81-85)
 */
export function isValidFdiToothNumber(tooth: number): boolean {
	const isAdult = tooth >= 11 && tooth <= 48 && tooth % 10 >= 1 && tooth % 10 <= 8;
	const isPediatric = tooth >= 51 && tooth <= 85 && tooth % 10 >= 1 && tooth % 10 <= 5;
	return isAdult || isPediatric;
}

/**
 * Преобразование рублей в целочисленные копейки (Мандат 8n: целые числа amountKopecks)
 * SSOT: использует канонический rublesToKopecks из @dental/shared
 */
export function rubToKopecks(rub: number): bigint {
	return BigInt(rublesToKopecks(rub));
}

/**
 * Преобразование целочисленных копеек в рубли
 * SSOT: использует канонический kopecksToRubles из @dental/shared
 */
export const kopecksToRub = kopecksToRubles;
