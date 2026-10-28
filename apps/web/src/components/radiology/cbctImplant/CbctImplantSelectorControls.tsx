import React from "react";
import { Layers, Shield } from "lucide-react";
import {
	DEFAULT_SAFETY_CORRIDOR_MM,
	IMPLANT_BRANDS,
	type ImplantBrandKey,
	MIN_SAFETY_CORRIDOR_MM,
} from "../implantLibrary";

export interface CbctImplantSelectorControlsProps {
	readonly selectedBrand: ImplantBrandKey;
	readonly setSelectedBrand: (brand: ImplantBrandKey) => void;
	readonly selectedDiameterMm: number;
	readonly setSelectedDiameterMm: (diameter: number) => void;
	readonly availableDiameters: number[];
	readonly selectedLengthMm: number;
	readonly setSelectedLengthMm: (length: number) => void;
	readonly availableLengths: number[];
	readonly safetyMarginMm: number;
	readonly setSafetyMarginMm: (margin: number) => void;
	readonly angulationDeg: number;
	readonly setAngulationDeg: (deg: number) => void;
	readonly entryDepthMm: number;
	readonly setEntryDepthMm: (depth: number) => void;
}

export const CbctImplantSelectorControls: React.FC<CbctImplantSelectorControlsProps> = ({
	selectedBrand,
	setSelectedBrand,
	selectedDiameterMm,
	setSelectedDiameterMm,
	availableDiameters,
	selectedLengthMm,
	setSelectedLengthMm,
	availableLengths,
	safetyMarginMm,
	setSafetyMarginMm,
	angulationDeg,
	setAngulationDeg,
	entryDepthMm,
	setEntryDepthMm,
}) => {
	return (
		<div className="w-full md:w-1/2 p-4 flex flex-col gap-4 overflow-y-auto">
			{/* Brand Selector */}
			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
					<Layers className="w-3.5 h-3.5 text-cyan-400" />
					<span>Производитель имплантата</span>
				</label>
				<div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
					{IMPLANT_BRANDS.map((b) => {
						const isSelected = b.key === selectedBrand;
						return (
							<button
								key={b.key}
								type="button"
								onClick={() => setSelectedBrand(b.key)}
								className={`px-2 py-1.5 rounded-md text-xs font-medium text-center transition-colors cursor-pointer border ${
									isSelected
										? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold shadow-sm"
										: "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
								}`}
								data-testid={`cbct-brand-btn-${b.key}`}
							>
								{b.name}
							</button>
						);
					})}
				</div>
			</div>

			{/* Diameter Selector */}
			<div className="flex flex-col gap-1.5">
				<div className="flex justify-between items-center text-xs">
					<span className="font-semibold text-zinc-300">Диаметр имплантата (Ø)</span>
					<span className="font-mono text-cyan-300 font-bold">{selectedDiameterMm.toFixed(1)} мм</span>
				</div>
				<div className="flex flex-wrap gap-1.5">
					{availableDiameters.map((d) => {
						const isSelected = Math.abs(d - selectedDiameterMm) < 0.05;
						return (
							<button
								key={d}
								type="button"
								onClick={() => setSelectedDiameterMm(d)}
								className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
									isSelected
										? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
										: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
								}`}
								data-testid={`cbct-diameter-btn-${d}`}
							>
								Ø {d.toFixed(1)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Length Selector */}
			<div className="flex flex-col gap-1.5">
				<div className="flex justify-between items-center text-xs">
					<span className="font-semibold text-zinc-300">Длина имплантата (L)</span>
					<span className="font-mono text-cyan-300 font-bold">{selectedLengthMm.toFixed(1)} мм</span>
				</div>
				<div className="flex flex-wrap gap-1.5">
					{availableLengths.map((l) => {
						const isSelected = Math.abs(l - selectedLengthMm) < 0.05;
						return (
							<button
								key={l}
								type="button"
								onClick={() => setSelectedLengthMm(l)}
								className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
									isSelected
										? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
										: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
								}`}
								data-testid={`cbct-length-btn-${l}`}
							>
								{l.toFixed(1)} мм
							</button>
						);
					})}
				</div>
			</div>

			{/* Safety Margin Selector */}
			<div className="flex flex-col gap-1.5">
				<div className="flex justify-between items-center text-xs">
					<span className="font-semibold text-zinc-300 flex items-center gap-1">
						<Shield className="w-3.5 h-3.5 text-cyan-400" />
						<span>Коридор безопасности (Safety Zone)</span>
					</span>
					<span className="font-mono text-cyan-300 font-bold">{safetyMarginMm.toFixed(1)} мм</span>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setSafetyMarginMm(MIN_SAFETY_CORRIDOR_MM)}
						className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer border text-center ${
							Math.abs(safetyMarginMm - MIN_SAFETY_CORRIDOR_MM) < 0.05
								? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
								: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
						}`}
						data-testid="cbct-safety-margin-15"
					>
						1.5 мм (Минимум)
					</button>
					<button
						type="button"
						onClick={() => setSafetyMarginMm(DEFAULT_SAFETY_CORRIDOR_MM)}
						className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer border text-center ${
							Math.abs(safetyMarginMm - DEFAULT_SAFETY_CORRIDOR_MM) < 0.05
								? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
								: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
						}`}
						data-testid="cbct-safety-margin-20"
					>
						2.0 мм (Стандарт Misch)
					</button>
				</div>
			</div>

			{/* Angulation & Pose Controls */}
			<div className="p-3 rounded-md bg-zinc-900/50 border border-zinc-800/80 flex flex-col gap-2.5">
				<div className="text-xs font-semibold text-zinc-300">
					Пространственное позиционирование
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex justify-between items-center text-[11px] text-zinc-400">
						<span>Угол наклона (Ангуляция)</span>
						<span className="font-mono text-zinc-200">{angulationDeg}°</span>
					</div>
					<input
						type="range"
						min={-25}
						max={25}
						step={1}
						value={angulationDeg}
						onChange={(e) => setAngulationDeg(Number(e.target.value))}
						className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
						data-testid="cbct-implant-slider-angulation"
						aria-label="Угол наклона имплантата"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex justify-between items-center text-[11px] text-zinc-400">
						<span>Глубина погружения гребня</span>
						<span className="font-mono text-zinc-200">{entryDepthMm.toFixed(1)} мм</span>
					</div>
					<input
						type="range"
						min={0}
						max={6}
						step={0.5}
						value={entryDepthMm}
						onChange={(e) => setEntryDepthMm(Number(e.target.value))}
						className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
						data-testid="cbct-implant-slider-depth"
						aria-label="Глубина погружения имплантата"
					/>
				</div>
			</div>
		</div>
	);
};
