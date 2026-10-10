/**
 * index.ts — сборка основного хука useTreatmentPlanLogic и ре-экспорт модулей.
 * Выделено из useTreatmentPlanLogic.ts строго по Мандату 8b (лимит строк <= 800).
 */

import { useMemo, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	calculateLoyaltyBonusDeduction,
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
	type CatalogServiceLookupItem,
} from "../treatmentPlanStagesEngine";
import { filterStagesBySpecialty } from "../treatmentPlanStageMutations";
import { useTreatmentPlanTeeth } from "../useTreatmentPlanTeeth";
import type {
	DigitalSignatureAgreementData,
	LabOrderPrefillContext,
	TreatmentPlanSpecialtyFilter,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanViewTab,
	UseTreatmentPlanLogicProps,
} from "./types";
import {
	buildStageCompletedActData,
	buildTreatmentPlanValidationPayload,
	calculateEffectiveSignTier,
	calculateGrandTotalRub,
	calculatePlanAgeDays,
	calculateTotalItemsCount,
	extractPatientFinancialContext,
	formatPlanContractNumber,
	resolveDoctorOptions,
	resolveInitialActiveViewTab,
	resolveOrthopedicTeeth,
} from "./planFinancialCalculators";
import { createPlanStageMutationHandlers } from "./planStageMutationHandlers";
import {
	createPlanPersistenceAndSyncHandlers,
	useTreatmentPlanPersistenceEffects,
} from "./planPersistenceAndSync";

export * from "./types";
export * from "./planFinancialCalculators";
export * from "./planStageMutationHandlers";
export * from "./planPersistenceAndSync";

