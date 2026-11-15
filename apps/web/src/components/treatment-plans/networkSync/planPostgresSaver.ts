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
		const itemsForApi = allItems.map((it) => {
			const unitPriceRub =
				it.unitPriceRub ?? (it.quantity > 0 ? it.priceRub / it.quantity : it.priceRub) ?? 0;
			const unitPriceKopecks =
				typeof it.amountKopecks === "bigint"
					? Number(it.amountKopecks)
					: typeof it.amountKopecks === "number" && it.amountKopecks > 0
						? Math.round(it.amountKopecks)
						: Math.round(unitPriceRub * 100);
			const quantity = it.quantity || 1;
			const discountRub = it.discountRub || 0;
			const discountKopecks = Math.round(discountRub * 100);
			const totalPriceKopecks = Math.max(0, unitPriceKopecks * quantity - discountKopecks);
			const priceInRub = unitPriceKopecks / 100;
			const discountInRub = discountKopecks / 100;

			const resolvedPriceId =
				(it.priceId && !it.priceId.startsWith("bundle-item-") && !it.priceId.startsWith("item-")
					? it.priceId
					: null) ||
				(it.serviceCode?.trim() || null) ||
				(it.code804n?.trim() || null) ||
				null;

			return {
				toothNumber: it.toothNumber ?? null,
				priceId: resolvedPriceId,
				isCustom: !resolvedPriceId,
				name: it.name || "Индивидуальная услуга",
				quantity,
				price: priceInRub,
				discount: discountInRub,
				unitPriceKopecks,
				totalPriceKopecks,
				phase: it.phase || 1,
				isAuto: it.isAuto ?? true,
				doctorId: it.doctorId ?? null,
			};
		});

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
