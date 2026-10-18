import { useState, useCallback } from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../../types";
import { parseKopecks, sumKopecks, type Kopecks } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { recalculateTierTotals } from "../../treatmentPlanMath";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";
import { getTierLetter, formatRubles } from "./presenterStateConstants";

export interface PresenterPatientSelectionParams {
	readonly selectedTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly setAllTiers: React.Dispatch<React.SetStateAction<readonly TreatmentPlanTier[]>>;
	readonly patientId?: string | undefined;
	readonly planId?: string | undefined;
	readonly onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmSelection?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly propOnUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
}

export function usePresenterPatientSelection({
	selectedTier,
	selectedTierId,
	setAllTiers,
	patientId,
	planId,
	onSelectPlan,
	onConfirmSelection,
	propOnUpdateItemPrice,
}: PresenterPatientSelectionParams) {
	const [isChoiceConfirmed, setIsChoiceConfirmed] = useState<boolean>(false);
	const [confirmedTierId, setConfirmedTierId] = useState<TreatmentPlanTierId | null>(null);
	const [confirmedNotice, setConfirmedNotice] = useState<string | null>(null);

	const handleUpdateItemPrice = useCallback((itemId: string, newPriceRub: number) => {
		setAllTiers((prev) =>
			prev.map((tier) => {
				if (tier.tierId !== selectedTierId) return tier;
				const updatedStages = tier.stages.map((st) => {
					if (!st.items.some((it) => it.id === itemId)) return st;
					const updatedItems = st.items.map((it) => {
						if (it.id !== itemId) return it;
						const qty = Math.max(1, it.quantity || 1);
						const unitKop = parseKopecks(newPriceRub);
						const discKop = parseKopecks(it.discountRub || 0);
						const lineTotalKop = Math.max(0, unitKop * qty - discKop) as Kopecks;
						return {
							...it,
							unitPriceRub: Math.round(unitKop / 100),
							priceRub: Math.round(lineTotalKop / 100),
							discountRub: Math.round(discKop / 100),
							isDraft: false,
							requiresManualPricing: false,
						};
					});
					const stTotalKopecks = sumKopecks(updatedItems.map((it) => parseKopecks(it.priceRub)));
					return { ...st, items: updatedItems, totalRub: Math.round(stTotalKopecks / 100), totalKopecks: stTotalKopecks };
				});
				const updatedTier = recalculateTierTotals(tier, updatedStages);
				if (propOnUpdateItemPrice) propOnUpdateItemPrice(itemId, newPriceRub);
				return updatedTier;
			}),
		);
		showToast("Цена услуги обновлена", "success");
	}, [selectedTierId, propOnUpdateItemPrice, setAllTiers]);

	const handleConfirmPatientChoice = useCallback((targetTier?: TreatmentPlanTier) => {
		const effectiveTier = targetTier ?? selectedTier;
		setIsChoiceConfirmed(true);
		setConfirmedTierId(effectiveTier.tierId);
		const variantTitle = getTierLetter(effectiveTier.tierId);
		const message = "Выбор зафиксирован: Пациент выбрал " + variantTitle + " на сумму " + formatRubles(effectiveTier.totalRub);
		setConfirmedNotice(message);
		showToast(message, "success");

		if (patientId && planId) {
			fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}/approve-variant`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ reason: `Пациент выбрал тариф «${effectiveTier.title}»` }),
			}).catch((err) => logger.warn("Не удалось сохранить выбор варианта на сервере:", err));
		}

		const stage1 = effectiveTier.stages.find((s) => s.stageNumber === 1) || effectiveTier.stages[0];
		if (stage1 && stage1.items && stage1.items.length > 0 && typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-take-stage-to-visit", {
				detail: { stage: { title: `Этап 1: ${stage1.title || "Терапия и санация"}`, stageNumber: stage1.stageNumber || 1, items: stage1.items }, items: stage1.items, patientId },
			}));
		}

		if (onConfirmSelection) onConfirmSelection(effectiveTier);
		if (onSelectPlan) onSelectPlan(effectiveTier);
	}, [selectedTier, onConfirmSelection, onSelectPlan, patientId, planId]);

	return {
		isChoiceConfirmed,
		confirmedTierId,
		confirmedNotice,
		handleUpdateItemPrice,
		handleConfirmPatientChoice,
	};
}