export function useTreatmentPlanLogic({
	patientId,
	patientName = "Пациент",
	teethData,
	onExportToCashier,
	onPlanSaved,
	planCreatedAtIso,
	initialStatus,
	onStatusChange,
	initialPlanId,
	initialViewTab,
}: UseTreatmentPlanLogicProps) {
	const { dashboard, auth } = useAppLogicContext();
	const effectiveTeethData = useTreatmentPlanTeeth(patientId, teethData);

	const planAgeDays = useMemo(
		() => calculatePlanAgeDays(planCreatedAtIso),
		[planCreatedAtIso],
	);

	const [activeViewTab, setActiveViewTab] = useState<TreatmentPlanViewTab>(() =>
		resolveInitialActiveViewTab(initialViewTab),
	);
	const [selectedTierId, setSelectedTierId] =
		useState<TreatmentPlanTierId>("optimum");
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [bonusPointsToUseRub, setBonusPointsToUseRub] = useState<number>(0);

	const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>(
		initialStatus || "agreed",
	);

	// Modals State
	const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
	const [isContractPrintOpen, setIsContractPrintOpen] = useState<boolean>(false);
	const [isActPrintOpen, setIsActPrintOpen] = useState<boolean>(false);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState<boolean>(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState<boolean>(false);
	const [isComparatorModalOpen, setIsComparatorModalOpen] =
		useState<boolean>(false);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] =
		useState<boolean>(false);
	const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] =
		useState<boolean>(false);
	const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
	const [isPresenterModalOpen, setIsPresenterModalOpen] =
		useState<boolean>(false);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] =
		useState<boolean>(false);
	const [selectedInstallmentStage, setSelectedInstallmentStage] =
		useState<TreatmentPlanStage | null>(null);
	const [isCuratorModalOpen, setIsCuratorModalOpen] = useState<boolean>(false);
	const [isChairsideBundlesModalOpen, setIsChairsideBundlesModalOpen] =
		useState<boolean>(false);

	// PostgreSQL 18
	const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

	// Filters
	const [specialtyFilter, setSpecialtyFilter] =
		useState<TreatmentPlanSpecialtyFilter>("all");
	const [isAddServiceModalOpen, setIsAddServiceModalOpen] =
		useState<boolean>(false);
	const [targetStageForAdd, setTargetStageForAdd] =
		useState<TreatmentPlanStage | null>(null);
	const [isCreateStageModalOpen, setIsCreateStageModalOpen] =
		useState<boolean>(false);

	// AI Copilot & Custom Stages State
	const [customStages, setCustomStages] = useState<
		TreatmentPlanStage[] | null
	>(null);
	const [cbctAutoPlanTiers, setCbctAutoPlanTiers] = useState<
		[TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] | null
	>(null);
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);

	const [selectedLabTeeth, setSelectedLabTeeth] = useState<
		number[] | undefined
	>(undefined);
	const [labOrderPrefill, setLabOrderPrefill] =
		useState<LabOrderPrefillContext | null>(null);
	const [selectedActStage, setSelectedActStage] =
		useState<TreatmentPlanStage | null>(null);
	const [isExecutingWriteOff, setIsExecutingWriteOff] =
		useState<boolean>(false);
	const [signedAgreement, setSignedAgreement] =
		useState<DigitalSignatureAgreementData | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const catalog = dashboard?.serviceCatalog as
		| CatalogServiceLookupItem[]
		| undefined;

	const {
		patient,
		patientBalanceRub,
		patientPhone,
		patientBirthDate,
	} = extractPatientFinancialContext(
		dashboard?.patients as any[] | undefined,
		patientId,
	);

	const planTiers = useMemo(() => {
		if (cbctAutoPlanTiers) return cbctAutoPlanTiers;
		return generate3TierPlanComparison(
			effectiveTeethData,
			catalog,
			discountPercent,
		);
	}, [cbctAutoPlanTiers, effectiveTeethData, catalog, discountPercent]);

	const currentTier = useMemo(() => {
		return (
			planTiers.find((t) => t.tierId === selectedTierId) ?? planTiers[2]!
		);
	}, [planTiers, selectedTierId]);

	const autoStages = useMemo(() => {
		if (currentTier?.stages && currentTier.stages.length > 0) {
			return currentTier.stages;
		}
		return generateTreatmentPlanStages(
			effectiveTeethData,
			catalog,
			discountPercent,
		);
	}, [effectiveTeethData, catalog, discountPercent, currentTier]);

	const stages = customStages ?? autoStages;

	const effectiveSignTier = useMemo(
		() => calculateEffectiveSignTier(currentTier, stages),
		[currentTier, stages],
	);

	useTreatmentPlanPersistenceEffects({
		patientId,
		catalog,
		initialPlanId,
		autoStages,
		setCurrentPlanId,
		setPlanStatus,
		setCustomStages,
	});

	const doctorOptions = useMemo(
		() => resolveDoctorOptions(dashboard?.clinicSettings?.staff as any[] | undefined),
		[dashboard?.clinicSettings?.staff],
	);

	const totalItemsCount = useMemo(
		() => calculateTotalItemsCount(stages),
		[stages],
	);

	const grandTotalRub = useMemo(
		() => calculateGrandTotalRub(stages),
		[stages],
	);

	const loyaltyDeduction = useMemo(() => {
		return calculateLoyaltyBonusDeduction(
			effectiveSignTier.totalKopecks,
			discountPercent,
			patientBalanceRub,
			bonusPointsToUseRub,
		);
	}, [
		effectiveSignTier.totalKopecks,
		discountPercent,
		patientBalanceRub,
		bonusPointsToUseRub,
	]);

	const orthopedicTeeth = useMemo(
		() => resolveOrthopedicTeeth(stages, effectiveTeethData),
		[stages, effectiveTeethData],
	);

	const validationPayload = useMemo(
		() =>
			buildTreatmentPlanValidationPayload({
				stages,
				patientId,
				patientName,
				currentTierTitle: currentTier.title,
				doctorId: auth?.currentUser?.id,
				doctorFullName: auth?.currentUser?.name,
				discountPercent,
				planCreatedAtIso,
			}),
		[
			stages,
			patientId,
			patientName,
			currentTier.title,
			auth,
			discountPercent,
			planCreatedAtIso,
		],
	);

	const contractNumber = formatPlanContractNumber(patientId);

	const completedActData = useMemo(
		() =>
			buildStageCompletedActData({
				selectedActStage,
				contractNumber,
				patientId,
				patientName,
				doctorFullName: auth?.currentUser?.name,
				clinicName: dashboard?.clinicSettings?.profile?.brandName,
				inventoryItems: dashboard?.inventoryItems,
			}),
		[
			selectedActStage,
			contractNumber,
			patientId,
			patientName,
			auth,
			dashboard,
		],
	);

	const visibleStages = useMemo(() => {
		return filterStagesBySpecialty(stages, specialtyFilter);
	}, [stages, specialtyFilter]);

	const {
		handleGenerateCbctAutoPlan,
		handleUpdateItemQuantity,
		handleUpdateItemPrice,
		handleUpdateItem,
		handleRemoveItem,
		handleAssignDoctorToStage,
		handleAssignDoctorToItem,
		handleExecuteCopilot,
		handleApplyClinicalBundle,
		handleApplyChairsideBundlePlan,
		handleApplyChairsideBundleInvoice,
		handleAddItemToStage,
		handleApplyDiscount,
		handleCreateNewStage,
		handleDeleteStage,
		handleStartStage,
		handleChangeStageStatus,
	} = createPlanStageMutationHandlers({
		patientId,
		patientName,
		effectiveTeethData,
		catalog,
		discountPercent,
		stages,
		currentPlanId,
		onExportToCashier,
		setCbctAutoPlanTiers,
		setSelectedTierId,
		setCustomStages,
		setActiveViewTab,
		setIsCopilotExecuting,
		setCopilotFeedback,
		setIsChairsideBundlesModalOpen,
		setDiscountPercent,
	});

	const {
		handleStatusTransition,
		handleOpenLabOrder,
		handleOneClickLabOrder,
		handleExportCashier,
		handleSavePlanToDatabase,
		handleExecuteWriteOffStage,
		handleConfirmExecuteWriteOff,
	} = createPlanPersistenceAndSyncHandlers({
		patientId,
		patientName,
		patientPhone,
		auth,
		stages,
		currentTier,
		loyaltyDeduction,
		orthopedicTeeth,
		currentPlanId,
		planStatus,
		signedAgreement,
		grandTotalRub,
		totalItemsCount,
		isSaving,
		completedActData,
		onStatusChange,
		onExportToCashier,
		onPlanSaved,
		setPlanStatus,
		setSelectedLabTeeth,
		setLabOrderPrefill,
		setIsLabOrderModalOpen,
		setIsSaving,
		setCurrentPlanId,
		setSelectedActStage,
		setIsActPrintOpen,
		setIsExecutingWriteOff,
	});

	return {
		dashboard,
		auth,
		patientId,
		patientName,
		patient,
		patientPhone,
		patientBirthDate,
		patientBalanceRub,
		planAgeDays,
		activeViewTab,
		setActiveViewTab,
		selectedTierId,
		setSelectedTierId,
		discountPercent,
		setDiscountPercent,
		handleApplyDiscount,
		bonusPointsToUseRub,
		setBonusPointsToUseRub,
		planStatus,
		setPlanStatus,
		handleStatusTransition,
		// Modals
		isSignModalOpen,
		setIsSignModalOpen,
		isContractPrintOpen,
		setIsContractPrintOpen,
		isActPrintOpen,
		setIsActPrintOpen,
		isFiscalModalOpen,
		setIsFiscalModalOpen,
		isLabOrderModalOpen,
		setIsLabOrderModalOpen,
		isComparatorModalOpen,
		setIsComparatorModalOpen,
		isStagePaymentModalOpen,
		setIsStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		setIsPriceValidatorModalOpen,
		isInvoiceModalOpen,
		setIsInvoiceModalOpen,
		isPresenterModalOpen,
		setIsPresenterModalOpen,
		isInstallmentModalOpen,
		setIsInstallmentModalOpen,
		selectedInstallmentStage,
		setSelectedInstallmentStage,
		isCuratorModalOpen,
		setIsCuratorModalOpen,
		isChairsideBundlesModalOpen,
		setIsChairsideBundlesModalOpen,
		isAddServiceModalOpen,
		setIsAddServiceModalOpen,
		targetStageForAdd,
		setTargetStageForAdd,
		isCreateStageModalOpen,
		setIsCreateStageModalOpen,
		// Data
		catalog,
		planTiers,
		currentTier,
		stages,
		effectiveSignTier,
		totalItemsCount,
		grandTotalRub,
		loyaltyDeduction,
		orthopedicTeeth,
		selectedLabTeeth,
		currentPlanId,
		labOrderPrefill,
		setLabOrderPrefill,
		contractNumber,
		completedActData,
		selectedActStage,
		setSelectedActStage,
		isExecutingWriteOff,
		signedAgreement,
		setSignedAgreement,
		isSaving,
		customStages,
		setCustomStages,
		cbctAutoPlanTiers,
		setCbctAutoPlanTiers,
		copilotFeedback,
		setCopilotFeedback,
		isCopilotExecuting,
		specialtyFilter,
		setSpecialtyFilter,
		visibleStages,
		validationPayload,
		// Handlers
		handleGenerateCbctAutoPlan,
		handleUpdateItemQuantity,
		handleUpdateItemPrice,
		handleUpdateItem,
		handleRemoveItem,
		handleExecuteCopilot,
		handleApplyClinicalBundle,
		handleApplyChairsideBundlePlan,
		handleApplyChairsideBundleInvoice,
		handleOpenLabOrder,
		handleOneClickLabOrder,
		handleExportCashier,
		handleSavePlanToDatabase,
		handleExecuteWriteOffStage,
		handleConfirmExecuteWriteOff,
		handleAddItemToStage,
		handleCreateNewStage,
		handleDeleteStage,
		handleStartStage,
		handleChangeStageStatus,
		doctorOptions,
		handleAssignDoctorToStage,
		handleAssignDoctorToItem,
	};
}
