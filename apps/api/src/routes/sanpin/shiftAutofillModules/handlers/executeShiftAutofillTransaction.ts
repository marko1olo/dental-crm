import crypto from "node:crypto";
import type { TenantDb } from "../../../../db/rls.js";
import {
	preSterilizationCleaningLogs,
	sterilizationLogs,
} from "../../../../db/schema.js";
import {
	getShiftPsoBatches,
	getShiftSterilizationRecords,
	normalizePackagingType,
} from "../shiftAutofillCalculators.js";
import type { AutofillMonthInput, AutofillShiftInput } from "../shiftAutofillSchemas.js";
import { executeShiftBactericidalAndClimateLogs } from "./executeShiftSecondaryLogs.js";

export type DatabaseTransaction = TenantDb;

export interface ShiftAutofillParams {
	organizationId: string;
	body: AutofillShiftInput;
	operatorId: string | null;
	todayStr: string;
}

export interface MonthAutofillParams {
	organizationId: string;
	body: AutofillMonthInput;
	operatorId: string | null;
}

export async function executeShiftAutofillTransaction(
	tx: DatabaseTransaction,
	params: ShiftAutofillParams,
): Promise<{
	insertedPso: (typeof preSterilizationCleaningLogs.$inferSelect)[];
	insertedSteril: (typeof sterilizationLogs.$inferSelect)[];
}> {
	const { organizationId, body, operatorId, todayStr } = params;

	// 1. Пробы контроля очистки (ПСО)
	const psoBatches = getShiftPsoBatches(body.psoRecords);
	const form257 = getShiftSterilizationRecords(body.sterilizationRecords, body.form257);

	const psoRows = await tx
		.insert(preSterilizationCleaningLogs)
		.values(
			psoBatches.map((p: any) => ({
				organizationId,
				testType: "both" as const,
				batchItemCount: Number(p.batchItemCount) || 100,
				testedSampleCount: Number(p.testedSampleCount) || 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isBatchApproved: true,
				detergentBrand: p.detergentBrand || "Биолот 0.5%",
				operatorId,
				notes: p.instrumentName
					? `${p.instrumentName} | ${p.notes || "⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21"}`
					: p.notes || "Стоматологический инструментарий | ⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21",
			})),
		)
		.returning();

	// 2. Журнал автоклавирования
	const sterilRows = await tx
		.insert(sterilizationLogs)
		.values(
			form257.map((f: any, idx: number) => ({
				organizationId,
				deviceName: f.sterilizerBrandModel || "Автоклав Euronda E9 Next (Класс B)",
				autoclaveId: f.sterilizerId || "АК-01",
				cycleNumber: Number(f.cycleNumber) || idx + 1,
				itemsDescription:
					f.itemsDescriptionRu || f.itemsDescription || f.sterilizedPacksSummary || "Стоматологический инструментарий смены",
				packagingType: normalizePackagingType(f.packagingType),
				temperatureCelsius: String(f.actualTemperatureCelsius || f.temperatureCelsius || f.temperatureC || "134"),
				pressureBar: String(f.actualPressureBar || f.pressureBar || "2.15"),
				durationMin: Number(f.actualExposureMinutes || f.durationMin || f.exposureMinutes) || 5,
				indicatorType: "class5_integrating",
				cycleMode: "B",
				passedIndicator: true,
				status: "passed" as const,
				barcode: `DNT-STER-${todayStr.replace(/-/g, "")}-${idx + 1}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
				operatorId,
			})),
		)
		.returning();

	// 3. Бактерицидная обработка, климат и отходы
	await executeShiftBactericidalAndClimateLogs(tx, organizationId, todayStr, operatorId);

	return { insertedPso: psoRows, insertedSteril: sterilRows };
}
