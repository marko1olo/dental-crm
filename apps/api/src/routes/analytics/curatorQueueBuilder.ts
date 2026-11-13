import {
	type CuratorFunnelStage,
	type CuratorPatientQueueItem,
	type PatientAdministrativeProfile,
	evaluatePatientUrgency,
} from "@dental/shared";
import type { CuratorStaffUser } from "./curatorTypes.js";

export interface RawCuratorPlanRecord {
	readonly id: string;
	readonly name: string | null;
	readonly status: string | null;
	readonly totalPriceRub: number | string | null;
	readonly totalPrice: number | string | null;
	readonly createdAt: Date;
	readonly patientId: string;
	readonly doctorId: string | null;
	readonly patientFullName: string | null;
	readonly patientPhone: string | null;
	readonly patientEmail: string | null;
	readonly patientAdminProfile: Partial<PatientAdministrativeProfile> | null;
}

export function buildCuratorQueueItem(
	plan: RawCuratorPlanRecord,
	paymentMap: Map<string, number>,
	doctorMap: Map<string, string>,
	defaultCurator: CuratorStaffUser,
): CuratorPatientQueueItem {
	const adminProf = plan.patientAdminProfile;
	const curatorId =
		typeof adminProf?.curatorId === "string" && adminProf.curatorId
			? adminProf.curatorId
			: defaultCurator.id;
	const curatorName =
		typeof adminProf?.curatorFullName === "string" && adminProf.curatorFullName
			? adminProf.curatorFullName
			: doctorMap.get(curatorId) || defaultCurator.fullName;

	const planPrice = Number(plan.totalPriceRub || plan.totalPrice || 0);
	// PLN-05 [SEV-1]: Учет оплат строго по plan.id (treatmentPlanId) — ноль заражения чужими платежами из истории пациента
	const paid = paymentMap.get(plan.id) || 0;
	const planPaid = Math.min(planPrice, paid);
	const remaining = Math.max(0, planPrice - planPaid);

	const planStages = adminProf?.curatorPlanStages;
	const planStageEntry =
		planStages && typeof planStages === "object" ? planStages[plan.id] : undefined;

	let stage: CuratorFunnelStage = "consultation";
	const candidateStage = planStageEntry?.stage ?? adminProf?.curatorFunnelStage;
	if (
		candidateStage === "consultation" ||
		candidateStage === "plan_negotiation" ||
		candidateStage === "prepayment" ||
		candidateStage === "treatment_start" ||
		candidateStage === "completed"
	) {
		stage = candidateStage;
	} else if (plan.status === "Completed") {
		stage = "completed";
	} else if (plan.status === "Active") {
		stage = "treatment_start";
	} else if (planPaid > 0) {
		stage = "prepayment";
	} else if (plan.status === "Approved") {
		stage = "plan_negotiation";
	}

	const stageUpdatedAtRaw = planStageEntry?.updatedAt ?? adminProf?.curatorStageUpdatedAt ?? plan.createdAt;
	const stageDate = typeof stageUpdatedAtRaw === "string" ? new Date(stageUpdatedAtRaw) : (stageUpdatedAtRaw instanceof Date ? stageUpdatedAtRaw : new Date(plan.createdAt));
	const validStageDate = Number.isNaN(stageDate.getTime()) ? new Date(plan.createdAt) : stageDate;

	const daysInStage = Math.max(
		0,
		Math.floor((Date.now() - validStageDate.getTime()) / (1000 * 60 * 60 * 24)),
	);
	const tier = planPrice >= 150_000 ? "premium" : planPrice < 50_000 ? "basic" : "optimum";
	const isVip = adminProf?.loyaltyTier === "gold" || adminProf?.loyaltyTier === "platinum";
	const urgency = evaluatePatientUrgency(daysInStage, stage, planPrice, planPaid, isVip);

	return {
		patientId: plan.patientId,
		patientFullName: plan.patientFullName || "Пациент клиники",
		patientPhone: plan.patientPhone,
		patientEmail: plan.patientEmail,
		treatmentPlanId: plan.id,
		treatmentPlanTitle: plan.name || "План лечения",
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
		assignedAt: typeof adminProf?.curatorAssignedAt === "string" ? adminProf.curatorAssignedAt : plan.createdAt.toISOString(),
		stageUpdatedAt: validStageDate.toISOString(),
		daysInStage,
		doctorId: plan.doctorId,
		doctorFullName: plan.doctorId ? doctorMap.get(plan.doctorId) : null,
		priorityScore: urgency.priorityScore,
		attentionFlags: urgency.attentionFlags,
		notes:
			typeof planStageEntry?.notes === "string"
				? planStageEntry.notes
				: typeof adminProf?.curatorNotes === "string"
					? adminProf.curatorNotes
					: null,
	};
}
