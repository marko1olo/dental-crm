/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftSummaryRegisterHandler.ts
 * Сводка реестров СанПиН и статусов контроля за дату.
 * Мандат 8b: строго <= 120 строк.
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import {
	bactericidalIrradiatorLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	temperatureHumidityLogs,
} from "../../../db/schema.js";
import { clinicTimeZone } from "../../../services/reports/managerReports/timezone.js";
import { dayBoundsInTimeZone } from "../../dayConfirmations/timezoneAndTypes.js";

const sanpinRegisterQuerySchema = z
	.object({
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	})
	.strict();

function isValidCalendarDateYmd(dateStr: string): boolean {
	const [y, m, d] = dateStr.split("-").map((v) => Number.parseInt(v, 10));
	if (!y || !m || !d) return false;
	const probe = new Date(Date.UTC(y, m - 1, d));
	return (
		probe.getUTCFullYear() === y &&
		probe.getUTCMonth() === m - 1 &&
		probe.getUTCDate() === d
	);
}

async function fetchSanpinDayStats(
	tx: TenantDb,
	organizationId: string,
	start: Date,
	end: Date,
	dateStr: string,
) {
	const [psoStats] = await tx.select({
		total: sql<number>`count(*)::int`,
		passed: sql<number>`count(*) filter (where ${preSterilizationCleaningLogs.isBatchApproved} = true)::int`,
	}).from(preSterilizationCleaningLogs).where(
		and(eq(preSterilizationCleaningLogs.organizationId, organizationId), gte(preSterilizationCleaningLogs.timestamp, start), lte(preSterilizationCleaningLogs.timestamp, end)),
	);

	const [sterilStats] = await tx.select({
		totalCycles: sql<number>`count(*)::int`,
		passedCycles: sql<number>`count(*) filter (where ${sterilizationLogs.status} = 'passed')::int`,
	}).from(sterilizationLogs).where(
		and(eq(sterilizationLogs.organizationId, organizationId), gte(sterilizationLogs.timestamp, start), lte(sterilizationLogs.timestamp, end)),
	);

	const [wasteStats] = await tx.select({
		totalLogs: sql<number>`count(*)::int`,
		totalClassBWeight: sql<number>`coalesce(sum(case when ${medicalWasteLogs.wasteClass} = 'class_B' then cast(${medicalWasteLogs.weightKg} as numeric) else 0 end), 0)::float`,
	}).from(medicalWasteLogs).where(
		and(eq(medicalWasteLogs.organizationId, organizationId), gte(medicalWasteLogs.logDate, start), lte(medicalWasteLogs.logDate, end)),
	);

	const [microStats] = await tx.select({ totalMeasurements: sql<number>`count(*)::int` }).from(temperatureHumidityLogs).where(
		and(eq(temperatureHumidityLogs.organizationId, organizationId), eq(temperatureHumidityLogs.measurementDate, dateStr)),
	);

	const [bactStats] = await tx.select({ totalSessions: sql<number>`count(*)::int` }).from(bactericidalIrradiatorLogs).where(
		and(eq(bactericidalIrradiatorLogs.organizationId, organizationId), eq(bactericidalIrradiatorLogs.date, dateStr)),
	);

	return { psoStats, sterilStats, wasteStats, microStats, bactStats };
}

export async function handleGetSanpinRegister(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sanpin register read");
	if (!organizationId) return;

	const parsedQuery = sanpinRegisterQuerySchema.safeParse(req.query ?? {});
	if (!parsedQuery.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный параметр date (ожидается формат YYYY-MM-DD).",
		});
	}

	const tz = (await clinicTimeZone(organizationId)) || "UTC";
	const todayStr =
		parsedQuery.data.date ??
		new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());

	if (!isValidCalendarDateYmd(todayStr)) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Указана несуществующая календарная дата смены.",
		});
	}

	const bounds =
		dayBoundsInTimeZone(todayStr, tz, req.log) ??
		dayBoundsInTimeZone(todayStr, "UTC", req.log);
	if (!bounds) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Не удалось вычислить временные границы указанной даты.",
		});
	}
	const { from: startOfDay, to: endOfDay } = bounds;

	const {
		psoStats,
		sterilStats,
		wasteStats,
		microStats,
		bactStats,
		sterilizationRecords,
		psoRecords,
		wasteRecords,
		microclimateRecords,
	} = await withTenantCtx(organizationId, async (tx) => {
		const stats = await fetchSanpinDayStats(tx, organizationId, startOfDay, endOfDay, todayStr);
		const [sterilRows, psoRows, wasteRows, microRows] = await Promise.all([
			tx.select().from(sterilizationLogs).where(and(eq(sterilizationLogs.organizationId, organizationId), gte(sterilizationLogs.timestamp, startOfDay), lte(sterilizationLogs.timestamp, endOfDay))),
			tx.select().from(preSterilizationCleaningLogs).where(and(eq(preSterilizationCleaningLogs.organizationId, organizationId), gte(preSterilizationCleaningLogs.timestamp, startOfDay), lte(preSterilizationCleaningLogs.timestamp, endOfDay))),
			tx.select().from(medicalWasteLogs).where(and(eq(medicalWasteLogs.organizationId, organizationId), gte(medicalWasteLogs.logDate, startOfDay), lte(medicalWasteLogs.logDate, endOfDay))),
			tx.select().from(temperatureHumidityLogs).where(and(eq(temperatureHumidityLogs.organizationId, organizationId), eq(temperatureHumidityLogs.measurementDate, todayStr))),
		]);
		return {
			...stats,
			sterilizationRecords: sterilRows,
			psoRecords: psoRows,
			wasteRecords: wasteRows,
			microclimateRecords: microRows,
		};
	});

	const psoCompliant = (psoStats?.total ?? 0) === 0 || (psoStats?.passed ?? 0) === (psoStats?.total ?? 0);
	const sterilCompliant = (sterilStats?.totalCycles ?? 0) === 0 || (sterilStats?.passedCycles ?? 0) === (sterilStats?.totalCycles ?? 0);
	const allPassed = psoCompliant && sterilCompliant;

	return reply.send({
		success: true,
		date: todayStr,
		allPassed,
		sterilizationRecords,
		psoRecords,
		wasteRecords,
		microclimateRecords,
		registers: {
			pso: {
				titleRu: "Контроль предстерилизационной очистки",
				totalSamples: psoStats?.total ?? 0,
				passedSamples: psoStats?.passed ?? 0,
				isCompliant: psoCompliant,
			},
			sterilization: {
				titleRu: "Журнал автоклавирования",
				totalCycles: sterilStats?.totalCycles ?? 0,
				passedCycles: sterilStats?.passedCycles ?? 0,
				isCompliant: sterilCompliant,
			},
			medicalWaste: {
				titleRu: "Журнал отходов (Класс Б и А)",
				recordsCount: wasteStats?.totalLogs ?? 0,
				classBWeightKg: wasteStats?.totalClassBWeight ?? 0,
			},
			microclimate: { titleRu: "Температурно-влажностный режим", measurementsCount: microStats?.totalMeasurements ?? 0 },
			bactericidal: { titleRu: "Обеззараживание воздуха", sessionsCount: bactStats?.totalSessions ?? 0 },
		},
		complianceStatusRu: allPassed
			? "Соответствует санитарно-эпидемиологическим нормам"
			: "Выявлены отклонения санитарно-эпидемиологического контроля",
	});
}
