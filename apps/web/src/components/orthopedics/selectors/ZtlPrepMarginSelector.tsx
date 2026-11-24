import React from "react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import { PREPARATION_MARGIN_PRESETS } from "../orthopedicCatalogData.js";

export interface ZtlPrepMarginSelectorProps {
	readonly preparationMargin: string;
	readonly onSelectPreparationMargin: (marginId: string, marginLabel: string) => void;
}

export function ZtlPrepMarginSelector({
	preparationMargin,
	onSelectPreparationMargin,
}: ZtlPrepMarginSelectorProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden" data-testid="prep-margin-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<DentalCrown size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Граница препарирования:
					</span>
				</div>
				<span className="text-[11px] text-[var(--ink-muted)] truncate">
					Тип уступа для прецизионного прилегания
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
				{PREPARATION_MARGIN_PRESETS.map((margin) => {
					const isSelected = preparationMargin === margin.id;
					return (
						<button
							key={margin.id}
							type="button"
							onClick={() => onSelectPreparationMargin(margin.id, margin.labelRu)}
							className={`min-h-[48px] p-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 ${
								isSelected
									? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] ring-1 ring-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
							}`}
							data-testid={`prep-margin-${margin.id}`}
							title={margin.description}
						>
							<span className="text-xs font-bold text-[var(--ink)] leading-snug truncate">
								{margin.labelRu}
							</span>
							<span className="text-[11px] text-[var(--ink-muted)] font-mono leading-tight mt-1">
								{margin.shortBadge}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
