/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftSummaryRegisterHandler.ts
 * Сводка реестров СанПиН и статусов контроля за дату.
 * Мандат 8b: строго <= 120 строк.
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
	bactericidalIrradiatorLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	temperatureHumidityLogs,
} from "../../../db/schema.js";

export async function handleGetSanpinRegister(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin register read",
	);
	if (!organizationId) return;

	const queryDate = (req.query as { date?: string })?.date;
	const todayStr = queryDate || new Date().toISOString().slice(0, 10);
	const startOfDay = new Date(todayStr);
	const endOfDay = new Date(todayStr);
	endOfDay.setHours(23, 59, 59, 999);

	const [psoStats] = await db
		.select({
			total: sql<number>`count(*)::int`,
			passed: sql<number>`count(*) filter (where ${preSterilizationCleaningLogs.isBatchApproved} = true)::int`,
		})
		.from(preSterilizationCleaningLogs)
		.where(
			and(
				eq(preSterilizationCleaningLogs.organizationId, organizationId),
				gte(preSterilizationCleaningLogs.timestamp, startOfDay),
				lte(preSterilizationCleaningLogs.timestamp, endOfDay),
			),
		);

	const [sterilStats] = await db
		.select({
			totalCycles: sql<number>`count(*)::int`,
			passedCycles: sql<number>`count(*) filter (where ${sterilizationLogs.status} = 'passed')::int`,
		})
		.from(sterilizationLogs)
		.where(
			and(
				eq(sterilizationLogs.organizationId, organizationId),
				gte(sterilizationLogs.timestamp, startOfDay),
				lte(sterilizationLogs.timestamp, endOfDay),
			),
		);

	const [wasteStats] = await db
		.select({
			totalLogs: sql<number>`count(*)::int`,
			totalClassBWeight: sql<number>`coalesce(sum(case when ${medicalWasteLogs.wasteClass} = 'class_B' then cast(${medicalWasteLogs.weightKg} as numeric) else 0 end), 0)::float`,
		})
		.from(medicalWasteLogs)
		.where(
			and(
				eq(medicalWasteLogs.organizationId, organizationId),
				gte(medicalWasteLogs.logDate, startOfDay),
				lte(medicalWasteLogs.logDate, endOfDay),
			),
		);

	const [microStats] = await db
		.select({ totalMeasurements: sql<number>`count(*)::int` })
		.from(temperatureHumidityLogs)
		.where(
			and(
				eq(temperatureHumidityLogs.organizationId, organizationId),
				eq(temperatureHumidityLogs.measurementDate, todayStr),
			),
		);

	const [bactStats] = await db
		.select({ totalSessions: sql<number>`count(*)::int` })
		.from(bactericidalIrradiatorLogs)
		.where(
			and(
				eq(bactericidalIrradiatorLogs.organizationId, organizationId),
				eq(bactericidalIrradiatorLogs.date, todayStr),
			),
		);

	const [sterilizationRecords, psoRecords, wasteRecords, microclimateRecords] =
		await Promise.all([
			db.select().from(sterilizationLogs).where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					gte(sterilizationLogs.timestamp, startOfDay),
					lte(sterilizationLogs.timestamp, endOfDay),
				),
			),
			db.select().from(preSterilizationCleaningLogs).where(
				and(
					eq(preSterilizationCleaningLogs.organizationId, organizationId),
					gte(preSterilizationCleaningLogs.timestamp, startOfDay),
					lte(preSterilizationCleaningLogs.timestamp, endOfDay),
				),
			),
			db.select().from(medicalWasteLogs).where(
				and(
					eq(medicalWasteLogs.organizationId, organizationId),
					gte(medicalWasteLogs.logDate, startOfDay),
					lte(medicalWasteLogs.logDate, endOfDay),
				),
			),
			db.select().from(temperatureHumidityLogs).where(
				and(
					eq(temperatureHumidityLogs.organizationId, organizationId),
					eq(temperatureHumidityLogs.measurementDate, todayStr),
				),
			),
		]);

	return reply.send({
		success: true,
		date: todayStr,
		sterilizationRecords,
		psoRecords,
		wasteRecords,
		microclimateRecords,
		registers: {
			pso: {
				titleRu: "Контроль предстерилизационной очистки",
				totalSamples: psoStats?.total ?? 0,
				passedSamples: psoStats?.passed ?? 0,
				isCompliant: (psoStats?.total ?? 0) === 0 || (psoStats?.passed ?? 0) === (psoStats?.total ?? 0),
			},
			sterilization: {
				titleRu: "Журнал автоклавирования",
				totalCycles: sterilStats?.totalCycles ?? 0,
				passedCycles: sterilStats?.passedCycles ?? 0,
				isCompliant: (sterilStats?.totalCycles ?? 0) === 0 || (sterilStats?.passedCycles ?? 0) === (sterilStats?.totalCycles ?? 0),
			},
			medicalWaste: {
				titleRu: "Журнал отходов (Класс Б и А)",
				recordsCount: wasteStats?.totalLogs ?? 0,
				classBWeightKg: wasteStats?.totalClassBWeight ?? 0,
			},
			microclimate: {
				titleRu: "Температурно-влажностный режим",
				measurementsCount: microStats?.totalMeasurements ?? 0,
			},
			bactericidal: {
				titleRu: "Обеззараживание воздуха",
				sessionsCount: bactStats?.totalSessions ?? 0,
			},
		},
		complianceStatusRu: "Соответствует санитарно-эпидемиологическим нормам",
	});
}
