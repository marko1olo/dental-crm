/**
 * VisiographToolbarFilterCluster.tsx
 * 1-Click Chairside Clinical Filter Presets (Канал, Кость, Эмаль, Инверсия).
 */

import { Activity, Contrast, Layers, Sparkles } from "lucide-react";
import React from "react";
import {
	CLINICAL_VISIOGRAPH_FILTERS,
	type ClinicalVisiographFilterPreset,
} from "./VisiographWindowPresets";
import type { VisiographImageParams } from "./VisiographImageProcessor";

export interface VisiographToolbarFilterClusterProps {
	params: VisiographImageParams;
	setParams: React.Dispatch<React.SetStateAction<VisiographImageParams>>;
	activeClinicalFilter: string | null;
	onApplyClinicalFilter: (filter: ClinicalVisiographFilterPreset) => void;
}

export function VisiographToolbarFilterCluster({
	params,
	setParams,
	activeClinicalFilter,
	onApplyClinicalFilter,
}: VisiographToolbarFilterClusterProps) {
	const handleSelectFilterPreset = (presetId: "endodontics" | "bone_periodont" | "caries_enamel") => {
		const preset = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === presetId);
		if (preset) onApplyClinicalFilter(preset);
	};

	const handleToggleInvert = () => {
		setParams((prev) => ({ ...prev, invert: !prev.invert }));
	};

	return (
		<div className="visiograph-toolbar-cluster">
			<button
				type="button"
				className={`secondary-button ${activeClinicalFilter === "endodontics" ? "is-active" : ""}`}
				data-testid="btn-filter-canal"
				onClick={() => handleSelectFilterPreset("endodontics")}
				title="Фильтр корневого канала и апекса (высокая резкость)"
				aria-pressed={activeClinicalFilter === "endodontics"}
			>
				<Activity size={13} aria-hidden="true" />
				<span>Канал</span>
			</button>

			<button
				type="button"
				className={`secondary-button ${activeClinicalFilter === "bone_periodont" ? "is-active" : ""}`}
				data-testid="btn-filter-bone"
				onClick={() => handleSelectFilterPreset("bone_periodont")}
				title="Фильтр кортикальной кости, балок и периодонта"
				aria-pressed={activeClinicalFilter === "bone_periodont"}
			>
				<Layers size={13} aria-hidden="true" />
				<span>Кость</span>
			</button>

			<button
				type="button"
				className={`secondary-button ${activeClinicalFilter === "caries_enamel" ? "is-active" : ""}`}
				data-testid="btn-filter-enamel"
				onClick={() => handleSelectFilterPreset("caries_enamel")}
				title="Контрастирование эмали и пришеечной зоны"
				aria-pressed={activeClinicalFilter === "caries_enamel"}
			>
				<Sparkles size={13} aria-hidden="true" />
				<span>Эмаль</span>
			</button>

			<button
				type="button"
				className={`secondary-button ${params.invert ? "is-active" : ""}`}
				data-testid="btn-tool-invert"
				onClick={handleToggleInvert}
				title="Инверсия (Негатив / Позитив) для выявления микротрещин"
				aria-pressed={Boolean(params.invert)}
			>
				<Contrast size={13} aria-hidden="true" />
				<span>Инверсия</span>
			</button>
		</div>
	);
}
