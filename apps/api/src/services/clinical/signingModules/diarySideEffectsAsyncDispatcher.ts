import { and, eq } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { withSavepoint } from "../../../db/rls.js";
import { doctorCommissions } from "../../../db/schema.js";
import { TreatmentConsumablesService } from "../../treatmentConsumables/index.js";
import type { DiaryDbTransaction } from "./signatureTypeVerifier.js";
import { createApiLogger } from "../../../observability/logger.js";

export interface DiarySideEffectsLogger {
	warn(msg: string, ...args: unknown[]): void;
	error?(msg: string, ...args: unknown[]): void;
	info?(msg: string, ...args: unknown[]): void;
}

export interface DiaryStockDeduction {
	inventoryItemId: string;
	inventoryItemName: string;
	quantityChanged: string;
	unitCostRub?: string | null;
	isOverdraft?: boolean;
}

export interface DiarySideEffectsResult {
	deductions: DiaryStockDeduction[];
	completedTreatmentItems: number;
}

const apiLogger = createApiLogger("diarySideEffects");

const fallbackLogger: DiarySideEffectsLogger = {
	warn: (msg: string, ...args: unknown[]) => {
		apiLogger.warn({ args }, msg);
	},
	error: (msg: string, ...args: unknown[]) => {
		apiLogger.error({ args }, msg);
	},
	info: (msg: string, ...args: unknown[]) => {
		apiLogger.info({ args }, msg);
	},
};

/**
 * Безопасное фоновое списание материалов и начисление комиссии врача.
 * Складские и бухгалтерские операции НИКОГДА не должны блокировать подписание (Мандаты 8e, 8v, 8aa).
 */
export async function dispatchDiarySigningSideEffects(
	tx: DiaryDbTransaction,
	params: {
		organizationId: string;
		visitId: string | null;
		userId: string | null;
		logger?: FastifyBaseLogger | DiarySideEffectsLogger | undefined;
	},
): Promise<DiarySideEffectsResult> {
	const { organizationId, visitId, userId, logger } = params;
	const log = logger ?? fallbackLogger;
	const deductions: DiaryStockDeduction[] = [];
	let completedTreatmentItems = 0;

	// 1. Списание расходников по техкартам и закрытие выполненных услуг
	if (visitId) {
		try {
			await withSavepoint(tx, async (spTx) => {
				const deductionResult = await TreatmentConsumablesService.deductForVisit(spTx, {
					organizationId,
					visitId,
					userId,
					transactionType: "auto_deduct",
				});
				completedTreatmentItems = deductionResult.completedTreatmentItems;
				for (const d of deductionResult.deductions) {
					deductions.push({
						inventoryItemId: d.inventoryItemId,
						inventoryItemName: d.inventoryItemName,
						quantityChanged: String(d.quantityChanged),
						unitCostRub: d.unitCostRub != null ? String(d.unitCostRub) : null,
						isOverdraft: Boolean(
							deductionResult.isOverdraft ||
								(d.remainingStock != null && d.remainingStock < 0),
						),
					});
				}
			});
		} catch (error) {
			// Savepoint откачен безопасно (без отравления PG TX 25P02); дневник не прерывается (Мандаты 8e, 8v, 8aa)
			log.warn("[DiarySigningSideEffects] Списание материалов пропущено:", error);
		}
	}

	// 2. Ставка врача в doctor_commissions (если ещё не заведена)
	if (userId) {
		try {
			await withSavepoint(tx, async (spTx) => {
				const [existingCommission] = await spTx
					.select()
					.from(doctorCommissions)
					.where(
						and(
							eq(doctorCommissions.userId, userId),
							eq(doctorCommissions.organizationId, organizationId),
						),
					)
					.limit(1);

				if (!existingCommission) {
					await spTx.insert(doctorCommissions).values({
						organizationId,
						userId,
						specialty: "universal",
						serviceCategory: "therapy",
						commissionPct: "30.00",
						commissionPercent: "30.00",
						materialCostDeductionPct: "100.00",
						isActive: true,
					});
				}
			});
		} catch (error) {
			log.warn("[DiarySigningSideEffects] Начисление комиссии пропущено:", error);
		}
	}

	return { deductions, completedTreatmentItems };
}
