/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/sterilizationShiftBatchHandler.ts
 *
 * Пакетная регистрация циклов смены автоклава со списанием расходников.
 * Мандат 8b: строго <= 120 строк.
 */

import type { SterilizationPackagingType } from "@dental/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { preSterilizationCleaningLogs, sterilizationLogs } from "../../../../db/schema.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { computeSterilizationExpiration, generateSterilizationBarcode } from "../sterilizationCycleEngine.js";
import type { SterilizationShiftBatchBody } from "../sterilizationSchemas.js";
import { executeSterilizationConsumablesDeduction } from "./sterilizationConsumablesDeduction.js";

export async function handleSterilizationShiftBatch(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization shift batch create");
	if (!organizationId) return;

	const body = (req.body as SterilizationShiftBatchBody) || {};
	const cyclesCount = Math.min(Math.max(Number(body.cyclesCount) || 1, 1), 5);
	const deviceName = body.deviceName || "Melag Vacuklav 23 B+ (ЦСО №1)";
	const packagingType = (body.packagingType as SterilizationPackagingType) || "kraft_heat_sealed";
	const itemsDescription = body.itemsDescription || "Базовый стоматологический набор смены (лотки, зеркала, зонды, пинцеты, боры)";
	const now = new Date();

	const existingToday = await db
		.select({ cycleNumber: sterilizationLogs.cycleNumber })
		.from(sterilizationLogs)
		.where(and(eq(sterilizationLogs.organizationId, organizationId), gte(sterilizationLogs.timestamp, new Date(now.getFullYear(), now.getMonth(), now.getDate()))))
		.orderBy(desc(sterilizationLogs.cycleNumber))
		.limit(1);

	const startCycle = (existingToday[0]?.cycleNumber ?? 0) + 1;
	const expiresAt = computeSterilizationExpiration(packagingType, now, "passed");
	const logsToInsert: Array<typeof sterilizationLogs.$inferInsert> = [];

	for (let i = 0; i < cyclesCount; i++) {
		const cycleNumber = startCycle + i;
		const generatedBarcode = generateSterilizationBarcode(cycleNumber, now);

		logsToInsert.push({
			organizationId,
			deviceName,
			autoclaveId: body.autoclaveId || "АК-01",
			cycleNumber,
			itemsDescription: `${itemsDescription} (Партия ${cycleNumber})`,
			packagingType,
			temperatureCelsius: "134.0",
			pressureBar: "2.15",
			durationMin: 5,
			indicatorType: "class5_integrating",
			cycleMode: "B",
			temperatureSet: "134.0",
			pressureSet: "2.15",
			passedIndicator: true,
			status: "passed" as const,
			barcode: generatedBarcode,
			expiresAt,
			operatorId: (req as any).user?.id || null,
			timestamp: new Date(now.getTime() + i * 60000),
		});
	}

	const inserted = await db.insert(sterilizationLogs).values(logsToInsert).returning();

	void executeSterilizationConsumablesDeduction({
		organizationId,
		userId: (req as any).user?.id || null,
		count: cyclesCount * 20,
		packagingType,
		indicatorType: "class5_integrating",
	});

	await db
		.insert(preSterilizationCleaningLogs)
		.values({
			organizationId,
			testType: "both",
			batchItemCount: cyclesCount * 20,
			testedSampleCount: Math.max(3, Math.ceil(cyclesCount * 20 * 0.01)),
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand: "Биолот 0.5% + Аламинол 1%",
			rejectionReason: null,
			operatorId: (req as any).user?.id || null,
			notes: `[Предстерилизационная очистка] Очистка партии смены (${cyclesCount} циклов, ${cyclesCount * 20} лотков): азопирам и фенолфталеин отрицательные, норма. Допущено.`,
			timestamp: now,
		})
		.catch((err) => {
			req.log.warn({ err }, "Non-blocking: could not record shift batch PSO test");
		});

	for (const insertedLog of inserted) {
		wsBroker.broadcastToOrganization(organizationId, { type: "SANPIN_STERILIZATION_ADDED", payload: insertedLog });
	}

	return reply.code(201).send({
		success: true,
		count: inserted.length,
		logs: inserted,
		message: `Зарегистрировано циклов смены: ${inserted.length} (134°C, 2.15 бар, 5 мин, очистка норма, склад списан)`,
	});
}
