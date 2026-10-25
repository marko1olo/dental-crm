/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseWasteSaver.ts
 * Сохранение отходов при закрытии смены СанПиН.
 * Мандат 8b: строго <= 120 строк.
 */

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { medicalWasteLogs } from "../../../db/schema.js";

type TxType = PgTransaction<any, any, ExtractTablesWithRelations<any>>;

export async function saveShiftWasteRecords(
	tx: TxType,
	organizationId: string,
	body: Record<string, any>,
	operatorId: string | null,
	dateStr: string,
	defaultOperatorName: string,
): Promise<number> {
	if (Array.isArray(body.wasteRecords) && body.wasteRecords.length > 0) {
		const wasteInserts = body.wasteRecords.map((w: any) => ({
			organizationId,
			operationType: "accumulation" as const,
			logDate: new Date(dateStr),
			wasteClass: (w.wasteClass === "B" || w.wasteClass === "class_B" ? "class_B" : "class_A") as "class_B" | "class_A",
			wasteDescription: w.wasteDescription || "Медицинские отходы смены",
			packageType: (w.packageType || (w.wasteClass === "B" || w.wasteClass === "class_B" ? "yellow_container_sharps" : "white_bag")) as any,
			packageCount: Number(w.packagesCount || 1),
			weightKg: String(w.netWeightGrams ? (Number(w.netWeightGrams) / 1000).toFixed(3) : w.weightKg || "0.350"),
			disinfectionMethod: (w.disinfectionMethod === "chemical" ? "chemical_soaking" : w.disinfectionMethod || "chemical_soaking") as any,
			disinfectantUsed: w.disinfectantUsed || "Аламинол 5%",
			transferActNumber: w.barcode || `ACT-W-${dateStr}`,
			responsibleStaffId: operatorId,
			notes: `Санитарные нормы. Ответственный: ${w.responsibleStaffName || defaultOperatorName}`,
		}));
		await tx.insert(medicalWasteLogs).values(wasteInserts);
		return wasteInserts.length;
	}

	if (body.waste) {
		const w = body.waste;
		const wasteInserts = [
			{
				organizationId,
				operationType: "accumulation" as const,
				logDate: new Date(dateStr),
				wasteClass: "class_B" as const,
				wasteDescription: `Отработанные пустые карпулы анестетиков стеклянные (${w.carpulesCount ?? 8} шт.), иглы/скальпели (${w.needlesCount ?? 8} шт.)`,
				packageType: (w.packageType || "yellow_container_sharps") as any,
				packageCount: 1,
				weightKg: String(w.classBWeightKg || 0.45),
				disinfectionMethod: "chemical_soaking" as const,
				disinfectantUsed: "Аламинол 5% / Дезофран",
				transferActNumber: w.barcode || `ACT-B-${dateStr}`,
				responsibleStaffId: operatorId,
				notes: `Пломба ${w.sealNumber || "DNT-PL-01"}. Сдано: ${defaultOperatorName}`,
			},
			{
				organizationId,
				operationType: "accumulation" as const,
				logDate: new Date(dateStr),
				wasteClass: "class_A" as const,
				wasteDescription: "Неопасные отходы (канцелярия, упаковочная бумага, бытовой мусор)",
				packageType: "white_bag" as any,
				packageCount: 1,
				weightKg: String(w.classAWeightKg || 1.8),
				disinfectionMethod: "not_required" as const,
				disinfectantUsed: null,
				transferActNumber: null,
				responsibleStaffId: operatorId,
				notes: "ТКО по санитарным нормам",
			},
		];
		await tx.insert(medicalWasteLogs).values(wasteInserts);
		return wasteInserts.length;
	}

	return 0;
}
