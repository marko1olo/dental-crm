/**
 * TreatmentPlanModule.tsx — главный модуль управления планами лечения и финансовой оценки DENTE CRM.
 * Полностью декомпозирован строго по Мандату 8b (лимит строк <= 800).
 */

import React from "react";
import { Layers, Plus, Sparkles } from "lucide-react";
import type {
	CashierInvoiceExportData,
	ToothData,
} from "./types";
import { showToast } from "../GlobalToast";
import type { InventoryItemLookup } from "./treatmentPlanMaterialEngine";
import { TreatmentPlanStageCard } from "./TreatmentPlanStageCard";
import { TreatmentPlanToolbar } from "./TreatmentPlanToolbar";
import { TreatmentPlanScenarioSelector } from "./TreatmentPlanScenarioSelector";
import { TreatmentPlanSpecializedModalsHost } from "./TreatmentPlanSpecializedModalsHost";
import { TreatmentPlanAddServiceModal } from "./TreatmentPlanAddServiceModal";
import { TreatmentPlanCreateStageModal } from "./TreatmentPlanCreateStageModal";
import { useTreatmentPlanLogic } from "./useTreatmentPlanLogic";

// Прозрачный реэкспорт подкомпонентов и хука (Мандат 8b: обратная совместимость)
export * from "./useTreatmentPlanLogic";
export * from "./TreatmentPlanToolbar";
export * from "./TreatmentPlanScenarioSelector";
export * from "./TreatmentPlanSpecializedModalsHost";
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
	readonly initialStatus?: "draft" | "agreed" | "in_progress" | "completed";
	readonly onStatusChange?: (status: "draft" | "agreed" | "in_progress" | "completed") => void;
}

