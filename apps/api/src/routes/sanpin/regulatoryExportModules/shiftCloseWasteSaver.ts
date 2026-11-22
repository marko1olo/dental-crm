/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseWasteSaver.ts
 * Сохранение отходов при закрытии смены СанПиН.
 * Мандат 8b: строго <= 120 строк.
 */

import type { TenantDb } from "../../../db/rls.js";
import { medicalWasteLogs } from "../../../db/schema.js";

export async function saveShiftWasteRecords(
	tx: TenantDb,
	organizationId: string,
	body: Record<string, unknown>,
	operatorId: string | null,
	dateStr: string,
	defaultOperatorName: string,
): Promise<number> {
	const wasteRecords = Array.isArray(body.wasteRecords)
		? (body.wasteRecords as Record<string, unknown>[])
		: [];

	if (wasteRecords.length > 0) {
		const wasteInserts = wasteRecords.map((w) => ({
			organizationId,
			operationType: "accumulation" as const,
			logDate: new Date(dateStr),
			wasteClass: (w.wasteClass === "B" || w.wasteClass === "class_B" ? "class_B" : "class_A") as "class_B" | "class_A",
			wasteDescription: String(w.wasteDescription || "Медицинские отходы смены"),
			packageType: String(w.packageType || (w.wasteClass === "B" || w.wasteClass === "class_B" ? "yellow_container_sharps" : "white_bag")),
			packageCount: Number(w.packagesCount || 1),
			weightKg: String(w.netWeightGrams ? (Number(w.netWeightGrams) / 1000).toFixed(3) : w.weightKg || "0.350"),
			disinfectionMethod: String(w.disinfectionMethod === "chemical" ? "chemical_soaking" : w.disinfectionMethod || "chemical_soaking"),
			disinfectantUsed: w.disinfectantUsed ? String(w.disinfectantUsed) : "Аламинол 5%",
			transferActNumber: String(w.barcode || `ACT-W-${dateStr}`),
			responsibleStaffId: operatorId,
			notes: `Санитарные нормы. Ответственный: ${(w.responsibleStaffName as string) || defaultOperatorName}`,
		}));
		await tx.insert(medicalWasteLogs).values(wasteInserts);
		return wasteInserts.length;
	}

	const w = body.waste as Record<string, unknown> | undefined;
	if (w) {
		const wasteInserts = [
			{
				organizationId,
				operationType: "accumulation" as const,
				logDate: new Date(dateStr),
				wasteClass: "class_B" as const,
				wasteDescription: `Отработанные пустые карпулы анестетиков стеклянные (${w.carpulesCount ?? 8} шт.), иглы/скальпели (${w.needlesCount ?? 8} шт.)`,
				packageType: String(w.packageType || "yellow_container_sharps"),
				packageCount: 1,
				weightKg: String(w.classBWeightKg || 0.45),
				disinfectionMethod: "chemical_soaking" as const,
				disinfectantUsed: "Аламинол 5% / Дезофран",
				transferActNumber: String(w.barcode || `ACT-B-${dateStr}`),
				responsibleStaffId: operatorId,
				notes: `Пломба ${(w.sealNumber as string) || "DNT-PL-01"}. Сдано: ${defaultOperatorName}`,
			},
			{
				organizationId,
				operationType: "accumulation" as const,
				logDate: new Date(dateStr),
				wasteClass: "class_A" as const,
				wasteDescription: "Неопасные отходы (канцелярия, упаковочная бумага, бытовой мусор)",
				packageType: "white_bag",
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
