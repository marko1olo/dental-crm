import React from "react";
import { CLINICAL_SOAP_PRESETS } from "../clinicalSoapPresets";

export interface ClinicalPresetsModeTabsProps {
	readonly presetViewMode: "specialty" | "express" | "all";
	readonly onSelectMode: (mode: "specialty" | "express" | "all") => void;
}

export const ClinicalPresetsModeTabs: React.FC<ClinicalPresetsModeTabsProps> = ({
	presetViewMode,
	onSelectMode,
}) => {
	const tabClass = (mode: string) =>
		`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
			presetViewMode === mode
				? "border-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal-dark,var(--teal,#0f766e))]"
				: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
		}`;

	return (
		<div
			className="hidden md:inline-flex items-center gap-1.5 py-0.5"
			role="tablist"
			aria-label="Режим отображения клинических протоколов"
			data-testid="presets-view-mode-segmented-bar"
		>
			<button
				type="button"
				role="tab"
				aria-selected={presetViewMode === "specialty"}
				onClick={() => onSelectMode("specialty")}
				className={tabClass("specialty")}
				data-active={presetViewMode === "specialty"}
				data-testid="btn-mode-specialty"
			>
				По специальностям
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={presetViewMode === "express"}
				onClick={() => onSelectMode("express")}
				className={tabClass("express")}
				data-active={presetViewMode === "express"}
				data-testid="btn-mode-express"
			>
				Экспресс-сценарии
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={presetViewMode === "all"}
				onClick={() => onSelectMode("all")}
				className={tabClass("all")}
				data-active={presetViewMode === "all"}
				data-testid="btn-mode-all"
			>
				Экспресс-шаблоны SOAP ({CLINICAL_SOAP_PRESETS.length})
			</button>
		</div>
	);
};
