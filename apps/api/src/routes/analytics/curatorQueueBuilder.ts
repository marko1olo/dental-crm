import {
	type CuratorFunnelStage,
	type CuratorPatientQueueItem,
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
	readonly patientAdminProfile: unknown;
}

export function buildCuratorQueueItem(
	plan: RawCuratorPlanRecord,
	paymentMap: Map<string, number>,
	doctorMap: Map<string, string>,
	defaultCurator: CuratorStaffUser,
): CuratorPatientQueueItem {
	const adminProf = plan.patientAdminProfile as Record<string, unknown> | null;
	const curatorId = typeof adminProf?.curatorId === "string" ? adminProf.curatorId : defaultCurator.id;
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
	} else if (plan.status === "Completed") {
		stage = "completed";
	} else if (plan.status === "Active") {
		stage = "treatment_start";
	} else if (planPaid > 0) {
		stage = "prepayment";
	} else if (plan.status === "Approved") {
		stage = "plan_negotiation";
	}

	const daysInStage = Math.max(
		0,
		Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
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
		stageUpdatedAt: plan.createdAt.toISOString(),
		daysInStage,
		doctorId: plan.doctorId,
		doctorFullName: plan.doctorId ? doctorMap.get(plan.doctorId) : null,
		priorityScore: urgency.priorityScore,
		attentionFlags: urgency.attentionFlags,
		notes: typeof adminProf?.curatorNotes === "string" ? adminProf.curatorNotes : null,
	};
}
