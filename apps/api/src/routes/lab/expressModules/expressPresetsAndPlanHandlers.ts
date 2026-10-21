import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import {
	CANONICAL_DENTAL_LAB_PRESETS,
	checkPlanContinuitySchema,
} from "../types.js";

export async function handleGetExpressPresets(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return reply;

	const presetInfo = {
		rule: "Истечение 30 дней с момента составления плана лечения не блокирует наряды ЗТЛ",
		standardPreset: CANONICAL_DENTAL_LAB_PRESETS[0],
		threeClickWorkflow: ["1. Зуб / Мост", "2. Конструкция", "3. Цвет VITA", "Срок сдачи: 5 раб. дней"],
	};

	return reply.status(200).send({
		presets: CANONICAL_DENTAL_LAB_PRESETS,
		autonomyInfo: presetInfo,
		mandate8eInfo: presetInfo,
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

	const { planAgeDays } = parsed.data;
	const isPlanExpired = planAgeDays > 30;

	return reply.status(200).send({
		canProceed: true,
		blocked: false,
		isPlanExpired,
		planAgeDays,
		requiresChiefPhysicianApproval: false,
		requiresSeniorTechnicianApproval: false,
		autonomyCompliant: true,
		mandate8eCompliant: true,
		noticeRu: isPlanExpired
			? `План лечения составлен ${planAgeDays} дн. назад (>30 дней). Наряды ЗТЛ, оказание услуг и оплата продолжаются в штатном режиме без блокировок.`
			: "План лечения активен. Ограничений на создание нарядов ЗТЛ нет.",
	});
}
