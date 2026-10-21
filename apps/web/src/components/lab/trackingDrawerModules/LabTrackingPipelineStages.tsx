import React from "react";
import { Check } from "lucide-react";
import { type LabOrderStageKey, LAB_ORDER_STAGES, CANONICAL_5_CLINICAL_LAB_STATUSES, mapTo5StageLabStatus } from "../labMath";

export interface LabTrackingPipelineStagesProps {
	activeStage: LabOrderStageKey;
	currentStageIndex: number;
	handleAdvanceStage: (targetStage?: LabOrderStageKey) => Promise<void> | void;
}

export function LabTrackingPipelineStages({
	activeStage, currentStageIndex, handleAdvanceStage,
}: LabTrackingPipelineStagesProps): React.JSX.Element {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<label className="text-sm font-bold text-[var(--ink)]">Клинические статусы наряда ЗТЛ</label>
				<span className="text-xs text-[var(--muted)]">
					{currentStageIndex >= 0 ? `Этап ${currentStageIndex + 1} из ${LAB_ORDER_STAGES.length}` : "Выберите статус"}
				</span>
			</div>

			{/* 5-Stage Stepper Bar */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2" data-testid="lab-drawer-5stage-stepper">
				<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex justify-between">
					<span>5 этапов клинического трекинга</span>
					<span className="text-[10px] text-[var(--muted)] font-medium">Стандарт лаборатории</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center">
					{CANONICAL_5_CLINICAL_LAB_STATUSES.map((item) => {
						const mappedCurrent = mapTo5StageLabStatus(activeStage);
						const isCurrent = mappedCurrent === item.id;
						const currentStep = CANONICAL_5_CLINICAL_LAB_STATUSES.find((s) => s.id === mappedCurrent)?.step ?? 1;
						const isPassed = currentStep >= item.step;

						return (
							<button
								key={item.id} type="button"
								onClick={() => {
									const map: Record<string, LabOrderStageKey> = { sent: "sent_to_lab", in_progress: "in_progress", fitting: "fitting_scheduled", ready: "delivered_to_clinic", completed: "delivered_completed" };
									if (map[item.id]) handleAdvanceStage(map[item.id]);
								}}
								className={`p-2 sm:p-1.5 rounded-lg border text-center transition-all cursor-pointer min-h-[44px] sm:min-h-[38px] flex flex-col justify-center touch-manipulation ${
									item.step === 5 ? "col-span-2 sm:col-span-1" : ""
								} ${isCurrent ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-xs ring-1 ring-[var(--teal)]" : isPassed ? "bg-[var(--teal-surface)] border-[var(--teal-soft)] text-[var(--teal)] font-semibold" : "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
								data-testid={`drawer-5stage-step-${item.id}`} title={item.descRu}
							>
								<div className="text-[9px] uppercase font-bold tracking-wider">Эт. {item.step}</div>
								<div className="text-[11px] font-bold truncate">{item.shortLabelRu}</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Technological Stages List */}
			<div className="space-y-2">
				{LAB_ORDER_STAGES.map((stage, idx) => {
					const isCurrent = activeStage === stage.id;
					const isPassed = currentStageIndex > idx;

					return (
						<button
							key={stage.id} type="button" onClick={() => handleAdvanceStage(stage.id)}
							className={`w-full min-h-[48px] p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
								isCurrent ? `${stage.color} ring-2 ring-[var(--teal-soft)] shadow-md font-bold` : isPassed ? "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink-2)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-60 hover:opacity-100"
							}`}
						>
							<div className="flex items-center gap-3">
								<div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPassed || isCurrent ? "bg-[var(--teal)] text-white" : "bg-[var(--line)] text-[var(--muted)]"}`}>
									{isPassed ? <Check className="w-4 h-4" /> : stage.step}
								</div>
								<div>
									<div className="text-xs sm:text-sm font-bold text-[var(--ink)]">{stage.name}</div>
									<div className="text-[11px] text-[var(--muted)]">{stage.desc}</div>
								</div>
							</div>
							{isCurrent && <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-sm flex-shrink-0">Текущий</span>}
						</button>
					);
				})}
			</div>
		</div>
	);
}
