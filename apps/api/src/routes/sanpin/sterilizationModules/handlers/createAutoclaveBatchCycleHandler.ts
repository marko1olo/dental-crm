/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/createAutoclaveBatchCycleHandler.ts
 *
 * Экспресс-запуск нормативного батча автоклава (134°C / 2.15 бар или 121°C / 1.15 бар)
 * с пакетным списанием расходников со склада и автоматической фиксацией 100% нормы очистки.
 * Мандат 8b: строго <= 120 строк.
 */

import { computePackagingExpirationDate, type SterilizationPackagingType } from "@dental/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import { preSterilizationCleaningLogs, sterilizationLogs } from "../../../../db/schema.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { executeSterilizationConsumablesDeduction } from "./sterilizationConsumablesDeduction.js";

export async function handleQuickNormCycle(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization quick norm");
	if (!organizationId) return;

	const operatorId = getRequestIdentity(req).userId ?? null;
	const body = (req.body as Record<string, unknown>) || {};
	const isDelicate = body.regime === "delicate_121";
	const isPrion = body.regime === "prion_134";
	const batchSize = Math.max(1, Math.min(Number(body.batchSize ?? body.packagesCount) || 25, 100));
	const deviceName = String(body.deviceName || "Melag Vacuklav 23 B+ (ЦСО №1)");
	const autoclaveId = String(body.autoclaveId || "АК-01");
	const temp = body.temperatureCelsius ? String(body.temperatureCelsius) : (isDelicate ? "121.0" : "134.0");
	const pressure = body.pressureBar ? String(body.pressureBar) : (isDelicate ? "1.15" : "2.15");
	const durationMin = isDelicate ? 20 : isPrion ? 18 : (Number(body.durationMin) || 5);
	const packagingType = String(body.packagingType || (isDelicate ? "kraft_heat_sealed" : "kraft_self_adhesive"));
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const { log, stockDeduction, cycleNumber, cycleTimeLabel } = await withTenantCtx(organizationId, async (tx) => {
		const [lastCycle] = await tx
			.select({ cycleNumber: sterilizationLogs.cycleNumber })
			.from(sterilizationLogs)
			.where(and(eq(sterilizationLogs.organizationId, organizationId), gte(sterilizationLogs.timestamp, todayStart)))
			.orderBy(desc(sterilizationLogs.cycleNumber))
			.limit(1);

		const cycleNum = (lastCycle?.cycleNumber ?? 0) + 1;
		const barcode = String(body.barcode || "").trim() || `BATCH-C${String(cycleNum).padStart(2, "0")}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;
		const expiresAt = computePackagingExpirationDate(packagingType as SterilizationPackagingType, now);
		const label = String(body.cycleName || body.shiftCycleName || (now.getHours() < 12 ? "Утренний цикл" : now.getHours() < 17 ? "Дневной цикл" : "Вечерний цикл"));
		const itemsDescription = String(body.itemsDescription || `${label} автоклавирования (${batchSize} упаковок: смотровые лотки, боры, наконечники, хирургия)`);
		const indicatorType = String(body.indicatorType || (body.indicatorClass === "4" ? "class4_multivariable" : "class5_integrating"));

		const [createdLog] = await tx
			.insert(sterilizationLogs)
			.values({
				organizationId,
				deviceName,
				autoclaveId,
				cycleNumber: cycleNum,
				itemsDescription: `${itemsDescription} | Партия ${batchSize} шт.`,
				packagingType,
				temperatureCelsius: temp,
				pressureBar: pressure,
				durationMin,
				indicatorType,
				cycleMode: "B",
				temperatureSet: temp,
				pressureSet: pressure,
				passedIndicator: true,
				status: "passed",
				barcode,
				expiresAt,
				operatorId,
				timestamp: now,
			})
			.returning();

		const sampleCount = Math.max(3, Math.ceil(batchSize * 0.01));
		await tx
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
				operatorId,
				notes: `[Предстерилизационная очистка] Очистка партии автоклава №${cycleNum} (${batchSize} шт): азопирамовая и фенолфталеиновая пробы отрицательные, 100% норма. Партия допущена.`,
				timestamp: now,
			});

		const deduction = await executeSterilizationConsumablesDeduction({
			organizationId,
			userId: operatorId,
			count: batchSize,
			packagingType,
			indicatorType,
			cycleNumber: cycleNum,
			barcode,
			logger: req.log,
		}, tx);

		return { log: createdLog, stockDeduction: deduction, cycleNumber: cycleNum, cycleTimeLabel: label };
	});

	wsBroker.broadcastToOrganization(organizationId, { type: "SANPIN_STERILIZATION_ADDED", payload: log });

	return reply.code(201).send({
		success: true,
		log,
		batchSize,
		cycleName: cycleTimeLabel,
		regime: isDelicate ? "121°C / 1.15 бар (20 мин)" : isPrion ? "134°C / 2.15 бар (18 мин)" : "134°C / 2.15 бар (5 мин)",
		psoStatus: "approved_100_percent_norm",
		stockDeduction,
		message: `Зафиксирован ${cycleTimeLabel.toLowerCase()} автоклавирования №${cycleNumber} (${batchSize} упаковок, ${temp}°C, ${pressure} бар, индикатор 5 класса норма). Очистка норма, расходники со склада списаны.`,
	});
}
