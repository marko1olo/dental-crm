import React from "react";
import { Layers, Zap } from "lucide-react";
import {
	type PatientBillingPlanStage,
	type PatientBillingTreatmentPlan,
} from "./PatientBillingFriendlyTab";

export interface PatientBillingPlanStagePanelProps {
	readonly planStages: readonly PatientBillingPlanStage[];
	readonly activeTreatmentPlan?: PatientBillingTreatmentPlan | undefined;
	readonly initialServicesCount: number;
	readonly isStageApplied: boolean;
	readonly onSetIsStageApplied: (val: boolean) => void;
	readonly selectedStage: PatientBillingPlanStage | null;
	readonly getStageAmountRub: (stg: PatientBillingPlanStage | null | undefined) => number;
	readonly onSelectPlanStage: (stg: PatientBillingPlanStage) => void;
	readonly onTenderPlanStage: (stg: PatientBillingPlanStage | null) => void;
}

export const PatientBillingPlanStagePanel: React.FC<PatientBillingPlanStagePanelProps> = ({
	planStages,
	activeTreatmentPlan,
	initialServicesCount,
	isStageApplied,
	onSetIsStageApplied,
	selectedStage,
	getStageAmountRub,
	onSelectPlanStage,
	onTenderPlanStage,
}) => {
	if (planStages.length === 0) return null;

	return (
		<div
			className="p-4 rounded-2xl border-2 border-indigo-500/40 bg-indigo-500/5 space-y-3"
			data-testid="patient-billing-plan-stage-panel"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
					<div>
						<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] m-0 uppercase tracking-wider">
							Оплата этапа плана лечения {activeTreatmentPlan?.planNumber ? `№ ${activeTreatmentPlan.planNumber}` : ""}
						</h4>
						{activeTreatmentPlan?.title && (
							<p className="text-[11px] text-[var(--muted)] m-0">
								{activeTreatmentPlan.title}
							</p>
						)}
					</div>
				</div>

				{initialServicesCount > 0 && (
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => onSetIsStageApplied(false)}
							className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								!isStageApplied
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
							}`}
						>
							Услуги визита ({initialServicesCount})
						</button>
						<button
							type="button"
							onClick={() => onSetIsStageApplied(true)}
							className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								isStageApplied
									? "bg-indigo-600 text-white shadow-xs"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
							}`}
						>
							Этап плана
						</button>
					</div>
				)}
			</div>

			{/* Список этапов */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
				{planStages.map((stg, idx) => {
					const isSelected = isStageApplied && (selectedStage?.id === stg.id);
					const amt = getStageAmountRub(stg);
					return (
						<button
							key={stg.id || idx}
							type="button"
							onClick={() => onSelectPlanStage(stg)}
							className={`min-h-[44px] p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs border ${
								isSelected
									? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-400"
									: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
							}`}
							data-testid={`plan-stage-item-${stg.id}`}
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
										Этап {stg.stageNumber ?? idx + 1}
									</span>
									{stg.status && (
										<span className="text-[10px] text-[var(--muted)]">
											{stg.status}
										</span>
									)}
								</div>
								<div className="text-xs font-bold text-[var(--ink)] truncate mt-0.5">
									{stg.titleRu ?? stg.title ?? `Этап ${stg.stageNumber ?? idx + 1}`}
								</div>
							</div>
							<div className="text-right shrink-0">
								<span className="text-xs sm:text-sm font-extrabold font-mono text-[var(--ink)]">
									{amt.toLocaleString("ru-RU")} ₽
								</span>
							</div>
						</button>
					);
				})}
			</div>

			{/* 1-клик кнопка оплаты выбранного этапа */}
			<div className="pt-1 flex items-center justify-between flex-wrap gap-2">
				<div className="text-xs text-[var(--muted)]">
					{isStageApplied && selectedStage ? (
						<span>
							К оплате выбран: <strong className="text-[var(--ink)]">{selectedStage.titleRu ?? selectedStage.title ?? `Этап ${selectedStage.stageNumber ?? 1}`}</strong> ({getStageAmountRub(selectedStage).toLocaleString("ru-RU")} ₽)
						</span>
					) : (
						<span>Выберите этап для подстановки суммы в чек</span>
					)}
				</div>
				<button
					type="button"
					onClick={() => onTenderPlanStage(selectedStage)}
					className="min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
					data-testid="btn-tender-plan-stage"
					title="Оплатить выбранный этап плана лечения"
				>
					<Zap className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
					<span>
						Оплатить этап • {getStageAmountRub(selectedStage).toLocaleString("ru-RU")} ₽
					</span>
				</button>
			</div>
		</div>
	);
};
