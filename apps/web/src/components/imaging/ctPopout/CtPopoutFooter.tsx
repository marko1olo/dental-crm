/**
 * CtPopoutFooter.tsx — Нижний HUD тулбар пресетов W/L, срезов и экспорта (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Camera } from "lucide-react";

export const WL_PRESETS = [
	{ id: "soft", label: "Мягкие ткани", wl: "40 / 400" },
	{ id: "bone", label: "Костная ткань", wl: "400 / 1500" },
	{ id: "teeth", label: "Зубы / Эмаль", wl: "1200 / 3000" },
	{ id: "implants", label: "Импланты", wl: "1500 / 4000" },
];

interface Props {
	activeWlPreset: string;
	setActiveWlPreset: (p: string) => void;
	sliceIndex: number;
	setSliceIndex: (idx: number) => void;
	slabThicknessMm: number;
	setSlabThicknessMm: (s: number) => void;
}

export const CtPopoutFooter: React.FC<Props> = ({
	activeWlPreset, setActiveWlPreset, sliceIndex, setSliceIndex,
	slabThicknessMm, setSlabThicknessMm,
}) => {
	return (
		<footer className="h-12 px-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-30">
			<div className="flex items-center gap-2">
				<span className="text-[11px] text-zinc-400 font-medium">Окно (WL):</span>
				<div className="ct-studio-wl-bar">
					{WL_PRESETS.map((w) => (
						<button
							key={w.id}
							type="button"
							onClick={() => setActiveWlPreset(w.id)}
							className={`ct-studio-wl-btn ${activeWlPreset === w.id ? "active" : ""}`}
							title={`Пресет: ${w.label} (${w.wl})`}
						>
							{w.label}
						</button>
					))}
				</div>
			</div>

			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
					<span className="text-zinc-400">Срез:</span>
					<input
						type="range"
						min="1"
						max="450"
						value={sliceIndex}
						onChange={(e) => setSliceIndex(Number(e.target.value))}
						className="w-36 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
					/>
					<span className="w-12 text-right">{sliceIndex} / 450</span>
				</div>

				<div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

				<div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
					<span>Slab (MIP):</span>
					{[0.2, 1.0, 5.0, 10.0].map((val) => (
						<button
							key={val}
							type="button"
							onClick={() => setSlabThicknessMm(val)}
							className={`ct-studio-slab-btn ${slabThicknessMm === val ? "active" : ""}`}
						>
							{val} мм
						</button>
					))}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button type="button" className="ct-studio-action-btn" title="Сделать снимок экрана среза в формате PNG">
					<Camera className="w-3.5 h-3.5 text-teal-400" />
					<span>Снимок экрана</span>
				</button>
			</div>
		</footer>
	);
};
