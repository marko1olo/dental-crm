import React, { useMemo, useState } from "react";
import { Download, Layers, ReceiptText, ShieldCheck } from "lucide-react";
import type { PatientDentalPassport, PatientPersonalCabinetData, PatientTreatmentPlan, TreatmentPlanStage } from "../patientCabinetEngine.js";
import {
	computePatientTeethFromStages,
	DEFAULT_PATIENT_TEETH,
	downloadPatientTaxCertificate1151156,
	formatRubles,
	generateTreatmentPlanEstimateHtml,
	signTreatmentPlanWithPep,
} from "../patientCabinetEngine.js";
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
	const basePlan = data.treatmentPlans[0] ?? (isDemo ? PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans[0] : undefined);
	const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium">(data.threeTierModel?.selectedTier || "standard");
	const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ "stage-0": true });
	const [isPassportExpanded, setIsPassportExpanded] = useState(false);
	const [localApproved, setLocalApproved] = useState<boolean>(!!basePlan?.approvedByPatient);

	const activeTierObj = useMemo(() => {
		if (!data.threeTierModel) return undefined;
		if (Array.isArray(data.threeTierModel.tiers)) {
			return data.threeTierModel.tiers.find((t: any) => t.tierId === selectedTier);
		}
		return (data.threeTierModel.tiers as any)?.[selectedTier];
	}, [data.threeTierModel, selectedTier]);

	const currentPlan: PatientTreatmentPlan | undefined = useMemo(() => {
		if (!basePlan) return undefined;
		if (activeTierObj?.stages && activeTierObj.stages.length > 0) {
			const tierCost = activeTierObj.totalCostRub || basePlan.totalCostRub;
			const tierStages = activeTierObj.stages;
			const paid = tierStages
				.filter((s: any) => s.status === "completed")
				.reduce((sum: number, s: any) => sum + (s.costRub || 0), 0);
			return {
				...basePlan,
				titleRu: `${basePlan.titleRu}`,
				totalCostRub: tierCost,
				paidCostRub: paid,
				remainingDueRub: Math.max(0, tierCost - paid),
				progressPercent:
					tierStages.length > 0
						? Math.round(
								(tierStages.filter((s: any) => s.status === "completed").length /
									tierStages.length) *
									100,
							)
						: basePlan.progressPercent,
				stages: tierStages,
			};
		}
		return basePlan;
	}, [basePlan, activeTierObj]);

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

	const handleSelectTier = (tier: "basic" | "standard" | "premium") => {
		setSelectedTier(tier);
		const tierName = tier === "basic" ? "Эконом" : tier === "premium" ? "Премиум" : "Оптимум";
		if (basePlan?.id) {
			void fetch(`/api/portal/treatment-plans/${basePlan.id}/select-tier`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tierId: tier }),
			}).catch(() => {});
		}
		if (onShowToast) {
			onShowToast(`Выбран тариф «${tierName}». План лечения пересчитан.`);
		}
	};

	const completedStages = currentPlan.stages.filter((s) => s.status === "completed").length;
	const nextStage = currentPlan.stages.find((s) => s.status !== "completed");
	const estimatedTaxRefundRub = Math.round(currentPlan.totalCostRub * 0.13);

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
			{/* 1-Click Tax Deduction 13% NDFL Transparency Card (Mandates 8e, 8n) */}
			<div
				className="pc-card pc-tax-refund-card"
				data-testid="pc-plan-tax-deduction-card"
				style={{
					borderRadius: "12px",
					padding: "14px 16px",
					backgroundColor: "var(--pc-surface, #ffffff)",
					border: "1px solid var(--pc-border, #e2e8f0)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div
						style={{
							width: "36px",
							height: "36px",
							borderRadius: "10px",
							backgroundColor: "var(--teal-soft, rgba(13, 148, 136, 0.1))",
							color: "var(--teal, #0d9488)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<ReceiptText size={20} />
					</div>
					<div>
						<strong style={{ fontSize: "14px", color: "var(--pc-text-main, #0f172a)", display: "block" }}>
							Налоговый вычет 13% НДФЛ: возврат до {formatRubles(estimatedTaxRefundRub)}
						</strong>
						<p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--pc-text-muted, #64748b)" }}>
							Справка по форме КНД 1151156 с QR-кодом для ФНС формируется в 1 клик
						</p>
					</div>
				</div>
				<button
					type="button"
					className="pc-btn-secondary"
					data-testid="pc-plan-tax-1click-btn"
					onClick={() => {
						downloadPatientTaxCertificate1151156(data, 2026);
						if (onShowToast) onShowToast("Справка для налогового вычета (13% НДФЛ, КНД 1151156) сформирована в 1 клик!");
					}}
					style={{ minHeight: "44px", touchAction: "manipulation", display: "inline-flex", alignItems: "center", gap: "6px" }}
				>
					<Download size={15} />
					<span>Скачать справку 13% НДФЛ</span>
				</button>
			</div>
			<div className="pc-card pc-formula-card" data-testid="pc-treatment-formula-section" style={{ borderRadius: "12px", padding: "16px", backgroundColor: "var(--pc-surface, #ffffff)", border: "1px solid var(--pc-border, #e2e8f0)" }}>
				<PatientPlanDentalFormula teeth={patientTeeth} showHealthIndex={true} />
			</div>
			{data.threeTierModel && <TreatmentPlanTierSelector threeTierModel={data.threeTierModel} selectedTier={selectedTier} onSelectTier={handleSelectTier} />}
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
