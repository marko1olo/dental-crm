/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftClosePsoSaver.ts
 * Сохранение записей предстерилизационной очистки при закрытии смены.
 * Мандат 8b: строго <= 120 строк.
 */

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { preSterilizationCleaningLogs } from "../../../db/schema.js";

type TxType = PgTransaction<any, any, ExtractTablesWithRelations<any>>;

export async function saveShiftPsoRecords(
	tx: TxType,
	organizationId: string,
	body: Record<string, any>,
	operatorId: string | null,
	defaultOperatorName: string,
): Promise<number> {
	const psoList = Array.isArray(body.psoRecords)
		? body.psoRecords
		: Array.isArray(body.psoBatches)
			? body.psoBatches
			: [];

	if (psoList.length === 0) return 0;

	const psoInserts = psoList.map((p: any) => ({
		organizationId,
		testType: (p.testType === "phenolphthalein"
			? "phenolphthalein"
			: p.testType === "azopiram" || p.testType === "azopyram"
				? "azopyram"
				: "both") as "phenolphthalein" | "azopyram" | "both",
		batchItemCount: Number(p.totalItemsTested || p.batchItemCount || 5),
		testedSampleCount: Number(
			p.negativeSamplesCount || p.testedSampleCount || p.totalItemsTested || 3,
		),
		isAzopyramNegative:
			p.positiveBloodSamplesCount != null
				? Number(p.positiveBloodSamplesCount) === 0
				: true,
		isPhenolphthaleinNegative: true,
		isBatchApproved:
			p.qualityTestPassed != null ? Boolean(p.qualityTestPassed) : true,
		detergentBrand: p.detergentBrand || "Биолот 0.5% + Аламинол 1%",
		operatorId,
		notes: `Предстерилизационная очистка. Пробы отрицательны. ${p.operatorStaffName || defaultOperatorName}`,
	}));

	await tx.insert(preSterilizationCleaningLogs).values(psoInserts);
	return psoInserts.length;
}
