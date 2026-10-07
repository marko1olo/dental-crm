import { Activity, Sparkles } from "lucide-react";
import React from "react";

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
				className="h-8 px-3 rounded-lg text-[13px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer inline-flex items-center gap-1.5 transition-colors shrink-0"
			>
				<Activity size={14} />
				<span>Эндо-линейка (Апекс)</span>
			</button>

			<button
				type="button"
				onClick={onToggleStudio}
				className={`h-8 px-3 rounded-lg text-[13px] font-medium border cursor-pointer inline-flex items-center gap-1.5 transition-colors shrink-0 ${
					isStudioMode
						? "bg-[var(--teal)] text-[var(--on-teal,white)] border-[var(--teal)] font-semibold"
						: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-hover)]"
				}`}
			>
				<Sparkles size={14} />
				<span>{isStudioMode ? "Закрыть PACS" : "Инструменты (PACS)"}</span>
			</button>
		</div>
	);
}
