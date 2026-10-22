import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { jsonObjectOrNull } from "../treatmentEstimatorTypes";
import { estimatorItemForApi, type PlanItem } from "../treatmentEstimatorPricing";

export function buildItemsForApi(items: readonly PlanItem[]) {
	return items
		.map((item) => {
			const apiItem = estimatorItemForApi(item);
			if (apiItem) return apiItem;
			return {
				...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
				priceId: item.priceId || `custom_${item.id || item.toothNumber || "service"}`,
				name: item.name
					? item.price === null
						? `${item.name} (Цена уточняется)`
						: item.name
					: "Услуга (цена уточняется)",
				quantity: Math.max(1, item.quantity || 1),
				price: item.price !== null && Number.isFinite(item.price) && item.price >= 0 ? item.price : 0,
				discount: item.discount || 0,
				phase: item.phase || 1,
				...(item.isAuto !== undefined ? { isAuto: item.isAuto } : {}),
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
}

export interface SavePlanResult {
	ok: boolean;
	status: number;
	rawBody: string;
	data: Record<string, unknown> | null;
}

export async function saveTreatmentPlanApi(
	patientId: string,
	planId: string | null,
	signatureUrl: string | null,
	items: readonly PlanItem[],
): Promise<SavePlanResult> {
	const itemsForApi = buildItemsForApi(items);
	const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			id: planId,
			name: "Комплексный план лечения (КТ)",
			patientSignature: signatureUrl,
			items: itemsForApi,
		}),
	});
	const rawBody = await res.text();
	const data = jsonObjectOrNull(rawBody);
	return { ok: res.ok && data?.success === true, status: res.status, rawBody, data };
}
