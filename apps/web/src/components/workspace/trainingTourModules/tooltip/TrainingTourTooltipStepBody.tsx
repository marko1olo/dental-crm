import React from "react";
import { Award, Crosshair, Zap } from "lucide-react";
import type { QuestStep, QuestTrack } from "../trainingTourTypes";

export interface TrainingTourTooltipStepBodyProps {
	readonly activeTrack: QuestTrack;
	readonly currentStep: QuestStep;
	readonly onFocusTarget: () => void;
}

export function TrainingTourTooltipStepBody({
	activeTrack,
	currentStep,
	onFocusTarget,
}: TrainingTourTooltipStepBodyProps) {
	return (
		<>
			<div className="px-3.5 pt-3 pb-1 flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
						Шаг {currentStep.stepNumber} из {activeTrack.steps.length}
					</span>
					<span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--paper-subtle,#e2e8f0)] text-[var(--muted,#64748b)]">
						{currentStep.badge}
					</span>
				</div>

				{currentStep.rewardBadge && (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
						<Award size={10} />
						<span>{currentStep.rewardBadge}</span>
					</span>
				)}
			</div>

			<div className="px-3.5 py-2 space-y-2.5 text-xs">
				<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
					{currentStep.title}
				</h3>

				<p className="text-[11px] text-[var(--ink-2,var(--ink,#0f172a))] leading-relaxed m-0">
					{currentStep.description}
				</p>

				<div className="p-2 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.06))] border border-[var(--teal-surface,rgba(13,148,136,0.2))] flex items-start gap-2">
					<Zap size={13} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" aria-hidden="true" />
					<p className="text-[10px] text-[var(--muted,#64748b)] leading-normal m-0">
						{currentStep.clinicalTip}
					</p>
				</div>

				<div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted,#64748b)] pt-0.5">
					<span className="font-medium truncate">{currentStep.shortcutBadge}</span>
					<button
						type="button"
						onClick={onFocusTarget}
						className="min-h-[44px] px-2 text-[var(--teal,#0d9488)] hover:underline font-semibold shrink-0 cursor-pointer inline-flex items-center gap-1"
						title="Показать элемент на экране"
					>
						<Crosshair size={12} />
						<span>{currentStep.actionLabel}</span>
					</button>
				</div>
			</div>
		</>
	);
}
