/**
 * TreatmentPlanSpecializedModalsHost.tsx — хост специализированных модальных окон плана лечения.
 * Выносит 13 специализированных студий и модалок из TreatmentPlanModule.tsx (Мандат 8b).
 */

import React, { Suspense, lazy } from "react";
import type { CuratorFunnelStage } from "@dental/shared";
import type {
	CashierInvoiceExportData,
	ToothData,
	TreatmentPlanAgreement,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanValidationPayload,
} from "./types";
import type { TreatmentPlanActPrintData } from "./TreatmentPlanCompletedActPrint";
import type { ClinicalBundleDefinition } from "./treatmentPlanBundlesEngine";
import type { InvoiceServiceItem } from "../finance/invoiceEngine";
import { showToast } from "../GlobalToast";

// Lazy-loaded specialized studio modals (Split bundles, instant modal open)
const TreatmentPlanComparatorModal = lazy(() =>
	import("./comparator/TreatmentPlanComparatorModal").then((m) => ({
		default: m.TreatmentPlanComparatorModal,
	})),
);
const StagePaymentPlanModal = lazy(() =>
	import("./stagePayment/StagePaymentPlanModal").then((m) => ({
		default: m.StagePaymentPlanModal,
	})),
);
const TreatmentPlanPriceValidatorModal = lazy(() =>
	import("./validation/TreatmentPlanPriceValidatorModal").then((m) => ({
		default: m.TreatmentPlanPriceValidatorModal,
	})),
);
const TreatmentPlanSignatureModal = lazy(() =>
	import("./TreatmentPlanSignatureModal").then((m) => ({
		default: m.TreatmentPlanSignatureModal,
	})),
);
const TreatmentPlanContractPrint = lazy(() =>
	import("./TreatmentPlanContractPrint").then((m) => ({
		default: m.TreatmentPlanContractPrint,
	})),
);
const TreatmentPlanCompletedActPrint = lazy(() =>
	import("./TreatmentPlanCompletedActPrint").then((m) => ({
		default: m.TreatmentPlanCompletedActPrint,
	})),
);
const FiscalReceipt54FzModal = lazy(() =>
	import("../finance/FiscalReceipt54FzModal").then((m) => ({
		default: m.FiscalReceipt54FzModal,
	})),
);
const LabWorkOrderModal = lazy(() =>
	import("../lab/orders/LabWorkOrderModal").then((m) => ({
		default: m.LabWorkOrderModal,
	})),
);
const InvoiceGenerationModal = lazy(() =>
	import("../finance/InvoiceGenerationModal").then((m) => ({
		default: m.InvoiceGenerationModal,
	})),
);
const BankInstallmentQrModal = lazy(() =>
	import("../payments/BankInstallmentQrModal").then((m) => ({
		default: m.BankInstallmentQrModal,
	})),
);
const TreatmentPlanPresenterModal = lazy(() =>
	import("./TreatmentPlanPresenterModal").then((m) => ({
		default: m.TreatmentPlanPresenterModal,
	})),
);
const CuratorPlanAssignmentModal = lazy(() =>
	import("./CuratorPlanAssignmentModal").then((m) => ({
		default: m.CuratorPlanAssignmentModal,
	})),
);
const ClinicalServiceBundlesModal = lazy(() =>
	import("./ClinicalServiceBundlesModal").then((m) => ({
		default: m.ClinicalServiceBundlesModal,
	})),
);

export interface TreatmentPlanSpecializedModalsHostProps {
	// Comparator
	readonly isComparatorModalOpen: boolean;
	readonly onCloseComparator: () => void;
	// Stage payment
	readonly isStagePaymentModalOpen: boolean;
	readonly onCloseStagePayment: () => void;
	// Price validator
	readonly isPriceValidatorModalOpen: boolean;
	readonly onClosePriceValidator: () => void;
	// Signature
	readonly isSignModalOpen: boolean;
	readonly onOpenSignModal: () => void;
	readonly onCloseSignModal: () => void;
	// Contract print
	readonly isContractPrintOpen: boolean;
	readonly onOpenContractPrint: () => void;
	readonly onCloseContractPrint: () => void;
	// Act print
	readonly isActPrintOpen: boolean;
	readonly onCloseActPrint: () => void;
	// Fiscal
	readonly isFiscalModalOpen: boolean;
	readonly onCloseFiscal: () => void;
	// Lab order
	readonly isLabOrderModalOpen: boolean;
	readonly onCloseLabOrder: () => void;
	// Invoice
	readonly isInvoiceModalOpen: boolean;
	readonly onCloseInvoice: () => void;
	// Installment
	readonly isInstallmentModalOpen: boolean;
	readonly onCloseInstallment: () => void;
	readonly onOpenInstallmentModal: () => void;
	// Presenter
	readonly isPresenterModalOpen: boolean;
	readonly onClosePresenter: () => void;
	// Curator
	readonly isCuratorModalOpen: boolean;
	readonly onCloseCurator: () => void;
	// Bundles
	readonly isChairsideBundlesModalOpen: boolean;
	readonly onCloseChairsideBundles: () => void;

