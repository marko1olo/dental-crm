import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers";
import type { ClinicalServiceBundle } from "./types";

export interface QuickServiceBundlesSectionProps {
	readonly resolvedBundles: readonly ClinicalServiceBundle[];
	readonly bundlesExpanded: boolean;
	readonly onToggleBundlesExpanded: () => void;
	readonly onAddBundle: (bundle: ClinicalServiceBundle) => void;
	readonly selectedTooth: string | null;
}

export const QuickServiceBundlesSection: React.FC<
	QuickServiceBundlesSectionProps
> = ({
	resolvedBundles,
	bundlesExpanded,
	onToggleBundlesExpanded,
	onAddBundle,
	selectedTooth,
}) => {
	return (
		<div className="mb-3 p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex items-center justify-between gap-2 mb-2">
				<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-[var(--primary)]" />
					Комплексные клинические пакеты:
				</span>
				<button
					type="button"
					onClick={onToggleBundlesExpanded}
					className="text-[11px] text-[var(--primary)] hover:underline flex items-center gap-0.5"
				>
					{bundlesExpanded ? "Свернуть" : "Показать все 4 пакета"}
					{bundlesExpanded ? (
						<ChevronUp className="w-3 h-3" />
					) : (
						<ChevronDown className="w-3 h-3" />
					)}
				</button>
			</div>
			<div
				className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 ${
					bundlesExpanded ? "" : "max-h-[120px] overflow-hidden"
				}`}
			>
				{resolvedBundles.map((b) => (
					<button
						key={b.id}
						type="button"
						onClick={() => onAddBundle(b)}
						className="flex flex-col items-start p-2 rounded-md bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)] transition-all text-left group min-h-[48px]"
						title={b.services
							.map(
								(s) =>
									`• ${s.title} (${money(s.priceRub)})`,
							)
							.join("\n")}
					>
						<div className="w-full flex items-center justify-between gap-1">
							<span className="text-xs font-medium text-[var(--ink)] group-hover:text-[var(--primary)]">
								{b.shortLabel}
								{selectedTooth ? ` (зуб ${selectedTooth})` : ""}
							</span>
							<span className="text-xs font-semibold text-[var(--ink)] font-mono">
								{money(b.totalPriceRub)}
							</span>
						</div>
						<span className="text-[10px] text-[var(--ink-muted)] truncate max-w-full mt-0.5">
							{b.badge}
						</span>
					</button>
				))}
			</div>
		</div>
	);
};
