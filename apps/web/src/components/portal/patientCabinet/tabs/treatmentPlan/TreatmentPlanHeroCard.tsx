import React from "react";
import { CheckCircle2, Clock, Printer, Scan, Smartphone } from "lucide-react";
import type { PatientTreatmentPlan } from "../../patientCabinetEngine.js";
import { formatRubles } from "../../patientCabinetEngine.js";

interface TreatmentPlanHeroCardProps {
	readonly currentPlan: PatientTreatmentPlan;
	readonly isPlanApproved: boolean;
	readonly completedStages: number;
	readonly totalStages: number;
	readonly onApprovePlan: () => void;
	readonly onPrintEstimate: () => void;
	readonly onOpenClinicalScans?: (() => void) | undefined;
	readonly isClinicalScansOpen?: boolean | undefined;
}

export const TreatmentPlanHeroCard: React.FC<TreatmentPlanHeroCardProps> = ({
	currentPlan, isPlanApproved, completedStages, totalStages,
	onApprovePlan, onPrintEstimate, onOpenClinicalScans, isClinicalScansOpen,
}) => {
	const progressPercent = currentPlan.progressPercent || 0;
	const radius = 54;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

	return (
		<div className="pc-card pc-plan-hero-card" data-testid="pc-plan-progress-hero">
			<div className="pc-plan-hero-grid">
				<div className="pc-ring-diagram-wrapper">
					<svg className="pc-progress-ring" width="130" height="130" viewBox="0 0 130 130" aria-label={`Прогресс лечения: ${progressPercent}%`}>
						<circle className="pc-ring-bg" cx="65" cy="65" r={radius} fill="none" stroke="var(--pc-border, #e2e8f0)" strokeWidth="11" />
						<circle className="pc-ring-fill" cx="65" cy="65" r={radius} fill="none" stroke="var(--pc-primary, #0d9488)" strokeLinecap="round" strokeWidth="11" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 65 65)" />
					</svg>
					<div className="pc-ring-center-content">
						<span className="pc-ring-percent">{progressPercent}%</span>
						<span className="pc-ring-subtext">Выполнено</span>
					</div>
				</div>

				<div className="pc-plan-hero-text">
					<div className="pc-plan-header-line">
						<h3 className="pc-plan-title">{currentPlan.titleRu}</h3>
						<span className="pc-status-badge paid">План № {currentPlan.planNumber}</span>
					</div>
					<p className="pc-plan-curator">Куратор плана: <strong>{currentPlan.curatingDoctor}</strong></p>
					<div className="pc-plan-financials-box">
						<div className="pc-fin-item"><span className="pc-fin-label">Общая стоимость:</span><strong className="pc-fin-val total">{formatRubles(currentPlan.totalCostRub)}</strong></div>
						<div className="pc-fin-item"><span className="pc-fin-label">Оплачено:</span><strong className="pc-fin-val paid">{formatRubles(currentPlan.paidCostRub)}</strong></div>
						<div className="pc-fin-item"><span className="pc-fin-label">Остаток к оплате:</span><strong className="pc-fin-val remaining">{currentPlan.remainingDueRub > 0 ? formatRubles(currentPlan.remainingDueRub) : "Оплачено 100%"}</strong></div>
					</div>
					<div className="pc-plan-stages-badge">
						Выполнено <strong>{completedStages}</strong> из <strong>{totalStages}</strong> клинических этапов
					</div>
					<div className="pc-plan-actions-strip" data-testid="pc-plan-actions-strip" style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed var(--pc-border, #cbd5e1)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
						{isPlanApproved ? (
							<span className="pc-status-badge paid" data-testid="plan-approved-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px" }}>
								<CheckCircle2 size={15} /><span>План согласован (ПЭП 63-ФЗ)</span>
							</span>
						) : (
							<>
								<span className="pc-status-badge unpaid" data-testid="plan-pending-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px" }}>
									<Clock size={15} /><span>Требуется согласование</span>
								</span>
								<button type="button" className="pc-btn-primary pc-btn-compact" onClick={onApprovePlan} data-testid="approve-treatment-plan-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
									<Smartphone size={14} /><span>Согласовать план (ПЭП 63-ФЗ)</span>
								</button>
							</>
						)}
						<button type="button" className="pc-btn-secondary pc-btn-compact" onClick={onPrintEstimate} data-testid="print-treatment-plan-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
							<Printer size={14} /><span>Печать сметы</span>
						</button>
						{onOpenClinicalScans && (
							<button type="button" className="pc-btn-secondary pc-btn-compact" onClick={onOpenClinicalScans} data-testid="open-clinical-scans-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
								<Scan size={14} /><span>{isClinicalScansOpen ? "Скрыть снимки КТ / ОПТГ" : "Снимки КТ / ОПТГ и фотопротокол"}</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
