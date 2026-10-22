import React from "react";
import { MEDICAL_REFUSAL_COMPLICATIONS_PRESET } from "@dental/shared";
import { Activity, Zap } from "lucide-react";

interface RefusalPresetItem {
	readonly refusedIntervention: string;
	readonly clinicalIndication: string;
	readonly explainedRisks: readonly string[];
	readonly alternativesOffered: readonly string[];
	readonly urgentWarningSigns: readonly string[];
}

interface RefusalPresetsBarProps {
	onSelectPreset: (preset: RefusalPresetItem) => void;
}

export const RefusalPresetsBar: React.FC<RefusalPresetsBarProps> = ({ onSelectPreset }) => (
	<div style={{ marginBottom: "8px" }}>
		<span style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
			<Zap size={13} className="text-amber-500 shrink-0" aria-hidden="true" />
			<span>Клинические осложнения при отказе:</span>
		</span>
		<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
			<button
				type="button"
				className="secondary-button inline-flex items-center gap-1"
				style={{ fontSize: "11.5px", padding: "3px 8px" }}
				onClick={() => onSelectPreset(MEDICAL_REFUSAL_COMPLICATIONS_PRESET.caries_endo_refusal)}
			>
				<Activity size={12} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
				<span>Отказ от терапии/эндодонтии</span>
			</button>
			<button
				type="button"
				className="secondary-button"
				style={{ fontSize: "11.5px", padding: "3px 8px" }}
				onClick={() => onSelectPreset(MEDICAL_REFUSAL_COMPLICATIONS_PRESET.surgery_extraction_refusal)}
			>
				Отказ от удаления/хирургии
			</button>
			<button
				type="button"
				className="secondary-button"
				style={{ fontSize: "11.5px", padding: "3px 8px" }}
				onClick={() => onSelectPreset(MEDICAL_REFUSAL_COMPLICATIONS_PRESET.prosthetics_implant_refusal)}
			>
				Отказ от протезирования/имплантации
			</button>
			<button
				type="button"
				className="secondary-button"
				style={{ fontSize: "11.5px", padding: "3px 8px" }}
				onClick={() => onSelectPreset(MEDICAL_REFUSAL_COMPLICATIONS_PRESET.anesthesia_refusal)}
			>
				Отказ от анестезии
			</button>
			<button
				type="button"
				className="secondary-button"
				style={{ fontSize: "11.5px", padding: "3px 8px" }}
				onClick={() => onSelectPreset(MEDICAL_REFUSAL_COMPLICATIONS_PRESET.orthodontics_refusal)}
			>
				Отказ от ортодонтии
			</button>
		</div>
	</div>
);
