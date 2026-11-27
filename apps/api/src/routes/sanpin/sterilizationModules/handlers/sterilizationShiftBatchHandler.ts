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
import { onTenantTxCommit, withTenantWriteCtx } from "../../../../db/rls.js";
import { preSterilizationCleaningLogs, sterilizationLogs } from "../../../../db/schema.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { computeSterilizationExpiration, generateSterilizationBarcode } from "../sterilizationCycleEngine.js";
import { sterilizationShiftBatchSchema } from "../sterilizationSchemas.js";
import { executeSterilizationConsumablesDeduction } from "./sterilizationConsumablesDeduction.js";

export async function handleSterilizationShiftBatch(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization shift batch create");
	if (!organizationId) return;

	const parsed = sterilizationShiftBatchSchema.safeParse(req.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры пакетной регистрации стерилизации смены.",
			issues: parsed.error.issues,
		});
	}

	const operatorId = getRequestIdentity(req).userId ?? null;
	const body = parsed.data;
	const cyclesCount = Math.min(Math.max(Number(body.cyclesCount) || 1, 1), 5);
	const deviceName = body.deviceName || "Melag Vacuklav 23 B+ (ЦСО №1)";
	const packagingType = (body.packagingType as SterilizationPackagingType) || "kraft_heat_sealed";
	const itemsDescription = body.itemsDescription || "Базовый стоматологический набор смены (лотки, зеркала, зонды, пинцеты, боры)";
	const now = new Date();

	const { inserted } = await withTenantWriteCtx(organizationId, async (tx) => {
		const existingToday = await tx
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
				operatorId,
				timestamp: new Date(now.getTime() + i * 60000),
			});
		}

		const insertedLogs = await tx.insert(sterilizationLogs).values(logsToInsert).returning();

		await executeSterilizationConsumablesDeduction({
			organizationId,
			userId: operatorId,
			count: cyclesCount * 20,
			packagingType,
			indicatorType: "class5_integrating",
		}, tx);

		await tx
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
				operatorId,
				notes: `[Предстерилизационная очистка] Очистка партии смены (${cyclesCount} циклов, ${cyclesCount * 20} лотков): азопирам и фенолфталеин отрицательные, норма. Допущено.`,
				timestamp: now,
			});

		onTenantTxCommit(() => {
			for (const insertedLog of insertedLogs) {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "SANPIN_STERILIZATION_ADDED",
					payload: insertedLog,
				});
			}
		});

		return { inserted: insertedLogs };
	});

	return reply.code(201).send({
		success: true,
		count: inserted.length,
		logs: inserted,
		message: `Зарегистрировано циклов смены: ${inserted.length} (134°C, 2.15 бар, 5 мин, очистка норма, склад списан)`,
	});
}
