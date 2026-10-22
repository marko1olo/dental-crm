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
		<div className="mb-3 p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50">
			<div className="flex items-center justify-between gap-2 mb-2">
				<span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-indigo-500" />
					Комплексные клинические пакеты:
				</span>
				<button
					type="button"
					onClick={onToggleBundlesExpanded}
					className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
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
						className="flex flex-col items-start p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/30 transition-all text-left group min-h-[48px]"
						title={b.services
							.map(
								(s) =>
									`• [${s.code804n}] ${s.title} (${money(s.priceRub)})`,
							)
							.join("\n")}
					>
						<div className="w-full flex items-center justify-between gap-1">
							<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
								{b.shortLabel}
								{selectedTooth ? ` (зуб ${selectedTooth})` : ""}
							</span>
							<span className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono">
								{money(b.totalPriceRub)}
							</span>
						</div>
						<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full mt-0.5">
							{b.badge}
						</span>
					</button>
				))}
			</div>
		</div>
	);
};
