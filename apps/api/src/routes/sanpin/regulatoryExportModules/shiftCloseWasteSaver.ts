/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseWasteSaver.ts
 * Сохранение отходов при закрытии смены СанПиН.
 * Мандат 8b: строго <= 120 строк.
 */

import type { TenantDb } from "../../../db/rls.js";
import { medicalWasteLogs } from "../../../db/schema.js";
import { buildCanonicalShiftWasteRecords } from "../wasteModules/canonicalShiftWasteRecords.js";

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
	const canonicalRecords = buildCanonicalShiftWasteRecords({
		organizationId,
		logDate: new Date(dateStr),
		operatorId,
		dateStr,
		defaultOperatorName,
		barcode: w?.barcode ? String(w.barcode) : undefined,
		sealNumber: w?.sealNumber ? String(w.sealNumber) : undefined,
		classAWeightKg: w?.classAWeightKg ? Number(w.classAWeightKg) : undefined,
		classBSoftWeightKg: w?.classBSoftWeightKg ? Number(w.classBSoftWeightKg) : undefined,
		classBSharpsWeightKg: w?.classBWeightKg ? Number(w.classBWeightKg) : undefined,
		carpulesCount: typeof w?.carpulesCount === "number" ? w.carpulesCount : undefined,
		needlesCount: typeof w?.needlesCount === "number" ? w.needlesCount : undefined,
	});

	await tx.insert(medicalWasteLogs).values(canonicalRecords);
	return canonicalRecords.length;
}
