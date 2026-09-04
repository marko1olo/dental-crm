/**
 * crmLeakDetector.ts — Fastify Routes for 210-Day CRM Leak Detector & Smart Patient Reactivation Funnel.
 *
 * Re-engineered from StomX competitive audit (Section 10, endpoints 69 & 70).
 * Compliant with 210-day clinical hygiene/warranty threshold and zero-spam booking exclusion.
 */

import {
	CLINICAL_LEAK_THRESHOLD_DAYS,
	calculateLeakFunnelMetrics,
	crmDeclineReasonSchema,
	crmLeadStatusSchema,
	generateClinicalRiskReason,
	generateReactivationScript,
	isClinicalObservationPause,
} from "@dental/shared";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	appointments,
	appointmentWaitlists,
	crmLeakDetectorLeads,
	patients,
	treatmentPlans,
	treatmentPlanStages,
	users,
	clinics,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function registerCrmLeakDetectorRoutes(app: FastifyInstance) {
	/**
	 * 1. GET /api/crm/leak-detector — Список лидов утечки пациентов
	 */
	app.get("/api/crm/leak-detector", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "crm leak detector read");
		if (!orgId) return;

		const querySchema = z.object({
			minDays: z.coerce.number().min(30).default(CLINICAL_LEAK_THRESHOLD_DAYS),
			status: z
				.enum([
					"all",
					"new",
					"in_progress",
					"contacted",
					"rebooked",
					"declined",
					"archived",
					"clinical_observation_pause",
					"CLINICAL_OBSERVATION_PAUSE",
				])
				.default("all"),
			doctorId: z.string().uuid().optional(),
			hasUncompletedPlan: z.enum(["true", "false"]).optional(),
			search: z.string().optional(),
			limit: z.coerce.number().min(1).max(200).default(50),
			offset: z.coerce.number().min(0).default(0),
		});

		const parsed = querySchema.safeParse(req.query);
		if (!parsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса", issues: parsed.error.issues });
		}

		const { minDays, status, doctorId, hasUncompletedPlan, search, limit, offset } = parsed.data;

		return withTenantCtx(orgId, async (tx) => {
			const conditions = [
				eq(crmLeakDetectorLeads.organizationId, orgId),
				sql`${crmLeakDetectorLeads.daysSinceLastVisit} >= ${minDays}`,
			];

			if (status !== "all") {
				if (status === "clinical_observation_pause" || status === "CLINICAL_OBSERVATION_PAUSE") {
					conditions.push(
						sql`${crmLeakDetectorLeads.leadStatus} IN ('clinical_observation_pause', 'CLINICAL_OBSERVATION_PAUSE')`,
					);
				} else {
					conditions.push(eq(crmLeakDetectorLeads.leadStatus, status));
				}
			}
			if (doctorId) {
				conditions.push(eq(crmLeakDetectorLeads.lastDoctorId, doctorId));
			}
			if (hasUncompletedPlan !== undefined) {
				conditions.push(eq(crmLeakDetectorLeads.hasUncompletedPlan, hasUncompletedPlan === "true"));
			}

			const query = tx
				.select({
					lead: crmLeakDetectorLeads,
					patientFullName: patients.fullName,
					patientPhone: patients.phone,
					patientBirthDate: patients.birthDate,
				})
				.from(crmLeakDetectorLeads)
				.innerJoin(patients, eq(patients.id, crmLeakDetectorLeads.patientId))
				.where(and(...conditions))
				.orderBy(desc(crmLeakDetectorLeads.daysSinceLastVisit))
				.limit(limit)
				.offset(offset);

			const rows = await query;

			const data = rows.map((r) => ({
				...r.lead,
				patientFullName: r.patientFullName || "Пациент",
				patientPhone: r.patientPhone || "Не указан",
				patientBirthDate: r.patientBirthDate,
			}));

			return reply.send({ data, total: data.length, limit, offset });
		});
	});

	/**
	 * 2. POST /api/crm/leak-detector/sync — Автоматический сбор пациентов > 210 дней
	 */
	app.post("/api/crm/leak-detector/sync", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "crm leak detector sync");
		if (!orgId) return;

		const now = new Date();
		const thresholdDate = new Date(now.getTime() - CLINICAL_LEAK_THRESHOLD_DAYS * MS_PER_DAY);

		return withTenantCtx(orgId, async (tx) => {
			// Находим клинику для текста скрипта
			const [clinic] = await tx.select({ name: clinics.name }).from(clinics).where(eq(clinics.organizationId, orgId)).limit(1);
			const clinicName = clinic?.name || "ДЕНТЕ";

			// Ищем пациентов, у которых:
			// 1) Последний состоявшийся визит <= thresholdDate (>= 210 дней назад)
			// 2) НЕТ будущих визитов (starts_at > now)
			// 3) НЕТ активного листа ожидания
			const candidatePatients = await tx
				.select({
					patientId: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					createdAt: patients.createdAt,
					lastPastVisit: sql<Date | null>`(
						SELECT max(a.starts_at) FROM ${appointments} a
						WHERE a.organization_id = ${orgId}
						  AND a.patient_id = ${patients.id}
						  AND a.starts_at <= ${now}
						  AND a.status IN ('completed', 'arrived', 'in_treatment')
					)`,
					lastDoctorId: sql<string | null>`(
						SELECT a.doctor_user_id FROM ${appointments} a
						WHERE a.organization_id = ${orgId}
						  AND a.patient_id = ${patients.id}
						  AND a.starts_at <= ${now}
						  AND a.status IN ('completed', 'arrived', 'in_treatment')
						ORDER BY a.starts_at DESC LIMIT 1
					)`,
					lastReason: sql<string | null>`(
						SELECT a.reason FROM ${appointments} a
						WHERE a.organization_id = ${orgId}
						  AND a.patient_id = ${patients.id}
						  AND a.starts_at <= ${now}
						  AND a.status IN ('completed', 'arrived', 'in_treatment')
						ORDER BY a.starts_at DESC LIMIT 1
					)`,
					uncompletedPlansSum: sql<number>`COALESCE((
						SELECT sum(tp.total_amount_rub) FROM ${treatmentPlans} tp
						WHERE tp.organization_id = ${orgId}
						  AND tp.patient_id = ${patients.id}
						  AND tp.status IN ('active', 'in_progress', 'draft')
					), 0)`,
				})
				.from(patients)
				.leftJoin(
					appointments,
					and(
						eq(appointments.organizationId, orgId),
						eq(appointments.patientId, patients.id),
						gt(appointments.startsAt, now),
						sql`${appointments.status} IN ('planned', 'confirmed', 'arrived', 'in_treatment')`,
					),
				)
				.leftJoin(
					appointmentWaitlists,
					and(
						eq(appointmentWaitlists.organizationId, orgId),
						eq(appointmentWaitlists.patientId, patients.id),
						eq(appointmentWaitlists.status, "active"),
					),
				)
				.where(
					and(
						eq(patients.organizationId, orgId),
						eq(patients.status, "active"),
						isNull(patients.mergedIntoPatientId),
						isNull(appointments.id),        // НЕТ будущих записей!
						isNull(appointmentWaitlists.id), // НЕТ активного листа ожидания!
					),
				);

			let createdCount = 0;
			let updatedCount = 0;

			for (const row of candidatePatients) {
				const lastVisit = row.lastPastVisit ? new Date(row.lastPastVisit) : null;
				if (!lastVisit) continue; // Пациенты без завершенных приемов не считаются оттоком от лечения

				const diffDays = Math.floor((now.getTime() - lastVisit.getTime()) / MS_PER_DAY);
				if (diffDays < CLINICAL_LEAK_THRESHOLD_DAYS) continue;

				// Имя врача и специализация
				let doctorName: string | null = null;
				let doctorSpecialty: string | null = null;
				if (row.lastDoctorId) {
					const [doc] = await tx
						.select({ name: users.fullName, specialties: users.specialties })
						.from(users)
						.where(eq(users.id, row.lastDoctorId))
						.limit(1);
					doctorName = doc?.name || null;
					if (doc?.specialties) {
						const specs = Array.isArray(doc.specialties) ? doc.specialties : [String(doc.specialties)];
						doctorSpecialty = specs.map((s) => String(s)).join(", ") || null;
					}
				}

				const hasUncompletedPlan = Number(row.uncompletedPlansSum) > 0;
				const isPause = isClinicalObservationPause(
					doctorSpecialty,
					row.lastReason,
					diffDays,
					hasUncompletedPlan,
				);
				const targetStatus = isPause ? "CLINICAL_OBSERVATION_PAUSE" : "new";
				const riskReason = generateClinicalRiskReason(diffDays, hasUncompletedPlan, doctorSpecialty, isPause);
				const script = generateReactivationScript(
					row.fullName || "Пациент",
					clinicName,
					doctorName,
					diffDays,
					hasUncompletedPlan,
				);

				// Проверяем, есть ли уже лид
				const [existing] = await tx
					.select()
					.from(crmLeakDetectorLeads)
					.where(and(eq(crmLeakDetectorLeads.organizationId, orgId), eq(crmLeakDetectorLeads.patientId, row.patientId)))
					.limit(1);

				if (existing) {
					// Не сбрасываем статус, если уже в работе или сконвертирован
					const isModifiableStatus =
						existing.leadStatus === "new" ||
						existing.leadStatus === "archived" ||
						existing.leadStatus === "CLINICAL_OBSERVATION_PAUSE" ||
						existing.leadStatus === "clinical_observation_pause";

					if (isModifiableStatus) {
						await tx
							.update(crmLeakDetectorLeads)
							.set({
								daysSinceLastVisit: diffDays,
								lastVisitDate: lastVisit,
								lastDoctorId: row.lastDoctorId,
								lastDoctorName: doctorName,
								lastSpecialty: doctorSpecialty,
								uncompletedPlanSumRub: Number(row.uncompletedPlansSum),
								hasUncompletedPlan,
								clinicalRiskReason: riskReason,
								leadStatus: targetStatus,
								aiReactivationSuggestion: script,
								updatedAt: now,
							})
							.where(eq(crmLeakDetectorLeads.id, existing.id));
						updatedCount++;
					}
				} else {
					await tx.insert(crmLeakDetectorLeads).values({
						organizationId: orgId,
						patientId: row.patientId,
						daysSinceLastVisit: diffDays,
						lastVisitDate: lastVisit,
						lastDoctorId: row.lastDoctorId,
						lastDoctorName: doctorName,
						lastSpecialty: doctorSpecialty,
						uncompletedPlanSumRub: Number(row.uncompletedPlansSum),
						hasUncompletedPlan,
						clinicalRiskReason: riskReason,
						leadStatus: targetStatus,
						aiReactivationSuggestion: script,
					});
					createdCount++;
				}
			}

			return reply.send({
				success: true,
				message: `Синхронизация завершена: обнаружено новых ${createdCount} лидов, обновлено ${updatedCount}.`,
				createdCount,
				updatedCount,
			});
		});
	});

	/**
	 * 3. POST /api/crm/leak-detector/:id/start-lead — Взять лид в работу администратором
	 */
	app.post("/api/crm/leak-detector/:id/start-lead", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "start leak lead");
		if (!orgId) return;
		const { id } = req.params as { id: string };
		const identity = getRequestIdentity(req);

		return withTenantCtx(orgId, async (tx) => {
			const [lead] = await tx
				.select()
				.from(crmLeakDetectorLeads)
				.where(and(eq(crmLeakDetectorLeads.id, id), eq(crmLeakDetectorLeads.organizationId, orgId)))
				.limit(1);

			if (!lead) return reply.code(404).send({ error: "LeadNotFound", message: "Лид не найден" });

			const [updated] = await tx
				.update(crmLeakDetectorLeads)
				.set({
					leadStatus: "in_progress",
					assignedAdminUserId: identity.userId,
					assignedAdminName:
						(identity as { name?: string }).name || identity.userId || "Администратор",
					updatedAt: new Date(),
				})
				.where(eq(crmLeakDetectorLeads.id, id))
				.returning();

			return reply.send({ success: true, lead: updated });
		});
	});

	/**
	 * 4. POST /api/crm/leak-detector/:id/process-lead — Зафиксировать контакт с пациентом
	 */
	const processSchema = z.object({
		channel: z.enum(["call", "whatsapp", "telegram", "sms"]),
		notes: z.string().min(1),
		targetStatus: z.enum(["contacted", "in_progress"]).default("contacted"),
	});

	app.post("/api/crm/leak-detector/:id/process-lead", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "process leak lead");
		if (!orgId) return;
		const { id } = req.params as { id: string };
		const body = processSchema.parse(req.body);

		return withTenantCtx(orgId, async (tx) => {
			const [lead] = await tx
				.select()
				.from(crmLeakDetectorLeads)
				.where(and(eq(crmLeakDetectorLeads.id, id), eq(crmLeakDetectorLeads.organizationId, orgId)))
				.limit(1);

			if (!lead) return reply.code(404).send({ error: "LeadNotFound", message: "Лид не найден" });

			const [updated] = await tx
				.update(crmLeakDetectorLeads)
				.set({
					leadStatus: body.targetStatus,
					contactAttemptsCount: lead.contactAttemptsCount + 1,
					lastContactAt: new Date(),
					lastContactChannel: body.channel,
					lastContactNotes: body.notes,
					updatedAt: new Date(),
				})
				.where(eq(crmLeakDetectorLeads.id, id))
				.returning();

			return reply.send({ success: true, lead: updated });
		});
	});

	/**
	 * 5. POST /api/crm/leak-detector/:id/cancel-lead — Отказ пациента от реактивации
	 */
	const cancelSchema = z.object({
		declineReason: crmDeclineReasonSchema,
		declineComment: z.string().optional(),
	});

	app.post("/api/crm/leak-detector/:id/cancel-lead", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "cancel leak lead");
		if (!orgId) return;
		const { id } = req.params as { id: string };
		const body = cancelSchema.parse(req.body);

		return withTenantCtx(orgId, async (tx) => {
			const [lead] = await tx
				.select()
				.from(crmLeakDetectorLeads)
				.where(and(eq(crmLeakDetectorLeads.id, id), eq(crmLeakDetectorLeads.organizationId, orgId)))
				.limit(1);

			if (!lead) return reply.code(404).send({ error: "LeadNotFound", message: "Лид не найден" });

			const [updated] = await tx
				.update(crmLeakDetectorLeads)
				.set({
					leadStatus: "declined",
					declineReason: body.declineReason,
					declineComment: body.declineComment || null,
					updatedAt: new Date(),
				})
				.where(eq(crmLeakDetectorLeads.id, id))
				.returning();

			return reply.send({ success: true, lead: updated });
		});
	});

	/**
	 * 6. GET /api/funnels/leak-detector — Воронка оттока и реактивации пациентов
	 */
	app.get("/api/funnels/leak-detector", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "leak funnel read");
		if (!orgId) return;

		return withTenantCtx(orgId, async (tx) => {
			const allLeads = await tx
				.select()
				.from(crmLeakDetectorLeads)
				.where(eq(crmLeakDetectorLeads.organizationId, orgId));

			const metrics = calculateLeakFunnelMetrics(allLeads as any);
			return reply.send({ data: metrics });
		});
	});

	/**
	 * 7. POST /api/crm/leak-detector/:id/create-task — Создать задачу перезвонить пациенту (реактивация в 1 клик)
	 */
	app.post("/api/crm/leak-detector/:id/create-task", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "create leak task");
		if (!orgId) return;
		const { id } = req.params as { id: string };

		return withTenantCtx(orgId, async (tx) => {
			const [lead] = await tx
				.select()
				.from(crmLeakDetectorLeads)
				.where(and(eq(crmLeakDetectorLeads.id, id), eq(crmLeakDetectorLeads.organizationId, orgId)))
				.limit(1);

			if (!lead) return reply.code(404).send({ error: "LeadNotFound", message: "Лид не найден" });

			const identity = getRequestIdentity(req);
			const assignedToId = lead.assignedAdminUserId || identity.userId || null;

			const [updatedLead] = await tx
				.update(crmLeakDetectorLeads)
				.set({
					leadStatus: "in_progress",
					assignedAdminUserId: assignedToId,
					assignedAdminName: (identity as { name?: string }).name || identity.userId || lead.assignedAdminName || "Администратор",
					updatedAt: new Date(),
				})
				.where(eq(crmLeakDetectorLeads.id, id))
				.returning();

			let createdTicket: unknown = null;
			if (assignedToId) {
				try {
					const { createPatientTaskTicketInDb } = await import("../db/patientTaskTicketsQuery.js");
					createdTicket = await createPatientTaskTicketInDb(orgId, lead.patientId, {
						title: `Перезвонить: реактивация (не был ${lead.daysSinceLastVisit} дн.)`,
						description: `Клинический риск: ${lead.clinicalRiskReason || "Угасание регулярной гигиены"}.${lead.hasUncompletedPlan ? ` Брошенный план: ${lead.uncompletedPlanSumRub} ₽.` : ""}`,
						assignedToId,
						priority: lead.hasUncompletedPlan || lead.daysSinceLastVisit > 270 ? "high" : "normal",
					});
				} catch (ticketErr) {
					req.log.warn({ ticketErr }, "[CrmLeakDetector] Could not create task ticket, lead updated anyway");
				}
			}

			return reply.send({
				success: true,
				message: "Задача перезвонить создана, лид взят в работу",
				lead: updatedLead,
				ticket: createdTicket,
			});
		});
	});
}
