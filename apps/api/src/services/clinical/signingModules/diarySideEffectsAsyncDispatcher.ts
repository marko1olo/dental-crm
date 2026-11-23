import { and, eq } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { doctorCommissions } from "../../../db/schema.js";
import { TreatmentConsumablesService } from "../../treatmentConsumables/index.js";
import type { DiaryDbTransaction } from "./signatureTypeVerifier.js";

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

const fallbackLogger: DiarySideEffectsLogger = {
	warn: (msg: string, ...args: unknown[]) => {
		process.stderr.write(`[WARN] ${msg} ${args.length > 0 ? JSON.stringify(args) : ""}\n`);
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
			const deductionResult = await TreatmentConsumablesService.deductForVisit(tx, {
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
					isOverdraft: Boolean(deductionResult.isOverdraft || (d.remainingStock != null && d.remainingStock < 0)),
				});
			}
		} catch (error) {
			// Тихий бэк-офис: логируем через инжектированный логгер, не прерываем подписание дневника врачом
			log.warn("[DiarySigningSideEffects] Списание материалов пропущено:", error);
		}
	}

	// 2. Ставка врача в doctor_commissions (если ещё не заведена)
	if (userId) {
		try {
			const [existingCommission] = await tx
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
				await tx.insert(doctorCommissions).values({
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
		} catch (error) {
			log.warn("[DiarySigningSideEffects] Начисление комиссии пропущено:", error);
		}
	}

	return { deductions, completedTreatmentItems };
}
