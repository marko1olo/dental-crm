import React, { useMemo, useState } from "react";
import { Layers, ShieldCheck } from "lucide-react";
import type { PatientDentalPassport, PatientPersonalCabinetData, PatientTreatmentPlan, TreatmentPlanStage } from "../patientCabinetEngine.js";
import { computePatientTeethFromStages, DEFAULT_PATIENT_TEETH, generateTreatmentPlanEstimateHtml, signTreatmentPlanWithPep } from "../patientCabinetEngine.js";
import { openPrintWindow } from "../patientCabinetDocuments.js";
import { PatientPlanDentalFormula } from "../PatientPlanDentalFormula.js";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { PATIENT_CABINET_PRESET_ALEXEY } from "../patientCabinetPresets.js";
import { TreatmentPlanEmptyState } from "./treatmentPlan/TreatmentPlanEmptyState.js";
import { TreatmentPlanHeroCard } from "./treatmentPlan/TreatmentPlanHeroCard.js";
import { TreatmentPlanTierSelector } from "./treatmentPlan/TreatmentPlanTierSelector.js";
import { TreatmentPlanStageCard } from "./treatmentPlan/TreatmentPlanStageCard.js";
import { TreatmentPlanPassportAccordion } from "./treatmentPlan/TreatmentPlanPassportAccordion.js";
import { TreatmentPlanFloatingBar } from "./treatmentPlan/TreatmentPlanFloatingBar.js";

export interface TreatmentPlanTabProps {
	readonly data: PatientPersonalCabinetData; readonly dentalPassport: PatientDentalPassport;
	readonly onPayStageWithSbp: (stage: TreatmentPlanStage) => void; readonly onBookAppointment: () => void;
	readonly onApproveTreatmentPlan?: ((plan: PatientTreatmentPlan) => void) | undefined; readonly onShowToast?: ((msg: string) => void) | undefined;
	readonly onOpenClinicalScans?: (() => void) | undefined; readonly isClinicalScansOpen?: boolean | undefined;
}

export const TreatmentPlanTab: React.FC<TreatmentPlanTabProps> = ({
	data, dentalPassport, onPayStageWithSbp, onBookAppointment,
	onApproveTreatmentPlan, onShowToast, onOpenClinicalScans, isClinicalScansOpen,
}) => {
	const isDemo = isDemoShowcaseMode();
	const currentPlan = data.treatmentPlans[0] ?? (isDemo ? PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans[0] : undefined);
	const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium">(data.threeTierModel?.selectedTier || "standard");
	const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ "stage-0": true });
	const [isPassportExpanded, setIsPassportExpanded] = useState(false);
	const [localApproved, setLocalApproved] = useState<boolean>(!!currentPlan?.approvedByPatient);
	const isPlanApproved = !!currentPlan?.approvedByPatient || localApproved;

	const patientTeeth = useMemo(() => {
		if (data.teeth && data.teeth.length > 0) return data.teeth;
		if (currentPlan) return computePatientTeethFromStages(currentPlan.stages, data.warranties);
		return isDemo ? DEFAULT_PATIENT_TEETH : [];
	}, [data.teeth, currentPlan, data.warranties, isDemo]);

	if (!currentPlan) return <TreatmentPlanEmptyState curatingDoctor={data.curatingDoctor} onBookAppointment={onBookAppointment} />;

	const handleApprovePlan = () => {
		setLocalApproved(true);
		const signed = signTreatmentPlanWithPep(currentPlan, data.phone, "123456", data.fullName);
		if (onApproveTreatmentPlan) onApproveTreatmentPlan(signed);
		if (onShowToast) onShowToast("План лечения успешно согласован по 63-ФЗ (ПЭП)!");
	};

	const completedStages = currentPlan.stages.filter((s) => s.status === "completed").length;
	const nextStage = currentPlan.stages.find((s) => s.status !== "completed");

	return (
		<div className="pc-tab-content-container" data-testid="pc-treatment-plan-tab">
			<TreatmentPlanHeroCard currentPlan={currentPlan} isPlanApproved={isPlanApproved} completedStages={completedStages} totalStages={currentPlan.stages.length} onApprovePlan={handleApprovePlan} onPrintEstimate={() => openPrintWindow(generateTreatmentPlanEstimateHtml(isPlanApproved ? { ...currentPlan, approvedByPatient: true } : currentPlan, data))} onOpenClinicalScans={onOpenClinicalScans} isClinicalScansOpen={isClinicalScansOpen} />
			<div className="pc-all-inclusive-banner" data-testid="pc-all-inclusive-banner">
				<div className="pc-ai-icon"><ShieldCheck size={24} /></div>
				<div className="pc-ai-text">
					<strong className="pc-ai-title">Честная прозрачная медицина DENTE — Всё включено</strong>
					<p className="pc-ai-desc">Анестезия современным карпульным препаратом (<strong>0 ₽</strong>), прицельные контрольные снимки радиовизиографом (<strong>0 ₽</strong>) и индивидуальный стерильный набор (<strong>0 ₽</strong>) уже включены в стоимость каждого этапа. Никаких скрытых доплат у кресла!</p>
				</div>
			</div>
			<div className="pc-card pc-formula-card" data-testid="pc-treatment-formula-section" style={{ borderRadius: "12px", padding: "16px", backgroundColor: "var(--pc-surface, #ffffff)", border: "1px solid var(--pc-border, #e2e8f0)" }}>
				<PatientPlanDentalFormula teeth={patientTeeth} showHealthIndex={true} />
			</div>
			{data.threeTierModel && <TreatmentPlanTierSelector threeTierModel={data.threeTierModel} selectedTier={selectedTier} onSelectTier={setSelectedTier} />}
			<div className="pc-stages-container">
				<div className="pc-section-header-row"><h4 className="pc-section-title"><Layers size={18} className="pc-icon-primary" /><span>Этапы комплексного плана лечения ({currentPlan.stages.length})</span></h4><span className="pc-section-hint">Оплата происходит поэтапно по факту выполнения</span></div>
				<div className="pc-stages-list">
					{currentPlan.stages.map((stage, idx) => (
						<TreatmentPlanStageCard key={stage.id || `stage-${idx}`} stage={stage} idx={idx} isExpanded={!!expandedStages[stage.id || `stage-${idx}`]} onToggle={() => setExpandedStages((p) => ({ ...p, [stage.id || `stage-${idx}`]: !p[stage.id || `stage-${idx}`] }))} onPayStageWithSbp={onPayStageWithSbp} onBookAppointment={onBookAppointment} />
					))}
				</div>
			</div>
			<TreatmentPlanPassportAccordion dentalPassport={dentalPassport} isPassportExpanded={isPassportExpanded} onTogglePassport={() => setIsPassportExpanded(!isPassportExpanded)} />
			<TreatmentPlanFloatingBar nextStageTitle={nextStage?.titleRu} onBookAppointment={onBookAppointment} />
		</div>
	);
};
export default TreatmentPlanTab;
