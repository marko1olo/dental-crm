import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { treatmentPlans } from "../../../db/schema.js";
import {
	CANONICAL_DENTAL_LAB_PRESETS,
	checkPlanContinuitySchema,
} from "../types.js";

export async function handleGetExpressPresets(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return reply;

	const presetInfo = {
		rule: "Истечение 30 дней с момента составления плана лечения не блокирует наряды ЗТЛ",
		standardPreset: CANONICAL_DENTAL_LAB_PRESETS[0] ?? null,
		workflowSteps: ["1. Зуб / Мост", "2. Конструкция", "3. Цвет VITA", "Срок сдачи: 5 раб. дней"],
	};

	return reply.status(200).send({
		presets: CANONICAL_DENTAL_LAB_PRESETS,
		autonomyInfo: presetInfo,
	});
}

export async function handleCheckPlanContinuity(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const parsed = checkPlanContinuitySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры проверки плана лечения.",
			details: parsed.error.issues,
		});
	}

	const { patientId, treatmentPlanId } = parsed.data;
	let computedPlanAgeDays = parsed.data.planAgeDays ?? 0;
	let planTitle: string | null = null;
	let planFound = false;

	if (treatmentPlanId) {
		const plan = await withTenantCtx(orgId, async (tx) => {
			const [found] = await tx
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					createdAt: treatmentPlans.createdAt,
					approvedAt: treatmentPlans.approvedAt,
				})
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, treatmentPlanId),
						eq(treatmentPlans.organizationId, orgId),
						eq(treatmentPlans.patientId, patientId),
					),
				)
				.limit(1);
			return found;
		});

		if (!plan) {
			return reply.code(404).send({
				error: "TreatmentPlanNotFound",
				message: "План лечения не найден для указанного пациента и организации.",
			});
		}

		planFound = true;
		planTitle = plan.name;
		const baseDate = plan.approvedAt ?? plan.createdAt;
		if (baseDate) {
			const diffMs = Date.now() - new Date(baseDate).getTime();
			computedPlanAgeDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
		}
	}

	const isPlanExpired = computedPlanAgeDays > 30;

	return reply.status(200).send({
		canProceed: true,
		blocked: false,
		isPlanExpired,
		planAgeDays: computedPlanAgeDays,
		requiresChiefPhysicianApproval: false,
		requiresSeniorTechnicianApproval: false,
		autonomyCompliant: true,
		treatmentPlanId: treatmentPlanId ?? null,
		planFound,
		planTitle,
		noticeRu: isPlanExpired
			? `План лечения составлен ${computedPlanAgeDays} дн. назад (>30 дней). Наряды ЗТЛ, оказание услуг и оплата продолжаются в штатном режиме без блокировок.`
			: "План лечения активен. Ограничений на создание нарядов ЗТЛ нет.",
	});
}
