import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { DEFAULT_TREATMENT_PLAN_PRESETS, type ComprehensivePlanVariant, type PlanTierCode } from "../planPresentationPresets";
import { generatePaymentSchedules } from "../planComparatorEngine";
import { isDemoShowcaseMode } from "../../../../utils/demoModeEngine";
import { ComparatorHeader } from "./ComparatorHeader";
import { ComparatorExpiredNotice } from "./ComparatorExpiredNotice";
import { ComparatorEmptyState } from "./ComparatorEmptyState";
import { ComparatorSegmentedControl } from "./ComparatorSegmentedControl";
import { ComparatorCard } from "./ComparatorCard";
import { ComparatorRoadmapSection } from "./ComparatorRoadmapSection";
import { ComparatorPaymentSection } from "./ComparatorPaymentSection";
import { ComparatorFooter } from "./ComparatorFooter";

if (typeof document !== "undefined") {
	void import("../planComparator.css");
}

export interface TreatmentPlanComparatorModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly planAgeDays?: number | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly isDemoMode?: boolean | undefined;
	readonly customVariants?: Readonly<Record<PlanTierCode, ComprehensivePlanVariant>> | undefined;
	readonly onPlanSelected?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onApproveAndSign?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onOpenInstallment?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onPrintContract?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
}

export const TreatmentPlanComparatorModalView: React.FC<TreatmentPlanComparatorModalProps> = ({
	isOpen = true,
	onClose,
	patientName = "Пациент",
	doctorName = "Лечащий врач",
	clinicName = "Стоматологическая клиника",
	planAgeDays,
	planCreatedAtIso,
	isDemoMode,
	customVariants,
	onPlanSelected,
	onApproveAndSign,
	onOpenInstallment,
	onPrintContract,
}) => {
	const isDemo = isDemoMode !== undefined ? isDemoMode : isDemoShowcaseMode();
	const variants = customVariants || (isDemo ? DEFAULT_TREATMENT_PLAN_PRESETS : null);
	const [selectedTier, setSelectedTier] = useState<PlanTierCode>("standard_recommended");
	const [activePaymentTab, setActivePaymentTab] = useState<"staged" | "discount" | "installments" | "ndfl">("staged");
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	const effectivePlanAgeDays = typeof planAgeDays === "number" ? planAgeDays : planCreatedAtIso ? Math.floor((Date.now() - new Date(planCreatedAtIso).getTime()) / (1000 * 60 * 60 * 24)) : 0;
	const currentVariant = variants ? variants[selectedTier] : null;
	const currentPayments = useMemo(() => (currentVariant ? generatePaymentSchedules(currentVariant.totalCostRub, currentVariant.isCode02HighCostSurgery) : null), [currentVariant]);

	const handleSelectPlan = (tier: PlanTierCode) => {
		setSelectedTier(tier);
		if (variants) onPlanSelected?.(tier, variants[tier]);
	};

	const handleConfirmChoice = () => {
		if (!currentVariant) return;
		if (onApproveAndSign) onApproveAndSign(selectedTier, currentVariant);
		else if (onPlanSelected) onPlanSelected(selectedTier, currentVariant);
		setStatusNotice(`План «${currentVariant.title}» выбран для пациента ${patientName}.`);
		setTimeout(() => setStatusNotice(null), 3000);
	};

	const handleInstallmentAction = () => {
		if (!currentVariant) return;
		if (onOpenInstallment) onOpenInstallment(selectedTier, currentVariant);
		else setActivePaymentTab("installments");
	};

	const handlePrintBrochure = () => {
		if (!currentVariant) return;
		if (onPrintContract) onPrintContract(selectedTier, currentVariant);
		else window.print();
	};

	if (!isOpen) return null;

	return (
		<div className="plan-comparator-backdrop" role="dialog" aria-modal="true" aria-labelledby="plan-comparator-title">
			<div className="plan-comparator-modal" data-testid="plan-comparator-modal">
				<ComparatorHeader patientName={patientName} doctorName={doctorName} clinicName={clinicName} onPrintBrochure={handlePrintBrochure} onClose={onClose} />
				<ComparatorExpiredNotice effectivePlanAgeDays={effectivePlanAgeDays} />
				{statusNotice && (
					<div style={{ background: "var(--plan-success-light)", color: "var(--plan-success)", padding: "6px 20px", fontSize: "0.8125rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
						<CheckCircle2 size={16} />
						<span>{statusNotice}</span>
					</div>
				)}
				{!variants || !currentVariant || !currentPayments ? (
					<ComparatorEmptyState onClose={onClose} />
				) : (
					<>
						<div className="plan-comparator-body">
							<ComparatorSegmentedControl variants={variants} selectedTier={selectedTier} onSelectTier={handleSelectPlan} />
							<div className="plan-cards-grid">
								{(["optimum_vip", "standard_recommended", "economy_basic"] as PlanTierCode[]).map((tierKey) => (
									<ComparatorCard key={tierKey} tierKey={tierKey} variant={variants[tierKey]} isSelected={selectedTier === tierKey} onSelect={handleSelectPlan} />
								))}
							</div>
							<ComparatorRoadmapSection currentVariant={currentVariant} />
							<ComparatorPaymentSection currentVariant={currentVariant} currentPayments={currentPayments} activePaymentTab={activePaymentTab} onSelectTab={setActivePaymentTab} />
						</div>
						<ComparatorFooter currentVariant={currentVariant} onInstallment={handleInstallmentAction} onConfirmChoice={handleConfirmChoice} />
					</>
				)}
			</div>
		</div>
	);
};
