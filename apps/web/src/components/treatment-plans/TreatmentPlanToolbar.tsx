/**
 * TreatmentPlanToolbar.tsx — однострочная командная панель плана лечения DENTE CRM.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 120).
 */

import React, { useState } from "react";
import type { TreatmentPlanStatus } from "./types";
import type { CopilotCommandType } from "../../services/ai/treatmentPlanCopilot";
import type { ClinicalBundleId } from "./treatmentPlanBundlesEngine";
import { TreatmentPlanDiscountsModal } from "./TreatmentPlanDiscountsModal";
import { TreatmentPlanHeaderBar } from "./toolbar/TreatmentPlanHeaderBar";
import { TreatmentPlanStatusControl } from "./toolbar/TreatmentPlanStatusControl";
import { TreatmentPlanViewTabs } from "./toolbar/TreatmentPlanViewTabs";
import { TreatmentPlanPrimaryActions } from "./toolbar/TreatmentPlanPrimaryActions";
import { TreatmentPlanOptionsMenu } from "./toolbar/TreatmentPlanOptionsMenu";

export interface TreatmentPlanToolbarProps {
	readonly planAgeDays: number;
	readonly planStatus: TreatmentPlanStatus;
	readonly onStatusTransition: (newStatus: TreatmentPlanStatus) => void;
	readonly patientName: string;
	readonly totalItemsCount: number;
	readonly activeViewTab: "3tier" | "stages" | "phased4" | "roadmap";
	readonly setActiveViewTab: (tab: "3tier" | "stages" | "phased4" | "roadmap") => void;
	readonly signedAgreement?: unknown;
	readonly onOpenSignModal: () => void;
	readonly onExportCashier: () => void;
	readonly onGenerateCbctAutoPlan?: () => void;
	readonly initialOptionsMenuOpen?: boolean;
	readonly onOpenInvoiceModal: () => void;
	readonly onOpenFiscalModal: () => void;
	readonly onOpenCuratorModal: () => void;
	readonly curatorFullName?: string | undefined;
	readonly onOpenPresenterModal: () => void;
	readonly onOpenComparatorModal?: (() => void) | undefined;
	readonly onOpenStagePaymentModal?: (() => void) | undefined;
	readonly onOpenPriceValidatorModal?: (() => void) | undefined;
	readonly onOpenContractPrint: () => void;
	readonly onOpenLabOrder?: () => void;
	readonly onOneClickLabOrder?: () => void;
	readonly isSaving: boolean;
	readonly onSavePlanToDatabase: () => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
	readonly bonusPointsToUseRub: number;
	readonly setBonusPointsToUseRub: (val: number) => void;
	readonly patientBalanceRub: number;
	readonly customStages?: readonly unknown[] | null | undefined;
	readonly cbctAutoPlanTiers?: unknown | null | undefined;
	readonly copilotFeedback: string | null;
	readonly setCopilotFeedback: (feedback: string | null) => void;
	readonly isCopilotExecuting: boolean;
	readonly onExecuteCopilot: (actionId: CopilotCommandType | string) => void;
	readonly onResetPlan: () => void;
	readonly onOpenChairsideBundlesModal: () => void;
	readonly onApplyClinicalBundle: (bundleId: ClinicalBundleId) => void;
	readonly orthopedicTeeth?: readonly number[] | undefined;
	readonly planGrossKopecks?: number | undefined;
}

export const TreatmentPlanToolbar: React.FC<TreatmentPlanToolbarProps> = (props) => {
	const {
		planAgeDays, planStatus, onStatusTransition, patientName, totalItemsCount,
		activeViewTab, setActiveViewTab, signedAgreement, onOpenSignModal, onExportCashier,
		isSaving, onSavePlanToDatabase, initialOptionsMenuOpen = false, onOpenInvoiceModal,
		onOpenFiscalModal, onOpenCuratorModal, curatorFullName, onOpenPresenterModal,
		onOpenComparatorModal, onOpenStagePaymentModal, onOpenContractPrint, onResetPlan,
		discountPercent, setDiscountPercent, bonusPointsToUseRub, setBonusPointsToUseRub,
		patientBalanceRub, planGrossKopecks = 0, isCopilotExecuting, onExecuteCopilot,
	} = props;

	const [isOptionsOpen, setIsOptionsOpen] = useState(initialOptionsMenuOpen);
	const [isDiscountsOpen, setIsDiscountsOpen] = useState(false);

	return (
		<>
			<TreatmentPlanHeaderBar patientName={patientName} totalItemsCount={totalItemsCount} />
			<div className="treatment-plan-toolbar flex items-center justify-between gap-2 min-h-[48px] sm:min-h-[36px] sm:h-9 py-1 sm:py-0 px-0.5 border-b border-[var(--line,var(--border,#cbd5e1))] flex-nowrap overflow-x-auto max-w-full" data-testid="treatment-plan-toolbar">
				<TreatmentPlanStatusControl planStatus={planStatus} onStatusTransition={onStatusTransition} planAgeDays={planAgeDays} />
				<TreatmentPlanViewTabs activeViewTab={activeViewTab} setActiveViewTab={setActiveViewTab} />
				<div className="flex items-center gap-1.5 shrink-0">
					<TreatmentPlanPrimaryActions signedAgreement={signedAgreement} onOpenSignModal={onOpenSignModal} onExportCashier={onExportCashier} />
					<TreatmentPlanOptionsMenu
						isOpen={isOptionsOpen} onToggle={() => setIsOptionsOpen((p) => !p)} onClose={() => setIsOptionsOpen(false)}
						onExportCashier={onExportCashier} onOpenInvoiceModal={onOpenInvoiceModal} onOpenFiscalModal={onOpenFiscalModal}
						onSavePlanToDatabase={onSavePlanToDatabase} isSaving={isSaving} onOpenStagePaymentModal={onOpenStagePaymentModal}
						onOpenDiscountsModal={() => setIsDiscountsOpen(true)}
						onOpenContractPrint={onOpenContractPrint} onOpenPresenterModal={onOpenPresenterModal} onOpenComparatorModal={onOpenComparatorModal}
						onResetPlan={onResetPlan}
					/>
				</div>
			</div>
			<TreatmentPlanDiscountsModal isOpen={isDiscountsOpen} onClose={() => setIsDiscountsOpen(false)} discountPercent={discountPercent} setDiscountPercent={setDiscountPercent} bonusPointsToUseRub={bonusPointsToUseRub} setBonusPointsToUseRub={setBonusPointsToUseRub} patientBalanceRub={patientBalanceRub} planGrossKopecks={planGrossKopecks} />
		</>
	);
};

export default TreatmentPlanToolbar;
