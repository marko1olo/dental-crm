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
				<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
					<span>Диаметр (Ø мм):</span>
					<span className="w-2 h-2 rounded-full" style={{ backgroundColor: platformColor }} />
				</div>
				<div className="grid grid-cols-4 gap-1">
					{STANDARD_CLINICAL_DIAMETERS.map((d) => (
						<button
							key={d}
							type="button"
							onClick={() => onSelectDiameterMm?.(d)}
							className={`py-1 px-0.5 rounded text-xs font-mono text-center border transition-colors cursor-pointer ${
								Math.abs(selectedDiameterMm - d) < 0.1
									? "bg-amber-950/70 text-amber-200 border-amber-500/50 font-bold shadow-xs"
									: "bg-zinc-900 text-zinc-300 hover:text-zinc-200 border-zinc-800"
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
				<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Длина (L мм):</span>
				<div className="grid grid-cols-4 gap-1">
					{STANDARD_CLINICAL_LENGTHS.map((l) => (
						<button
							key={l}
							type="button"
							onClick={() => onSelectLengthMm?.(l)}
							className={`py-1 px-0.5 rounded text-xs font-mono text-center border transition-colors cursor-pointer ${
								Math.abs(selectedLengthMm - l) < 0.1
									? "bg-amber-950/70 text-amber-200 border-amber-500/50 font-bold shadow-xs"
									: "bg-zinc-900 text-zinc-300 hover:text-zinc-200 border-zinc-800"
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
