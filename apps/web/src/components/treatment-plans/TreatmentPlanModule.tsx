/**
 * TreatmentPlanModule.tsx — главный модуль управления планами лечения и финансовой оценки DENTE CRM.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 120).
 */

import React from "react";
import type {
	CashierInvoiceExportData,
	ToothData,
	TreatmentPlanStatus,
} from "./types";
import { showToast } from "../GlobalToast";
import { TreatmentPlanToolbar } from "./TreatmentPlanToolbar";
import { TreatmentPlanScenarioSelector } from "./TreatmentPlanScenarioSelector";
import { TreatmentPlanSpecialtyFilterBar } from "./TreatmentPlanSpecialtyFilterBar";
import { TreatmentPlanStagesListSection } from "./TreatmentPlanStagesListSection";
import { TreatmentPlanClinicalModals } from "./TreatmentPlanClinicalModals";
import { TreatmentPlanExportModals } from "./TreatmentPlanExportModals";
import { useTreatmentPlanLogic } from "./useTreatmentPlanLogic";

// Прозрачный реэкспорт подкомпонентов и хука (Мандат 8b: обратная совместимость)
export * from "./useTreatmentPlanLogic";
export * from "./TreatmentPlanToolbar";
export * from "./TreatmentPlanScenarioSelector";
export * from "./TreatmentPlanAddServiceModal";
export * from "./TreatmentPlanCreateStageModal";

export type TreatmentPlanStatusFilter = "all" | "draft" | "agreed" | "in_progress" | "completed";

export interface TreatmentPlanModuleProps {
	readonly patientId: string;
	readonly patientName?: string;
	readonly teethData: readonly ToothData[];
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	readonly onPlanSaved?: (planId: string) => void;
	readonly className?: string;
	readonly planCreatedAtIso?: string;
	readonly initialOptionsMenuOpen?: boolean;
	readonly initialStatus?: TreatmentPlanStatus | undefined;
	readonly onStatusChange?: ((status: TreatmentPlanStatus) => void) | undefined;
	readonly initialPlanId?: string | null | undefined;
	readonly initialViewTab?: "3tier" | "stages" | "phased4" | "roadmap" | undefined;
}

