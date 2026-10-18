/**
 * apps/web/src/components/sanpin/kraft/KraftToolSetSelector.tsx
 *
 * Селектор пресетов крафт-пакетов (СанПиН 3.3686-21).
 * Фасад для popularKraftPresets.ts.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { POPULAR_KRAFT_PRESETS, type QuickKraftPreset } from "./popularKraftPresets";

export { POPULAR_KRAFT_PRESETS, type QuickKraftPreset };

export interface KraftToolSetSelectorProps {
	readonly selectedPresetId?: string | undefined;
	readonly onSelectPreset: (preset: QuickKraftPreset) => void;
}

export const KraftToolSetSelector: React.FC<KraftToolSetSelectorProps> = ({
	selectedPresetId,
	onSelectPreset,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
			{POPULAR_KRAFT_PRESETS.map((p) => {
				const isSelected = p.id === selectedPresetId;
				return (
					<button
						key={p.id}
						type="button"
						onClick={() => onSelectPreset(p)}
						className={`p-2.5 rounded-xl border text-left transition-all ${
							isSelected
								? "border-[var(--teal,#0d9488)] bg-teal-500/10"
								: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<div className="font-semibold text-[var(--ink)]">{p.brandNameRu}</div>
						<div className="text-[var(--muted)] text-[11px]">{p.dimensionsMm} • {p.badgeTextRu}</div>
					</button>
				);
			})}
		</div>
	);
};

export default KraftToolSetSelector;
