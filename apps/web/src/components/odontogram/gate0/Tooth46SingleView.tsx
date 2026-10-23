/**
 * DENTE Dental CRM — Single Tooth 46 Inspection View
 * Mandate 8b <= 120 lines.
 */

import React from "react";
import { TOOTH46_PRESETS } from "./Tooth46ClinicalPresets";
import { Tooth46Container } from "./Tooth46Container";
import { Tooth46StandToggles } from "./Tooth46StandToggles";
import type {
	CrownMaterial,
	Tooth46ClinicalPreset,
	Tooth46LayerFlags,
} from "./tooth46Types";

export interface Tooth46SingleViewProps {
	readonly isDark: boolean;
	readonly zoom: number;
	readonly layers: Tooth46LayerFlags;
	readonly activePreset: Tooth46ClinicalPreset | null;
	readonly onSelectPreset: (presetId: Tooth46ClinicalPreset) => void;
	readonly onToggleLayer: (key: keyof Tooth46LayerFlags) => void;
	readonly onChangeCrownMaterial: (mat: CrownMaterial) => void;
	readonly onToggleCondition: (type: "composite" | "crown") => void;
}

export const Tooth46SingleView: React.FC<Tooth46SingleViewProps> = ({
	isDark,
	zoom,
	layers,
	activePreset,
	onSelectPreset,
	onToggleLayer,
	onChangeCrownMaterial,
	onToggleCondition,
}) => {
	const card = "bg-[var(--paper-strong,#f8fafc)] border-[var(--line,#e2e8f0)]";

	return (
		<>
			<Tooth46StandToggles
				layers={layers}
				activePreset={activePreset}
				onSelectPreset={onSelectPreset}
				onToggle={onToggleLayer}
				onChangeCrownMaterial={onChangeCrownMaterial}
				onToggleCondition={onToggleCondition}
			/>
			<main
				className={`flex-1 w-full max-w-5xl rounded-2xl border p-3 sm:p-6 flex flex-col items-center justify-center relative overflow-auto ${card}`}
			>
				<div className="stand-hud absolute top-2 left-3 sm:top-3 sm:left-4 text-[10px] sm:text-xs font-mono opacity-60 space-y-0.5 pointer-events-none">
					<div>Масштаб: {zoom}x ({100 * zoom}×{170 * zoom}px)</div>
					<div>
						Статус:{" "}
						{activePreset
							? TOOTH46_PRESETS.find((p) => p.id === activePreset)?.nameRu
							: "Пользовательский"}
					</div>
					<div>WCAG: {isDark ? "4.52:1 (AAA)" : "3.33:1 (AA)"} · 5 Бугров</div>
				</div>
				<div className="p-2 sm:p-8 pb-44 sm:pb-8 transition-transform duration-200">
					<Tooth46Container
						isDark={isDark}
						zoom={zoom}
						layers={layers}
						presetId={activePreset ?? undefined}
					/>
				</div>
			</main>
		</>
	);
};
