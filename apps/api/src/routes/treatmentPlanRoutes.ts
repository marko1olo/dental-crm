import { and, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	appointments,
	auditEvents,
	patients,
	portalBudgetTokens,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../db/schema.js";
import { PortalBudgetService } from "../services/portalBudgetService.js";
import { wsBroker } from "../services/websocketBroker.js";

export type PipelineStage =
	| "requires_budget"
	| "awaiting_decision"
	| "no_appointment"
	| "in_progress_abandoned"
	| "completed";

export interface PipelineCard {
	id: string;
	name: string;
	title: string;
	status: string;
	stage: PipelineStage;
	patientId: string;
	patientName: string;
	patientPhone: string | null;
	doctorId: string | null;
	doctorName: string | null;
	totalPriceRub: number;
	discountRub: number;
	netTotalRub: number;
	itemsCount: number;
	createdAt: string;
	updatedAt: string;
	lastActivityAt: string;
	daysSinceLastActivity: number;
	budgetToken?: string | null;
	budgetStatus?: string | null;
	hasFutureAppointment: boolean;
	nextAppointmentDate?: string | null;
	lastAppointmentDate?: string | null;
}

const querySchema = z.object({
	doctorId: z.string().uuid("Идентификатор врача должен быть корректным UUID").optional(),
	search: z.string().max(100, "Поисковый запрос не должен превышать 100 символов").optional(),
	limit: z.coerce.number().int("Лимит должен быть целым числом").positive("Лимит должен быть положительным числом").max(1000, "Лимит не должен превышать 1000").optional(),
	offset: z.coerce.number().int("Смещение должно быть целым числом").min(0, "Смещение не может быть отрицательным").optional(),
	stage: z.enum([
		"requires_budget",
		"awaiting_decision",
		"no_appointment",
		"in_progress_abandoned",
		"completed",
	], { errorMap: () => ({ message: "Недопустимый этап воронки планов лечения" }) }).optional(),
	startDate: z.string().datetime({ message: "Дата начала должна быть в формате ISO" }).optional(),
	endDate: z.string().datetime({ message: "Дата окончания должна быть в формате ISO" }).optional(),
});

export const treatmentPlanRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/treatment-plans/pipeline — 5-колоночная оперативная воронка координатора
	server.get(
		"/api/v1/treatment-plans/pipeline",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"treatment plan pipeline",
			);
			if (!context) return;
			const organizationId = context.organizationId;

			const parsed = querySchema.safeParse(request.query);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "InvalidQueryParams",
					message: "Некорректные параметры запроса воронки планов лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
					issues: parsed.error.issues,
				});
			}
			const filterDoctorId = parsed.data.doctorId;
			const filterSearch = parsed.data.search?.trim().toLowerCase();
			const filterStage = parsed.data.stage;
			const filterLimit = parsed.data.limit;
			const filterOffset = parsed.data.offset;

			// Читаем все планы лечения организации
			const conditions = [eq(treatmentPlans.organizationId, organizationId)];
			if (filterDoctorId) {
				conditions.push(eq(treatmentPlans.doctorId, filterDoctorId));
			}

			const plans = await db
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					title: treatmentPlans.title,
					status: treatmentPlans.status,
					totalPrice: treatmentPlans.totalPrice,
					totalPriceRub: treatmentPlans.totalPriceRub,
					planDiscountRub: treatmentPlans.planDiscountRub,
					patientId: treatmentPlans.patientId,
					doctorId: treatmentPlans.doctorId,
					createdAt: treatmentPlans.createdAt,
					updatedAt: treatmentPlans.updatedAt,
					approvedAt: treatmentPlans.approvedAt,
					patientName: patients.fullName,
					patientPhone: patients.phone,
					doctorName: users.fullName,
				})
				.from(treatmentPlans)
				.leftJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.leftJoin(users, eq(treatmentPlans.doctorId, users.id))
				.where(and(...conditions))
				.orderBy(desc(treatmentPlans.updatedAt));

			if (plans.length === 0) {
				return reply.code(200).send({
					pipeline: {
						requires_budget: [],
						awaiting_decision: [],
						no_appointment: [],
						in_progress_abandoned: [],
						completed: [],
					},
					summary: {
						counts: {
							requires_budget: 0,
							awaiting_decision: 0,
							no_appointment: 0,
							in_progress_abandoned: 0,
							completed: 0,
							total: 0,
						},
						totalsRub: {
							requires_budget: 0,
							awaiting_decision: 0,
							no_appointment: 0,
							in_progress_abandoned: 0,
							completed: 0,
							total: 0,
						},
					},
				});
			}

			const patientIds = Array.from(new Set(plans.map((p) => p.patientId).filter(Boolean)));
			const planIds = plans.map((p) => p.id);

			// Загружаем активные ссылки на сметы (portal_budget_tokens)
			const budgetTokens = await db
				.select({
					token: portalBudgetTokens.token,
					planId: portalBudgetTokens.planId,
					status: portalBudgetTokens.status,
					netTotalRub: portalBudgetTokens.netTotalRub,
					createdAt: portalBudgetTokens.createdAt,
					viewedAt: portalBudgetTokens.viewedAt,
					signedAt: portalBudgetTokens.signedAt,
				})
				.from(portalBudgetTokens)
				.where(
					and(
						eq(portalBudgetTokens.organizationId, organizationId),
						inArray(portalBudgetTokens.planId, planIds),
					),
				);

			const budgetMap = new Map<string, typeof budgetTokens[0]>();
			for (const b of budgetTokens) {
				if (b.planId && !budgetMap.has(b.planId)) {
					budgetMap.set(b.planId, b);
				}
			}

			// Проверяем будущие и прошлые записи пациентов (Appointments)
			const now = new Date();
			const nowIso = now.toISOString();

			const apptRows = await db
				.select({
					patientId: appointments.patientId,
					startsAt: appointments.startsAt,
					status: appointments.status,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, organizationId),
						inArray(appointments.patientId, patientIds),
						sql`${appointments.status} != 'cancelled'`,
					),
				);

			const futureAppointmentsByPatient = new Map<string, string>();
			const latestPastAppointmentByPatient = new Map<string, string>();

			for (const appt of apptRows) {
				if (!appt.patientId) continue;
				const apptDate = new Date(appt.startsAt);
				if (apptDate >= now) {
					const existing = futureAppointmentsByPatient.get(appt.patientId);
					if (!existing || new Date(existing) > apptDate) {
						futureAppointmentsByPatient.set(appt.patientId, appt.startsAt instanceof Date ? appt.startsAt.toISOString() : String(appt.startsAt));
					}
				} else {
					const existing = latestPastAppointmentByPatient.get(appt.patientId);
					if (!existing || new Date(existing) < apptDate) {
						latestPastAppointmentByPatient.set(appt.patientId, appt.startsAt instanceof Date ? appt.startsAt.toISOString() : String(appt.startsAt));
					}
				}
			}

			const columns: Record<PipelineStage, PipelineCard[]> = {
				requires_budget: [],
				awaiting_decision: [],
				no_appointment: [],
				in_progress_abandoned: [],
				completed: [],
			};

			for (const p of plans) {
				if (filterSearch) {
					const matchName = (p.patientName || "").toLowerCase().includes(filterSearch);
					const matchPhone = (p.patientPhone || "").toLowerCase().includes(filterSearch);
					const matchTitle = (p.title || p.name || "").toLowerCase().includes(filterSearch);
					if (!matchName && !matchPhone && !matchTitle) continue;
				}

				const budget = budgetMap.get(p.id);
				const hasFuture = futureAppointmentsByPatient.has(p.patientId);
				const nextAppt = futureAppointmentsByPatient.get(p.patientId) || null;
				const lastAppt = latestPastAppointmentByPatient.get(p.patientId) || null;

				const updatedAtDate = p.updatedAt ? new Date(p.updatedAt) : now;
				const lastActivityDate = lastAppt ? new Date(lastAppt) : updatedAtDate;
				const diffMs = Math.max(0, now.getTime() - lastActivityDate.getTime());
				const daysSinceLastActivity = Math.floor(diffMs / (1000 * 60 * 60 * 24));

				const totalRub = Number(p.totalPriceRub) || Number(p.totalPrice) || 0;
				const discRub = Number(p.planDiscountRub) || 0;
				const netRub = Math.max(0, totalRub - discRub);

				// ОПРЕДЕЛЕНИЕ СТАДИИ (5 колонок воронки):
				let stage: PipelineStage;

				if (p.status === "Completed") {
					// 5. Завершенные планы
					stage = "completed";
				} else if (p.status === "Approved" || budget?.status === "accepted") {
					if (!hasFuture) {
						// 3. Смета одобрена / подписана, но запись на приём отсутствует
						stage = "no_appointment";
					} else {
						stage = "awaiting_decision";
					}
				} else if (budget && (budget.status === "sent" || budget.status === "viewed")) {
					// 2. Смета отправлена / открыта, пациент думает
					stage = "awaiting_decision";
				} else if (p.status === "Active") {
					// Если план в процессе, но визитов нет >30 дней и нет будущей записи — брошен
					if (daysSinceLastActivity >= 30 && !hasFuture) {
						stage = "in_progress_abandoned";
					} else if (!hasFuture) {
						stage = "no_appointment";
					} else {
						stage = "awaiting_decision";
					}
				} else {
					// 1. Черновик или нет сметы — требуется смета
					if (daysSinceLastActivity >= 45 && !hasFuture) {
						stage = "in_progress_abandoned";
					} else {
						stage = "requires_budget";
					}
				}

				const card: PipelineCard = {
					id: p.id,
					name: p.name,
					title: p.title || p.name,
					status: p.status,
					stage,
					patientId: p.patientId,
					patientName: p.patientName || "Без имени",
					patientPhone: p.patientPhone || null,
					doctorId: p.doctorId || null,
					doctorName: p.doctorName || "Врач не назначен",
					totalPriceRub: totalRub,
					discountRub: discRub,
					netTotalRub: netRub,
					itemsCount: 1,
					createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : nowIso,
					updatedAt: updatedAtDate.toISOString(),
					lastActivityAt: lastActivityDate.toISOString(),
					daysSinceLastActivity,
					budgetToken: budget?.token ?? null,
					budgetStatus: budget?.status ?? null,
					hasFutureAppointment: hasFuture,
					nextAppointmentDate: nextAppt,
					lastAppointmentDate: lastAppt,
				};

				columns[stage].push(card);
			}

			const summary = {
				counts: {
					requires_budget: columns.requires_budget.length,
					awaiting_decision: columns.awaiting_decision.length,
					no_appointment: columns.no_appointment.length,
					in_progress_abandoned: columns.in_progress_abandoned.length,
					completed: columns.completed.length,
					total:
						columns.requires_budget.length +
						columns.awaiting_decision.length +
						columns.no_appointment.length +
						columns.in_progress_abandoned.length +
						columns.completed.length,
				},
				totalsRub: {
					requires_budget: columns.requires_budget.reduce((acc, c) => acc + c.netTotalRub, 0),
					awaiting_decision: columns.awaiting_decision.reduce((acc, c) => acc + c.netTotalRub, 0),
					no_appointment: columns.no_appointment.reduce((acc, c) => acc + c.netTotalRub, 0),
					in_progress_abandoned: columns.in_progress_abandoned.reduce((acc, c) => acc + c.netTotalRub, 0),
					completed: columns.completed.reduce((acc, c) => acc + c.netTotalRub, 0),
					total:
						columns.requires_budget.reduce((acc, c) => acc + c.netTotalRub, 0) +
						columns.awaiting_decision.reduce((acc, c) => acc + c.netTotalRub, 0) +
						columns.no_appointment.reduce((acc, c) => acc + c.netTotalRub, 0) +
						columns.in_progress_abandoned.reduce((acc, c) => acc + c.netTotalRub, 0) +
						columns.completed.reduce((acc, c) => acc + c.netTotalRub, 0),
				},
			};

			return reply.code(200).send({
				pipeline: columns,
				summary,
			});
		},
	);

	// 2. POST /api/v1/treatment-plans/:id/create-budget-link — создание ссылки на подписание сметы
	server.post<{ Params: { id: string } }>(
		"/api/v1/treatment-plans/:id/create-budget-link",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"create budget link",
			);
			if (!context) return;
			const organizationId = context.organizationId;
			const planId = request.params.id;

			const [plan] = await db
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					patientId: treatmentPlans.patientId,
					doctorId: treatmentPlans.doctorId,
					totalPriceRub: treatmentPlans.totalPriceRub,
					planDiscountRub: treatmentPlans.planDiscountRub,
				})
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!plan) {
				return reply.code(404).send({
					error: "TreatmentPlanNotFound",
					message: "План лечения не найден.",
				});
			}

			// Генерируем токен согласования
			const gen = await PortalBudgetService.generateBudgetPortalToken({
				planId: plan.id,
				organizationId,
				patientId: plan.patientId,
				doctorId: plan.doctorId || undefined,
				authMethod: "phone_last4",
			});

			const publicUrl = `/public/budget/${gen.token}`;

			// Аудит
			try {
				await db.insert(auditEvents).values({
					organizationId,
					actorUserId: null,
					entityType: "treatment_plan",
					entityId: plan.id,
					action: "BUDGET_LINK_GENERATED",
					reason: `Выпущена публичная ссылка на смету (token: ${gen.token})`,
				});
			} catch (auditErr) {
				request.log.warn({ err: auditErr }, "Не удалось записать аудит выпуска ссылки на смету");
			}

			wsBroker.broadcastToOrganization(organizationId, {
				type: "TREATMENT_PLAN_BUDGET_LINK_CREATED",
				payload: {
					planId: plan.id,
					token: gen.token,
					shareUrl: publicUrl,
				},
			});

			return reply.code(200).send({
				success: true,
				token: gen.token,
				shareUrl: publicUrl,
				publicUrl,
				expiresAt: gen.expiresAt,
			});
		},
	);
};
