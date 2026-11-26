/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/autoclaveRegulatoryExportHandler.ts
 * Выгрузка журналов автоклавирования и контроля предстерилизационной очистки.
 * Мандат 8b: строго <= 120 строк.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	preSterilizationCleaningLogs,
	sterilizationLogs,
	users,
} from "../../../db/schema.js";
import { clinicTimeZone } from "../../../services/reports/managerReports/timezone.js";

export async function handleGetRegulatoryExport(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin regulatory export read",
	);
	if (!organizationId) return;

	const tz = (await clinicTimeZone(organizationId)) || "UTC";
	const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());

	const { autoclaveLogs, cleaningControlLogs } = await withTenantCtx(
		organizationId,
		async (tx) => {
			const autoclave = await tx
				.select({
					id: sterilizationLogs.id,
					cycleNumber: sterilizationLogs.cycleNumber,
					deviceName: sterilizationLogs.deviceName,
					autoclaveId: sterilizationLogs.autoclaveId,
					itemsDescription: sterilizationLogs.itemsDescription,
					packagingType: sterilizationLogs.packagingType,
					temperatureCelsius: sterilizationLogs.temperatureCelsius,
					pressureBar: sterilizationLogs.pressureBar,
					durationMin: sterilizationLogs.durationMin,
					status: sterilizationLogs.status,
					passedIndicator: sterilizationLogs.passedIndicator,
					operatorName: users.fullName,
					barcode: sterilizationLogs.barcode,
					timestamp: sterilizationLogs.timestamp,
				})
				.from(sterilizationLogs)
				.leftJoin(
					users,
					and(
						eq(users.id, sterilizationLogs.operatorId),
						eq(users.organizationId, organizationId),
					),
				)
				.where(eq(sterilizationLogs.organizationId, organizationId))
				.orderBy(desc(sterilizationLogs.timestamp))
				.limit(200);

			const cleaning = await tx
				.select({
					id: preSterilizationCleaningLogs.id,
					instrumentName: sql<string>`coalesce(nullif(pre_sterilization_cleaning_logs.notes, ''), 'Стоматологический инструментарий')`,
					testType: preSterilizationCleaningLogs.testType,
					batchItemCount: preSterilizationCleaningLogs.batchItemCount,
					testedSampleCount: preSterilizationCleaningLogs.testedSampleCount,
					isAzopyramNegative: preSterilizationCleaningLogs.isAzopyramNegative,
					isPhenolphthaleinNegative: preSterilizationCleaningLogs.isPhenolphthaleinNegative,
					isBatchApproved: preSterilizationCleaningLogs.isBatchApproved,
					detergentBrand: preSterilizationCleaningLogs.detergentBrand,
					operatorName: users.fullName,
					timestamp: preSterilizationCleaningLogs.timestamp,
				})
				.from(preSterilizationCleaningLogs)
				.leftJoin(
					users,
					and(
						eq(users.id, preSterilizationCleaningLogs.operatorId),
						eq(users.organizationId, organizationId),
					),
				)
				.where(eq(preSterilizationCleaningLogs.organizationId, organizationId))
				.orderBy(desc(preSterilizationCleaningLogs.timestamp))
				.limit(200);

			return { autoclaveLogs: autoclave, cleaningControlLogs: cleaning };
		},
	);

	const allSterilPassed = autoclaveLogs.every(
		(log) => log.status === "passed" && log.passedIndicator !== false,
	);
	const allPsoPassed = cleaningControlLogs.every(
		(log) => log.isBatchApproved === true,
	);
	const allPassed = allSterilPassed && allPsoPassed;

	return reply.send({
		success: true,
		date: todayStr,
		presumedSterile: allPassed,
		traySterileByDefault: allPassed,
		regulatoryStandard: "СанПиН 3.3686-21",
		forms: {
			autoclaveJournal: {
				titleRu: "Журнал контроля работы стерилизаторов (автоклавирование)",
				recordsCount: autoclaveLogs.length,
				records: autoclaveLogs,
			},
			cleaningAndDisinfectionJournal: {
				titleRu: "Журнал учета качества предстерилизационной очистки",
				recordsCount: cleaningControlLogs.length,
				records: cleaningControlLogs,
			},
			cleaningControlJournal: {
				titleRu: "Журнал учета качества предстерилизационной очистки",
				recordsCount: cleaningControlLogs.length,
				records: cleaningControlLogs,
			},
			form257u: {
				titleRu: "Журнал контроля работы стерилизаторов (автоклавирование)",
				recordsCount: autoclaveLogs.length,
				records: autoclaveLogs,
			},
			form366u: {
				titleRu: "Журнал учета качества предстерилизационной очистки",
				recordsCount: cleaningControlLogs.length,
				records: cleaningControlLogs,
			},
		},
		summary: {
			totalSterilizationCycles: autoclaveLogs.length,
			totalPsoBatches: cleaningControlLogs.length,
			allPassed,
			complianceStatusRu: allPassed
				? "Соответствует санитарным нормам"
				: "Выявлены неутверждённые партии ПСО или отклонённые циклы стерилизации",
		},
		messageRu: allPassed
			? "Журналы автоклавирования и предстерилизационной очистки сформированы и готовы к проверкам"
			: "Журналы сформированы; зафиксированы неутверждённые пробы ПСО или отклонённые циклы стерилизации",
	});
}
