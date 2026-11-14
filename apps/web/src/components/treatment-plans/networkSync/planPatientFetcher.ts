import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import {
	type CatalogServiceLookupItem,
	type RawTreatmentPlanItemDto,
	buildStagesFromPlanItems,
} from "../treatmentPlanStagesEngine";
import type { TreatmentPlanStage } from "../types";
import type { LoadedPlanResult } from "./types";

interface PatientPlanDto {
	id: string;
	status?: string;
	items?: readonly RawTreatmentPlanItemDto[];
}

export async function fetchPatientTreatmentPlans(
	patientId: string,
	catalog?: CatalogServiceLookupItem[],
	targetPlanId?: string | null,
): Promise<LoadedPlanResult | null> {
	try {
		const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:5173";
		const res = await fetch(`${origin}/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return null;
		const data = await res.json();
		const plans: PatientPlanDto[] = Array.isArray(data?.plans) ? data.plans : [];
		if (data?.success && plans.length > 0) {
			const targetPlan = targetPlanId
				? plans.find((p) => p.id === targetPlanId) ||
				  plans.find((p) => p.status === "Approved" || p.status === "Active") ||
				  plans[0]
				: plans.find((p) => p.status === "Approved" || p.status === "Active") ||
				  plans[0];
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
	} catch (e: unknown) {
		logger.warn("[treatmentPlanNetworkSync] Ошибка загрузки планов пациента из БД", { error: e });
	}
	return null;
}
