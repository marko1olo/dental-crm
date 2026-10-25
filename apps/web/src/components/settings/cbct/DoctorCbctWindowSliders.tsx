import { Sliders, Sparkles } from "lucide-react";
import React from "react";

interface DoctorCbctWindowSlidersProps {
	windowWidth: number;
	onWindowWidthChange: (v: number) => void;
	windowLevel: number;
	onWindowLevelChange: (v: number) => void;
	gamma: number;
	onGammaChange: (v: number) => void;
}

export function DoctorCbctWindowSliders({
	windowWidth, onWindowWidthChange,
	windowLevel, onWindowLevelChange,
	gamma, onGammaChange,
}: DoctorCbctWindowSlidersProps) {
	return (
		<>
			{/* 1. Window Width */}
			<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-white flex items-center gap-1.5">
						<Sliders size={14} className="text-teal-400" />
						<span>Ширина окна (Window Width)</span>
					</label>
					<div className="flex items-center gap-2">
						<span className="text-xs font-mono font-bold text-teal-300">{windowWidth} HU</span>
						<span className="text-[10px] text-slate-500">(базово: 4025)</span>
					</div>
				</div>
				<input
					type="range" aria-label="Ширина окна (Window Width)" min={400} max={5000} step={25}
					value={windowWidth} onChange={(e) => onWindowWidthChange(Number(e.target.value))} className="w-full cbct-slider cbct-slider--teal"
				/>
				<div className="flex items-center justify-between text-[10px] text-slate-500">
					<span>400 HU (контраст)</span> <span>Динамический диапазон серого</span> <span>5000 HU (мягкий)</span>
				</div>
			</div>

			{/* 2. Window Level */}
			<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-white flex items-center gap-1.5">
						<Sliders size={14} className="text-teal-400" />
						<span>Уровень окна (Window Level / Center)</span>
					</label>
					<div className="flex items-center gap-2">
						<span className="text-xs font-mono font-bold text-teal-300">{windowLevel} HU</span>
						<span className="text-[10px] text-slate-500">(базово: 525)</span>
					</div>
				</div>
				<input
					type="range" aria-label="Уровень окна (Window Level)" min={-200} max={2000} step={25}
					value={windowLevel} onChange={(e) => onWindowLevelChange(Number(e.target.value))} className="w-full cbct-slider cbct-slider--teal"
				/>
				<div className="flex items-center justify-between text-[10px] text-slate-500">
					<span>-200 HU (ткани)</span> <span>Центральная яркость анатомических структур</span> <span>+2000 HU (эмаль)</span>
				</div>
			</div>

			{/* 3. Gamma */}
			<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-white flex items-center gap-1.5">
						<Sparkles size={14} className="text-teal-400" />
						<span>Гамма-коррекция (Gamma)</span>
					</label>
					<div className="flex items-center gap-2">
						<span className="text-xs font-mono font-bold text-teal-300">{gamma.toFixed(2)}</span>
						<span className="text-[10px] text-slate-500">(базово: 1.50)</span>
					</div>
				</div>
				<input
					type="range" aria-label="Гамма-коррекция (Gamma)" min={0.5} max={2.5} step={0.05}
					value={gamma} onChange={(e) => onGammaChange(Number(Number(e.target.value).toFixed(2)))} className="w-full cbct-slider cbct-slider--teal"
				/>
				<div className="flex items-center justify-between text-[10px] text-slate-500">
					<span>0.50 (линейная)</span> <span>Выделение трабекулярного рисунка кости</span> <span>2.50 (глубокие тени)</span>
				</div>
			</div>
		</>
	);
}
