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
	insertedSteril: Array<(typeof sterilizationLogs.$inferSelect) & { packagedItemsCount: number }>;
}> {
	const { organizationId, body, operatorId, todayStr } = params;

	// Поддержка пакетного массива смен batchDays (ретроспективное сохранение смен)
	if (Array.isArray(body.batchDays) && body.batchDays.length > 0) {
		const workingDays = body.batchDays.filter(
			(d) => (d as Record<string, unknown>).isWorkingDay !== false,
		);
		const daysToProcess = workingDays.length > 0 ? workingDays : body.batchDays;

		const psoValues: Array<typeof preSterilizationCleaningLogs.$inferInsert> = daysToProcess.map((d) => {
			const day = d as Record<string, unknown>;
			const dayDateStr = typeof day.date === "string" ? day.date : todayStr;
			const dayTimestamp = new Date(`${dayDateStr}T10:00:00.000Z`);
			const validTimestamp = Number.isNaN(dayTimestamp.getTime()) ? new Date() : dayTimestamp;
			const batchCount = Number(day.traysProcessedCount || day.psoBatchCount || 100);
			const sampleCount = Number(day.psoSampleCount || 3);
			return {
				organizationId,
				testType: "both" as const,
				batchItemCount: batchCount,
				testedSampleCount: sampleCount,
				isAzopyramNegative: day.isAzopyramNegative !== false,
				isPhenolphthaleinNegative: day.isPhenolphthaleinNegative !== false,
				isBatchApproved: day.isPsoApproved !== false,
				detergentBrand: (day.psoDetergent as string) || "Биолот 0.5%",
				operatorId,
				notes: (day.notes as string) || `Ретроспективная смена (${dayDateStr}): клиническая норма`,
				timestamp: validTimestamp,
			};
		});

		const sterilValues: Array<typeof sterilizationLogs.$inferInsert> = [];
		for (const d of daysToProcess) {
			const day = d as Record<string, unknown>;
			const dayDateStr = typeof day.date === "string" ? day.date : todayStr;
			const dayTimestamp = new Date(`${dayDateStr}T12:00:00.000Z`);
			const validTimestamp = Number.isNaN(dayTimestamp.getTime()) ? new Date() : dayTimestamp;
			const cyclesCount = Math.max(1, Number(day.autoclaveCyclesCount || 1));
			for (let c = 1; c <= cyclesCount; c++) {
				sterilValues.push({
					organizationId,
					deviceName: String(day.sterilizerModelName || body.autoclaveId || "Автоклав Euronda E9 Next (Класс B)"),
					autoclaveId: String(body.autoclaveId || "АК-01"),
					cycleNumber: c,
					itemsDescription: String(
						day.autoclaveRegimeTitle || "Стоматологический инструментарий смены",
					),
					packagingType: normalizePackagingType(
						typeof day.packagingType === "string" ? day.packagingType : "kraft_bag_combined",
					),
					temperatureCelsius: String(day.autoclaveTemperature || "134"),
					pressureBar: String(day.autoclavePressure || "2.15"),
					durationMin: Number(day.autoclaveDuration || 5),
					indicatorType: "class5_integrating",
					cycleMode: "B",
					passedIndicator: day.points5Passed !== false,
					status: "passed" as const,
					barcode: `DNT-STER-${dayDateStr.replace(/-/g, "")}-${c}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
					operatorId,
					timestamp: validTimestamp,
				});
			}
		}

		const psoRows = psoValues.length > 0 ? await tx.insert(preSterilizationCleaningLogs).values(psoValues).returning() : [];
		const sterilRows = sterilValues.length > 0 ? await tx.insert(sterilizationLogs).values(sterilValues).returning() : [];

		const sterilWithCounts = sterilRows.map((row) =>
			Object.assign(row, { packagedItemsCount: Math.max(1, Number(body.packagedItemsCount || 1)) }),
		);

		for (const d of daysToProcess) {
			const day = d as Record<string, unknown>;
			const dayDateStr = typeof day.date === "string" ? day.date : todayStr;
			await executeShiftBactericidalAndClimateLogs(tx, organizationId, dayDateStr, operatorId);
		}

		return { insertedPso: psoRows, insertedSteril: sterilWithCounts };
	}

	// 1. Пробы контроля предстерилизационной очистки
	const psoBatches = getShiftPsoBatches(body.psoRecords);
	const rawAutoclaveCycles = body.autoclaveCycles ?? body.autoclaveCycle ?? body.form257 ?? body.sterilizationRecords;
	const autoclaveCycles = getShiftSterilizationRecords(body.sterilizationRecords, rawAutoclaveCycles);

	const psoRows = await tx
		.insert(preSterilizationCleaningLogs)
		.values(
			psoBatches.map((p) => ({
				organizationId,
				testType: "both" as const,
				batchItemCount: Number(p.batchItemCount) || 100,
				testedSampleCount: Number(p.testedSampleCount) || 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isBatchApproved: true,
				detergentBrand: (p.detergentBrand as string) || "Биолот 0.5%",
				operatorId,
				notes: p.instrumentName
					? `${p.instrumentName} | ${(p.notes as string) || "Автопилот смены: клиническая норма"}`
					: (p.notes as string) || "Стоматологический инструментарий | Автопилот смены: клиническая норма",
			})),
		)
		.returning();

	// 2. Журнал автоклавирования
	const sterilRows = await tx
		.insert(sterilizationLogs)
		.values(
			autoclaveCycles.map((f, idx: number) => ({
				organizationId,
				deviceName: String(f.sterilizerBrandModel || "Автоклав Euronda E9 Next (Класс B)"),
				autoclaveId: String(f.sterilizerId || body.autoclaveId || "АК-01"),
				cycleNumber: Number(f.cycleNumber) || idx + 1,
				itemsDescription: String(
					f.itemsDescriptionRu || f.itemsDescription || f.sterilizedPacksSummary || "Стоматологический инструментарий смены",
				),
				packagingType: normalizePackagingType(typeof f.packagingType === "string" ? f.packagingType : undefined),
				temperatureCelsius: String(f.actualTemperatureCelsius ?? (f as Record<string, unknown>)["temperatureCelsius"] ?? (f as Record<string, unknown>)["temperatureC"] ?? "134"),
				pressureBar: String(f.actualPressureBar || f.pressureBar || "2.15"),
				durationMin: Number(f.actualExposureMinutes ?? (f as Record<string, unknown>)["durationMin"] ?? f.exposureMinutes ?? 5),
				indicatorType: "class5_integrating",
				cycleMode: "B",
				passedIndicator: true,
				status: "passed" as const,
				barcode: `DNT-STER-${todayStr.replace(/-/g, "")}-${idx + 1}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
				operatorId,
			})),
		)
		.returning();

	const sterilWithCounts = sterilRows.map((row, idx) => {
		const f = autoclaveCycles[idx];
		const packCount = Number(
			f?.packagedItemsCount ?? f?.count ?? body.packagedItemsCount ?? 1,
		);
		return Object.assign(row, { packagedItemsCount: Math.max(1, packCount) });
	});

	// 3. Бактерицидная обработка, климат и отходы
	await executeShiftBactericidalAndClimateLogs(tx, organizationId, todayStr, operatorId);

	return { insertedPso: psoRows, insertedSteril: sterilWithCounts };
}
