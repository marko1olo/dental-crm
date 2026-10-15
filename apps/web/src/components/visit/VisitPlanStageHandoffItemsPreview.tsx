import React from "react";
import { Tag } from "lucide-react";

export interface VisitPlanStageHandoffItemsPreviewProps {
	readonly selectedItems: readonly any[];
}

export const VisitPlanStageHandoffItemsPreview: React.FC<VisitPlanStageHandoffItemsPreviewProps> = ({
	selectedItems,
}) => {
	if (selectedItems.length === 0) return null;

	return (
		<div
			data-testid="handoff-stage-items-preview"
			className="text-[11px] text-[var(--muted,#64748b)] bg-[var(--paper,#ffffff)]/60 dark:bg-[var(--paper-soft,#1e293b)]/40 p-2 rounded-lg border border-[var(--teal,#0d9488)]/15 flex items-center gap-1.5 flex-wrap"
		>
			<span className="font-semibold text-[var(--ink,#0f172a)] shrink-0 flex items-center gap-1">
				<Tag size={11} className="text-[var(--teal,#0d9488)]" />
				<span>Включает:</span>
			</span>
			{selectedItems.slice(0, 4).map((it, idx) => {
				const tooth = it.toothNumber || it.toothCode ? ` (зуб ${it.toothNumber || it.toothCode})` : "";
				const title = it.name || it.title || it.medicalTitleRu || it.priceId || "Услуга";
				return (
					<span
						key={it.id || idx}
						className="px-1.5 py-0.5 rounded bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line-subtle,#e2e8f0)] text-[10px] text-[var(--ink,#0f172a)]"
					>
						{title}
						{tooth}
					</span>
				);
			})}
			{selectedItems.length > 4 && (
				<span className="text-[10px] text-[var(--muted,#94a3b8)]">
					+ ещё {selectedItems.length - 4}
				</span>
			)}
		</div>
	);
};
