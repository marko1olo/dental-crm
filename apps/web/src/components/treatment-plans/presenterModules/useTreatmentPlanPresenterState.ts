/**
 * useTreatmentPlanPresenterState.ts — Хук управления состоянием и расчетами студии презентации планов лечения
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { TreatmentPlanPresenterModalProps } from "./treatmentPlanPresenterTypes";
import { DEFAULT_SAMPLE_TEETH, getTierLetter, formatRubles } from "./state/presenterStateConstants";
import { usePresenterAiAudit } from "./state/usePresenterAiAudit";
import { usePresenterToolsState } from "./state/usePresenterToolsState";
import { usePresenterNavigationState } from "./state/usePresenterNavigationState";
import { usePresenterPatientSelection } from "./state/usePresenterPatientSelection";
import { usePresenterModalEffects } from "./state/usePresenterModalEffects";

export { DEFAULT_SAMPLE_TEETH, getTierLetter, formatRubles };

export function useTreatmentPlanPresenterState(props: TreatmentPlanPresenterModalProps) {
	const {
		isOpen,
		onClose,
		patientName = "",
		patientId = "",
		doctorFullName = "",
		clinicName = "DENTE Стоматология",
		clinicPhone = "",
		contractNumber,
		planId,
		teeth,
		tiers: propTiers,
		initialSelectedTierId = "standard",
		onSelectPlan,
		onConfirmSelection,
		onUpdateItemPrice: propOnUpdateItemPrice,
		planCreatedAtIso,
		isDemoMode: propIsDemoMode,
	} = props;

	const isDemo = propIsDemoMode !== undefined ? propIsDemoMode : isDemoShowcaseMode();

	const initialCalculatedTiers = useMemo(() => {
		if (propTiers && propTiers.length > 0) return propTiers;
		const effectiveTeeth =
			teeth && teeth.length > 0
				? teeth
				: isDemo
					? (isDemoShowcaseMode() ? DEFAULT_SAMPLE_TEETH : [])
					: [];
		return generate3TierPlanComparison(effectiveTeeth, undefined, 0, 0, { isDemoMode: isDemo });
	}, [propTiers, teeth, isDemo]);

	const [allTiers, setAllTiers] = useState<readonly TreatmentPlanTier[]>(initialCalculatedTiers);
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);

	useEffect(() => {
		if (propTiers && propTiers.length > 0) setAllTiers(propTiers);
	}, [propTiers]);

	usePresenterModalEffects(isOpen, onClose);

	const planAgeDays = useMemo(() => {
		if (!planCreatedAtIso) return 0;
		const createdTime = new Date(planCreatedAtIso).getTime();
		if (Number.isNaN(createdTime)) return 0;
		return Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
	}, [planCreatedAtIso]);

	const selectedTier = useMemo(() => {
		return allTiers.find((t) => t.tierId === selectedTierId) || allTiers[0] || initialCalculatedTiers[0]!;
	}, [allTiers, selectedTierId, initialCalculatedTiers]);

	const handleSelectTier = useCallback((tier: TreatmentPlanTier) => {
		setSelectedTierId(tier.tierId);
		if (onSelectPlan) onSelectPlan(tier);
	}, [onSelectPlan]);

	const cleanPatCode = (patientId || "001").replace(/[^a-zA-Z0-9]/g, "");
	const displayContractNumber = contractNumber || ("ДОГ-2026-" + cleanPatCode);

	const aiAudit = usePresenterAiAudit({ selectedTier, patientName, doctorFullName, teeth });
	const tools = usePresenterToolsState({ selectedTier, selectedTierId, setAllTiers, patientId, planId });
	const navigation = usePresenterNavigationState({ allTiers, selectedTier, patientName, clinicName, clinicPhone, doctorFullName });
	const selection = usePresenterPatientSelection({
		selectedTier,
		selectedTierId,
		setAllTiers,
		patientId,
		planId,
		onSelectPlan,
		onConfirmSelection,
		propOnUpdateItemPrice,
	});

	const patientChoiceBtnText = "Пациент выбрал " + getTierLetter(selectedTier.tierId) + " (" + (selectedTier.totalRub ? selectedTier.totalRub.toLocaleString("ru-RU") : "0") + " ₽)";
	const choiceConfirmedBtnText = "Выбор зафиксирован (" + getTierLetter(selectedTier.tierId) + ")";

	return {
		allTiers,
		selectedTier,
		selectedTierId,
		handleSelectTier,
		planAgeDays,
		displayContractNumber,
		patientChoiceBtnText,
		choiceConfirmedBtnText,
		...navigation,
		...tools,
		...aiAudit,
		...selection,
	};
}
