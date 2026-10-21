import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import type { TreatmentPlanItem, TreatmentPlanTier } from "../types";

export interface PlanCashierPayloadResult {
	grossTotalRub: number;
	discountRub: number;
	resolvedPlanId?: string | undefined;
}

export async function prepareCashierExportPlanId(
	patientId: string,
	currentPlanId: string | null | undefined,
	allItems: readonly TreatmentPlanItem[],
	currentTier: TreatmentPlanTier,
	onPlanSaved?: ((planId: string) => void) | undefined,
): Promise<string | undefined> {
	let resolvedPlanId: string | undefined = undefined;
	const isUuid =
		typeof currentPlanId === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentPlanId);

	if (isUuid) {
		resolvedPlanId = currentPlanId;
	} else if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
		try {
			const itemsForApi = allItems.map((it) => ({
				toothNumber: it.toothNumber ?? null,
				priceId: it.priceId || it.code804n,
				name: it.name,
				quantity: it.quantity || 1,
				price: it.unitPriceRub || 0,
				discount: it.discountRub || 0,
				phase: it.phase,
				isAuto: it.isAuto ?? true,
				doctorId: it.doctorId ?? null,
			}));

			const planRes = await fetch(
				`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`,
				{
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: `${currentTier.title} (${new Date().toLocaleDateString("ru-RU")})`,
						status: "Approved",
						items: itemsForApi,
					}),
				},
			);

			if (planRes.ok) {
				const planData = await planRes.json();
				if (planData?.planId) {
					resolvedPlanId = planData.planId;
					onPlanSaved?.(planData.planId);
				}
			}
		} catch (saveErr) {
			logger.warn("[treatmentPlanNetworkSync] Авто-сохранение плана перед отправкой в кассу", saveErr);
		}
	}

	return resolvedPlanId;
}
