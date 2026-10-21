import React from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { humanizeDentalText } from "@dental/shared";
import type { TreatmentPlanStage } from "../treatmentPlanPresenterTypes.js";
import { isMicroConsumable } from "../../treatmentPlanConsumables.js";
import { TreatmentPlanStageItemRow } from "./TreatmentPlanStageItemRow.js";

export interface TreatmentPlanStageCardItemProps {
	readonly stage: TreatmentPlanStage;
	readonly isExpanded: boolean;
	readonly onToggleStage: (stageNum: number) => void;
	readonly showMicroConsumables: boolean;
}

export const TreatmentPlanStageCardItem: React.FC<TreatmentPlanStageCardItemProps> = ({
	stage,
	isExpanded,
	onToggleStage,
	showMicroConsumables,
}) => {
	const visibleItems = showMicroConsumables
		? stage.items
		: stage.items.filter((it) => !isMicroConsumable(it));

	const isSurgery = /имплант|синус|хирург|удален/i.test(stage.title);
	const isProsthetics = /коронк|протез|винир|циркон|ортопед/i.test(stage.title);
	const isTherapy = /кариес|пульпит|пломб|санаци|гигиен/i.test(stage.title);

	const badgeBg = isSurgery
		? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
		: isProsthetics
			? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
			: isTherapy
				? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
				: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]";

	return (
		<section
			className="treatment-stage-card rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs overflow-hidden transition-all duration-200"
			style={{ willChange: "transform, opacity" }}
		>
			<button
				type="button"
				onClick={() => onToggleStage(stage.stageNumber)}
				className="w-full min-h-[52px] p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 bg-[var(--paper)] hover:bg-[var(--paper-soft)] active:bg-[var(--paper-soft)] transition-colors cursor-pointer border-none"
				aria-expanded={isExpanded}
				aria-controls={`stage-content-${stage.stageNumber}`}
			>
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-full bg-[var(--teal)] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
						{stage.stageNumber}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<h4 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 truncate">
								{stage.title}
							</h4>
							<span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badgeBg}`}>
								{isSurgery ? "Хирургия" : isProsthetics ? "Ортопедия" : "Терапия / Санация"}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
							{humanizeDentalText(stage.clinicalGoal || stage.title)}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3 shrink-0">
					<div className="text-right">
						<div className="text-sm sm:text-base font-extrabold text-[var(--ink)] font-mono">
							{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-[11px] text-[var(--muted)] flex items-center justify-end gap-1">
							<Clock size={12} className="opacity-70" />
							<span>~{stage.estimatedWeeks} нед. ({stage.estimatedVisits} виз.)</span>
						</div>
					</div>

					<div className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
						{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
					</div>
				</div>
			</button>

			{isExpanded && (
				<div
					id={`stage-content-${stage.stageNumber}`}
					className="border-t border-[var(--line-subtle)] bg-[var(--paper-soft)] p-3 sm:p-4 animate-in fade-in-50 duration-150"
				>
					{visibleItems.length === 0 ? (
						<div className="py-4 text-center text-xs text-[var(--muted)]">
							В этом этапе нет активных процедур
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{visibleItems.map((item, idx) => (
								<TreatmentPlanStageItemRow
									key={item.id || `${stage.stageNumber}-${idx}`}
									item={item}
									index={idx}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</section>
	);
};
