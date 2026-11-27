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
import { and, desc, eq, gte, inArray, lte, notExists, sql } from "drizzle-orm";
import { z } from "zod";
import { defineStreamRoute } from "../core/routeFactories.js";
import { withSavepoint, withTenantReadCtx } from "../db/rls.js";
import { clinicTimeZone } from "../services/reports/managerReports/timezone.js";
import { resolveExecutiveDateRange } from "./analytics/executiveKpiDateUtils.js";
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

const marketingAnalyticsQuerySchema = z.object({
	period: z.enum(["day", "week", "month", "quarter", "year", "all", "7d", "30d", "90d"]).optional(),
	from: z.string().trim().min(1).max(64).optional(),
	to: z.string().trim().min(1).max(64).optional(),
	limit: z.coerce.number().int().min(1).max(5000).optional(),
});

function resolveMarketingBounds(
	query: z.infer<typeof marketingAnalyticsQuerySchema>,
	timeZone: string | null,
): { startDate: Date | null; endDate: Date | null; apptEndDate: Date | null; rowLimit: number } {
	const rowLimit = query.limit ?? 2000;
	if (query.period === "all" && !query.from && !query.to) {
		return { startDate: null, endDate: null, apptEndDate: null, rowLimit };
	}
	if (query.from) {
		const range = resolveExecutiveDateRange("custom", query.from, query.to, timeZone);
		return {
			startDate: range.startDate,
			endDate: range.endDate,
			apptEndDate: query.to ? range.endDate : null,
			rowLimit,
		};
	}
	const p = query.period ?? "year";
	if (p === "7d") {
		const end = new Date();
		return {
			startDate: new Date(end.getTime() - 7 * 86_400_000),
			endDate: end,
			apptEndDate: query.to ? end : null,
			rowLimit,
		};
	}
	if (p === "30d") {
		const end = new Date();
		return {
			startDate: new Date(end.getTime() - 30 * 86_400_000),
			endDate: end,
			apptEndDate: query.to ? end : null,
			rowLimit,
		};
	}
	if (p === "90d") {
		const end = new Date();
		return {
			startDate: new Date(end.getTime() - 90 * 86_400_000),
			endDate: end,
			apptEndDate: query.to ? end : null,
			rowLimit,
		};
	}
	const range = resolveExecutiveDateRange(p, undefined, undefined, timeZone);
	return {
		startDate: range.startDate,
		endDate: range.endDate,
		apptEndDate: query.to ? range.endDate : null,
		rowLimit,
	};
}

