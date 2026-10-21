import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import type { SavePlanParams } from "./types";

export async function savePlanToPostgres({
	patientId,
	currentPlanId,
	currentTier,
	planStatus,
	signedAgreement,
	stages,
	grandTotalRub,
	totalItemsCount,
	onPlanSaved,
}: SavePlanParams): Promise<string | null> {
	if (totalItemsCount === 0) {
		showToast("План пуст: добавьте или отметьте зубы на схеме", "warning");
		return null;
	}

	try {
		const allItems = stages.flatMap((s) => s.items);
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

		const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				...(currentPlanId ? { id: currentPlanId, allowRevision: true } : {}),
				name: `${currentTier.title} (${new Date().toLocaleDateString("ru-RU")})`,
				status:
					planStatus === "agreed"
						? "Approved"
						: planStatus === "in_progress"
							? "Active"
							: planStatus === "completed"
								? "Completed"
								: "Draft",
				patientSignature: signedAgreement?.signatureBase64 || null,
				items: itemsForApi,
			}),
		});

		if (res.ok) {
			const data = await res.json();
			const planId = data.planId || currentPlanId;
			if (planId && onPlanSaved) onPlanSaved(planId);
			showToast(`Комплексный план лечения успешно сохранен в базе на сумму ${(grandTotalRub || 0).toLocaleString("ru-RU")} ₽!`, "success", 4000);
			return planId || null;
		}

		showToast("Не удалось сохранить план на сервере", "error");
		return null;
	} catch (err) {
		logger.error("[treatmentPlanNetworkSync] Save error", err);
		showToast("Ошибка сохранения плана", "error");
		return null;
	}
}