export const TreatmentPlanModule: React.FC<TreatmentPlanModuleProps> = (props) => {
	const { patientId, patientName = "Пациент", teethData, onExportToCashier, onPlanSaved, className = "", planCreatedAtIso, initialOptionsMenuOpen = false, initialStatus, onStatusChange, initialPlanId, initialViewTab } = props;
	const logic = useTreatmentPlanLogic({ patientId, patientName, teethData, onExportToCashier, onPlanSaved, planCreatedAtIso, initialStatus, onStatusChange, initialPlanId, initialViewTab });

	return (
		<div className={`treatment-plan-module flex flex-col gap-3.5 w-full bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] p-3.5 shadow-lg ${className}`.trim()} data-testid="treatment-plan-module">
			<TreatmentPlanToolbar
				planAgeDays={logic.planAgeDays} planStatus={logic.planStatus} onStatusTransition={logic.handleStatusTransition} patientName={logic.patientName} totalItemsCount={logic.totalItemsCount} activeViewTab={logic.activeViewTab} setActiveViewTab={logic.setActiveViewTab} signedAgreement={logic.signedAgreement} onOpenSignModal={() => logic.setIsSignModalOpen(true)} onExportCashier={logic.handleExportCashier} onGenerateCbctAutoPlan={logic.handleGenerateCbctAutoPlan} initialOptionsMenuOpen={initialOptionsMenuOpen} onOpenInvoiceModal={() => logic.setIsInvoiceModalOpen(true)} onOpenFiscalModal={() => logic.setIsFiscalModalOpen(true)} onOpenCuratorModal={() => logic.setIsCuratorModalOpen(true)} curatorFullName={logic.patient?.administrativeProfile?.curatorFullName} onOpenPresenterModal={() => logic.setIsPresenterModalOpen(true)} onOpenComparatorModal={() => logic.setIsComparatorModalOpen(true)} onOpenStagePaymentModal={() => logic.setIsStagePaymentModalOpen(true)} onOpenPriceValidatorModal={() => logic.setIsPriceValidatorModalOpen(true)} onOpenContractPrint={() => logic.setIsContractPrintOpen(true)} onOpenLabOrder={logic.handleOpenLabOrder} onOneClickLabOrder={() => void logic.handleOneClickLabOrder()} isSaving={logic.isSaving} onSavePlanToDatabase={logic.handleSavePlanToDatabase} discountPercent={logic.discountPercent} setDiscountPercent={logic.setDiscountPercent} bonusPointsToUseRub={logic.bonusPointsToUseRub} setBonusPointsToUseRub={logic.setBonusPointsToUseRub} patientBalanceRub={logic.patientBalanceRub} customStages={logic.customStages} cbctAutoPlanTiers={logic.cbctAutoPlanTiers} copilotFeedback={logic.copilotFeedback} setCopilotFeedback={logic.setCopilotFeedback} isCopilotExecuting={logic.isCopilotExecuting} onExecuteCopilot={logic.handleExecuteCopilot} onResetPlan={() => { logic.setCustomStages(null); logic.setCbctAutoPlanTiers(null); logic.setCopilotFeedback(null); showToast("План сброшен к исходной одонтограмме", "info"); }} onOpenChairsideBundlesModal={() => logic.setIsChairsideBundlesModalOpen(true)} onApplyClinicalBundle={logic.handleApplyClinicalBundle} orthopedicTeeth={logic.orthopedicTeeth} planGrossKopecks={logic.effectiveSignTier.totalKopecks}
			/>

			<TreatmentPlanScenarioSelector
				activeViewTab={logic.activeViewTab} planTiers={logic.planTiers} selectedTierId={logic.selectedTierId}
				onSelectTier={(tier) => { logic.setSelectedTierId(tier.tierId); if (tier.stages?.length) logic.setCustomStages([...tier.stages]); }}
				onApproveAndSignTier={(tier) => { logic.setSelectedTierId(tier.tierId); if (tier.stages?.length) logic.setCustomStages([...tier.stages]); logic.setIsSignModalOpen(true); }}
				onOpenComparatorStudio={() => logic.setIsComparatorModalOpen(true)} onOpenStagePaymentStudio={() => logic.setIsStagePaymentModalOpen(true)} onOpenPriceValidatorStudio={() => logic.setIsPriceValidatorModalOpen(true)}
				onOpenInstallmentForTier={(tier) => { logic.setSelectedTierId(tier.tierId); if (tier.stages?.length) logic.setCustomStages([...tier.stages]); if (logic.stages.length > 0) { logic.setSelectedInstallmentStage(logic.stages[0]!); logic.setIsInstallmentModalOpen(true); } }}
				onPrintContractForTier={(tier) => { logic.setSelectedTierId(tier.tierId); if (tier.stages?.length) logic.setCustomStages([...tier.stages]); logic.setIsContractPrintOpen(true); }}
				stages={logic.stages} patientName={logic.patientName} patientId={logic.patientId} planAgeDays={logic.planAgeDays} planCreatedAtIso={planCreatedAtIso} onExecuteWriteOffStage={logic.handleExecuteWriteOffStage}
				onOpenFiscalPayment={() => { if (logic.stages.length > 0) logic.setSelectedInstallmentStage(logic.stages[0]!); logic.setIsFiscalModalOpen(true); }}
				onOpenInstallmentModal={() => { if (logic.stages.length > 0) logic.setSelectedInstallmentStage(logic.stages[0]!); logic.setIsInstallmentModalOpen(true); }}
				onOpenSignModal={() => logic.setIsSignModalOpen(true)} onOpenContractPrint={() => logic.setIsContractPrintOpen(true)} onChangeStageStatus={logic.handleChangeStageStatus}
			>
				<div className="flex flex-col gap-4">
					<TreatmentPlanSpecialtyFilterBar stages={logic.stages} visibleStages={logic.visibleStages} specialtyFilter={logic.specialtyFilter} onSetSpecialtyFilter={logic.setSpecialtyFilter} onOpenAddCatalogService={() => { logic.setTargetStageForAdd(logic.visibleStages[0] || logic.stages[0] || null); logic.setIsAddServiceModalOpen(true); }} onOpenCreateStageModal={() => logic.setIsCreateStageModalOpen(true)} />
					<TreatmentPlanStagesListSection visibleStages={logic.visibleStages} specialtyFilter={logic.specialtyFilter} onSetSpecialtyFilter={logic.setSpecialtyFilter} onApplyClinicalBundle={(bundleId, toothNumber) => logic.handleApplyClinicalBundle(bundleId as any, toothNumber)} onOpenCreateStageModal={() => logic.setIsCreateStageModalOpen(true)} dashboard={logic.dashboard} doctorOptions={logic.doctorOptions} onAssignDoctorToStage={logic.handleAssignDoctorToStage} onAssignDoctorToItem={logic.handleAssignDoctorToItem} onUpdateItemQuantity={logic.handleUpdateItemQuantity} onUpdateItemPrice={logic.handleUpdateItemPrice} onUpdateItem={logic.handleUpdateItem} onRemoveItem={logic.handleRemoveItem} onAddItemToStage={(st) => { logic.setTargetStageForAdd(st); logic.setIsAddServiceModalOpen(true); }} onDeleteStage={logic.handleDeleteStage} onExecuteWriteOffStage={logic.handleExecuteWriteOffStage} onStartStage={logic.handleStartStage} onChangeStageStatus={logic.handleChangeStageStatus} onPayStage={(st) => { logic.setSelectedInstallmentStage(st); logic.setIsFiscalModalOpen(true); }} onApplyStageDiscount={() => { logic.setDiscountPercent(10); showToast("Применена скидка врача 10% на план лечения", "success"); }} onOpenLabOrder={logic.handleOpenLabOrder} onOneClickLabOrder={logic.handleOneClickLabOrder} onOpenInstallment={(st) => { logic.setSelectedInstallmentStage(st); logic.setIsInstallmentModalOpen(true); }} />
				</div>
			</TreatmentPlanScenarioSelector>

			<TreatmentPlanClinicalModals logic={logic} teethData={teethData} />
			<TreatmentPlanExportModals logic={logic} onExportToCashier={onExportToCashier} />
		</div>
	);
};

export default TreatmentPlanModule;
