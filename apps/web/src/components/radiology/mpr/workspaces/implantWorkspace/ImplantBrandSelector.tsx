/**
 * ImplantBrandSelector.tsx — Селектор бренда и геометрии имплантата в воркспейсе (Мандат 8b).
 */

import React from "react";
import type { ImplantBrandKey } from "../../../implantSafetyEngine";

const IMPLANT_BRANDS: readonly { key: ImplantBrandKey; label: string }[] = [
	{ key: "osstem", label: "Osstem" },
	{ key: "straumann", label: "Straumann" },
	{ key: "nobel_biocare", label: "Nobel" },
	{ key: "dentium", label: "Dentium" },
	{ key: "mis", label: "MIS" },
];

export interface ImplantBrandSelectorProps {
	readonly selectedBrand: ImplantBrandKey;
	readonly onSelectBrand?: ((b: ImplantBrandKey) => void) | undefined;
	readonly selectedDiameterMm: number;
	readonly onSelectDiameterMm?: ((d: number) => void) | undefined;
	readonly selectedLengthMm: number;
	readonly onSelectLengthMm?: ((l: number) => void) | undefined;
}

export const ImplantBrandSelector: React.FC<ImplantBrandSelectorProps> = ({
	selectedBrand,
	onSelectBrand,
	selectedDiameterMm,
	onSelectDiameterMm,
	selectedLengthMm,
	onSelectLengthMm,
}) => {
	const diameters = [3.3, 3.5, 4.0, 4.5, 5.0];
	const lengths = [7.0, 8.5, 10.0, 11.5, 13.0];

	return (
		<div className="flex items-center gap-2 flex-wrap">
			<div className="flex items-center gap-1 bg-[var(--paper)] p-0.5 rounded-lg border border-[var(--line)]">
				{IMPLANT_BRANDS.map((b) => (
					<button
						key={b.key}
						type="button"
						onClick={() => onSelectBrand?.(b.key)}
						className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
							selectedBrand === b.key
								? "bg-[var(--primary)] text-white"
								: "text-[var(--text-muted)] hover:text-[var(--text)]"
						}`}
					>
						{b.label}
					</button>
				))}
			</div>

			<div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
				<span>Ø</span>
				<select
					value={selectedDiameterMm}
					onChange={(e) => onSelectDiameterMm?.(Number(e.target.value))}
					className="px-2 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-xs text-[var(--text)]"
				>
					{diameters.map((d) => (
						<option key={d} value={d}>{d.toFixed(1)} мм</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
				<span>L</span>
				<select
					value={selectedLengthMm}
					onChange={(e) => onSelectLengthMm?.(Number(e.target.value))}
					className="px-2 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-xs text-[var(--text)]"
				>
					{lengths.map((l) => (
						<option key={l} value={l}>{l.toFixed(1)} мм</option>
					))}
				</select>
			</div>
		</div>
	);
};
