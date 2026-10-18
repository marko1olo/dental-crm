import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import {
	STAGE_STATUS_META,
	STAGE_SUBTITLES,
	STAGE_TIMELINE_LABELS,
	STAGE_TITLES,
	type CategorizedStageData,
	type PhasedStageStatus,
} from "../types";
import { PhasedStageIcon } from "./PhasedStageIcon";

export interface PhasedStageCardHeaderProps {
	readonly category: TreatmentPlanStageCategory;
	readonly stageIndex: number;
	readonly stageData: CategorizedStageData;
	readonly isExpanded: boolean;
	readonly currentStatus: PhasedStageStatus;
	readonly stageSharePercent: number;
	readonly hasItems: boolean;
	readonly onToggle: () => void;
	readonly onCycleStatus: (e: React.MouseEvent) => void;
}

export const PhasedStageCardHeader: React.FC<PhasedStageCardHeaderProps> = ({
	category,
	stageIndex,
	stageData,
	isExpanded,
	currentStatus,
	stageSharePercent,
	hasItems,
	onToggle,
	onCycleStatus,
}) => {
	const statusBadge = STAGE_STATUS_META[currentStatus];

	return (
		<div
			role="button"
			tabIndex={0}
			aria-expanded={isExpanded}
			onClick={onToggle}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onToggle();
				}
			}}
			className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-[var(--paper-soft)] transition-colors rounded-t-xl cursor-pointer"
		>
			<div className="flex items-center gap-3 min-w-0 flex-1">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--teal)_28%,transparent)] bg-[color-mix(in_srgb,var(--teal)_10%,var(--paper))] text-[var(--teal)]">
					<PhasedStageIcon category={category} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--teal)] border border-[var(--line)]">
							Этап {stageIndex + 1} из 4
						</span>
						<h4 className="text-sm font-bold text-[var(--ink)]">
							{STAGE_TITLES[category] || stageData.meta.shortLabelRu}
						</h4>
						<span className="inline-flex items-center gap-1 rounded-md bg-[var(--paper-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-muted)] border border-[var(--line)]">
							<svg className="w-3 h-3 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							Срок: {STAGE_TIMELINE_LABELS[category]}
						</span>
						<button
							type="button"
							data-testid={`phased-stage-status-${category}`}
							onClick={onCycleStatus}
							title="Нажмите для переключения статуса этапа"
							className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border transition-colors cursor-pointer ${statusBadge.badgeClass}`}
						>
							<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusBadge.dotColor }} />
							{statusBadge.label}
						</button>
					</div>
					<p className="text-xs text-[var(--ink-muted)] mt-0.5">
						{STAGE_SUBTITLES[category]}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="text-right">
					<div className="text-sm font-bold text-[var(--ink)] tabular-nums">
						{stageData.subtotalRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--ink-muted)] tabular-nums">
						{hasItems ? `${stageData.items.length} услуг (${stageSharePercent}% от сметы)` : "Не требуется по показаниям"}
					</div>
				</div>
				<span className={`text-[var(--ink-muted)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
					<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</span>
			</div>
		</div>
	);
};
