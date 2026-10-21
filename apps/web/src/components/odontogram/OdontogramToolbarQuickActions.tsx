/**
 * DENTE Dental CRM — Odontogram Toolbar Quick Actions Dropdown
 * Provides batch quadrant selection, jaw/occlusion launchers, and intact dentition shortcuts.
 */

import { ChevronDown, Layers } from "lucide-react";
import React from "react";
import { TOOTH_STATE_LABELS } from "./chart/toothChartTypes";
import { QuickActionsBatchOps } from "./QuickActionsBatchOps";
import { QuickActionsJaws } from "./QuickActionsJaws";
import { QuickActionsQuadrants } from "./QuickActionsQuadrants";
import type { OdontogramToolbarQuickActionsProps } from "./quickActionsTypes";
import { useQuickActionsHandlers } from "./useQuickActionsHandlers";

export type { OdontogramToolbarQuickActionsProps };

export const OdontogramToolbarQuickActions: React.FC<OdontogramToolbarQuickActionsProps> =
	React.memo((props) => {
		const allDentitionTeeth = props.isPediatricEffective
			? [
					...props.PEDIATRIC_Q5,
					...props.PEDIATRIC_Q6,
					...props.PEDIATRIC_Q7,
					...props.PEDIATRIC_Q8,
				]
			: [
					...props.ADULT_Q1,
					...props.ADULT_Q2,
					...props.ADULT_Q3,
					...props.ADULT_Q4,
				];

		const handlers = useQuickActionsHandlers({
			allDentitionTeeth,
			activeStampTool: props.activeStampTool,
			selectedTeeth: props.selectedTeeth,
			onQuickStateChange: props.onQuickStateChange,
			handleMarkIntactDentition: props.handleMarkIntactDentition,
			handleMarkWisdomTeethMissing: props.handleMarkWisdomTeethMissing,
			handleBatchSelectGroup: props.handleBatchSelectGroup,
			onInvertSelection: props.onInvertSelection,
			onClearSelection: props.onClearSelection,
		});

		const stampHint = props.activeStampTool
			? ` (Штамп «${TOOTH_STATE_LABELS[props.activeStampTool] || props.activeStampTool}» окрасит всю группу)`
			: "";

		return (
			<details className="relative shrink-0">
				<summary
					className="list-none odontogram-tools-trigger-btn"
					title="Выделение квадрантов, челюстей, инверсия и санация"
					data-testid="odontogram-quick-actions-menu"
				>
					<Layers size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="hidden sm:inline font-bold">Выделение</span>
					<ChevronDown
						size={13}
						className="shrink-0 text-[var(--muted,#64748b)]"
					/>
				</summary>
				<div className="absolute right-0 top-full mt-1.5 z-40 w-72 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2">
					{props.onQuickStateChange && (
						<QuickActionsBatchOps
							pediatricMode={props.pediatricMode}
							onSanitizeAll={handlers.handleSanitizeAll}
							onWisdomMissing={handlers.handleWisdomMissing}
							onInvert={handlers.handleInvert}
							onClear={handlers.handleClear}
						/>
					)}
					<QuickActionsQuadrants
						isPediatricEffective={props.isPediatricEffective}
						activeStampTool={props.activeStampTool}
						stampHint={stampHint}
						onGroupAction={handlers.handleGroupAction}
						ADULT_Q1={props.ADULT_Q1}
						ADULT_Q2={props.ADULT_Q2}
						ADULT_Q3={props.ADULT_Q3}
						ADULT_Q4={props.ADULT_Q4}
						ADULT_FRONT={props.ADULT_FRONT}
						PEDIATRIC_Q5={props.PEDIATRIC_Q5}
						PEDIATRIC_Q6={props.PEDIATRIC_Q6}
						PEDIATRIC_Q7={props.PEDIATRIC_Q7}
						PEDIATRIC_Q8={props.PEDIATRIC_Q8}
						PEDIATRIC_FRONT={props.PEDIATRIC_FRONT}
					/>
					<QuickActionsJaws onSelectJaw={props.setActiveJawModalTarget} />
				</div>
			</details>
		);
	});
OdontogramToolbarQuickActions.displayName = "OdontogramToolbarQuickActions";
