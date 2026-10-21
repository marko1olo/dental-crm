import { useAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { useTreatmentPlanTeeth } from "../useTreatmentPlanTeeth.js";
import { extractPatientFinancialContext } from "./planFinancialCalculators.js";
import { usePlanContextData } from "./planLogicContextData.js";
import { usePlanModals } from "./planLogicModals.js";
import { usePlanTiersComputation } from "./planLogicTiers.js";
import { createPlanPersistenceAndSyncHandlers, useTreatmentPlanPersistenceEffects } from "./planPersistenceAndSync.js";
import { createPlanStageMutationHandlers } from "./planStageMutationHandlers.js";
import { usePlanCoreState } from "./usePlanCoreState.js";
import type { CatalogServiceLookupItem, UseTreatmentPlanLogicProps } from "./types.js";

export * from "./types.js";
export * from "./planFinancialCalculators.js";
export * from "./planStageMutationHandlers.js";
export * from "./planPersistenceAndSync.js";

export function useTreatmentPlanLogic(props: UseTreatmentPlanLogicProps) {
	const { dashboard, auth } = useAppLogicContext();
	const effectiveTeethData = useTreatmentPlanTeeth(props.patientId, props.teethData);
	const catalog = dashboard?.serviceCatalog as CatalogServiceLookupItem[] | undefined;
	const patientFin = extractPatientFinancialContext(dashboard?.patients as any[] | undefined, props.patientId);

	const core = usePlanCoreState(props.initialViewTab, props.initialStatus);
	const modals = usePlanModals();

	const tiersComp = usePlanTiersComputation({
		cbctAutoPlanTiers: core.cbctAutoPlanTiers,
		effectiveTeethData,
		catalog,
		discountPercent: core.discountPercent,
		selectedTierId: core.selectedTierId,
		customStages: core.customStages,
		specialtyFilter: core.specialtyFilter,
		patientBalanceRub: patientFin.patientBalanceRub,
		bonusPointsToUseRub: core.bonusPointsToUseRub,
	});

	useTreatmentPlanPersistenceEffects({
		patientId: props.patientId,
		catalog,
		initialPlanId: props.initialPlanId,
		autoStages: tiersComp.autoStages,
		setCurrentPlanId: core.setCurrentPlanId,
		setPlanStatus: core.setPlanStatus,
		setCustomStages: core.setCustomStages,
	});

	const ctxData = usePlanContextData({
		planCreatedAtIso: props.planCreatedAtIso,
		dashboard,
		auth,
		patientId: props.patientId,
		patientName: props.patientName || "Пациент",
		stages: tiersComp.stages,
		currentTier: tiersComp.currentTier,
		discountPercent: core.discountPercent,
		selectedActStage: core.selectedActStage,
	});

	const stageMutations = createPlanStageMutationHandlers({
		patientId: props.patientId,
		patientName: props.patientName || "Пациент",
		effectiveTeethData,
		catalog,
		discountPercent: core.discountPercent,
		stages: tiersComp.stages,
		currentPlanId: core.currentPlanId,
		onExportToCashier: props.onExportToCashier,
		setCbctAutoPlanTiers: core.setCbctAutoPlanTiers,
		setSelectedTierId: core.setSelectedTierId,
		setCustomStages: core.setCustomStages,
		setActiveViewTab: core.setActiveViewTab,
		setIsCopilotExecuting: core.setIsCopilotExecuting,
		setCopilotFeedback: core.setCopilotFeedback,
		setIsChairsideBundlesModalOpen: modals.setIsChairsideBundlesModalOpen,
		setDiscountPercent: core.setDiscountPercent,
	});

	const persistenceHandlers = createPlanPersistenceAndSyncHandlers({
		patientId: props.patientId,
		patientName: props.patientName || "Пациент",
		patientPhone: patientFin.patientPhone,
		auth,
		stages: tiersComp.stages,
		currentTier: tiersComp.currentTier,
		loyaltyDeduction: tiersComp.loyaltyDeduction,
		orthopedicTeeth: tiersComp.orthopedicTeeth,
		currentPlanId: core.currentPlanId,
		planStatus: core.planStatus,
		signedAgreement: core.signedAgreement,
		grandTotalRub: tiersComp.grandTotalRub,
		totalItemsCount: tiersComp.totalItemsCount,
		isSaving: core.isSaving,
		completedActData: ctxData.completedActData,
		onStatusChange: props.onStatusChange,
		onExportToCashier: props.onExportToCashier,
		onPlanSaved: props.onPlanSaved,
		setPlanStatus: core.setPlanStatus,
		setSelectedLabTeeth: core.setSelectedLabTeeth,
		setLabOrderPrefill: core.setLabOrderPrefill,
		setIsLabOrderModalOpen: modals.setIsLabOrderModalOpen,
		setIsSaving: core.setIsSaving,
		setCurrentPlanId: core.setCurrentPlanId,
		setSelectedActStage: core.setSelectedActStage,
		setIsActPrintOpen: modals.setIsActPrintOpen,
		setIsExecutingWriteOff: core.setIsExecutingWriteOff,
	});

	return {
		dashboard, auth, patientId: props.patientId, patientName: props.patientName || "Пациент",
		...patientFin, ...core, ...modals, ...tiersComp, ...ctxData,
		...stageMutations, ...persistenceHandlers,
	};
}
