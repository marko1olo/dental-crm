/**
 * autoBomWriteoffService.ts — Layer 3: Фоновое автосписание материалов по техкартам (BOM).
 *
 * Реализует Мандаты 8e (Автономия врача), 8k (CRM != симулятор реальности), 8n (Суверенитет масштаба):
 * 1. Автоматический БОМ (Bill of Materials) в 1 клик/фоне:
 *    Оказал услугу (например, A16.07.002 «Лечение кариеса») -> в фоне списывается расход по техкарте
 *    (анестетик, адгезив, композит, матрица, СИЗ).
 * 2. Мягкий овердрафт (Soft Negative Stock, isOverdraft: true):
 *    Дефицит на складе НИКОГДА не блокирует завершение приёма и формирование чека.
 * 3. Партионный учёт FEFO (First Expired, First Out) с изоляцией просроченных партий.
 */

import type { DbExecutor } from "./types.js";
import { deductForVisit } from "./stockDeduction.js";
import type {
	StockDeductionRecord,
	StockDeductionResult,
	StockDeductionWarning,
} from "./stockDeductionModules/stockDeductionTypes.js";

export interface AutoBomWriteoffServiceItem {
	serviceId: string;
	quantity?: number;
}

export interface AutoBomWriteoffParams {
	organizationId: string;
	visitId: string;
	services?: AutoBomWriteoffServiceItem[] | undefined;
	userId?: string | null | undefined;
	transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
	clientMutationId?: string | null | undefined;
	allowOverdraft?: boolean | undefined;
	notes?: string | null | undefined;
	carpulesCount?: number | null | undefined;
	drugName?: string | null | undefined;
}

export interface AutoBomWriteoffResult extends StockDeductionResult {
	success: boolean;
}

/**
 * Фоновое списание расходных материалов по техкартам оказанных услуг визита (BOM).
 * Поддерживает мягкий овердрафт склада без блокировки клинического приёма.
 */
export async function executeAutoBomWriteoff(
	tx: DbExecutor,
	params: AutoBomWriteoffParams,
): Promise<AutoBomWriteoffResult> {
	const {
		organizationId,
		visitId,
		services = [],
		userId = null,
		transactionType = "auto_deduct",
		clientMutationId = null,
		allowOverdraft = true,
		carpulesCount = null,
		drugName = null,
	} = params;

	const deductionResult = await deductForVisit(tx, {
		organizationId,
		visitId,
		services: services.map((s) => ({
			serviceId: s.serviceId,
			quantity: s.quantity ?? 1,
		})),
		userId,
		transactionType,
		clientMutationId,
		allowOverdraft,
		carpulesCount: carpulesCount ?? undefined,
		drugName: drugName ?? undefined,
	});

	return {
		success: true,
		...deductionResult,
	};
}
