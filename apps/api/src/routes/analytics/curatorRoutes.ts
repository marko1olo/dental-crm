import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	patients,
	payments,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import {
	type CuratorFunnelStage,
	type CuratorPatientQueueItem,
	calculateCuratorMetrics,
	evaluatePatientUrgency,
} from "@dental/shared";

/**
 * ====================================================================
 *  ФИЧА #27 — ВЫДЕЛЕННАЯ РОЛЬ «КУРАТОР ПАЦИЕНТОВ» И АНАЛИТИКА ВОРОНКИ
 * ====================================================================
 */
export async function registerCuratorRoutes(app: FastifyInstance) {
	app.get("/api/analytics/curators", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"curator analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"curator analytics",
		);
		if (!orgId) return;

		try {
			// 1. Сотрудники клиники с ролью куратора или смежными
			const staffList = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
				})
				.from(users)
				.where(eq(users.organizationId, orgId));

			const curatorUsers = staffList.filter(
				(u) =>
					u.role === "curator" ||
					u.role === "administrator" ||
					u.role === "manager" ||
					u.role === "admin" ||
					u.role === "owner",
			);

			// 2. Планы лечения и карточки пациентов
			const plans = await db
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					totalPriceRub: treatmentPlans.totalPriceRub,
					totalPrice: treatmentPlans.totalPrice,
					createdAt: treatmentPlans.createdAt,
					patientId: treatmentPlans.patientId,
					doctorId: treatmentPlans.doctorId,
					patientFullName: patients.fullName,
					patientPhone: patients.phone,
					patientEmail: patients.email,
					patientAdminProfile: patients.administrativeProfile,
				})
				.from(treatmentPlans)
				.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.where(eq(treatmentPlans.organizationId, orgId));

			// 3. Оплаты пациентов
			const patientPayments = await db
				.select({
					patientId: payments.patientId,
					totalPaid: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.status, "paid"),
					),
				)
				.groupBy(payments.patientId);

			const paymentMap = new Map(
				patientPayments.map((p) => [p.patientId, Number(p.totalPaid)]),
			);

			const doctorMap = new Map(staffList.map((u) => [u.id, u.fullName]));

			const defaultCurator = curatorUsers[0] || {
				id: "00000000-0000-0000-0000-000000000001",
				fullName: "Куратор клиники",
			};

			const queueItems: CuratorPatientQueueItem[] = plans.map((plan) => {
				const adminProf = plan.patientAdminProfile as Record<string, unknown> | null;
				const curatorId =
					typeof adminProf?.curatorId === "string"
						? adminProf.curatorId
						: defaultCurator.id;
				const curatorName =
					typeof adminProf?.curatorFullName === "string"
						? adminProf.curatorFullName
						: doctorMap.get(curatorId) || defaultCurator.fullName;

				const planPrice = Number(plan.totalPriceRub || plan.totalPrice || 0);
				const paid = paymentMap.get(plan.patientId) || 0;
				const planPaid = Math.min(planPrice, paid);
				const remaining = Math.max(0, planPrice - planPaid);

				let stage: CuratorFunnelStage = "consultation";
				if (
					adminProf?.curatorFunnelStage === "consultation" ||
					adminProf?.curatorFunnelStage === "plan_negotiation" ||
					adminProf?.curatorFunnelStage === "prepayment" ||
					adminProf?.curatorFunnelStage === "treatment_start" ||
					adminProf?.curatorFunnelStage === "completed"
				) {
					stage = adminProf.curatorFunnelStage;
				} else {
					if (plan.status === "Completed") {
						stage = "completed";
					} else if (plan.status === "Active") {
						stage = "treatment_start";
					} else if (planPaid > 0) {
						stage = "prepayment";
					} else if (plan.status === "Approved") {
						stage = "plan_negotiation";
					} else {
						stage = "consultation";
					}
				}

				const daysInStage = Math.max(
					0,
					Math.floor(
						(Date.now() - new Date(plan.createdAt).getTime()) /
							(1000 * 60 * 60 * 24),
					),
				);

				const tier =
					planPrice >= 150_000
						? "premium"
						: planPrice < 50_000
							? "basic"
							: "optimum";

				const urgency = evaluatePatientUrgency(
					daysInStage,
					stage,
					planPrice,
					planPaid,
					adminProf?.loyaltyTier === "gold" ||
						adminProf?.loyaltyTier === "platinum",
				);

				const assignedAtStr =
					typeof adminProf?.curatorAssignedAt === "string"
						? adminProf.curatorAssignedAt
						: plan.createdAt.toISOString();

				const notesStr =
					typeof adminProf?.curatorNotes === "string"
						? adminProf.curatorNotes
						: null;

				return {
					patientId: plan.patientId,
					patientFullName: plan.patientFullName,
					patientPhone: plan.patientPhone,
					patientEmail: plan.patientEmail,
					treatmentPlanId: plan.id,
					treatmentPlanTitle: plan.name,
					planTier: tier,
					planTotalPriceRub: planPrice,
					planTotalPriceKopecks: Math.round(planPrice * 100),
					paidAmountRub: planPaid,
					paidAmountKopecks: Math.round(planPaid * 100),
					remainingAmountRub: remaining,
					remainingAmountKopecks: Math.round(remaining * 100),
					funnelStage: stage,
					curatorId,
					curatorFullName: curatorName,
					assignedAt: assignedAtStr,
					stageUpdatedAt: plan.createdAt.toISOString(),
					daysInStage,
					doctorId: plan.doctorId,
					doctorFullName: plan.doctorId ? doctorMap.get(plan.doctorId) : null,
					priorityScore: urgency.priorityScore,
					attentionFlags: urgency.attentionFlags,
					notes: notesStr,
				};
			});

			const overallMetrics = calculateCuratorMetrics(
				queueItems,
				"all",
				"Все кураторы",
			);

			const perCuratorMetrics = curatorUsers.map((cur) =>
				calculateCuratorMetrics(queueItems, cur.id, cur.fullName),
			);

			return {
				success: true,
				data: {
					curators: curatorUsers,
					overallMetrics,
					perCuratorMetrics,
					queue: queueItems,
				},
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось загрузить аналитику кураторов");
			return reply.code(503).send({
				success: false,
				error: "CuratorAnalyticsUnavailable",
				message: "Не удалось загрузить аналитику кураторов. Повторите позже.",
			});
		}
	});
}
