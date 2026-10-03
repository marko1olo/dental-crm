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
		<div data-tour="mpr-presets" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
			{/* Segmented Control for 5 quick presets */}
			<div
				style={{
					display: "inline-flex",
					alignItems: "center",
					background: "var(--paper)",
					padding: "2px",
					borderRadius: "6px",
					border: "1px solid var(--line)",
					gap: "2px",
				}}
			>
				{(["standard", "invert", "endo", "bone", "enamel"] as const).map((p) => {
					const isAct = quickPreset === p;
					return (
						<button
							key={p}
							type="button"
							onClick={() => setQuickPreset(p)}
							style={{
								height: "26px",
								minHeight: "26px",
								padding: "0 8px",
								borderRadius: "4px",
								fontSize: "0.75rem",
								fontWeight: isAct ? 700 : 500,
								background: isAct ? "var(--teal)" : "transparent",
								color: isAct ? "var(--on-teal, white)" : "var(--ink)",
								border: "none",
								cursor: "pointer",
								whiteSpace: "nowrap",
								transition: "all 0.15s ease",
							}}
						>
							{PRESET_LABELS[p]}
						</button>
					);
				})}
			</div>

			<div style={{ width: 1, height: 18, background: "var(--line)", margin: "0 1px" }} />

			<button
				type="button"
				data-tour="dicom-ruler"
				onClick={onOpenApexRuler}
				style={{
					height: "30px",
					minHeight: "30px",
					padding: "0 9px",
					borderRadius: "6px",
					fontSize: "0.78rem",
					fontWeight: 600,
					background: "rgba(16, 185, 129, 0.12)",
					color: "#059669",
					border: "1px solid rgba(16, 185, 129, 0.4)",
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
				}}
			>
				<Activity size={13} />
				<span>Эндо-линейка (Апекс)</span>
			</button>

			<button
				type="button"
				onClick={onToggleStudio}
				style={{
					height: "30px",
					minHeight: "30px",
					padding: "0 9px",
					background: isStudioMode ? "var(--teal)" : "transparent",
					color: isStudioMode ? "var(--on-teal, white)" : "var(--ink)",
					border: `1px solid ${isStudioMode ? "var(--teal)" : "var(--line)"}`,
					borderRadius: "6px",
					fontSize: "0.78rem",
					fontWeight: 600,
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
				}}
			>
				<Sparkles size={13} />
				<span>{isStudioMode ? "Закрыть PACS" : "Инструменты (PACS)"}</span>
			</button>
		</div>
	);
}
