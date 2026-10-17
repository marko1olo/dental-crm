/**
 * ChairsidePackageHeader.tsx
 * Header selector for the 6 canonical diagnosis packages.
 */

import React from "react";
import { Zap } from "lucide-react";
import { CANONICAL_DIAGNOSIS_BUNDLES, type CanonicalDiagnosisBundle } from "@dental/shared";

interface ChairsidePackageHeaderProps {
	activeBundle: CanonicalDiagnosisBundle;
	selectedTooth: string | null;
	onSelectBundle: (bundle: CanonicalDiagnosisBundle) => void;
}

export const ChairsidePackageHeader: React.FC<ChairsidePackageHeaderProps> = ({
	activeBundle,
	selectedTooth,
	onSelectBundle,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
			<div className="flex items-center gap-2">
				<div className="w-6 h-6 rounded-md bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shrink-0">
					<Zap className="w-3.5 h-3.5" />
				</div>
				<div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
							Готовый чек-лист клинических услуг
						</span>
						<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700">
							{activeBundle.diagnosisIcd10}
						</span>
						{selectedTooth && (
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
								Зуб {selectedTooth}
							</span>
						)}
					</div>
					<div className="text-[11px] text-slate-500 dark:text-slate-400">
						{activeBundle.diagnosisTitle} у кресла без ручного поиска по позициям
					</div>
				</div>
			</div>

			<div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
				{CANONICAL_DIAGNOSIS_BUNDLES.map((b) => {
					const isSelected = b.id === activeBundle.id;
					return (
						<button
							key={b.id}
							type="button"
							onClick={() => onSelectBundle(b)}
							className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 min-h-[32px] sm:min-h-[28px] ${
								isSelected
									? "bg-teal-600 text-white font-bold shadow-2xs"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-300"
							}`}
						>
							{b.diagnosisTitle.split(" ")[0]} ({b.diagnosisIcd10})
						</button>
					);
				})}
			</div>
		</div>
	);
};
