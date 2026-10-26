import React from "react";
import { Sliders, RotateCcw } from "lucide-react";

export interface ImplantPoseControlsProps {
	readonly currentXOffsetMm: number;
	readonly currentDepthMm: number;
	readonly currentAngulationDeg: number;
	readonly handleUpdateXOffset: (val: number) => void;
	readonly handleUpdateDepth: (val: number) => void;
	readonly handleUpdateAngulation: (val: number) => void;
	readonly handleResetPose: () => void;
}

export const ImplantPoseControls: React.FC<ImplantPoseControlsProps> = ({
	currentXOffsetMm, currentDepthMm, currentAngulationDeg,
	handleUpdateXOffset, handleUpdateDepth, handleUpdateAngulation, handleResetPose,
}) => {
	return (
		<div
			className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 flex flex-col gap-1.5"
			data-testid="cbct-implant-positioning-panel"
		>
			<div className="flex items-center justify-between text-xs">
				<span className="font-bold text-zinc-300 flex items-center gap-1">
					<Sliders className="w-3.5 h-3.5 text-amber-400" />
					<span>Позиционирование в гребне:</span>
				</span>
				<button
					type="button"
					onClick={handleResetPose}
					className="text-[10px] text-zinc-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
					data-testid="cbct-implant-pos-reset-btn"
					title="Сброс в центр (Смещение 0 мм, глубина 0.5 мм, наклон 0°)"
				>
					<RotateCcw className="w-3 h-3" />
					<span>Центр</span>
				</button>
			</div>

			<div className="grid grid-cols-3 gap-2 text-[10px]">
				{/* Offset X */}
				<div className="flex flex-col gap-0.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
					<div className="flex items-center justify-between text-zinc-400">
						<span>Смещение (X)</span>
						<span className="font-mono font-bold text-amber-300">{currentXOffsetMm > 0 ? `+${currentXOffsetMm.toFixed(1)}` : currentXOffsetMm.toFixed(1)} мм</span>
					</div>
					<input
						type="range"
						min="-4.0"
						max="4.0"
						step="0.5"
						value={currentXOffsetMm}
						onChange={(e) => handleUpdateXOffset(Number.parseFloat(e.target.value))}
						className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
						data-testid="cbct-implant-pos-offset-slider"
					/>
				</div>

				{/* Depth Y */}
				<div className="flex flex-col gap-0.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
					<div className="flex items-center justify-between text-zinc-400">
						<span>Погружение</span>
						<span className="font-mono font-bold text-cyan-300">{currentDepthMm.toFixed(1)} мм</span>
					</div>
					<input
						type="range"
						min="-2.0"
						max="6.0"
						step="0.5"
						value={currentDepthMm}
						onChange={(e) => handleUpdateDepth(Number.parseFloat(e.target.value))}
						className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
						data-testid="cbct-implant-pos-depth-slider"
					/>
				</div>

				{/* Angulation Deg */}
				<div className="flex flex-col gap-0.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
					<div className="flex items-center justify-between text-zinc-400">
						<span>Наклон (°)</span>
						<span className="font-mono font-bold text-purple-300">{currentAngulationDeg > 0 ? `+${currentAngulationDeg}°` : `${currentAngulationDeg}°`}</span>
					</div>
					<input
						type="range"
						min="-25"
						max="25"
						step="1"
						value={currentAngulationDeg}
						onChange={(e) => handleUpdateAngulation(Number.parseInt(e.target.value, 10))}
						className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
						data-testid="cbct-implant-pos-angulation-slider"
					/>
				</div>
			</div>
		</div>
	);
};
