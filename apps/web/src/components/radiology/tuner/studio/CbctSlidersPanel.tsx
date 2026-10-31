/**
 * DENTE CRM — CBCT Contrast & Projection Sliders Panel
 * Precision clinical controls for Window Width, Window Level, Gamma, Soft-Knee, Air Cutoff, Slab Thickness.
 * Strict adherence to cbctDarkCockpitInquisition and Mandate 8b (< 800 lines).
 */

import React from "react";
import type { TunerParams, TunerProjectionMode } from "../cbctTunerTypes";

export interface CbctSlidersPanelProps {
	readonly params: TunerParams;
	readonly onSetParams: React.Dispatch<React.SetStateAction<TunerParams>>;
}

export const CbctSlidersPanel: React.FC<CbctSlidersPanelProps> = ({
	params,
	onSetParams,
}) => {
	return (
		<div className="flex flex-col gap-3">
			{/* 1. Window Width (WW) */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between text-xs">
					<span className="text-zinc-300 font-semibold">Ширина окна (Window Width):</span>
					<span className="font-mono text-cyan-400 font-bold">{params.windowWidth} HU</span>
				</div>
				<div className="flex items-center min-h-[44px] py-1 touch-none">
					<input
						type="range"
						aria-label="Ширина окна (Window Width)"
						min={400}
						max={5000}
						step={25}
						value={params.windowWidth}
						onChange={(e) =>
							onSetParams((p) => ({ ...p, windowWidth: Number(e.target.value) }))
						}
						className="w-full cbct-slider cbct-slider--cyan"
						data-testid="cbct-slider-window-width"
					/>
				</div>
				<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
					<span>400 (высокий контраст)</span>
					<span>5000 (мягкий обзор)</span>
				</div>
			</div>

			{/* 2. Window Level (WL) */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between text-xs">
					<span className="text-zinc-300 font-semibold">Уровень окна (Window Level):</span>
					<span className="font-mono text-cyan-400 font-bold">{params.windowLevel} HU</span>
				</div>
				<div className="flex items-center min-h-[44px] py-1 touch-none">
					<input
						type="range"
						aria-label="Уровень окна (Window Level)"
						min={-200}
						max={2000}
						step={25}
						value={params.windowLevel}
						onChange={(e) =>
							onSetParams((p) => ({ ...p, windowLevel: Number(e.target.value) }))
						}
						className="w-full cbct-slider cbct-slider--cyan"
						data-testid="cbct-slider-window-level"
					/>
				</div>
				<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
					<span>-200 (мягкие ткани)</span>
					<span>2000 (дентин/эмаль)</span>
				</div>
			</div>

			{/* 3. Gamma */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between text-xs">
					<span className="text-zinc-300 font-semibold">Гамма (Нелинейность):</span>
					<span className="font-mono text-amber-300 font-bold">{params.gamma.toFixed(2)}</span>
				</div>
				<div className="flex items-center min-h-[44px] py-1 touch-none">
					<input
						type="range"
						aria-label="Гамма (Нелинейность)"
						min={0.5}
						max={2.5}
						step={0.05}
						value={params.gamma}
						onChange={(e) =>
							onSetParams((p) => ({ ...p, gamma: Number(e.target.value) }))
						}
						className="w-full cbct-slider cbct-slider--amber"
						data-testid="cbct-slider-gamma"
					/>
				</div>
				<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
					<span>0.5 (ярче тени)</span>
					<span>1.0 (линейно)</span>
					<span>2.5 (глубже кость)</span>
				</div>
			</div>

			{/* 4. Soft-Knee Enamel Compression */}
			<div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
				<div className="flex items-center justify-between text-xs">
					<label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-300 min-h-[36px]">
						<input
							type="checkbox"
							checked={params.useSoftKnee}
							onChange={(e) =>
								onSetParams((p) => ({ ...p, useSoftKnee: e.target.checked }))
							}
							className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
							data-testid="cbct-checkbox-soft-knee"
						/>
						<span>Потолок эмали (Soft-Knee)</span>
					</label>
					<span className="font-mono text-emerald-400 font-bold text-xs">
						{params.useSoftKnee ? `${params.softKneeCeiling} / 255` : "ВЫКЛ"}
					</span>
				</div>
				{params.useSoftKnee && (
					<div className="flex items-center min-h-[44px] py-1 touch-none">
						<input
							type="range"
							aria-label="Потолок компрессии эмали"
							min={120}
							max={255}
							step={1}
							value={params.softKneeCeiling}
							onChange={(e) =>
								onSetParams((p) => ({ ...p, softKneeCeiling: Number(e.target.value) }))
							}
							className="w-full cbct-slider cbct-slider--emerald"
							data-testid="cbct-slider-soft-knee"
						/>
					</div>
				)}
			</div>

			{/* 5. Air Cutoff HU */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between text-xs">
					<span className="text-zinc-300 font-semibold">Отсечка воздуха (Air Cutoff):</span>
					<span className="font-mono text-blue-400 font-bold">{params.airCutoffHU} HU</span>
				</div>
				<div className="flex items-center min-h-[44px] py-1 touch-none">
					<input
						type="range"
						aria-label="Отсечка воздуха (Air Cutoff)"
						min={-1000}
						max={0}
						step={25}
						value={params.airCutoffHU}
						onChange={(e) =>
							onSetParams((p) => ({ ...p, airCutoffHU: Number(e.target.value) }))
						}
						className="w-full cbct-slider cbct-slider--blue"
						data-testid="cbct-slider-air-cutoff"
					/>
				</div>
				<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
					<span>-1000 HU (весь фон)</span>
					<span>-100 HU (чистый черный)</span>
					<span>0 HU</span>
				</div>
			</div>

			{/* 6. Slice Thickness & Projection Mode */}
			<div className="flex flex-col gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
				<div className="flex justify-between text-xs">
					<span className="text-zinc-300 font-semibold">Толщина среза / Слой ОПТГ:</span>
					<span className="font-mono text-purple-400 font-bold">
						{params.sliceThicknessMm.toFixed(1)} мм
					</span>
				</div>
				<div className="flex items-center min-h-[44px] py-1 touch-none">
					<input
						type="range"
						aria-label="Толщина среза / Слой ОПТГ (Thickness)"
						min={1.0}
						max={16.0}
						step={0.5}
						value={params.sliceThicknessMm}
						onChange={(e) =>
							onSetParams((p) => ({ ...p, sliceThicknessMm: Number(e.target.value) }))
						}
						className="w-full cbct-slider cbct-slider--purple"
						data-testid="cbct-slider-thickness"
					/>
				</div>

				{/* Projection Mode Radio Buttons */}
				<div className="flex flex-col gap-1 mt-1">
					<span className="text-[11px] text-zinc-400 font-semibold">Режим проекции пласта:</span>
					<div className="grid grid-cols-2 gap-1.5">
						{(["native", "average", "mip", "ray_sum"] as TunerProjectionMode[]).map((mode) => (
							<button
								key={mode}
								type="button"
								onClick={() => onSetParams((p) => ({ ...p, projectionMode: mode }))}
								className={`py-2 px-2 rounded-md text-[11px] font-semibold border cursor-pointer min-h-[44px] flex items-center justify-center ${
									params.projectionMode === mode
										? "bg-purple-950/70 text-purple-200 border-purple-400 font-bold shadow-[0_0_8px_rgba(168,85,247,0.3)]"
										: "bg-zinc-800/80 text-zinc-400 border-zinc-750 hover:text-zinc-200"
								}`}
								data-testid={`cbct-tuner-mode-${mode}`}
							>
								{mode === "native" && "Нативный (0 мм)"}
								{mode === "average" && "Среднее (Avg)"}
								{mode === "mip" && "MIP (Максимум)"}
								{mode === "ray_sum" && "Ray-Sum (Сумма)"}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* 7. Invert Colors (X-ray Negative) */}
			<div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
				<span className="text-xs text-zinc-300 font-semibold">Инверсия цвета (Рентген):</span>
				<button
					type="button"
					onClick={() => onSetParams((p) => ({ ...p, invert: !p.invert }))}
					className={`px-3 py-2 rounded-md text-xs font-bold border transition-colors cursor-pointer min-h-[44px] ${
						params.invert
							? "bg-amber-950/70 text-amber-300 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
							: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
					}`}
					data-testid="cbct-tuner-invert-btn"
				>
					{params.invert ? "НЕГАТИВ (ПЛЕНКА)" : "ПОЗИТИВ (МОНИТОР)"}
				</button>
			</div>
		</div>
	);
};
