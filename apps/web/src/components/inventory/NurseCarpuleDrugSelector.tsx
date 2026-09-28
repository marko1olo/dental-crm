import { Syringe } from "lucide-react";
import React from "react";
import { COMMON_ANESTHETICS } from "./carpuleDisposalConstants.js";
import { getFefoTrafficLight } from "./fefoTrafficLight.js";

export interface NurseCarpuleDrugSelectorProps {
	readonly selectedDrugId: string;
	readonly onSelectDrugId: (id: string) => void;
	readonly dateIso: string;
}

export const NurseCarpuleDrugSelector: React.FC<
	NurseCarpuleDrugSelectorProps
> = ({ selectedDrugId, onSelectDrugId, dateIso }) => {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<label
					htmlFor="nurse-anes-select"
					className="block text-xs font-semibold text-[var(--muted,#64748b)]"
				>
					Наименование анестетика
				</label>
				<span className="text-[11px] text-[var(--muted,#64748b)]">
					1 клик выбор (Закон Хика + FEFO)
				</span>
			</div>

			{/* 1-ROW COMPACT PRESET CHIPS STRIP (HEIGHT 34px - HICK'S LAW 32-36px) */}
			<div
				className="nurse-carpule-filter-toolbar h-[34px] flex items-center gap-1.5 overflow-x-auto no-scrollbar"
				role="tablist"
				aria-label="Быстрый выбор анестетика"
			>
				{[
					{ id: "articaine_100k", label: "Ультракаин Форте (1:100к)" },
					{ id: "articaine_200k", label: "Ультракаин Д-С (1:200к)" },
					{ id: "mepivacaine_3", label: "Скандонест 3% (без адреналина)" },
					{ id: "septanest_100k", label: "Септанест (1:100к)" },
				].map((chip) => {
					const isSelected = selectedDrugId === chip.id;
					const chipDrug = COMMON_ANESTHETICS.find((d) => d.id === chip.id);
					const chipFefo = getFefoTrafficLight(chipDrug?.defaultExp, dateIso);
					return (
						<button
							key={chip.id}
							type="button"
							role="tab"
							aria-selected={isSelected}
							data-fefo-status={chipFefo.status}
							onClick={() => onSelectDrugId(chip.id)}
							className={`nurse-carpule-filter-chip h-[34px] px-3 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 min-w-0 cursor-pointer ${
								isSelected
									? "bg-teal-600 border-teal-600 text-white shadow-xs"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-teal-500/40"
							}`}
						>
							<span
								className="w-2 h-2 rounded-full shrink-0"
								style={{ backgroundColor: chipFefo.dotColor }}
								data-fefo-dot={chipFefo.status}
								aria-hidden="true"
							/>
							<Syringe
								size={13}
								className={
									isSelected
										? "text-white shrink-0"
										: "text-teal-600 dark:text-teal-400 shrink-0"
								}
							/>
							<span className="truncate">{chip.label}</span>
						</button>
					);
				})}
			</div>

			{/* DETAILED SELECT WITH LOT AND EXPIRATION */}
			<select
				id="nurse-anes-select"
				value={selectedDrugId}
				onChange={(e) => onSelectDrugId(e.target.value)}
				className="w-full h-9 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
			>
				{COMMON_ANESTHETICS.map((drug) => {
					const fefo = getFefoTrafficLight(drug.defaultExp, dateIso);
					return (
						<option key={drug.id} value={drug.id}>
							{`[FEFO: ${fefo.badgeText}] ${drug.nameRu} (серия: ${drug.defaultSeries}, годен до ${drug.defaultExp})`}
						</option>
					);
				})}
			</select>
		</div>
	);
};