	// Shared Context Data
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientDepositRub: number;
	readonly patientBalanceRub: number;
	readonly patientChartNumber?: string | undefined;
	readonly patientAdministrativeProfile?: {
		curatorId?: string | undefined;
		curatorFullName?: string | undefined;
		curatorFunnelStage?: "consultation" | "diagnosis" | "financial_approval" | "treatment" | "completed" | undefined;
	} | undefined;
	readonly doctorFullName: string;
	readonly doctorId: string;
	readonly clinicName: string;
	readonly clinicInn?: string | undefined;
	readonly planAgeDays: number;
	readonly planCreatedAtIso?: string | undefined;
	readonly contractNumber?: string | undefined;
	readonly teethData?: readonly ToothData[] | undefined;
	readonly orthopedicTeeth: readonly number[];
	readonly selectedLabTeeth?: readonly number[] | null | undefined;
	readonly catalog?: readonly unknown[] | undefined;
	readonly currentTier: TreatmentPlanTier;
	readonly effectiveSignTier: TreatmentPlanTier;
	readonly planTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTierId: (tierId: TreatmentPlanTierId) => void;
	readonly onSetPlanStatus: (status: TreatmentPlanStatus) => void;
	readonly stages: readonly TreatmentPlanStage[];
	readonly signedAgreement: TreatmentPlanAgreement | null;
	readonly onSignedSuccess: (agreement: TreatmentPlanAgreement) => void;
	readonly discountPercent: number;
	readonly loyaltyDeduction: { appliedBonusRub: number; netPayableRub: number };
	readonly completedActData: TreatmentPlanActPrintData | null;
	readonly selectedActStage: TreatmentPlanStage | null;
	readonly onSelectActStage: (stage: TreatmentPlanStage | null) => void;
	readonly onConfirmExecuteWriteOff: () => void;
	readonly isExecutingWriteOff: boolean;
	readonly validationPayload: TreatmentPlanValidationPayload;
	readonly selectedInstallmentStage: TreatmentPlanStage | null;
	readonly onSelectInstallmentStage: (stage: TreatmentPlanStage | null) => void;
	readonly grandTotalRub: number;
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	readonly onApplyChairsideBundlePlan: (
		items: TreatmentPlanItem[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => void;
	readonly onApplyChairsideBundleInvoice: (
		items: InvoiceServiceItem[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => void;
}

const mapCuratorStage = (stage?: string | null): CuratorFunnelStage => {
	if (stage === "treatment") return "treatment_start";
	if (stage === "financial_approval") return "plan_negotiation";
	if (stage === "diagnosis") return "consultation";
	if (
		stage === "prepayment" ||
		stage === "plan_negotiation" ||
		stage === "treatment_start" ||
		stage === "completed"
	) {
		return stage;
	}
	return "consultation";
};

export const TreatmentPlanSpecializedModalsHost: React.FC<TreatmentPlanSpecializedModalsHostProps> = ({
	isComparatorModalOpen,
	onCloseComparator,
	isStagePaymentModalOpen,
	onCloseStagePayment,
	isPriceValidatorModalOpen,
	onClosePriceValidator,
	isSignModalOpen,
	onOpenSignModal,
	onCloseSignModal,
	isContractPrintOpen,
	onOpenContractPrint,
	onCloseContractPrint,
	isActPrintOpen,
	onCloseActPrint,
	isFiscalModalOpen,
	onCloseFiscal,
	isLabOrderModalOpen,
	onCloseLabOrder,
	isInvoiceModalOpen,
	onCloseInvoice,
	isInstallmentModalOpen,
	onCloseInstallment,
	onOpenInstallmentModal,
	isPresenterModalOpen,
	onClosePresenter,
	isCuratorModalOpen,
	onCloseCurator,
	isChairsideBundlesModalOpen,
	onCloseChairsideBundles,
	patientId,
	patientName,
	patientPhone = "",
	patientBirthDate,
	patientDepositRub,
	patientBalanceRub,
	patientChartNumber,
	patientAdministrativeProfile,
	doctorFullName,
	doctorId,
	clinicName,
	clinicInn = "",
	planAgeDays,
	planCreatedAtIso,
	contractNumber,
	teethData,
	orthopedicTeeth,
	selectedLabTeeth,
	catalog = [],
	currentTier,
	effectiveSignTier,
	planTiers,
	selectedTierId,
	onSelectTierId,
	onSetPlanStatus,
	stages,
	signedAgreement,
	onSignedSuccess,
	discountPercent,
	loyaltyDeduction,
	completedActData,
	selectedActStage,
	onSelectActStage,
	onConfirmExecuteWriteOff,
	isExecutingWriteOff,
	validationPayload,
	selectedInstallmentStage,
	onSelectInstallmentStage,
	grandTotalRub,
	onExportToCashier,
	onApplyChairsideBundlePlan,
	onApplyChairsideBundleInvoice,
}) => {
	return (
		<>
			{/* 3-Tier Multi-Variant Presentation Studio Modal */}
			{isComparatorModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanComparatorModal
						isOpen={isComparatorModalOpen}
						onClose={onCloseComparator}
						patientName={patientName}
						doctorName={doctorFullName}
						clinicName={clinicName}
						planAgeDays={planAgeDays}
						planCreatedAtIso={planCreatedAtIso}
						onPlanSelected={(tierCode) => {
							const mappedTierId =
								tierCode === "economy_basic"
									? "economy"
									: tierCode === "standard_recommended"
										? "standard"
										: "optimum";
							onSelectTierId(mappedTierId);
							onCloseComparator();
							showToast(`Выбран вариант лечения «${tierCode}»`, "success");
						}}
						onApproveAndSign={(tierCode) => {
							const mappedTierId =
								tierCode === "economy_basic"
									? "economy"
									: tierCode === "standard_recommended"
										? "standard"
										: "optimum";
							onSelectTierId(mappedTierId);
							onCloseComparator();
							onOpenSignModal();
						}}
						onOpenInstallment={() => {
							if (stages.length > 0) {
								onSelectInstallmentStage(stages[0]!);
								onOpenInstallmentModal();
							}
						}}
						onPrintContract={() => {
							onOpenContractPrint();
						}}
					/>
				</Suspense>
			)}

			{/* Stage Payment & Escrow Studio Modal */}
			{isStagePaymentModalOpen && (
				<Suspense fallback={null}>
					<StagePaymentPlanModal
						isOpen={isStagePaymentModalOpen}
						onClose={onCloseStagePayment}
						patientName={patientName}
						patientId={patientId}
						planTitle={currentTier.title}
						clinicName={clinicName}
						doctorFullName={doctorFullName}
					/>
				</Suspense>
			)}

			{/* Price & Star Protocols Validator Modal */}
			{isPriceValidatorModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanPriceValidatorModal
						isOpen={isPriceValidatorModalOpen}
						onClose={onClosePriceValidator}
						planPayload={validationPayload}
						stages={stages}
						catalogPricelist={(catalog as any) || []}
						onExportWorkOrder={(order) => {
							showToast(
								`Наряд-заказ №${order.orderNumber} на сумму ${order.totalPayableRub.toLocaleString("ru-RU")} ₽ выписан!`,
								"success",
								5000,
							);
						}}
						onExportCompletedAct={(act) => {
							showToast(
								`Акт выполненных работ №${act.orderNumber} на сумму ${act.totalPayableRub.toLocaleString("ru-RU")} ₽ сформирован!`,
								"success",
								5000,
							);
						}}
					/>
				</Suspense>
			)}

			{/* Digital Signature Modal */}
			{isSignModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanSignatureModal
						isOpen={isSignModalOpen}
						tier={effectiveSignTier}
						patientName={patientName}
						patientId={patientId}
						doctorFullName={doctorFullName}
						clinicName={clinicName}
						onClose={onCloseSignModal}
						onSignedSuccess={onSignedSuccess}
					/>
				</Suspense>
			)}

			{/* Contract and Plan Specification Printable Modal */}
			{isContractPrintOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanContractPrint
						isOpen={isContractPrintOpen}
						tier={effectiveSignTier}
						stages={stages}
						patientName={patientName}
						patientId={patientId}
						patientPhone={patientPhone}
						patientBirthDate={patientBirthDate}
						doctorFullName={doctorFullName}
						clinicName={clinicName}
						signedAgreement={signedAgreement}
						discountPercent={discountPercent}
						bonusPointsDeductedRub={loyaltyDeduction.appliedBonusRub}
						planAgeDays={planAgeDays}
						onClose={onCloseContractPrint}
					/>
				</Suspense>
			)}

			{/* Completed Works Act and Material Write-off Modal */}
			{isActPrintOpen && completedActData && (
				<Suspense fallback={null}>
					<TreatmentPlanCompletedActPrint
						isOpen={isActPrintOpen}
						actData={completedActData}
						onClose={() => {
							onCloseActPrint();
							onSelectActStage(null);
						}}
						onConfirmExecuteWriteOff={onConfirmExecuteWriteOff}
						isExecuting={isExecutingWriteOff}
					/>
				</Suspense>
			)}

			{/* 54-FZ Fiscal Receipt & Split Payment Modal */}
			{isFiscalModalOpen && (
				<Suspense fallback={null}>
					<FiscalReceipt54FzModal
						isOpen={isFiscalModalOpen}
						items={effectiveSignTier.stages.flatMap((s) => s.items)}
						patientId={patientId}
						patientName={patientName}
						patientPhone={patientPhone}
						patientDepositRub={patientDepositRub}
						cashierFullName={doctorFullName}
						clinicName={clinicName}
						onClose={onCloseFiscal}
						onReceiptFiscalized={(receiptNum) => {
							showToast(`Чек №${receiptNum} сохранен в истории оплат`, "success");
						}}
					/>
				</Suspense>
			)}

			{/* Statutory Lab Work Order & Tracking Studio Modal */}
			{isLabOrderModalOpen && (
				<Suspense fallback={null}>
					<LabWorkOrderModal
						isOpen={isLabOrderModalOpen}
						onClose={onCloseLabOrder}
						patientId={patientId}
						patientName={patientName}
						patientChartNumber={patientChartNumber || `К-${patientId.slice(0, 5)}`}
						doctorId={doctorId}
						doctorName={doctorFullName}
						initialTeeth={
							selectedLabTeeth && selectedLabTeeth.length > 0 ? selectedLabTeeth : orthopedicTeeth
						}
						initialOrder={
							selectedActStage
								? ({
										id: `LAB-${patientId.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
										orderNumber: `НРД-${patientId.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
										patientId,
										patientName,
										doctorId: doctorId,
										doctorName: doctorFullName,
										selectedTeeth:
											selectedLabTeeth && selectedLabTeeth.length > 0
												? selectedLabTeeth
												: orthopedicTeeth,
										prostheticTypeId: "crown_zirconia_monolithic",
										materialId: "zirconia_katana_ml",
										shadeSystem: "classical",
										shadeCode: "A2",
										stumpShadeCode: "ND2",
										currentStage: "in_progress",
										completedStages: ["order_placed"],
										patientPriceRub: selectedActStage.totalRub,
										costPriceRub: Math.round(selectedActStage.totalRub * 0.4),
										createdAt: new Date().toISOString(),
										updatedAt: new Date().toISOString(),
										stagesLog: [],
										clinicNotes: `Оформлено по этапу №${selectedActStage.stageNumber} плана «${currentTier.title}». Зафиксированная стоимость: ${selectedActStage.totalRub.toLocaleString("ru-RU")} ₽.`,
									} as any)
								: null
						}
						onSaveOrder={(order) => {
							showToast(
								`Наряд-заказ №${order.orderNumber} в зуботехническую лабораторию на сумму ${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽ успешно сохранен!`,
								"success",
								5000,
							);
						}}
					/>
				</Suspense>
			)}

			{/* Fast Invoice & Work Order Generation Modal (Feature #41 PriceGuard) */}
			{isInvoiceModalOpen && (
				<Suspense fallback={null}>
					<InvoiceGenerationModal
						isOpen={isInvoiceModalOpen}
						onClose={onCloseInvoice}
						patientId={patientId}
						patientName={patientName}
						patientPhone={patientPhone}
						patientBalanceRub={patientBalanceRub}
						planId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
						planNumber={`ПЛАН-№${patientId.slice(0, 4)}`}
						planTitle={currentTier.title}
						planCreatedAtIso={new Date().toISOString()}
						approvedAtIso={signedAgreement ? new Date().toISOString() : undefined}
						isSignedWithPatient={Boolean(signedAgreement)}
						doctorFullName={doctorFullName}
						doctorUserId={doctorId}
						planItems={stages.flatMap((s) => s.items)}
						onInvoiceCreated={(inv) => {
							const allItems = stages.flatMap((s) => s.items);
							const grossTotalRub = allItems.reduce(
								(acc, it) => acc + it.unitPriceRub * it.quantity,
								0,
							);
							const discountRub = allItems.reduce((acc, it) => acc + it.discountRub, 0);
							const netTotalRub = inv.totalNetRub ?? loyaltyDeduction.netPayableRub;

							const exportData: CashierInvoiceExportData = {
								patientId,
								patientName,
								invoiceId: inv.invoiceId,
								invoiceNumber: inv.invoiceNumber,
								items: allItems,
								grossTotalRub,
								discountRub,
								netTotalRub,
								netTotalKopecks: Math.round(netTotalRub * 100),
								notes: `Выписан счет №${inv.invoiceNumber || ""} по плану «${currentTier.title}»`,
								createdAtIso: new Date().toISOString(),
							};

							if (onExportToCashier) {
								onExportToCashier(exportData);
							}

							showToast(`Документ ${inv.invoiceNumber} успешно сформирован и передан в кассу!`, "success", 4000);
						}}
					/>
				</Suspense>
			)}

			{/* Bank Installment QR Financing Modal */}
			{isInstallmentModalOpen && selectedInstallmentStage && (
				<Suspense fallback={null}>
					<BankInstallmentQrModal
						isOpen={isInstallmentModalOpen}
						onClose={() => {
							onCloseInstallment();
							onSelectInstallmentStage(null);
						}}
						stageTitle={`Этап №${selectedInstallmentStage.stageNumber}: ${selectedInstallmentStage.title}`}
						stageNumber={selectedInstallmentStage.stageNumber}
						stageAmountKopecks={selectedInstallmentStage.totalKopecks}
						patientId={patientId}
						patientName={patientName}
						patientPhone={patientPhone}
						clinicName={clinicName}
						clinicInn={clinicInn}
						planId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
						onInstallmentApproved={() => {
							showToast(
								`Рассрочка на сумму ${selectedInstallmentStage.totalRub.toLocaleString("ru-RU")} ₽ одобрена банком!`,
								"success",
								5000,
							);
						}}
					/>
				</Suspense>
			)}

			{/* AI Audit & 3-Tier Chairside Presenter Modal */}
			{isPresenterModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanPresenterModal
						isOpen={isPresenterModalOpen}
						onClose={onClosePresenter}
						patientId={patientId}
						patientName={patientName}
						patientPhone={patientPhone}
						doctorFullName={doctorFullName}
						teeth={teethData}
						tiers={planTiers}
						initialSelectedTierId={selectedTierId}
						contractNumber={contractNumber}
						onSelectPlan={(plan) => {
							onSelectTierId(plan.tierId);
							showToast(`Выбран план: ${plan.title} (${plan.totalRub.toLocaleString("ru-RU")} ₽)`, "success");
						}}
						onConfirmSelection={(plan) => {
							onSelectTierId(plan.tierId);
							onSetPlanStatus("agreed");
							showToast(`Пациент подтвердил выбор: ${plan.title}`, "success");
						}}
						onApproveAndSign={(plan) => {
							onSelectTierId(plan.tierId);
							onClosePresenter();
							onOpenSignModal();
						}}
						onPrintContract={(plan) => {
							onSelectTierId(plan.tierId);
							onClosePresenter();
							onOpenContractPrint();
						}}
					/>
				</Suspense>
			)}

			{/* Curator Plan Assignment Modal */}
			{isCuratorModalOpen && (
				<Suspense fallback={null}>
					<CuratorPlanAssignmentModal
						isOpen={isCuratorModalOpen}
						onClose={onCloseCurator}
						patientId={patientId}
						patientName={patientName}
						treatmentPlanId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
						treatmentPlanTitle={`${currentTier.title} (${grandTotalRub.toLocaleString("ru-RU")} ₽)`}
						currentCuratorId={patientAdministrativeProfile?.curatorId}
						currentStage={mapCuratorStage(patientAdministrativeProfile?.curatorFunnelStage)}
						onAssigned={(assigned) => {
							showToast(`Куратор ${assigned.curatorFullName} успешно закреплен!`, "success");
						}}
					/>
				</Suspense>
			)}

			{/* Chairside Clinical Service Bundles 804n Modal */}
			{isChairsideBundlesModalOpen && (
				<Suspense fallback={null}>
					<ClinicalServiceBundlesModal
						isOpen={isChairsideBundlesModalOpen}
						onClose={onCloseChairsideBundles}
						initialToothNumber={orthopedicTeeth[0] || 16}
						patientId={patientId}
						patientName={patientName}
						onApplyToPlan={onApplyChairsideBundlePlan}
						onApplyToInvoice={onApplyChairsideBundleInvoice}
						targetMode="both"
					/>
				</Suspense>
			)}
		</>
	);
};
