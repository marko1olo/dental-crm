import React from "react";
import { Check } from "lucide-react";
import {
	type PediatricAnestheticDrugId,
	PEDIATRIC_ANESTHETIC_SPECS,
} from "./pediatricAnesthesiaSpecs";

interface PediatricAnesthesiaDrugSelectProps {
	readonly selectedDrugId: PediatricAnestheticDrugId;
	readonly onSelectDrugId: (id: PediatricAnestheticDrugId) => void;
	readonly articaineContraindicated: boolean;
	readonly mepivacaineContraindicated: boolean;
}

export const PediatricAnesthesiaDrugSelect: React.FC<PediatricAnesthesiaDrugSelectProps> = ({
	selectedDrugId,
	onSelectDrugId,
	articaineContraindicated,
	mepivacaineContraindicated,
}) => {
	return (
		<div className="mb-3">
			<label className="block text-[11px] font-bold text-[var(--muted,#64748b)] uppercase mb-1.5">
				Препарат местного анестетика:
			</label>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="anesthesia-drug-selector">
				{(["articaine_4", "mepivacaine_3"] as const).map((drugId) => {
					const d = PEDIATRIC_ANESTHETIC_SPECS[drugId];
					const isSelected = selectedDrugId === drugId;
					const isContraindicated =
						(drugId === "articaine_4" && articaineContraindicated) ||
						(drugId === "mepivacaine_3" && mepivacaineContraindicated);
					return (
						<button
							key={drugId}
							type="button"
							onClick={() => onSelectDrugId(drugId)}
							className={`min-h-[44px] sm:min-h-[38px] p-2.5 rounded-xl border text-left transition cursor-pointer select-none active:scale-[0.99] ${
								isSelected
									? "border-teal-600 bg-teal-50/90 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-2 ring-teal-500/30 shadow-xs"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							data-testid={`anesthesia-drug-btn-${drugId}`}
						>
							<div className="flex items-center justify-between gap-1">
								<span className="font-extrabold text-xs">{d.nameRu}</span>
								<div className="flex items-center gap-1">
									{isContraindicated && (
										<span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-700/60">
											Противопоказан
										</span>
									)}
									{isSelected && <Check className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />}
								</div>
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5 flex items-center justify-between">
								<span>{d.tradeNamesRu}</span>
								<span className="font-bold font-mono text-teal-700 dark:text-teal-400">
									макс {d.maxDoseMgPerKg} мг/кг
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
