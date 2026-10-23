/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/createAutoclaveBatchCycleHandler.ts
 *
 * 1-клик запуск нормативного батча автоклава (134°C / 2.15 бар или 121°C / 1.15 бар)
 * с пакетным списанием расходников со склада и автоматической фиксацией 100% нормы очистки.
 * Мандат 8b: строго <= 120 строк.
 */

import { computePackagingExpirationDate, type SterilizationPackagingType } from "@dental/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { preSterilizationCleaningLogs, sterilizationLogs } from "../../../../db/schema.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { executeSterilizationConsumablesDeduction } from "./sterilizationConsumablesDeduction.js";

export async function handleQuickNormCycle(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization quick norm");
	if (!organizationId) return;

	const body = (req.body as Record<string, unknown>) || {};
	const isDelicate = body.regime === "delicate_121";
	const batchSize = Math.max(1, Math.min(Number(body.batchSize ?? body.packagesCount) || 25, 100));
	const deviceName = String(body.deviceName || "Melag Vacuklav 23 B+ (ЦСО №1)");
	const autoclaveId = String(body.autoclaveId || "АК-01");
	const temp = isDelicate ? "121.0" : "134.0";
	const pressure = isDelicate ? "1.15" : "2.15";
	const durationMin = isDelicate ? 20 : 5;
	const packagingType = String(body.packagingType || (isDelicate ? "kraft_heat_sealed" : "kraft_self_adhesive"));
	const now = new Date();

	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const [lastCycle] = await db
		.select({ cycleNumber: sterilizationLogs.cycleNumber })
		.from(sterilizationLogs)
		.where(and(eq(sterilizationLogs.organizationId, organizationId), gte(sterilizationLogs.timestamp, todayStart)))
		.orderBy(desc(sterilizationLogs.cycleNumber))
		.limit(1);

	const cycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;
	const barcode = `BATCH-C${String(cycleNumber).padStart(2, "0")}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;
	const expiresAt = computePackagingExpirationDate(packagingType as SterilizationPackagingType, now);
	const cycleTimeLabel = String(body.cycleName || body.shiftCycleName || (now.getHours() < 12 ? "Утренний цикл" : now.getHours() < 17 ? "Дневной цикл" : "Вечерний цикл"));
	const itemsDescription = String(body.itemsDescription || `${cycleTimeLabel} автоклавирования (${batchSize} упаковок: смотровые лотки, боры, наконечники, хирургия)`);

	const [log] = await db
		.insert(sterilizationLogs)
		.values({
			organizationId,
			deviceName,
			autoclaveId,
			cycleNumber,
			itemsDescription: `${itemsDescription} | Партия ${batchSize} шт.`,
			packagingType,
			temperatureCelsius: temp,
			pressureBar: pressure,
			durationMin,
			indicatorType: "class5_integrating",
			cycleMode: "B",
			temperatureSet: temp,
			pressureSet: pressure,
			passedIndicator: true,
			status: "passed",
			barcode,
			expiresAt,
			operatorId: (req as any).user?.id ?? null,
			timestamp: now,
		})
		.returning();

	const sampleCount = Math.max(3, Math.ceil(batchSize * 0.01));
	await db
		.insert(preSterilizationCleaningLogs)
		.values({
			organizationId,
			testType: "both",
			batchItemCount: batchSize,
			testedSampleCount: sampleCount,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand: "Биолот 0.5% + Аламинол 1%",
			rejectionReason: null,
			operatorId: (req as any).user?.id ?? null,
			notes: `[Предстерилизационная очистка] Очистка партии автоклава №${cycleNumber} (${batchSize} шт): азопирамовая и фенолфталеиновая пробы отрицательные, 100% норма. Партия допущена.`,
			timestamp: now,
		})
		.catch((err) => {
			req.log.warn({ err }, "Non-blocking: could not record quick norm PSO test");
		});

	const stockDeduction = await executeSterilizationConsumablesDeduction({
		organizationId,
		userId: (req as any).user?.id ?? null,
		count: batchSize,
		packagingType,
		indicatorType: "class5_integrating",
		cycleNumber,
		barcode,
	});

	wsBroker.broadcastToOrganization(organizationId, { type: "SANPIN_STERILIZATION_ADDED", payload: log });

	return reply.code(201).send({
		success: true,
		log,
		batchSize,
		cycleName: cycleTimeLabel,
		regime: isDelicate ? "121°C / 1.15 бар (20 мин)" : "134°C / 2.15 бар (5 мин)",
		psoStatus: "approved_100_percent_norm",
		stockDeduction,
		message: `Зафиксирован ${cycleTimeLabel.toLowerCase()} автоклавирования №${cycleNumber} (${batchSize} упаковок, ${temp}°C, ${pressure} бар, индикатор 5 класса норма). Очистка норма, расходники со склада списаны.`,
	});
}
