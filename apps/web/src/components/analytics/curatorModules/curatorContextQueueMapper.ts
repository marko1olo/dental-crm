import type { CuratorFunnelStage, CuratorPatientQueueItem } from "@dental/shared";

export function mapDashboardContextToQueue(
	plans: any[],
	patients: any[],
	staff: any[],
	staffCurators: any[],
): CuratorPatientQueueItem[] {
	if (!plans || plans.length === 0) return [];

	const staffMap = new Map<string, string>(staff.map((s: any) => [s.id, s.fullName || s.name]));
	const defaultCurator = staffCurators[0] || null;

	return plans.map((plan: any) => {
		const patient = patients.find((p: any) => p.id === plan.patientId);
		const adminProf = patient?.administrativeProfile;
		const curatorId = adminProf?.curatorId || defaultCurator?.id || null;
		const curatorName =
			adminProf?.curatorFullName ||
			(curatorId ? staffMap.get(curatorId) : null) ||
			defaultCurator?.fullName ||
			"Не назначен";

		const priceRub = Number(plan.totalPriceRub || plan.totalPrice || 0);
		const paidRub = Math.max(0, Number(plan.paidAmountRub || patient?.balanceRub || 0));
		const remainingRub = Math.max(0, priceRub - paidRub);

		let stage: CuratorFunnelStage = "consultation";
		if (adminProf?.curatorFunnelStage) {
			stage = adminProf.curatorFunnelStage;
		} else if (plan.status === "Completed") {
			stage = "completed";
		} else if (plan.status === "Active") {
			stage = "treatment_start";
		} else if (paidRub > 0) {
			stage = "prepayment";
		} else if (plan.status === "Approved") {
			stage = "plan_negotiation";
		}

		const days = Math.max(
			1,
			Math.floor((Date.now() - new Date(plan.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
		);
		const tier = priceRub >= 150_000 ? "premium" : priceRub < 50_000 ? "basic" : "optimum";
		const attentionFlags: any[] = [];
		if (days > 5 && stage !== "completed") attentionFlags.push("stagnant_plan");
		if (priceRub >= 150_000) attentionFlags.push("high_value_plan");
		if (stage === "plan_negotiation" && days >= 3 && paidRub === 0) {
			attentionFlags.push("pending_prepayment");
			attentionFlags.push("requires_followup_call");
		}

		return {
			patientId: plan.patientId || patient?.id || "00000000-0000-0000-0000-000000000000",
			patientFullName: patient?.fullName || "Пациент клиники",
			patientPhone: patient?.phone || null,
			patientEmail: patient?.email || null,
			treatmentPlanId: plan.id,
			treatmentPlanTitle: plan.name || plan.title || "Комплексный план лечения",
			planTier: tier,
			planTotalPriceRub: priceRub,
			planTotalPriceKopecks: Math.round(priceRub * 100),
			paidAmountRub: paidRub,
			paidAmountKopecks: Math.round(paidRub * 100),
			remainingAmountRub: remainingRub,
			remainingAmountKopecks: Math.round(remainingRub * 100),
			funnelStage: stage,
			curatorId,
			curatorFullName: curatorName,
			assignedAt: adminProf?.curatorAssignedAt || new Date().toISOString(),
			stageUpdatedAt: new Date().toISOString(),
			daysInStage: days,
			doctorId: plan.doctorId || null,
			doctorFullName: plan.doctorId ? staffMap.get(plan.doctorId) : "Врач-куратор",
			priorityScore: Math.min(100, Math.max(10, 50 + (days > 4 ? 20 : 0) + (priceRub > 150_000 ? 15 : 0))),
			attentionFlags,
			notes: adminProf?.curatorNotes || null,
		};
	});
}
