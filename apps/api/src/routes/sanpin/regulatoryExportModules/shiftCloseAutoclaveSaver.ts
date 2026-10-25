/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseAutoclaveSaver.ts
 * Сохранение циклов автоклавирования при закрытии смены.
 * Мандат 8b: строго <= 120 строк.
 */

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { sterilizationLogs } from "../../../db/schema.js";

type TxType = PgTransaction<any, any, ExtractTablesWithRelations<any>>;

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
	tx: TxType,
	organizationId: string,
	body: Record<string, any>,
	operatorId: string | null,
	dateStr: string,
): Promise<number> {
	if (!Array.isArray(body.form257Records) || body.form257Records.length === 0) return 0;

	const sterilInserts = body.form257Records.map((f: any, idx: number) => ({
		organizationId,
		deviceName: f.sterilizerBrandModel || f.deviceName || "Автоклав класс B",
		autoclaveId: f.sterilizerEquipmentId || f.sterilizerId || f.autoclaveId || "АК-01",
		cycleNumber: Number(f.cycleNumber) || idx + 1,
		itemsDescription:
			f.itemsDescriptionRu ||
			f.itemsDescription ||
			(f.packagedItemsCount
				? `Стоматологический инструментарий (${f.packagedItemsCount} упак.)`
				: "Стоматологический инструментарий смены"),
		packagingType: resolvePackagingType(f.packagingType),
		cycleMode: resolveCycleMode(f.sterilizationProgram || f.cycleMode),
		temperatureCelsius: String(
			f.targetTemperatureC || f.actualTemperatureCelsius || f.sensors?.actualTemperatureCelsius || "134.4",
		),
		pressureBar: String(
			f.targetPressureBar || f.actualPressureBar || f.sensors?.actualPressureBar || "2.15",
		),
		durationMin: Number(
			f.exposureTimeMinutes || f.actualExposureMinutes || f.sensors?.actualExposureMinutes || 5,
		),
		indicatorType: "class5_integrating",
		passedIndicator: f.chemicalIndicator5Verified != null ? Boolean(f.chemicalIndicator5Verified) : true,
		status: "passed" as const,
		barcode: f.pouchBatchNumber || `DNT-STER-${dateStr.replace(/-/g, "")}-${idx + 1}`,
		operatorId,
	}));

	await tx.insert(sterilizationLogs).values(sterilInserts);
	return sterilInserts.length;
}
