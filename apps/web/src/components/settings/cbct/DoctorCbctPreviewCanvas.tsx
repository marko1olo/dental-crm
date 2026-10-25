import { Activity, Layers, Scan } from "lucide-react";
import React from "react";
import type { CbctVoxelVolume } from "../../radiology/cbctMprMath";
import { CBCT_QUICK_TISSUE_PRESETS } from "./cbctPreferencesTypes";

interface DoctorCbctPreviewCanvasProps {
	previewTab: "axial" | "pano";
	onSelectTab: (tab: "axial" | "pano") => void;
	volume: CbctVoxelVolume | null;
	isLoading: boolean;
	loadStatus: string | null;
	axialCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	onAxialWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
	sliceZIndex: number;
	onSliceZChange: (z: number) => void;
	mprThicknessMm: number;
	panoThicknessMm: number;
	onApplyPreset: (ww: number, wl: number, g: number, air: number) => void;
}

export function DoctorCbctPreviewCanvas({
	previewTab, onSelectTab, volume, isLoading, loadStatus,
	axialCanvasRef, panoCanvasRef, onAxialWheel, sliceZIndex,
	onSliceZChange, mprThicknessMm, panoThicknessMm, onApplyPreset,
}: DoctorCbctPreviewCanvasProps) {
	return (
		<div className="lg:col-span-5 flex flex-col space-y-3">
			<div className="flex items-center justify-between bg-slate-900/80 p-1 rounded-xl border border-slate-800">
				<div className="flex items-center gap-1">
					<button
						type="button" onClick={() => onSelectTab("axial")}
						className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
							previewTab === "axial" ? "bg-teal-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
						}`}
					>
						<Scan size={13} /> <span>Аксиальный срез</span>
					</button>
					<button
						type="button" onClick={() => onSelectTab("pano")}
						className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
							previewTab === "pano" ? "bg-teal-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
						}`}
					>
						<Layers size={13} /> <span>Панорама (ОПТГ)</span>
					</button>
				</div>
				<span className="text-[10px] text-slate-400 font-mono px-2">
					{volume ? `${volume.dimensions.width}×${volume.dimensions.height}` : "Demo"}
				</span>
			</div>

			<div className="relative aspect-square w-full rounded-xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
				{isLoading && (
					<div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-xs text-slate-300">
						<Activity size={24} className="text-teal-400 animate-spin mb-2" />
						<span>{loadStatus || "Загрузка КЛКТ срезов..."}</span>
					</div>
				)}
				<canvas
					ref={axialCanvasRef} width={320} height={320} onWheel={onAxialWheel}
					className={`w-full h-full object-contain cursor-ns-resize ${previewTab === "axial" ? "block" : "hidden"}`}
					title="Крутите колесо мыши для перемещения по Z-срезам"
				/>
				<canvas
					ref={panoCanvasRef} width={320} height={320}
					className={`w-full h-full object-contain ${previewTab === "pano" ? "block" : "hidden"}`}
				/>
				<div className="absolute top-2 left-2 z-10 pointer-events-none px-2 py-0.5 rounded bg-black/70 border border-slate-700/60 text-[10px] font-mono text-cyan-300">
					{previewTab === "axial" ? `Z: ${sliceZIndex + 1} / ${volume?.dimensions.depth ?? 312} | Срез: ${mprThicknessMm.toFixed(1)} мм` : `ОПТГ Слой: ${panoThicknessMm.toFixed(1)} мм`}
				</div>
			</div>

			{previewTab === "axial" && volume && (
				<div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
					<div className="flex items-center justify-between text-[11px] text-slate-400">
						<span>Уровень среза (Z-ось):</span>
						<span className="font-mono text-cyan-300 font-bold">#{sliceZIndex + 1} / {volume.dimensions.depth}</span>
					</div>
					<input
						type="range" aria-label="Уровень среза Z" min={0} max={volume.dimensions.depth - 1} step={1}
						value={sliceZIndex} onChange={(e) => onSliceZChange(Number(e.target.value))} className="w-full cbct-slider cbct-slider--teal"
					/>
				</div>
			)}

			<div className="space-y-1.5 pt-1">
				<span className="text-[11px] font-semibold text-slate-400 block">Быстрые пресеты тканей:</span>
				<div className="grid grid-cols-2 gap-1.5">
					{CBCT_QUICK_TISSUE_PRESETS.map((p) => (
						<button
							key={p.title} type="button" onClick={() => onApplyPreset(p.ww, p.wl, p.gamma, p.air)}
							className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
						>
							<span className={`font-bold block ${p.colorClass}`}>{p.title}</span>
							<span className="text-[9px] text-slate-500">{p.subtitle}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
