import { Activity, Sparkles } from "lucide-react";
import React from "react";
import "../visit/VisitDiagnosticsTab.css";

export type VisiographPresetType = "standard" | "invert" | "endo" | "bone" | "enamel";

export interface VisiographCockpitPresetsProps {
	readonly quickPreset: VisiographPresetType;
	readonly setQuickPreset: (p: VisiographPresetType) => void;
	readonly isStudioMode: boolean;
	readonly onToggleStudio: () => void;
	readonly onOpenApexRuler: () => void;
}

const PRESET_LABELS: Record<VisiographPresetType, string> = {
	standard: "Стандарт",
	invert: "Негатив",
	endo: "Эндо",
	bone: "Кость",
	enamel: "Эмаль",
};

export function VisiographCockpitPresets({
	quickPreset,
	setQuickPreset,
	isStudioMode,
	onToggleStudio,
	onOpenApexRuler,
}: VisiographCockpitPresetsProps) {
	return (
		<div data-tour="mpr-presets" className="flex items-center gap-2 flex-nowrap shrink-0">
			{/* Segmented Control for 5 quick presets */}
			<div className="dente-segmented-bar shrink-0">
				{(["standard", "invert", "endo", "bone", "enamel"] as const).map((p) => {
					const isAct = quickPreset === p;
					return (
						<button
							key={p}
							type="button"
							onClick={() => setQuickPreset(p)}
							className={`dente-segmented-item ${isAct ? "active" : ""}`}
						>
							{PRESET_LABELS[p]}
						</button>
					);
				})}
			</div>

			<div className="w-[1px] h-4 bg-[var(--line)] shrink-0" />

			<button
				type="button"
				data-tour="dicom-ruler"
				onClick={onOpenApexRuler}
				className="diag-btn"
				title="Эндо-линейка (Апекс)"
			>
				<Activity size={14} className="text-[var(--teal)]" />
				<span>Эндо-линейка</span>
			</button>

			<button
				type="button"
				onClick={onToggleStudio}
				title="Инструменты анализа снимка (PACS)"
				className={isStudioMode ? "diag-btn-teal" : "diag-btn"}
			>
				<Sparkles size={14} className={isStudioMode ? "text-white" : "text-[var(--teal)]"} />
				<span>{isStudioMode ? "Закрыть PACS" : "Инструменты"}</span>
			</button>
		</div>
	);
}
