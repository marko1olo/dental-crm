import React from "react";

interface DoctorCbctThicknessSlidersProps {
	airCutoffHU: number;
	onAirCutoffChange: (v: number) => void;
	mprThicknessMm: number;
	onMprThicknessChange: (v: number) => void;
	panoThicknessMm: number;
	onPanoThicknessChange: (v: number) => void;
}

export function DoctorCbctThicknessSliders({
	airCutoffHU, onAirCutoffChange,
	mprThicknessMm, onMprThicknessChange,
	panoThicknessMm, onPanoThicknessChange,
}: DoctorCbctThicknessSlidersProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
			<div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
				<div className="flex items-center justify-between text-[11px] font-bold text-white">
					<span>Отсечение воздуха</span>
					<span className="font-mono text-teal-300">{airCutoffHU} HU</span>
				</div>
				<input
					type="range" aria-label="Отсечение воздуха" min={-1000} max={0} step={25}
					value={airCutoffHU} onChange={(e) => onAirCutoffChange(Number(e.target.value))} className="w-full cbct-slider cbct-slider--teal"
				/>
			</div>
			<div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
				<div className="flex items-center justify-between text-[11px] font-bold text-white">
					<span>Толщина MPR</span>
					<span className="font-mono text-teal-300">{mprThicknessMm.toFixed(1)} мм</span>
				</div>
				<input
					type="range" aria-label="Толщина MPR" min={0.5} max={10.0} step={0.5}
					value={mprThicknessMm} onChange={(e) => onMprThicknessChange(Number(Number(e.target.value).toFixed(1)))} className="w-full cbct-slider cbct-slider--teal"
				/>
			</div>
			<div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
				<div className="flex items-center justify-between text-[11px] font-bold text-white">
					<span>Слой ОПТГ</span>
					<span className="font-mono text-teal-300">{panoThicknessMm.toFixed(1)} мм</span>
				</div>
				<input
					type="range" aria-label="Слой ОПТГ" min={1.0} max={16.0} step={0.5}
					value={panoThicknessMm} onChange={(e) => onPanoThicknessChange(Number(Number(e.target.value).toFixed(1)))} className="w-full cbct-slider cbct-slider--teal"
				/>
			</div>
		</div>
	);
}
