import { useState, useCallback } from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../../types";
import { applyCopilotCommandToPlan, type CopilotCommandType } from "../../../../services/ai/treatmentPlanCopilot";
import { applyClinicalBundleToTier, getClinicalBundleById, type ClinicalBundleId } from "../../treatmentPlanBundlesEngine";
import { showToast } from "../../../GlobalToast";
import { recalculateTierTotals, applyDoctorDiscountToStages, applyDoctorFixedDiscountToStages } from "../../treatmentPlanMath";
import { getTierLetter } from "./presenterStateConstants";
import { syncDiscountModeToServer } from "./syncDiscountModeToServer";

export interface PresenterToolsStateParams {
	readonly selectedTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly setAllTiers: React.Dispatch<React.SetStateAction<readonly TreatmentPlanTier[]>>;
	readonly patientId?: string | undefined;
	readonly planId?: string | undefined;
}

export function usePresenterToolsState({
	selectedTier,
	selectedTierId,
	setAllTiers,
	patientId,
	planId,
}: PresenterToolsStateParams) {
	const [activeToolsPanel, setActiveToolsPanel] = useState<"copilot" | "bundles" | "doctorDiscount" | null>(null);
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [doctorDiscountRub, setDoctorDiscountRub] = useState<number>(0);
	const [doctorDiscountMode, setDoctorDiscountMode] = useState<"percent" | "fixed">("percent");
	const [doctorDiscountTargetStage, setDoctorDiscountTargetStage] = useState<number>(0);

	const handleExecuteCopilot = useCallback((cmdOrText: CopilotCommandType | string) => {
		setIsCopilotExecuting(true);
		try {
			const res = applyCopilotCommandToPlan(selectedTier.stages, cmdOrText);
			if (res.success) {
				setAllTiers((prev) =>
					prev.map((t) => (t.tierId !== selectedTierId ? t : recalculateTierTotals(t, res.stages))),
				);
				setCopilotFeedback(res.explanation);
				showToast(`AI Copilot: ${res.commandTitle} применено`, "success");
			}
		} finally {
			setIsCopilotExecuting(false);
		}
	}, [selectedTier, selectedTierId, setAllTiers]);

	const handleApplyClinicalBundle = useCallback((bundleId: ClinicalBundleId, toothNumber?: number) => {
		const bundle = getClinicalBundleById(bundleId);
		setAllTiers((prev) =>
			prev.map((t) => (t.tierId !== selectedTierId ? t : applyClinicalBundleToTier(t, bundleId, toothNumber))),
		);
		const toothDesc = bundle?.requiresTooth ? ` (зуб ${toothNumber ?? bundle?.defaultTooth})` : "";
		showToast(`Пакет «${bundle?.shortTitle || bundleId}» успешно добавлен в ${getTierLetter(selectedTierId)}${toothDesc}!`, "success", 4000);
	}, [selectedTierId, setAllTiers]);

	const handleApplyDoctorDiscount = useCallback((pct: number, stageNum?: number) => {
		const validPct = Math.max(0, Math.min(100, pct));
		const targetStage = stageNum !== undefined ? stageNum : doctorDiscountTargetStage;
		setDoctorDiscountPercent(validPct);
		setDoctorDiscountMode("percent");
		setAllTiers((prev) =>
			prev.map((tier) => {
				if (tier.tierId !== selectedTierId) return tier;
				return recalculateTierTotals(tier, applyDoctorDiscountToStages(tier.stages, validPct, targetStage));
			}),
		);
		const stageDesc = targetStage > 0 ? ` (Этап ${targetStage})` : "";
		showToast(`Скидка ${validPct}% применена к ${getTierLetter(selectedTierId)}${stageDesc}`, "info");
		syncDiscountModeToServer(patientId, planId, { discountMode: "plan_fixed", planDiscountPercent: validPct });
	}, [selectedTierId, doctorDiscountTargetStage, patientId, planId, setAllTiers]);

	const handleApplyDoctorFixedDiscount = useCallback((rub: number, stageNum?: number) => {
		const validRub = Math.max(0, rub);
		const targetStage = stageNum !== undefined ? stageNum : doctorDiscountTargetStage;
		setDoctorDiscountRub(validRub);
		setDoctorDiscountMode("fixed");
		setAllTiers((prev) =>
			prev.map((tier) => {
				if (tier.tierId !== selectedTierId) return tier;
				return recalculateTierTotals(tier, applyDoctorFixedDiscountToStages(tier.stages, validRub, targetStage));
			}),
		);
		const stageDesc = targetStage > 0 ? ` (Этап ${targetStage})` : "";
		showToast(`Скидка ${validRub.toLocaleString("ru-RU")} ₽ применена к ${getTierLetter(selectedTierId)}${stageDesc}`, "info");
		syncDiscountModeToServer(patientId, planId, { discountMode: "plan_fixed", planDiscountRub: validRub });
	}, [selectedTierId, doctorDiscountTargetStage, patientId, planId, setAllTiers]);

	return {
		activeToolsPanel,
		setActiveToolsPanel,
		copilotFeedback,
		setCopilotFeedback,
		isCopilotExecuting,
		doctorDiscountPercent,
		setDoctorDiscountPercent,
		doctorDiscountRub,
		setDoctorDiscountRub,
		doctorDiscountMode,
		setDoctorDiscountMode,
		doctorDiscountTargetStage,
		setDoctorDiscountTargetStage,
		handleExecuteCopilot,
		handleApplyClinicalBundle,
		handleApplyDoctorDiscount,
		handleApplyDoctorFixedDiscount,
	};
}
