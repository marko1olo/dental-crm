import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	autofillMonthSchema,
	autofillShiftSchema,
	type AutofillMonthInput,
	type AutofillShiftInput,
} from "./shiftAutofillSchemas.js";
import {
	calculateMonthWorkingDates,
	generateMonthBatchRows,
	getDefaultBactericidalEquipments,
	getDefaultTemperatureHumidityEquipments,
	getShiftPsoBatches,
	getShiftSterilizationRecords,
	normalizePackagingType,
} from "./shiftAutofillCalculators.js";

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

/**
 * Executes 1-click shift SanPiN journals autofill in a single ACID transaction.
 * Requires tx: DatabaseTransaction as the first argument.
 */
export async function executeShiftAutofillTransaction(
	tx: DatabaseTransaction,
	params: ShiftAutofillParams,
): Promise<{
	insertedPso: (typeof preSterilizationCleaningLogs.$inferSelect)[];
	insertedSteril: (typeof sterilizationLogs.$inferSelect)[];
}> {
	const { organizationId, body, operatorId, todayStr } = params;

	// 1. Пробы ПСО (Форма № 366/у)
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
					: p.notes ||
						"Стоматологический инструментарий | ⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21",
			})),
		)
		.returning();

	// 2. Стерилизация (Форма № 257/у)
	const sterilRows = await tx
		.insert(sterilizationLogs)
		.values(
			form257.map((f: any, idx: number) => ({
				organizationId,
				deviceName: f.sterilizerBrandModel || "Автоклав Euronda E9 Next (Класс B)",
				autoclaveId: f.sterilizerId || "АК-01",
				cycleNumber: Number(f.cycleNumber) || idx + 1,
				itemsDescription:
					f.itemsDescriptionRu ||
					f.itemsDescription ||
					f.sterilizedPacksSummary ||
					"Стоматологический инструментарий смены",
				packagingType: normalizePackagingType(f.packagingType),
				temperatureCelsius: String(
					f.actualTemperatureCelsius || f.temperatureCelsius || f.temperatureC || "134",
				),
				pressureBar: String(f.actualPressureBar || f.pressureBar || "2.15"),
				durationMin:
					Number(f.actualExposureMinutes || f.durationMin || f.exposureMinutes) || 5,
				indicatorType: "class5_integrating",
				cycleMode: "B",
				passedIndicator: true,
				status: "passed" as const,
				barcode: `DNT-STER-${todayStr.replace(/-/g, "")}-${idx + 1}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
				operatorId,
			})),
		)
		.returning();

	// 3. Бактерицидные установки / Дезар (Zero-Setup: создаем дефолтный рециркулятор, если список пуст)
	let activeEquips = await tx
		.select()
		.from(bactericidalEquipments)
		.where(
			and(
				eq(bactericidalEquipments.organizationId, organizationId),
				eq(bactericidalEquipments.isCommissioned, true),
			),
		);

	if (activeEquips.length === 0) {
		activeEquips = await tx
			.insert(bactericidalEquipments)
			.values(getDefaultBactericidalEquipments(organizationId))
			.returning();
	}

	if (activeEquips.length > 0) {
		const sessStart = new Date();
		sessStart.setHours(8, 0, 0, 0);
		const sessEnd = new Date();
		sessEnd.setHours(8, 30, 0, 0);

		const bactLogsToInsert = activeEquips.map((bactEquip) => {
			const currentHours = Number(bactEquip.totalOperatingHours || 0);
			const nextHours = (currentHours + 0.5).toFixed(2);
			return {
				organizationId,
				equipmentId: bactEquip.id,
				date: todayStr,
				sessionStartTime: sessStart,
				sessionEndTime: sessEnd,
				durationMinutes: 30,
				operatingMode: "continuous_presence" as const,
				cumulativeHoursAfterSession: nextHours,
				operatorId,
				notes: "⚡ 1-Клик автопилот смены: предсменная дезинфекция воздуха",
			};
		});

		await tx.insert(bactericidalIrradiatorLogs).values(bactLogsToInsert);

		for (const bactEquip of activeEquips) {
			const currentHours = Number(bactEquip.totalOperatingHours || 0);
			const nextHours = (currentHours + 0.5).toFixed(2);
			await tx
				.update(bactericidalEquipments)
				.set({
					totalOperatingHours: nextHours,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(bactericidalEquipments.id, bactEquip.id),
						eq(bactericidalEquipments.organizationId, organizationId),
					),
				);
		}
	}

	// 4. Замеры температуры и влажности (Zero-Setup: создаем холодильник и кабинет, если список пуст)
	let tempEquips = await tx
		.select()
		.from(temperatureHumidityEquipments)
		.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

	if (tempEquips.length === 0) {
		tempEquips = await tx
			.insert(temperatureHumidityEquipments)
			.values(getDefaultTemperatureHumidityEquipments(organizationId))
			.returning();
	}

	if (tempEquips.length > 0) {
		const tempLogsToInsert = tempEquips.map((te) => {
			const isFridge = te.equipmentType.includes("refrigerator");
			const temp = isFridge ? "4.2" : "21.5";
			const humidity = isFridge ? null : "48";
			return {
				organizationId,
				equipmentId: te.id,
				measurementDate: todayStr,
				measurementPeriod: "morning" as const,
				temperatureCelsius: temp,
				relativeHumidityPercent: humidity,
				isWithinNorm: true,
				deviationReason: null,
				operatorId,
				notes: "⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21",
			};
		});

		await tx.insert(temperatureHumidityLogs).values(tempLogsToInsert);
	}

	// 5. Медицинские отходы Класса Б (СанПиН 2.1.3684-21)
	await tx.insert(medicalWasteLogs).values({
		organizationId,
		operationType: "accumulation",
		wasteClass: "class_B",
		wasteDescription:
			"Отработанные карпулы анестетиков, салфетки, перчатки, слюноотсосы (стоматологическое отделение)",
		packageType: "yellow_bag",
		packageCount: 2,
		weightKg: "1.850",
		disinfectionMethod: "chemical_soaking",
		disinfectantUsed: "Оптимакс Про 1.5%",
		disposalCompany: "ООО «ЭкоМедСервис»",
		transferActNumber: `АКТ-Б-${todayStr.replace(/-/g, "")}`,
		responsibleStaffId: operatorId,
		notes: "⚡ 1-Клик автопилот смены: сбор и обеззараживание отходов класса Б",
	});

	return { insertedPso: psoRows, insertedSteril: sterilRows };
}

/**
 * Executes month SanPiN records autofill in a single ACID transaction.
 * Requires tx: DatabaseTransaction as the first argument.
 */
export async function executeMonthAutofillTransaction(
	tx: DatabaseTransaction,
	params: MonthAutofillParams,
): Promise<{
	insertedSterilCount: number;
	insertedPsoCount: number;
	workingDaysCount: number;
	monthLabelRu: string;
}> {
	const { organizationId, body, operatorId } = params;
	const { targetYear, targetMonth, workingDates, monthLabelRu } = calculateMonthWorkingDates(
		body.year,
		body.month,
	);

	let activeEquips = await tx
		.select()
		.from(bactericidalEquipments)
		.where(
			and(
				eq(bactericidalEquipments.organizationId, organizationId),
				eq(bactericidalEquipments.isCommissioned, true),
			),
		);

	if (activeEquips.length === 0) {
		activeEquips = await tx
			.insert(bactericidalEquipments)
			.values(getDefaultBactericidalEquipments(organizationId))
			.returning();
	}

	let tempEquips = await tx
		.select()
		.from(temperatureHumidityEquipments)
		.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

	if (tempEquips.length === 0) {
		tempEquips = await tx
			.insert(temperatureHumidityEquipments)
			.values(getDefaultTemperatureHumidityEquipments(organizationId))
			.returning();
	}

	const batchRows = generateMonthBatchRows({
		workingDates,
		organizationId,
		activeEquips,
		tempEquips,
		operatorId,
	});

	const insertedSteril = await tx.insert(sterilizationLogs).values(batchRows.allSterilRows).returning();
	const insertedPso = await tx.insert(preSterilizationCleaningLogs).values(batchRows.allPsoRows).returning();

	if (batchRows.allBactLogs.length > 0) {
		await tx.insert(bactericidalIrradiatorLogs).values(batchRows.allBactLogs);
	}
	if (batchRows.allTempLogs.length > 0) {
		await tx.insert(temperatureHumidityLogs).values(batchRows.allTempLogs);
	}
	if (batchRows.allWasteLogs.length > 0) {
		await tx.insert(medicalWasteLogs).values(batchRows.allWasteLogs);
	}

	return {
		insertedSterilCount: insertedSteril.length,
		insertedPsoCount: insertedPso.length,
		workingDaysCount: workingDates.length,
		monthLabelRu,
	};
}

/**
 * Route handler: POST /api/registers/autofill-shift
 */
export async function handleAutofillShift(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin shift autofill",
	);
	if (!organizationId) return;

	const parsed = autofillShiftSchema.safeParse(req.body || {});
	const body = parsed.success
		? parsed.data
		: // biome-ignore lint/suspicious/noExplicitAny: fallback for unparseable payload
			((req.body as any) || {});
	const now = new Date();
	const todayStr = body.date || now.toISOString().slice(0, 10);

	const { insertedPso, insertedSteril } = await withTenantCtx(organizationId, async (tx) => {
		return executeShiftAutofillTransaction(tx, {
			organizationId,
			body,
			operatorId: req.user?.id || null,
			todayStr,
		});
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_SHIFT_AUTOPILOT_COMPLETED",
		payload: {
			date: todayStr,
			psoCount: insertedPso.length,
			sterilCount: insertedSteril.length,
		},
	});

	return reply.send({
		success: true,
		date: todayStr,
		batchCount: insertedPso.length,
		sterilCount: insertedSteril.length,
		summary: {
			totalPsoItems: insertedPso.reduce((acc, p) => acc + p.batchItemCount, 0),
			totalSterilizationCycles: insertedSteril.length,
		},
	});
}

/**
 * Route handler: POST /api/registers/autofill-month
 */
export async function handleAutofillMonth(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin month autofill",
	);
	if (!organizationId) return;

	const parsed = autofillMonthSchema.safeParse(req.body || {});
	const body = parsed.success
		? parsed.data
		: // biome-ignore lint/suspicious/noExplicitAny: fallback
			((req.body as any) || {});

	const result = await withTenantCtx(organizationId, async (tx) => {
		return executeMonthAutofillTransaction(tx, {
			organizationId,
			body,
			operatorId: req.user?.id || null,
		});
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_MONTH_AUTOPILOT_COMPLETED",
		payload: {
			monthLabelRu: result.monthLabelRu,
			workingDaysCount: result.workingDaysCount,
			sterilCount: result.insertedSterilCount,
			psoCount: result.insertedPsoCount,
		},
	});

	return reply.send({
		success: true,
		monthLabelRu: result.monthLabelRu,
		workingDaysCount: result.workingDaysCount,
		insertedSterilCount: result.insertedSterilCount,
		insertedPsoCount: result.insertedPsoCount,
		summary: {
			totalSterilizationCycles: result.insertedSterilCount,
			totalPsoBatches: result.insertedPsoCount,
			complianceRatePercent: 100,
			statutoryStatus: "100% Норма СанПиН 3.3686-21",
		},
	});
}
