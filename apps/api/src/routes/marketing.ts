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
import { and, eq, inArray, notExists, sql } from "drizzle-orm";
import { withTenantCtx } from "../db/rls.js";
import {
	appointments,
	cashOperations,
	communicationEvents,
	crmLeads,
	patientInvoices,
	patients,
	payments,
} from "../db/schema.js";
import { requireMarketingReadAccess } from "./marketingModules/marketingAccessGuard.js";
import {
	aggregateCrmMarketingMetrics,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
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
import { calculateRealMarketingCohorts } from "../services/marketing/marketingCohortService.js";
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

function buildNetPaidRowsForRomi(
	rows: Array<{
		id: string;
		patientId: string;
		amountKopecks: number | bigint | string | null;
		amountRub: string | number | null;
		status: string | null;
	}>,
) {
	const netByPatient = new Map<string, number>();
	for (const pay of rows) {
		if (pay.status !== "paid" && pay.status !== "refunded") continue;
		const rawKop =
			pay.amountKopecks != null && Number(pay.amountKopecks) !== 0
				? Number(pay.amountKopecks)
				: rublesToKopecks(Number(pay.amountRub || 0));
		const signed = pay.status === "refunded" ? -Math.abs(rawKop) : rawKop;
		netByPatient.set(pay.patientId, (netByPatient.get(pay.patientId) ?? 0) + signed);
	}
	const result: Array<{
		id: string;
		patientId: string;
		amountKopecks: number;
		amount: number;
		status: string;
	}> = [];
	for (const [patientId, netKop] of netByPatient.entries()) {
		const clampedKop = Math.max(0, netKop);
		if (clampedKop <= 0) continue;
		result.push({
			id: `net-${patientId}`,
			patientId,
			amountKopecks: clampedKop,
			amount: kopecksToRubles(clampedKop),
			status: "paid",
		});
	}
	return result;
}

export async function registerMarketingRoutes(app: FastifyInstance) {
	await registerMarketingPromosRoutes(app);

	/**
	 * GET /api/marketing/attribution
	 * Сводная сквозная аналитика: онлайн-самозапись vs телефония регистратуры + каналы ROMI (Фича #28)
	 */
	app.get("/api/marketing/attribution", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireMarketingReadAccess(request, reply, "marketing attribution");
		if (!orgId) return;

		try {
			const [allLeads, allAppts, allPayments, allPatients, allCallEvents, allMarketingExpenses] =
				await withTenantCtx(orgId, (tx) =>
					Promise.all([
						tx.select({
							id: crmLeads.id,
							patientId: crmLeads.patientId,
							phone: crmLeads.phone,
							source: crmLeads.source,
							status: crmLeads.status,
							createdAt: crmLeads.createdAt,
						}).from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
						tx.select({
							id: appointments.id,
							patientId: appointments.patientId,
							status: appointments.status,
							startsAt: appointments.startsAt,
						}).from(appointments).where(eq(appointments.organizationId, orgId)),
						tx.select({
							id: payments.id,
							patientId: payments.patientId,
							amountKopecks: payments.amountKopecks,
							amountRub: payments.amountRub,
							status: payments.status,
						}).from(payments).where(
							and(
								eq(payments.organizationId, orgId),
								inArray(payments.status, ["paid", "refunded"]),
								notExists(
									tx.select({ id: patientInvoices.id })
										.from(patientInvoices)
										.where(
											and(
												eq(patientInvoices.id, payments.documentId),
												eq(patientInvoices.organizationId, orgId),
												inArray(patientInvoices.status, ["voided", "cancelled"]),
											),
										),
								),
							),
						),
						tx.select({
							id: patients.id,
							fullName: patients.fullName,
							phone: patients.phone,
							notes: patients.notes,
							administrativeProfile: patients.administrativeProfile,
							createdAt: patients.createdAt,
						}).from(patients).where(eq(patients.organizationId, orgId)),
						tx.select({
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
						tx.select({
							amountKopecks: cashOperations.amountKopecks,
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
					]),
				);

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
					administrativeProfile: (p.administrativeProfile && typeof p.administrativeProfile === "object"
						? (p.administrativeProfile as Record<string, unknown>)
						: null),
					notes: p.notes,
				})),
				appointments: allAppts.map((a) => ({
					id: a.id,
					patientId: a.patientId ?? "",
					status: a.status ?? "",
				})),
				payments: buildNetPaidRowsForRomi(allPayments),
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
		const orgId = await requireMarketingReadAccess(request, reply, "marketing romi");
		if (!orgId) return;

		try {
			const { allPatients, allAppts, allPayments, allCallEvents, customBudgetsKopecks } =
				await withTenantCtx(orgId, async (tx) => {
					const [patientsRows, apptsRows, paymentsRows, callRows] = await Promise.all([
						tx.select({
							id: patients.id,
							fullName: patients.fullName,
							phone: patients.phone,
							notes: patients.notes,
							administrativeProfile: patients.administrativeProfile,
							createdAt: patients.createdAt,
						}).from(patients).where(eq(patients.organizationId, orgId)),
						tx.select({
							id: appointments.id,
							patientId: appointments.patientId,
							status: appointments.status,
						}).from(appointments).where(eq(appointments.organizationId, orgId)),
						tx.select({
							id: payments.id,
							patientId: payments.patientId,
							amountKopecks: payments.amountKopecks,
							amountRub: payments.amountRub,
							status: payments.status,
						}).from(payments).where(
							and(
								eq(payments.organizationId, orgId),
								inArray(payments.status, ["paid", "refunded"]),
								notExists(
									tx.select({ id: patientInvoices.id })
										.from(patientInvoices)
										.where(
											and(
												eq(patientInvoices.id, payments.documentId),
												eq(patientInvoices.organizationId, orgId),
												inArray(patientInvoices.status, ["voided", "cancelled"]),
											),
										),
								),
							),
						),
						tx.select({
							id: communicationEvents.id,
							channel: communicationEvents.channel,
							direction: communicationEvents.direction,
							durationSeconds: communicationEvents.durationSeconds,
							status: communicationEvents.status,
						}).from(communicationEvents).where(eq(communicationEvents.organizationId, orgId)),
					]);

					let budgets: Record<string, number> | undefined;
					try {
						const { channels: persistedChannels } = await readOrSeedOrganizationRomiChannels(orgId, tx);
						budgets = {};
						for (const ch of persistedChannels) {
							if (ch.spentKopecks > 0) {
								budgets[ch.channelKey] = ch.spentKopecks;
							}
						}
					} catch (romiSeedErr) {
						request.log.warn({ romiSeedErr }, "[Marketing] Non-critical: could not load persisted custom budgets, using CRM default aggregation");
					}

					return {
						allPatients: patientsRows,
						allAppts: apptsRows,
						allPayments: paymentsRows,
						allCallEvents: callRows,
						customBudgetsKopecks: budgets,
					};
				});

			const romiChannels = aggregateCrmMarketingMetrics({
				patients: allPatients.map((p) => ({
					id: p.id,
					administrativeProfile: (p.administrativeProfile && typeof p.administrativeProfile === "object"
						? (p.administrativeProfile as Record<string, unknown>)
						: null),
					notes: p.notes,
				})),
				appointments: allAppts.map((a) => ({
					id: a.id,
					patientId: a.patientId ?? "",
					status: a.status ?? "",
				})),
				payments: buildNetPaidRowsForRomi(allPayments),
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
		const orgId = await requireMarketingReadAccess(request, reply, "online booking funnel");
		if (!orgId) return;

		try {
			const [allLeads, allAppts, allPayments, allPatients] = await withTenantCtx(orgId, (tx) =>
				Promise.all([
					tx.select({
						id: crmLeads.id,
						patientId: crmLeads.patientId,
						phone: crmLeads.phone,
						source: crmLeads.source,
						status: crmLeads.status,
					}).from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
					tx.select({
						id: appointments.id,
						patientId: appointments.patientId,
						status: appointments.status,
					}).from(appointments).where(eq(appointments.organizationId, orgId)),
					tx.select({
						id: payments.id,
						patientId: payments.patientId,
						amountKopecks: payments.amountKopecks,
						amountRub: payments.amountRub,
						status: payments.status,
					}).from(payments).where(
						and(
							eq(payments.organizationId, orgId),
							inArray(payments.status, ["paid", "refunded"]),
							notExists(
								tx.select({ id: patientInvoices.id })
									.from(patientInvoices)
									.where(
										and(
											eq(patientInvoices.id, payments.documentId),
											eq(patientInvoices.organizationId, orgId),
											inArray(patientInvoices.status, ["voided", "cancelled"]),
										),
									),
							),
						),
					),
					tx.select({
						id: patients.id,
						fullName: patients.fullName,
						phone: patients.phone,
						notes: patients.notes,
						administrativeProfile: patients.administrativeProfile,
						createdAt: patients.createdAt,
					}).from(patients).where(eq(patients.organizationId, orgId)),
				]),
			);

			const funnel = calculateOnlineBookingFunnel({
				allLeads,
				allAppts,
				allPayments,
				allPatients,
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
	 * GET /api/marketing/cohort-segments
	 * Честные когорты пациентов и 3D RFM матрица из реальной базы PostgreSQL 18 ([LOY-10 & LOY-11]).
	 */
	app.get("/api/marketing/cohort-segments", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireMarketingReadAccess(request, reply, "marketing cohort segments");
		if (!orgId) return;

		try {
			const report = await calculateRealMarketingCohorts(orgId);
			return reply.code(200).send(report);
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error calculating cohort segments");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось рассчитать когортные сегменты и RFM матрицу",
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
