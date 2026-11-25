import React, { memo } from "react";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { CheckCircle2, Clock, FileText, Sparkles } from "lucide-react";

export interface TreatmentStage {
	readonly id: string;
	readonly title: string;
	readonly costRub: number;
	readonly status: "completed" | "in_progress" | "pending";
}

export interface PatientTreatmentPlan {
	readonly id: string;
	readonly title: string;
	readonly totalCostRub: number;
	readonly paidCostRub: number;
	readonly status: "approved" | "pending_approval" | "completed";
	readonly stages: readonly TreatmentStage[];
}

export interface CabinetTreatmentPlansTabProps {
	readonly plans?: readonly PatientTreatmentPlan[];
	readonly onApprovePlan?: (planId: string) => void;
	readonly onTriggerHaptic?: (style?: "light" | "medium" | "heavy") => void;
}

function computePlanFinanceMetrics(plan: PatientTreatmentPlan) {
	const totalKop = rublesToKopecks(plan.totalCostRub);
	const paidKop = rublesToKopecks(plan.paidCostRub);
	const remainingRub = kopecksToRubles(Math.max(0, totalKop - paidKop));
	const progressPercent = totalKop > 0 ? Math.min(100, Math.round((paidKop * 1000) / totalKop / 10)) : 0;
	return { remainingRub, progressPercent };
}

export const CabinetTreatmentPlansTab: React.FC<CabinetTreatmentPlansTabProps> = memo(({
	plans = [],
	onApprovePlan,
	onTriggerHaptic,
}) => (
	<main className="tg-tab-content">
		<div className="tg-section-header">
			<div>
				<h2 className="tg-section-title">Планы лечения и смета</h2>
				<p className="tg-section-desc">Согласованные клинические этапы, прогресс и прозрачные расчеты</p>
			</div>
		</div>

		{plans.length === 0 ? (
			<div className="tg-empty-card">
				<FileText size={32} className="text-[var(--ink-muted)] mb-2" />
				<div className="text-sm font-semibold text-[var(--ink)]">Нет активных планов лечения</div>
				<div className="text-xs text-[var(--ink-muted)] mt-1">После комплексной консультации лечащий врач составит пошаговый план</div>
			</div>
		) : (
			<div className="tg-card-list">
				{plans.map((plan) => {
					const { remainingRub, progressPercent } = computePlanFinanceMetrics(plan);
					const badgeCls = plan.status === "approved" ? "tg-badge-confirmed" : plan.status === "completed" ? "tg-badge-completed" : "tg-badge-pending";
					const badgeText = plan.status === "approved" ? "Согласован" : plan.status === "completed" ? "Завершён" : "На согласовании";

					return (
						<div key={plan.id} className="tg-grouped-card p-4 space-y-3">
							<div className="flex items-center justify-between gap-2">
								<div className="text-sm font-semibold text-[var(--ink)]">{plan.title}</div>
								<span className={`tg-status-badge ${badgeCls}`}>{badgeText}</span>
							</div>

							<div>
								<div className="flex justify-between text-xs text-[var(--ink-muted)] mb-1">
									<span>Выполнено: {progressPercent}%</span>
									<span className="font-mono tracking-tight tabular-nums">Остаток: {remainingRub.toLocaleString("ru-RU")} ₽</span>
								</div>
								<div className="w-full h-2 bg-[var(--paper-soft)] rounded-full overflow-hidden">
									<div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
								</div>
							</div>

							<div className="space-y-2 pt-2 border-t border-[var(--line)]">
								{plan.stages.map((stage) => (
									<div key={stage.id} className="flex items-center justify-between text-xs py-1">
										<div className="flex items-center gap-2">
											{stage.status === "completed" ? (
												<CheckCircle2 size={14} className="text-[var(--primary)] shrink-0" />
											) : stage.status === "in_progress" ? (
												<Clock size={14} className="text-[var(--warning)] shrink-0" />
											) : (
												<span className="w-3.5 h-3.5 rounded-full border border-[var(--line)] inline-block shrink-0" />
											)}
											<span className="text-[var(--ink)]">{stage.title}</span>
										</div>
										<span className="font-mono tracking-tight font-medium text-right tabular-nums text-[var(--ink-muted)]">{stage.costRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								))}
							</div>

							{plan.status === "pending_approval" && onApprovePlan && (
								<button
									type="button"
									className="tg-cta-button mt-2"
									onClick={() => {
										onApprovePlan(plan.id);
										onTriggerHaptic?.("medium");
									}}
								>
									<Sparkles className="w-4 h-4 shrink-0" />
									<span>Согласовать план лечения</span>
								</button>
							)}
						</div>
					);
				})}
			</div>
		)}
	</main>
));

CabinetTreatmentPlansTab.displayName = "CabinetTreatmentPlansTab";
