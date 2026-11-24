import React from "react";
import {
	STANDARD_CLINICAL_DIAMETERS,
	STANDARD_CLINICAL_LENGTHS,
} from "../../implant/implantCatalog";

export interface ImplantDimensionsSelectorProps {
	readonly selectedDiameterMm: number;
	readonly onSelectDiameterMm?: ((diameter: number) => void) | undefined;
	readonly selectedLengthMm: number;
	readonly onSelectLengthMm?: ((length: number) => void) | undefined;
	readonly platformColor: string;
}

export const ImplantDimensionsSelector: React.FC<ImplantDimensionsSelectorProps> = ({
	selectedDiameterMm, onSelectDiameterMm, selectedLengthMm, onSelectLengthMm, platformColor,
}) => {
	return (
		<div className="grid grid-cols-2 gap-2">
			{/* Diameters */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between text-xs font-semibold text-[var(--ink-muted)]">
					<span>Диаметр (Ø мм):</span>
					<span className="w-2 h-2 rounded-full" style={{ backgroundColor: platformColor }} />
				</div>
				<div className="grid grid-cols-4 gap-1">
					{STANDARD_CLINICAL_DIAMETERS.map((d) => (
						<button
							key={d}
							type="button"
							onClick={() => onSelectDiameterMm?.(d)}
							className={`min-h-[44px] py-1 px-1 rounded-lg text-xs font-mono text-center border transition-colors cursor-pointer touch-manipulation ${
								Math.abs(selectedDiameterMm - d) < 0.1
									? "bg-[var(--primary)] text-white border-[var(--primary)] font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] border-[var(--line)]"
							}`}
							data-testid={`cbct-implant-diam-${d}`}
						>
							Ø{d.toFixed(1)}
						</button>
					))}
				</div>
			</div>

			{/* Lengths */}
			<div className="flex flex-col gap-1">
				<span className="text-xs font-semibold text-[var(--ink-muted)]">Длина (L мм):</span>
				<div className="grid grid-cols-4 gap-1">
					{STANDARD_CLINICAL_LENGTHS.map((l) => (
						<button
							key={l}
							type="button"
							onClick={() => onSelectLengthMm?.(l)}
							className={`min-h-[44px] py-1 px-1 rounded-lg text-xs font-mono text-center border transition-colors cursor-pointer touch-manipulation ${
								Math.abs(selectedLengthMm - l) < 0.1
									? "bg-[var(--primary)] text-white border-[var(--primary)] font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] border-[var(--line)]"
							}`}
							data-testid={`cbct-implant-len-${l}`}
						>
							{l.toFixed(1)}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
