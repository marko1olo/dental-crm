/**
 * DENTE CRM — CBCT 3D Volume Clipping Box Panel
 * Standards: Vatech Ez3D-i / Planmeca Romexis 6.x
 *
 * Provides anatomical clipping planes for maxillofacial skull volume:
 * - Cervical spine clipping (Z-min)
 * - Occipital bone clipping (Y-max)
 * - Coronal facial resection (X-max)
 */

import React from "react";
import { Scissors } from "lucide-react";
import type { Volume3DClippingBox } from "./cbctVolume3DMath";

export interface CbctVolume3DClippingPanelProps {
	readonly clipping: Volume3DClippingBox;
	readonly onClipChange: (axis: "xMin" | "xMax" | "yMin" | "yMax" | "zMin" | "zMax", val: number) => void;
	readonly onResetClipping: () => void;
	readonly onQuickClipSpine: () => void;
	readonly onQuickClipOcciput: () => void;
	readonly onStartInteraction?: () => void;
	readonly onEndInteraction?: () => void;
}

export const CbctVolume3DClippingPanel: React.FC<CbctVolume3DClippingPanelProps> = ({
	clipping,
	onClipChange,
	onResetClipping,
	onQuickClipSpine,
	onQuickClipOcciput,
	onStartInteraction,
	onEndInteraction,
}) => {
	return (
		<div
			className="absolute top-10 right-2 z-30 bg-zinc-950/95 backdrop-blur-md p-2.5 rounded-md border border-zinc-800/90 shadow-2xl text-[11px] w-64 flex flex-col gap-2.5 select-none pointer-events-auto"
			data-testid="cbct-clipping-box-panel"
		>
			<div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
				<span className="font-semibold text-zinc-200 flex items-center gap-1 text-[11px]">
					<Scissors className="w-3 h-3 text-cyan-400" />
					Отсечение 3D черепа
				</span>
				<button
					type="button"
					onClick={onResetClipping}
					title="Сбросить все срезы черепа"
					className="text-[10px] text-zinc-400 hover:text-cyan-300 underline cursor-pointer"
					data-testid="cbct-btn-reset-clipping"
				>
					Сброс срезов
				</button>
			</div>

			{/* Quick Preset Buttons */}
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={onQuickClipSpine}
					title="Срез позвонков: срез шейного отдела позвоночника (Z-min = 28%)"
					className={`flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border text-center ${
						clipping.clipMin[2] >= 0.2
							? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
							: "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
					}`}
					data-testid="cbct-btn-clip-spine"
				>
					Срез позвонков
				</button>
				<button
					type="button"
					onClick={onQuickClipOcciput}
					title="Срез затылка: отсечение затылочной кости (Y-max = 72%)"
					className={`flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border text-center ${
						clipping.clipMax[1] <= 0.8
							? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
							: "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
					}`}
					data-testid="cbct-btn-clip-occiput"
				>
					Срез затылка
				</button>
			</div>

			{/* Slider 1: Срез позвонков (Z-min) */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between items-center text-[10px]">
					<span className="text-zinc-300 font-medium">Срез позвонков (Z-min)</span>
					<span className="font-mono text-cyan-300">{Math.round(clipping.clipMin[2] * 100)}%</span>
				</div>
				<input
					type="range"
					min={0}
					max={70}
					step={1}
					value={Math.round(clipping.clipMin[2] * 100)}
					onPointerDown={onStartInteraction}
					onPointerUp={onEndInteraction}
					onChange={(e) => onClipChange("zMin", Number(e.target.value) / 100)}
					className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
					data-testid="cbct-clip-slider-z-min"
					aria-label="Срез позвонков (Z-min)"
				/>
			</div>

			{/* Slider 2: Срез затылка (Y-max) */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between items-center text-[10px]">
					<span className="text-zinc-300 font-medium">Срез затылка (Y-max)</span>
					<span className="font-mono text-cyan-300">{Math.round(clipping.clipMax[1] * 100)}%</span>
				</div>
				<input
					type="range"
					min={30}
					max={100}
					step={1}
					value={Math.round(clipping.clipMax[1] * 100)}
					onPointerDown={onStartInteraction}
					onPointerUp={onEndInteraction}
					onChange={(e) => onClipChange("yMax", Number(e.target.value) / 100)}
					className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
					data-testid="cbct-clip-slider-y-max"
					aria-label="Срез затылка (Y-max)"
				/>
			</div>

			{/* Slider 3: Корональный срез (X) */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between items-center text-[10px]">
					<span className="text-zinc-300 font-medium">Корональный срез (X)</span>
					<span className="font-mono text-cyan-300">{Math.round(clipping.clipMax[0] * 100)}%</span>
				</div>
				<input
					type="range"
					min={20}
					max={100}
					step={1}
					value={Math.round(clipping.clipMax[0] * 100)}
					onPointerDown={onStartInteraction}
					onPointerUp={onEndInteraction}
					onChange={(e) => onClipChange("xMax", Number(e.target.value) / 100)}
					className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
					data-testid="cbct-clip-slider-x"
					aria-label="Корональный срез (X)"
				/>
			</div>
		</div>
	);
};

export default CbctVolume3DClippingPanel;
