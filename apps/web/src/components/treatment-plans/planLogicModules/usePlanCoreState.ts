import { useState } from "react";
import { resolveInitialActiveViewTab } from "./planFinancialCalculators.js";
import type {
	DigitalSignatureAgreementData,
	LabOrderPrefillContext,
	TreatmentPlanSpecialtyFilter,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanViewTab,
} from "./types.js";

export function usePlanCoreState(
	initialViewTab?: TreatmentPlanViewTab,
	initialStatus?: TreatmentPlanStatus,
) {
	const [activeViewTab, setActiveViewTab] = useState<TreatmentPlanViewTab>(() =>
		resolveInitialActiveViewTab(initialViewTab),
	);
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [bonusPointsToUseRub, setBonusPointsToUseRub] = useState<number>(0);
	const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>(initialStatus || "agreed");
	const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
	const [specialtyFilter, setSpecialtyFilter] = useState<TreatmentPlanSpecialtyFilter>("all");
	const [customStages, setCustomStages] = useState<TreatmentPlanStage[] | null>(null);
	const [cbctAutoPlanTiers, setCbctAutoPlanTiers] = useState<[TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] | null>(null);
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);
	const [selectedLabTeeth, setSelectedLabTeeth] = useState<number[] | undefined>(undefined);
	const [labOrderPrefill, setLabOrderPrefill] = useState<LabOrderPrefillContext | null>(null);
	const [selectedActStage, setSelectedActStage] = useState<TreatmentPlanStage | null>(null);
	const [isExecutingWriteOff, setIsExecutingWriteOff] = useState<boolean>(false);
	const [signedAgreement, setSignedAgreement] = useState<DigitalSignatureAgreementData | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	return {
		activeViewTab, setActiveViewTab,
		selectedTierId, setSelectedTierId,
		discountPercent, setDiscountPercent,
		bonusPointsToUseRub, setBonusPointsToUseRub,
		planStatus, setPlanStatus,
		currentPlanId, setCurrentPlanId,
		specialtyFilter, setSpecialtyFilter,
		customStages, setCustomStages,
		cbctAutoPlanTiers, setCbctAutoPlanTiers,
		copilotFeedback, setCopilotFeedback,
		isCopilotExecuting, setIsCopilotExecuting,
		selectedLabTeeth, setSelectedLabTeeth,
		labOrderPrefill, setLabOrderPrefill,
		selectedActStage, setSelectedActStage,
		isExecutingWriteOff, setIsExecutingWriteOff,
		signedAgreement, setSignedAgreement,
		isSaving, setIsSaving,
	};
}
