/**
 * CbctSidebarImplantSelector.tsx — Выбор бренда, диаметра и длины имплантата (Мандат 8b).
 */

import React from "react";
import type { ImplantBrandKey } from "../../implantSafetyEngine";

const IMPLANT_BRAND_OPTIONS: readonly { key: ImplantBrandKey; label: string }[] = [
	{ key: "osstem", label: "Osstem" },
	{ key: "straumann", label: "Straumann" },
	{ key: "nobel_biocare", label: "Nobel" },
	{ key: "dentium", label: "Dentium" },
	{ key: "mis", label: "MIS" },
];

export interface CbctSidebarImplantSelectorProps {
	readonly selectedBrand: ImplantBrandKey;
	readonly setSelectedBrand: (brand: ImplantBrandKey) => void;
	readonly selectedDiameterMm: number;
	readonly setSelectedDiameterMm: (diam: number) => void;
	readonly selectedLengthMm: number;
	readonly setSelectedLengthMm: (len: number) => void;
}

export const CbctSidebarImplantSelector: React.FC<CbctSidebarImplantSelectorProps> = ({
	selectedBrand,
	setSelectedBrand,
	selectedDiameterMm,
	setSelectedDiameterMm,
	selectedLengthMm,
	setSelectedLengthMm,
}) => {
	const diameters = [3.3, 3.5, 4.0, 4.5, 5.0];
	const lengths = [7.0, 8.5, 10.0, 11.5, 13.0];

	return (
		<div className="flex flex-col gap-2 p-2.5 bg-[var(--paper)] rounded-lg border border-[var(--line)] text-xs">
			<div className="flex justify-between items-center">
				<span className="font-semibold text-[var(--text)]">Имплантационная система</span>
				<span className="text-[10px] text-[var(--text-muted)]">Примерка на срезе</span>
			</div>

			<div className="flex gap-1 overflow-x-auto pb-0.5">
				{IMPLANT_BRAND_OPTIONS.map((b) => (
					<button
						key={b.key}
						type="button"
						onClick={() => setSelectedBrand(b.key)}
						className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
							selectedBrand === b.key
								? "bg-[var(--primary)] text-white"
								: "bg-[var(--paper-strong)] text-[var(--text-muted)] hover:text-[var(--text)]"
						}`}
					>
						{b.label}
					</button>
				))}
			</div>

			<div className="grid grid-cols-2 gap-2">
				<div>
					<span className="text-[10px] text-[var(--text-muted)]">Диаметр Ø</span>
					<select
						value={selectedDiameterMm}
						onChange={(e) => setSelectedDiameterMm(Number(e.target.value))}
						className="w-full mt-0.5 px-2 py-1 bg-[var(--paper-strong)] border border-[var(--line)] rounded text-xs text-[var(--text)]"
					>
						{diameters.map((d) => (
							<option key={d} value={d}>Ø {d.toFixed(1)} мм</option>
						))}
					</select>
				</div>
				<div>
					<span className="text-[10px] text-[var(--text-muted)]">Длина L</span>
					<select
						value={selectedLengthMm}
						onChange={(e) => setSelectedLengthMm(Number(e.target.value))}
						className="w-full mt-0.5 px-2 py-1 bg-[var(--paper-strong)] border border-[var(--line)] rounded text-xs text-[var(--text)]"
					>
						{lengths.map((l) => (
							<option key={l} value={l}>L {l.toFixed(1)} мм</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};
