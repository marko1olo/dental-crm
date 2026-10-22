import { useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { PlanItem } from "../treatmentEstimatorPricing";
import type { PlanLoadState } from "./estimatorUiTypes";
import { saveTreatmentPlanApi } from "./estimatorSaveEngine";

export function useEstimatorSave(
	patientId: string,
	planId: string | null,
	setPlanId: (id: string) => void,
	signatureUrl: string | null,
	items: readonly PlanItem[],
	planLoad: PlanLoadState,
	saveBlock: boolean,
) {
	const [isSaving, setIsSaving] = useState(false);

	const savePlan = async () => {
		if (planLoad.phase !== "ready") {
			showToast("План лечения ещё читается с сервера...", "info", 5000);
			return;
		}
		if (saveBlock) {
			showToast("В смете есть позиции без цены в прайсе — сохраняются как «Цена уточняется» (0 ₽).", "warning", 8000);
		}
		setIsSaving(true);
		try {
			const res = await saveTreatmentPlanApi(patientId, planId, signatureUrl, items);
			if (res.ok) {
				if (typeof res.data?.planId === "string") setPlanId(res.data.planId);
				showToast(saveBlock ? "План лечения сохранен («Цена уточняется»)!" : "План лечения успешно сохранен!", "success");
			} else {
				showToast("План не сохранён. Позиции сохранены на экране.", "error", 8000);
			}
		} finally {
			setIsSaving(false);
		}
	};

	return { isSaving, savePlan };
}
