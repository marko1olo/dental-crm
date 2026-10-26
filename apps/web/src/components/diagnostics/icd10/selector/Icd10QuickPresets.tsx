import React from "react";
import { Check } from "lucide-react";
import { ToothCaries } from "../../../icons/DentalIcons";
import {
	TOP_12_AMBULATORY_PRESETS,
	type DentalIcd10Item,
} from "../../icd10DentalCatalog";

interface Icd10QuickPresetsProps {
	selectedCode?: string | null | undefined;
	onSelectDiagnosis: (preset: DentalIcd10Item) => void;
}

export const Icd10QuickPresets: React.FC<Icd10QuickPresetsProps> = ({
	selectedCode,
	onSelectDiagnosis,
}) => {
	return (
		<div className="icd10-quick-presets-section" data-testid="icd10-top12-section">
			<div className="icd10-section-label">
				<ToothCaries size={16} aria-hidden="true" />
				<span>ТОП-12 амбулаторных диагнозов:</span>
			</div>
			<div className="icd10-chips-grid" role="group" aria-label="Быстрый выбор ТОП-12 стоматологических диагнозов">
				{TOP_12_AMBULATORY_PRESETS.map((preset) => {
					const isSelected = selectedCode === preset.code;
					return (
						<button
							key={preset.code}
							type="button"
							className={`min-w-0 icd10-preset-chip ${isSelected ? "is-selected" : ""}`}
							onClick={() => onSelectDiagnosis(preset)}
							data-testid={`top12-preset-${preset.code}`}
							title={`${preset.code} — ${preset.titleRu}`}
						>
							<span className="icd10-chip-code shrink-0">{preset.code}</span>
							<span className="icd10-chip-title truncate min-w-0">{preset.shortTitleRu}</span>
							{isSelected && <Check size={16} color="var(--teal)" aria-hidden="true" className="shrink-0 ml-1" />}
						</button>
					);
				})}
			</div>
		</div>
	);
};
