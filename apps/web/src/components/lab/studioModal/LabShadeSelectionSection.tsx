/**
 * apps/web/src/components/lab/studioModal/LabShadeSelectionSection.tsx
 *
 * DENTE Dental CRM — Dental Lab Vita Shade Picker Section.
 * Comprehensive Vita Classical & Bleach shades with visual hex swatches.
 * Mandate 8b modular design, Mandate 8e chairside doctor autonomy.
 */

import React from "react";
import { VITA_SHADES_SSOT } from "../dentalLabCatalogData";

export interface LabShadeSelectionSectionProps {
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export const LabShadeSelectionSection: React.FC<LabShadeSelectionSectionProps> = ({
	selectedShade,
	onSelectShade,
}) => {
	return (
		<div className="shrink-0 space-y-1">
			<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink)]">
				<span>Цвет Vita:</span>
				<strong className="text-[var(--teal)] font-mono text-xs">{selectedShade}</strong>
			</div>

			<div className="flex flex-wrap gap-1 p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] max-h-24 overflow-y-auto">
				{VITA_SHADES_SSOT.map((v) => {
					const isSel = selectedShade === v.code;
					return (
						<button
							key={v.code}
							type="button"
							data-testid={`shade-chip-${v.code}`}
							onClick={() => onSelectShade(v.code)}
							className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer min-h-[28px] ${
								isSel
									? "border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--teal)] ring-1 ring-[var(--teal)] shadow-xs"
									: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--line-strong)]"
							}`}
						>
							<span
								className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
								style={{ backgroundColor: v.approxHex }}
							/>
							{v.code}
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default LabShadeSelectionSection;