export async function registerMarketingRoutes(app: FastifyInstance) {
	await registerMarketingPromosRoutes(app);

	/**
	 * GET /api/marketing/attribution
	 * Сводная сквозная аналитика: онлайн-самозапись vs телефония регистратуры + каналы ROMI (Фича #28)
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/marketing/attribution",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireMarketingReadAccess(request, reply, "marketing attribution");
			if (!orgId) return;

			const parsedQuery = marketingAnalyticsQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры периода аналитики маркетинга",
				});
			}

			try {
				const [allLeads, allAppts, allPayments, allPatients, allCallEvents, allMarketingExpenses] =
					await withTenantReadCtx(orgId, async (tx) => {
						const tz = await clinicTimeZone(orgId, tx);
						const { startDate, endDate, apptEndDate, rowLimit } = resolveMarketingBounds(parsedQuery.data, tz);
						return Promise.all([
							tx.select({
								id: crmLeads.id,
								patientId: crmLeads.patientId,
								phone: crmLeads.phone,
								source: crmLeads.source,
								status: crmLeads.status,
								createdAt: crmLeads.createdAt,
							}).from(crmLeads).where(
								and(
									eq(crmLeads.organizationId, orgId),
									startDate ? gte(crmLeads.createdAt, startDate) : sql`true`,
									endDate ? lte(crmLeads.createdAt, endDate) : sql`true`,
								),
							).orderBy(desc(crmLeads.createdAt)).limit(rowLimit),
							tx.select({
								id: appointments.id,
								patientId: appointments.patientId,
								status: appointments.status,
								startsAt: appointments.startsAt,
							}).from(appointments).where(
								and(
									eq(appointments.organizationId, orgId),
									startDate ? gte(appointments.startsAt, startDate) : sql`true`,
									apptEndDate ? lte(appointments.startsAt, apptEndDate) : sql`true`,
								),
							).orderBy(desc(appointments.startsAt)).limit(rowLimit),
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
									startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
									endDate ? lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, endDate) : sql`true`,
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
							).orderBy(desc(payments.createdAt)).limit(rowLimit),
							tx.select({
								id: patients.id,
								fullName: patients.fullName,
								phone: patients.phone,
								notes: patients.notes,
								administrativeProfile: patients.administrativeProfile,
								createdAt: patients.createdAt,
							}).from(patients).where(eq(patients.organizationId, orgId))
								.orderBy(desc(patients.createdAt)).limit(rowLimit),
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
									startDate ? gte(communicationEvents.createdAt, startDate) : sql`true`,
									endDate ? lte(communicationEvents.createdAt, endDate) : sql`true`,
								),
							).orderBy(desc(communicationEvents.createdAt)).limit(rowLimit),
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
									startDate ? gte(cashOperations.createdAt, startDate) : sql`true`,
									endDate ? lte(cashOperations.createdAt, endDate) : sql`true`,
								),
							).orderBy(desc(cashOperations.createdAt)).limit(rowLimit),
						]);
					});

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
		},
	});

	/**
	 * GET /api/marketing/romi
	 * Прямая сводная таблица окупаемости маркетинга (ROMI) из реальных данных БД CRM.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/marketing/romi",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireMarketingReadAccess(request, reply, "marketing romi");
			if (!orgId) return;

			const parsedQuery = marketingAnalyticsQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры периода ROMI",
				});
			}

			try {
				const { allPatients, allAppts, allPayments, allCallEvents, customBudgetsKopecks } =
					await withTenantReadCtx(orgId, async (tx) => {
						const tz = await clinicTimeZone(orgId, tx);
						const { startDate, endDate, apptEndDate, rowLimit } = resolveMarketingBounds(parsedQuery.data, tz);
						const [patientsRows, apptsRows, paymentsRows, callRows] = await Promise.all([
							tx.select({
								id: patients.id,
								fullName: patients.fullName,
								phone: patients.phone,
								notes: patients.notes,
								administrativeProfile: patients.administrativeProfile,
								createdAt: patients.createdAt,
							}).from(patients).where(eq(patients.organizationId, orgId))
								.orderBy(desc(patients.createdAt)).limit(rowLimit),
							tx.select({
								id: appointments.id,
								patientId: appointments.patientId,
								status: appointments.status,
							}).from(appointments).where(
								and(
									eq(appointments.organizationId, orgId),
									startDate ? gte(appointments.startsAt, startDate) : sql`true`,
									apptEndDate ? lte(appointments.startsAt, apptEndDate) : sql`true`,
								),
							).orderBy(desc(appointments.startsAt)).limit(rowLimit),
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
									startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
									endDate ? lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, endDate) : sql`true`,
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
							).orderBy(desc(payments.createdAt)).limit(rowLimit),
							tx.select({
								id: communicationEvents.id,
								channel: communicationEvents.channel,
								direction: communicationEvents.direction,
								durationSeconds: communicationEvents.durationSeconds,
								status: communicationEvents.status,
							}).from(communicationEvents).where(
								and(
									eq(communicationEvents.organizationId, orgId),
									startDate ? gte(communicationEvents.createdAt, startDate) : sql`true`,
									endDate ? lte(communicationEvents.createdAt, endDate) : sql`true`,
								),
							).orderBy(desc(communicationEvents.createdAt)).limit(rowLimit),
						]);

						let budgets: Record<string, number> | undefined;
						try {
							const { channels: persistedChannels } = await withSavepoint(
								tx,
								(spTx) => readOrSeedOrganizationRomiChannels(orgId, spTx),
							);
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
		},
	});

	/**
	 * GET /api/marketing/online-booking/funnel
	 * Пошаговая воронка конверсии самозаписи (Фича №28)
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/marketing/online-booking/funnel",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireMarketingReadAccess(request, reply, "online booking funnel");
			if (!orgId) return;

			const parsedQuery = marketingAnalyticsQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры периода воронки самозаписи",
				});
			}

			try {
				const [allLeads, allAppts, allPayments, allPatients] = await withTenantReadCtx(orgId, async (tx) => {
					const tz = await clinicTimeZone(orgId, tx);
					const { startDate, endDate, apptEndDate, rowLimit } = resolveMarketingBounds(parsedQuery.data, tz);
					return Promise.all([
						tx.select({
							id: crmLeads.id,
							patientId: crmLeads.patientId,
							phone: crmLeads.phone,
							source: crmLeads.source,
							status: crmLeads.status,
						}).from(crmLeads).where(
							and(
								eq(crmLeads.organizationId, orgId),
								startDate ? gte(crmLeads.createdAt, startDate) : sql`true`,
								endDate ? lte(crmLeads.createdAt, endDate) : sql`true`,
							),
						).orderBy(desc(crmLeads.createdAt)).limit(rowLimit),
						tx.select({
							id: appointments.id,
							patientId: appointments.patientId,
							status: appointments.status,
						}).from(appointments).where(
							and(
								eq(appointments.organizationId, orgId),
								startDate ? gte(appointments.startsAt, startDate) : sql`true`,
								apptEndDate ? lte(appointments.startsAt, apptEndDate) : sql`true`,
							),
						).orderBy(desc(appointments.startsAt)).limit(rowLimit),
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
								startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
								endDate ? lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, endDate) : sql`true`,
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
						).orderBy(desc(payments.createdAt)).limit(rowLimit),
						tx.select({
							id: patients.id,
							fullName: patients.fullName,
							phone: patients.phone,
							notes: patients.notes,
							administrativeProfile: patients.administrativeProfile,
							createdAt: patients.createdAt,
						}).from(patients).where(eq(patients.organizationId, orgId))
							.orderBy(desc(patients.createdAt)).limit(rowLimit),
					]);
				});

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
		},
	});

	/**
	 * GET /api/marketing/cohort-segments
	 * Честные когорты пациентов и 3D RFM матрица из реальной базы PostgreSQL 18 ([LOY-10 & LOY-11]).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/marketing/cohort-segments",
		permission: "public",
		handler: async ({ request, reply }) => {
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
		},
	});

	/**
	 * GET /api/marketing/patient-field-requirements
	 * Настройки обязательности полей карточки пациента (Фича №35)
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/marketing/patient-field-requirements",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleGetPatientFieldRequirements(request, reply),
	});

	/**
	 * PUT /api/marketing/patient-field-requirements
	 * Обновление настроек обязательности полей карточки пациента (Фича №35)
	 */
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/marketing/patient-field-requirements",
		permission: "public",
		handler: async ({ request, reply }) =>
			handlePutPatientFieldRequirements(request, reply),
	});

	/**
	 * GET /api/marketing/reports
	 * Маркетинговые сводные отчеты (ROMI, CAC, воронка и распределение по каналам).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/marketing/reports",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleGetMarketingReports(request, reply),
	});
}