export const TreatmentPlanModule: React.FC<TreatmentPlanModuleProps> = ({
	patientId,
	patientName = "Пациент",
	teethData,
	onExportToCashier,
	onPlanSaved,
	className = "",
	planCreatedAtIso,
	initialOptionsMenuOpen = false,
	initialStatus,
	onStatusChange,
}) => {
	const logic = useTreatmentPlanLogic({
		patientId,
		patientName,
		teethData,
		onExportToCashier,
		onPlanSaved,
		planCreatedAtIso,
		initialStatus,
		onStatusChange,
	});

	return (
		<div
			className={`treatment-plan-module flex flex-col gap-5 w-full bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--line,var(--border,#cbd5e1))] p-5 shadow-xl ${className}`.trim()}
			data-testid="treatment-plan-module"
		>
			{/* Top Bar, Quick Actions, Status, Tabs, and Collapsible Toolbars */}
			<TreatmentPlanToolbar
				planAgeDays={logic.planAgeDays}
				planStatus={logic.planStatus}
				onStatusTransition={logic.handleStatusTransition}
				patientName={logic.patientName}
				totalItemsCount={logic.totalItemsCount}
				activeViewTab={logic.activeViewTab}
				setActiveViewTab={logic.setActiveViewTab}
				signedAgreement={logic.signedAgreement}
				onOpenSignModal={() => logic.setIsSignModalOpen(true)}
				onExportCashier={logic.handleExportCashier}
				onGenerateCbctAutoPlan={logic.handleGenerateCbctAutoPlan}
				initialOptionsMenuOpen={initialOptionsMenuOpen}
				onOpenInvoiceModal={() => logic.setIsInvoiceModalOpen(true)}
				onOpenFiscalModal={() => logic.setIsFiscalModalOpen(true)}
				onOpenCuratorModal={() => logic.setIsCuratorModalOpen(true)}
				curatorFullName={logic.patient?.administrativeProfile?.curatorFullName}
				onOpenPresenterModal={() => logic.setIsPresenterModalOpen(true)}
				onOpenComparatorModal={() => logic.setIsComparatorModalOpen(true)}
				onOpenStagePaymentModal={() => logic.setIsStagePaymentModalOpen(true)}
				onOpenPriceValidatorModal={() => logic.setIsPriceValidatorModalOpen(true)}
				onOpenContractPrint={() => logic.setIsContractPrintOpen(true)}
				onOpenLabOrder={logic.handleOpenLabOrder}
				onOneClickLabOrder={() => void logic.handleOneClickLabOrder()}
				isSaving={logic.isSaving}
				onSavePlanToDatabase={logic.handleSavePlanToDatabase}
				discountPercent={logic.discountPercent}
				setDiscountPercent={logic.setDiscountPercent}
				bonusPointsToUseRub={logic.bonusPointsToUseRub}
				setBonusPointsToUseRub={logic.setBonusPointsToUseRub}
				patientBalanceRub={logic.patientBalanceRub}
				customStages={logic.customStages}
				cbctAutoPlanTiers={logic.cbctAutoPlanTiers}
				copilotFeedback={logic.copilotFeedback}
				setCopilotFeedback={logic.setCopilotFeedback}
				isCopilotExecuting={logic.isCopilotExecuting}
				onExecuteCopilot={logic.handleExecuteCopilot}
				onResetPlan={() => {
					logic.setCustomStages(null);
					logic.setCbctAutoPlanTiers(null);
					logic.setCopilotFeedback(null);
					showToast("План сброшен к исходной одонтограмме", "info");
				}}
				onOpenChairsideBundlesModal={() => logic.setIsChairsideBundlesModalOpen(true)}
				onApplyClinicalBundle={logic.handleApplyClinicalBundle}
				orthopedicTeeth={logic.orthopedicTeeth}
			/>

			{/* Main Content Area: 3-Tier comparison, 4-Phases view, or Stages list */}
			<TreatmentPlanScenarioSelector
				activeViewTab={logic.activeViewTab}
				planTiers={logic.planTiers}
				selectedTierId={logic.selectedTierId}
				onSelectTier={(tier) => {
					logic.setSelectedTierId(tier.tierId);
					if (tier.stages && tier.stages.length > 0) {
						logic.setCustomStages([...tier.stages]);
					}
				}}
				onApproveAndSignTier={(tier) => {
					logic.setSelectedTierId(tier.tierId);
					if (tier.stages && tier.stages.length > 0) {
						logic.setCustomStages([...tier.stages]);
					}
					logic.setIsSignModalOpen(true);
				}}
				onOpenComparatorStudio={() => logic.setIsComparatorModalOpen(true)}
				onOpenStagePaymentStudio={() => logic.setIsStagePaymentModalOpen(true)}
				onOpenPriceValidatorStudio={() => logic.setIsPriceValidatorModalOpen(true)}
				onOpenInstallmentForTier={(tier) => {
					logic.setSelectedTierId(tier.tierId);
					if (tier.stages && tier.stages.length > 0) {
						logic.setCustomStages([...tier.stages]);
					}
					if (logic.stages.length > 0) {
						logic.setSelectedInstallmentStage(logic.stages[0]!);
						logic.setIsInstallmentModalOpen(true);
					}
				}}
				onPrintContractForTier={(tier) => {
					logic.setSelectedTierId(tier.tierId);
					if (tier.stages && tier.stages.length > 0) {
						logic.setCustomStages([...tier.stages]);
					}
					logic.setIsContractPrintOpen(true);
				}}
				stages={logic.stages}
				patientName={logic.patientName}
				patientId={logic.patientId}
				planAgeDays={logic.planAgeDays}
				planCreatedAtIso={planCreatedAtIso}
				onExecuteWriteOffStage={logic.handleExecuteWriteOffStage}
				onOpenFiscalPayment={() => {
					if (logic.stages.length > 0) {
						logic.setSelectedInstallmentStage(logic.stages[0]!);
					}
					logic.setIsFiscalModalOpen(true);
				}}
				onOpenInstallmentModal={() => {
					if (logic.stages.length > 0) {
						logic.setSelectedInstallmentStage(logic.stages[0]!);
					}
					logic.setIsInstallmentModalOpen(true);
				}}
				onOpenSignModal={() => logic.setIsSignModalOpen(true)}
				onOpenContractPrint={() => logic.setIsContractPrintOpen(true)}
			>
				<div className="flex flex-col gap-4">
					{/* Doctor Specialty Filter Bar & Stage Actions (Mandate 8e: Doctor Autonomy) */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] shadow-xs">
						{/* Specialty Filter Pills */}
						<div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Фильтр по специализациям">
							{[
								{ id: "all", label: "Все специалисты", count: logic.stages.length },
								{
									id: "therapy",
									label: "Терапия",
									count: logic.stages.filter(
										(s) =>
											s.stageKind === "stage_1_therapy" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("терап") || c.includes("кариес") || c.includes("эндо");
											}),
									).length,
								},
								{
									id: "surgery",
									label: "Хирургия",
									count: logic.stages.filter(
										(s) =>
											s.stageKind === "stage_2_surgery" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("хирург") || c.includes("имплант") || c.includes("удал");
											}),
									).length,
								},
								{
									id: "orthopedics",
									label: "Ортопедия",
									count: logic.stages.filter(
										(s) =>
											s.stageKind === "stage_3_orthopedics" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("ортопед") || c.includes("коронк") || c.includes("мост");
											}),
									).length,
								},
								{
									id: "orthodontics",
									label: "Ортодонтия",
									count: logic.stages.filter(
										(s) =>
											s.stageKind === "stage_4_orthodontics" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("ортодонт") || c.includes("брекет") || c.includes("элайнер");
											}),
									).length,
								},
								{
									id: "periodontics",
									label: "Пародонтология",
									count: logic.stages.filter(
										(s) =>
											s.stageKind === "stage_5_periodontics" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("пародонт") || c.includes("гигиен") || c.includes("десн");
											}),
									).length,
								},
							].map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => logic.setSpecialtyFilter(tab.id as any)}
									data-testid={`tp-specialty-filter-${tab.id}`}
									className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 touch-manipulation ${
										logic.specialtyFilter === tab.id
											? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
											: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))]"
									}`}
								>
									<span>{tab.label}</span>
									{tab.count > 0 && (
										<span
											className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
												logic.specialtyFilter === tab.id
													? "bg-white/20 text-white"
													: "bg-[var(--paper-strong)] text-[var(--muted)]"
											}`}
										>
											{tab.count}
										</span>
									)}
								</button>
							))}
						</div>

						{/* Actions: + Добавить услугу из каталога, + Добавить этап плана */}
						<div className="flex items-center gap-2 flex-wrap shrink-0">
							<button
								type="button"
								onClick={() => {
									const defaultStage = logic.visibleStages[0] || logic.stages[0] || null;
									logic.setTargetStageForAdd(defaultStage);
									logic.setIsAddServiceModalOpen(true);
								}}
								data-testid="tp-add-catalog-service-btn"
								className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
								title="Добавить любую услугу из утвержденного прейскуранта клиники (Мандат 8e)"
							>
								<Plus size={14} />
								<span>+ Услуга из каталога</span>
							</button>

							<button
								type="button"
								onClick={() => logic.setIsCreateStageModalOpen(true)}
								data-testid="tp-create-stage-btn"
								className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
								title="Добавить новый этап в план лечения"
							>
								<Layers size={14} className="text-[var(--teal,var(--brand-primary))]" />
								<span>+ Добавить этап</span>
							</button>
						</div>
					</div>

					{/* Stage list or Empty state */}
					{logic.visibleStages.length === 0 ? (
						<div className="p-8 rounded-2xl border border-dashed border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-center text-xs text-[var(--muted,#64748b)] space-y-3">
							<Layers className="w-10 h-10 mx-auto text-[var(--muted,#64748b)] opacity-40" />
							<div className="font-bold text-sm text-[var(--ink,#0f172a)]">
								{logic.specialtyFilter !== "all"
									? "В выбранной специализации пока нет этапов"
									: "В плане лечения пока нет сформированных этапов"}
							</div>
							<p className="max-w-md mx-auto m-0 text-xs text-[var(--muted,#64748b)]">
								{logic.specialtyFilter !== "all"
									? "Сбросьте фильтр или добавьте новый этап по этой специальности."
									: "Добавьте клинический пакет, услугу из каталога или создайте этап вручную."}
							</p>
							<div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
								{logic.specialtyFilter !== "all" ? (
									<button
										type="button"
										onClick={() => logic.setSpecialtyFilter("all")}
										className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
									>
										<span>Показать все этапы</span>
									</button>
								) : (
									<>
										<button
											type="button"
											onClick={() => logic.handleApplyClinicalBundle("hygiene_turnkey")}
											className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
										>
											<Sparkles size={13} />
											<span>+ Пакет: Профгигиена</span>
										</button>
										<button
											type="button"
											onClick={() => logic.setIsCreateStageModalOpen(true)}
											className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
										>
											<span>+ Создать этап</span>
										</button>
									</>
								)}
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							{logic.visibleStages.map((stage) => (
								<TreatmentPlanStageCard
									key={stage.stageNumber}
									stage={stage}
									defaultExpanded={true}
									{...(Array.isArray(logic.dashboard?.inventoryItems) && logic.dashboard.inventoryItems.length > 0
										? { inventoryItems: logic.dashboard.inventoryItems as InventoryItemLookup[] }
										: {})}
									onUpdateItemQuantity={logic.handleUpdateItemQuantity}
									onUpdateItemPrice={logic.handleUpdateItemPrice}
									onUpdateItem={logic.handleUpdateItem}
									onRemoveItem={logic.handleRemoveItem}
									onAddItem={(st) => {
										logic.setTargetStageForAdd(st);
										logic.setIsAddServiceModalOpen(true);
									}}
									onDeleteStage={logic.handleDeleteStage}
									onExecuteWriteOffStage={logic.handleExecuteWriteOffStage}
									onStartStage={logic.handleStartStage}
									onChangeStageStatus={logic.handleChangeStageStatus}
									onPayStage={(stageToPay) => {
										logic.setSelectedInstallmentStage(stageToPay);
										logic.setIsFiscalModalOpen(true);
									}}
									onApplyStageDiscount={() => {
										logic.setDiscountPercent(10);
										showToast("Применена скидка врача 10% на план лечения", "success");
									}}
									onOpenLabOrder={logic.handleOpenLabOrder}
									onOneClickLabOrder={logic.handleOneClickLabOrder}
									onOpenInstallment={(stageToFinance) => {
										logic.setSelectedInstallmentStage(stageToFinance);
										logic.setIsInstallmentModalOpen(true);
									}}
								/>
							))}
						</div>
					)}
				</div>
			</TreatmentPlanScenarioSelector>

			{/* 13 Specialized Studio Modals Host */}
			<TreatmentPlanSpecializedModalsHost
				isComparatorModalOpen={logic.isComparatorModalOpen}
				onCloseComparator={() => logic.setIsComparatorModalOpen(false)}
				isStagePaymentModalOpen={logic.isStagePaymentModalOpen}
				onCloseStagePayment={() => logic.setIsStagePaymentModalOpen(false)}
				isPriceValidatorModalOpen={logic.isPriceValidatorModalOpen}
				onClosePriceValidator={() => logic.setIsPriceValidatorModalOpen(false)}
				isSignModalOpen={logic.isSignModalOpen}
				onOpenSignModal={() => logic.setIsSignModalOpen(true)}
				onCloseSignModal={() => logic.setIsSignModalOpen(false)}
				isContractPrintOpen={logic.isContractPrintOpen}
				onOpenContractPrint={() => logic.setIsContractPrintOpen(true)}
				onCloseContractPrint={() => logic.setIsContractPrintOpen(false)}
				isActPrintOpen={logic.isActPrintOpen}
				onCloseActPrint={() => logic.setIsActPrintOpen(false)}
				isFiscalModalOpen={logic.isFiscalModalOpen}
				onCloseFiscal={() => logic.setIsFiscalModalOpen(false)}
				isLabOrderModalOpen={logic.isLabOrderModalOpen}
				onCloseLabOrder={() => logic.setIsLabOrderModalOpen(false)}
				isInvoiceModalOpen={logic.isInvoiceModalOpen}
				onCloseInvoice={() => logic.setIsInvoiceModalOpen(false)}
				isInstallmentModalOpen={logic.isInstallmentModalOpen}
				onCloseInstallment={() => logic.setIsInstallmentModalOpen(false)}
				onOpenInstallmentModal={() => logic.setIsInstallmentModalOpen(true)}
				isPresenterModalOpen={logic.isPresenterModalOpen}
				onClosePresenter={() => logic.setIsPresenterModalOpen(false)}
				isCuratorModalOpen={logic.isCuratorModalOpen}
				onCloseCurator={() => logic.setIsCuratorModalOpen(false)}
				isChairsideBundlesModalOpen={logic.isChairsideBundlesModalOpen}
				onCloseChairsideBundles={() => logic.setIsChairsideBundlesModalOpen(false)}
				patientId={logic.patientId}
				patientName={logic.patientName}
				patientPhone={logic.patientPhone}
				patientBirthDate={logic.patientBirthDate}
				patientDepositRub={Math.round((logic.dashboard?.activePatient?.balanceKopecks || 0) / 100)}
				patientBalanceRub={logic.patientBalanceRub}
				patientChartNumber={logic.patient?.chartNumber || logic.patient?.cardNumber}
				patientAdministrativeProfile={logic.patient?.administrativeProfile}
				doctorFullName={logic.auth?.currentUser?.name || "Лечащий врач"}
				doctorId={logic.auth?.currentUser?.id || "doc-01"}
				clinicName={logic.dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника DENTE"}
				clinicInn={logic.dashboard?.clinicSettings?.requisites?.inn}
				planAgeDays={logic.planAgeDays}
				planCreatedAtIso={planCreatedAtIso}
				contractNumber={logic.contractNumber}
				teethData={teethData}
				orthopedicTeeth={logic.orthopedicTeeth}
				selectedLabTeeth={logic.selectedLabTeeth}
				catalog={logic.catalog}
				currentTier={logic.currentTier}
				effectiveSignTier={logic.effectiveSignTier}
				planTiers={logic.planTiers}
				selectedTierId={logic.selectedTierId}
				onSelectTierId={logic.setSelectedTierId}
				onSetPlanStatus={logic.setPlanStatus}
				stages={logic.stages}
				signedAgreement={logic.signedAgreement}
				onSignedSuccess={(agreement) => {
					logic.setSignedAgreement(agreement);
					logic.setIsSignModalOpen(false);
					showToast(
						`План «${logic.effectiveSignTier.title}» успешно подписан пациентом ${logic.patientName}!`,
						"success",
						5000,
					);
				}}
				discountPercent={logic.discountPercent}
				loyaltyDeduction={logic.loyaltyDeduction}
				completedActData={logic.completedActData}
				selectedActStage={logic.selectedActStage}
				onSelectActStage={logic.setSelectedActStage}
				onConfirmExecuteWriteOff={logic.handleConfirmExecuteWriteOff}
				isExecutingWriteOff={logic.isExecutingWriteOff}
				validationPayload={logic.validationPayload}
				selectedInstallmentStage={logic.selectedInstallmentStage}
				onSelectInstallmentStage={logic.setSelectedInstallmentStage}
				grandTotalRub={logic.grandTotalRub}
				onExportToCashier={onExportToCashier}
				onApplyChairsideBundlePlan={logic.handleApplyChairsideBundlePlan}
				onApplyChairsideBundleInvoice={logic.handleApplyChairsideBundleInvoice}
			/>

			{/* Manual Service Addition from Catalog Modal (Mandates 8e, 8k) */}
			<TreatmentPlanAddServiceModal
				isOpen={logic.isAddServiceModalOpen}
				onClose={() => logic.setIsAddServiceModalOpen(false)}
				stages={logic.stages}
				targetStage={logic.targetStageForAdd}
				catalog={logic.catalog}
				onAddService={logic.handleAddItemToStage}
			/>

			{/* Create New Clinical Stage Modal */}
			<TreatmentPlanCreateStageModal
				isOpen={logic.isCreateStageModalOpen}
				onClose={() => logic.setIsCreateStageModalOpen(false)}
				onCreateStage={logic.handleCreateNewStage}
			/>
		</div>
	);
};
