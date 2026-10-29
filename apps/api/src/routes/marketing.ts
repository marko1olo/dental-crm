/**
 * marketing.ts — Layer 5: Компактный канонический фасад эндпоинтов сквозной аналитики маркетинга,
 * онлайн-самозаписи и обязательности полей карточки пациента (Фичи #28 и #35).
 *
 * КОНТЕКСТ & МАНДАТ:
 * 1. Разделение каналов автоматической онлайн-самозаписи (Сайт, Карты, 2ГИС, ПроДокторов, Боты) и звонков администраторов.
 * 2. Копеечная точность в расчетах ROMI, CAC и выручки.
 * 3. Настройка обязательности полей карточки пациента (Телефон, Рекламный источник, СНИЛС).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	appointments,
	cashOperations,
	communicationEvents,
	crmLeads,
	patients,
	payments,
} from "../db/schema.js";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { aggregateCrmMarketingMetrics } from "@dental/shared";
import {
	registerMarketingPromosRoutes,
	readOrSeedOrganizationRomiChannels,
} from "./marketingPromosRoutes.js";
import {
	calculateMarketingAttributionReport,
	calculateOnlineBookingFunnel,
	cleanPhoneDigits,
	detectChannelFromSource,
	ONLINE_CHANNEL_DEFS,
	CHANNEL_NAMES_RU_MAP,
} from "./marketingModules/marketingAnalyticsEngine.js";
import {
	handleGetMarketingReports,
	handleGetPatientFieldRequirements,
	handlePutPatientFieldRequirements,
	fetchPatientFieldRequirementsFromDb,
	updatePatientFieldRequirementsInDb,
	type DatabaseTransaction,
} from "./marketingModules/marketingCampaignCrudHandlers.js";

// Экспорт утилит и схем для полной обратной совместимости
export {
	cleanPhoneDigits,
	detectChannelFromSource,
	ONLINE_CHANNEL_DEFS,
	CHANNEL_NAMES_RU_MAP,
	calculateMarketingAttributionReport,
	calculateOnlineBookingFunnel,
	handleGetMarketingReports,
	handleGetPatientFieldRequirements,
	handlePutPatientFieldRequirements,
	fetchPatientFieldRequirementsFromDb,
	updatePatientFieldRequirementsInDb,
	type DatabaseTransaction,
};
export * from "./marketingModules/marketingSchemas.js";

export async function registerMarketingRoutes(app: FastifyInstance) {
	await registerMarketingPromosRoutes(app);

	/**
	 * GET /api/marketing/attribution
	 * Сводная сквозная аналитика: онлайн-самозапись vs телефония регистратуры + каналы ROMI (Фича #28)
	 */
	app.get("/api/marketing/attribution", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "marketing attribution");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "marketing attribution");
		if (!orgId) return;

		try {
			const [allLeads, allAppts, allPayments, allPatients, allCallEvents, allMarketingExpenses] = await Promise.all([
				db.select().from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
				db.select().from(appointments).where(eq(appointments.organizationId, orgId)),
				db.select().from(payments).where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid"))),
				db.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					notes: patients.notes,
					administrativeProfile: patients.administrativeProfile,
					createdAt: patients.createdAt,
				}).from(patients).where(eq(patients.organizationId, orgId)),
				db.select({
					id: communicationEvents.id,
					channel: communicationEvents.channel,
					direction: communicationEvents.direction,
					durationSeconds: communicationEvents.durationSeconds,
					status: communicationEvents.status,
				}).from(communicationEvents).where(
					and(
						eq(communicationEvents.organizationId, orgId),
						eq(communicationEvents.channel, "phone"),
					),
				),
				db.select({
					amountRub: cashOperations.amountRub,
					metadata: cashOperations.metadata,
					reasonCode: cashOperations.reasonCode,
				}).from(cashOperations).where(
					and(
						eq(cashOperations.organizationId, orgId),
						eq(cashOperations.operationType, "expense"),
						sql`(${cashOperations.reasonCode} = 6 or (${cashOperations.metadata}->>'category') = 'marketing')`,
					),
				),
			]);

			const report = calculateMarketingAttributionReport({
				organizationId: orgId,
				allLeads,
				allAppts,
				allPayments,
				allPatients,
				allCallEvents,
				allMarketingExpenses,
			});

			const romiChannels = aggregateCrmMarketingMetrics({
				patients: allPatients.map((p) => ({
					id: p.id,
					administrativeProfile: p.administrativeProfile as any,
					notes: p.notes,
				})),
				appointments: allAppts.map((a) => ({
					id: a.id,
					patientId: a.patientId ?? "",
					status: a.status ?? "",
				})),
				payments: allPayments.map((pay) => ({
					id: pay.id,
					patientId: pay.patientId,
					amount: Number(pay.amountRub || 0),
					status: pay.status ?? "paid",
				})),
				communicationEvents: allCallEvents.map((c) => ({
					id: c.id,
					channel: c.channel ?? "phone",
					source: "telephony",
				})),
			});

			return reply.code(200).send({
				...report,
				romiChannels,
				channels: romiChannels,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error fetching attribution report");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сформировать отчет по маркетинговой атрибуции",
			});
		}
	});

	/**
	 * GET /api/marketing/romi
	 * Прямая сводная таблица окупаемости маркетинга (ROMI) из реальных данных БД CRM.
	 */
	app.get("/api/marketing/romi", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "marketing romi");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "marketing romi");
		if (!orgId) return;

		try {
			const [allPatients, allAppts, allPayments, allCallEvents] = await Promise.all([
				db.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					notes: patients.notes,
					administrativeProfile: patients.administrativeProfile,
					createdAt: patients.createdAt,
				}).from(patients).where(eq(patients.organizationId, orgId)),
				db.select().from(appointments).where(eq(appointments.organizationId, orgId)),
				db.select().from(payments).where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid"))),
				db.select({
					id: communicationEvents.id,
					channel: communicationEvents.channel,
					direction: communicationEvents.direction,
					durationSeconds: communicationEvents.durationSeconds,
					status: communicationEvents.status,
				}).from(communicationEvents).where(eq(communicationEvents.organizationId, orgId)),
			]);

			let customBudgetsKopecks: Record<string, number> | undefined;
			try {
				const { channels: persistedChannels } = await readOrSeedOrganizationRomiChannels(orgId);
				customBudgetsKopecks = {};
				for (const ch of persistedChannels) {
					if (ch.spentKopecks > 0) {
						customBudgetsKopecks[ch.channelKey] = ch.spentKopecks;
					}
				}
			} catch (_) {}

			const romiChannels = aggregateCrmMarketingMetrics({
				patients: allPatients.map((p) => ({
					id: p.id,
					administrativeProfile: p.administrativeProfile as any,
					notes: p.notes,
				})),
				appointments: allAppts.map((a) => ({
					id: a.id,
					patientId: a.patientId ?? "",
					status: a.status ?? "",
				})),
				payments: allPayments.map((pay) => ({
					id: pay.id,
					patientId: pay.patientId,
					amount: Number(pay.amountRub || 0),
					status: pay.status ?? "paid",
				})),
				communicationEvents: allCallEvents.map((c) => ({
					id: c.id,
					channel: c.channel ?? "",
					source: c.channel ?? "",
				})),
				customBudgetsKopecks,
			});

			return reply.code(200).send({
				organizationId: orgId,
				channels: romiChannels,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error calculating romi channels");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось рассчитать показатели ROMI",
			});
		}
	});

	/**
	 * GET /api/marketing/online-booking/funnel
	 * Пошаговая воронка конверсии самозаписи (Фича №28)
	 */
	app.get("/api/marketing/online-booking/funnel", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "online booking funnel");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "online booking funnel");
		if (!orgId) return;

		try {
			const [allLeads, allAppts, allPayments] = await Promise.all([
				db.select().from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
				db.select().from(appointments).where(eq(appointments.organizationId, orgId)),
				db.select().from(payments).where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid"))),
			]);

			const funnel = calculateOnlineBookingFunnel({
				allLeads,
				allAppts,
				allPayments,
			});

			return reply.code(200).send(funnel);
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error fetching online booking funnel");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сформировать воронку онлайн-самозаписи",
			});
		}
	});

	/**
	 * GET /api/marketing/patient-field-requirements
	 * Настройки обязательности полей карточки пациента (Фича №35)
	 */
	app.get("/api/marketing/patient-field-requirements", handleGetPatientFieldRequirements);

	/**
	 * PUT /api/marketing/patient-field-requirements
	 * Обновление настроек обязательности полей карточки пациента (Фича №35)
	 */
	app.put("/api/marketing/patient-field-requirements", handlePutPatientFieldRequirements);

	/**
	 * GET /api/marketing/reports
	 * Маркетинговые сводные отчеты (ROMI, CAC, воронка и распределение по каналам).
	 */
	app.get("/api/marketing/reports", handleGetMarketingReports);
}
