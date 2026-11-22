/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseAutoclaveSaver.ts
 * Сохранение циклов автоклавирования при закрытии смены.
 * Мандат 8b: строго <= 120 строк.
 */

import type { TenantDb } from "../../../db/rls.js";
import { sterilizationLogs } from "../../../db/schema.js";
import { executeSterilizationConsumablesDeduction } from "../sterilizationModules/sterilizationStockDeduction.js";

function resolvePackagingType(raw?: string): string {
	const valid = ["kraft_heat_sealed", "kraft_self_adhesive", "laminated_heat_sealed", "metal_cassette", "other"];
	if (raw && valid.includes(raw)) return raw;
	if (raw && (raw.includes("laminat") || raw.includes("пакет"))) return "laminated_heat_sealed";
	if (raw && (raw.includes("adhesive") || raw.includes("samokley"))) return "kraft_self_adhesive";
	if (raw && (raw.includes("cassette") || raw.includes("kasseta"))) return "metal_cassette";
	if (raw && raw.includes("kraft")) return "kraft_heat_sealed";
	return "laminated_heat_sealed";
}

function resolveCycleMode(raw?: string): string {
	const valid = ["B", "S", "N", "dry_heat_180", "dry_heat_160", "plasma_vh2o2", "ethylene_oxide"];
	if (raw && valid.includes(raw)) return raw;
	if (raw && (raw.includes("134") || raw.includes("B"))) return "B";
	if (raw && raw.includes("S")) return "S";
	if (raw && raw.includes("N")) return "N";
	return "B";
}

export async function saveShiftAutoclaveRecords(
	tx: TenantDb,
	organizationId: string,
	body: Record<string, unknown>,
	operatorId: string | null,
	dateStr: string,
): Promise<number> {
	const rawAutoclaveRecords =
		body.autoclaveCycles ??
		body.sterilizationRecords ??
		body.form257Records ??
		body.form257 ??
		[];
	const autoclaveRecords = Array.isArray(rawAutoclaveRecords)
		? (rawAutoclaveRecords as Record<string, unknown>[])
		: [];
	if (autoclaveRecords.length === 0) return 0;

	const sterilInserts = autoclaveRecords.map((f, idx: number) => ({
		organizationId,
		deviceName: String(f.sterilizerBrandModel || f.deviceName || "Автоклав класс B"),
		autoclaveId: String(f.sterilizerEquipmentId || f.sterilizerId || f.autoclaveId || "АК-01"),
		cycleNumber: Number(f.cycleNumber) || idx + 1,
		itemsDescription: String(
			f.itemsDescriptionRu ||
			f.itemsDescription ||
			(f.packagedItemsCount
				? `Стоматологический инструментарий (${f.packagedItemsCount} упак.)`
				: "Стоматологический инструментарий смены"),
		),
		packagingType: resolvePackagingType(typeof f.packagingType === "string" ? f.packagingType : undefined),
		cycleMode: resolveCycleMode(typeof (f.sterilizationProgram || f.cycleMode) === "string" ? String(f.sterilizationProgram || f.cycleMode) : undefined),
		temperatureCelsius: String(
			f.targetTemperatureC || f.actualTemperatureCelsius || (f.sensors as Record<string, unknown> | undefined)?.actualTemperatureCelsius || "134.4",
		),
		pressureBar: String(
			f.targetPressureBar || f.actualPressureBar || (f.sensors as Record<string, unknown> | undefined)?.actualPressureBar || "2.15",
		),
		durationMin: Number(
			f.exposureTimeMinutes || f.actualExposureMinutes || (f.sensors as Record<string, unknown> | undefined)?.actualExposureMinutes || 5,
		),
		indicatorType: "class5_integrating",
		passedIndicator: f.chemicalIndicator5Verified != null ? Boolean(f.chemicalIndicator5Verified) : true,
		status: "passed" as const,
		barcode: String(f.pouchBatchNumber || `DNT-STER-${dateStr.replace(/-/g, "")}-${idx + 1}`),
		operatorId,
	}));

	await tx.insert(sterilizationLogs).values(sterilInserts);

	for (const f of autoclaveRecords) {
		const rawCount = f.packagedItemsCount ?? f.count ?? (body as Record<string, unknown>).packagedItemsCount;
		const packsCount = Number(rawCount) > 0 ? Number(rawCount) : 1;
		await executeSterilizationConsumablesDeduction({
			organizationId,
			userId: operatorId,
			count: packsCount,
			packagingType: resolvePackagingType(typeof f.packagingType === "string" ? f.packagingType : undefined),
			indicatorType: "class5_integrating",
			cycleNumber: Number(f.cycleNumber) || 1,
			barcode: String(f.pouchBatchNumber || `DNT-STER-${dateStr.replace(/-/g, "")}-1`),
		}, tx);
	}

	return sterilInserts.length;
}
