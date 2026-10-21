import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import {
	type CatalogServiceLookupItem,
	buildStagesFromPlanItems,
} from "../treatmentPlanStagesEngine";
import type { TreatmentPlanStage } from "../types";
import type { LoadedPlanResult } from "./types";

export async function fetchPatientTreatmentPlans(
	patientId: string,
	catalog?: CatalogServiceLookupItem[],
	targetPlanId?: string | null,
): Promise<LoadedPlanResult | null> {
	try {
		const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return null;
		const data = await res.json();
		if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
			const targetPlan = targetPlanId
				? data.plans.find((p: any) => p.id === targetPlanId) ||
				  data.plans.find((p: any) => p.status === "Approved" || p.status === "Active") ||
				  data.plans[0]
				: data.plans.find((p: any) => p.status === "Approved" || p.status === "Active") ||
				  data.plans[0];
			if (targetPlan) {
				const status: "draft" | "agreed" | "in_progress" | "completed" =
					targetPlan.status === "Approved"
						? "agreed"
						: targetPlan.status === "Active"
							? "in_progress"
							: targetPlan.status === "Completed"
								? "completed"
								: "draft";

				let rebuiltStages: TreatmentPlanStage[] | null = null;
				if (Array.isArray(targetPlan.items) && targetPlan.items.length > 0) {
					const rebuilt = buildStagesFromPlanItems(targetPlan.items, catalog);
					if (rebuilt.length > 0) {
						rebuiltStages = rebuilt;
					}
				}
				return {
					planId: targetPlan.id,
					status,
					rebuiltStages,
				};
			}
		}
	} catch (e) {
		logger.warn("[treatmentPlanNetworkSync] Ошибка загрузки планов пациента из БД", e);
	}
	return null;
}
