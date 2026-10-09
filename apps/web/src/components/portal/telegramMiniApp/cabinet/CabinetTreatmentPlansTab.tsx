import React, { memo } from "react";
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

export const CabinetTreatmentPlansTab: React.FC<CabinetTreatmentPlansTabProps> = memo(({
	plans = [],
	onApprovePlan,
	onTriggerHaptic,
}) => {
	return (
		<main className="tg-tab-content">
			<div className="tg-section-header">
				<div>
					<h2 className="tg-section-title">Планы лечения & Смета</h2>
					<p className="tg-section-desc">
						Согласованные клинические этапы, прогресс и прозрачные расчеты
					</p>
				</div>
			</div>

			{plans.length === 0 ? (
				<div className="tg-empty-card">
					<FileText size={32} className="text-slate-400 mb-2" />
					<div className="text-sm font-bold">Нет активных планов лечения</div>
					<div className="text-xs text-slate-400 mt-1">
						После комплексной консультации лечащий врач составит пошаговый план
					</div>
				</div>
			) : (
				<div className="tg-card-list">
					{plans.map((plan) => {
						const remainingRub = Math.max(0, plan.totalCostRub - plan.paidCostRub);
						const progressPercent = plan.totalCostRub > 0
							? Math.round((plan.paidCostRub / plan.totalCostRub) * 100)
							: 0;

						return (
							<div key={plan.id} className="tg-grouped-card p-4 space-y-3">
								<div className="flex items-center justify-between">
									<div className="text-sm font-bold text-slate-100">{plan.title}</div>
									<span
										className={`tg-status-badge ${
											plan.status === "approved"
												? "tg-badge-confirmed"
												: plan.status === "completed"
												? "tg-badge-completed"
												: "tg-badge-pending"
										}`}
									>
										{plan.status === "approved"
											? "Согласован"
											: plan.status === "completed"
											? "Завершён"
											: "На согласовании"}
									</span>
								</div>

								{/* Прогресс оплаты */}
								<div>
									<div className="flex justify-between text-xs text-slate-400 mb-1">
										<span>Выполнено: {progressPercent}%</span>
										<span>Остаток: {remainingRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
										<div
											className="h-full bg-teal-500 rounded-full transition-all"
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
								</div>

								{/* Список этапов */}
								<div className="space-y-2 pt-2 border-t border-slate-800">
									{plan.stages.map((stage) => (
										<div
											key={stage.id}
											className="flex items-center justify-between text-xs py-1"
										>
											<div className="flex items-center gap-2">
												{stage.status === "completed" ? (
													<CheckCircle2 size={14} className="text-teal-400" />
												) : stage.status === "in_progress" ? (
													<Clock size={14} className="text-amber-400" />
												) : (
													<span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />
												)}
												<span className="text-slate-200">{stage.title}</span>
											</div>
											<span className="font-bold text-slate-300">
												{stage.costRub.toLocaleString("ru-RU")} ₽
											</span>
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
										<Sparkles size={16} />
										<span>Согласовать план лечения</span>
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}
		</main>
	);
});

CabinetTreatmentPlansTab.displayName = "CabinetTreatmentPlansTab";
