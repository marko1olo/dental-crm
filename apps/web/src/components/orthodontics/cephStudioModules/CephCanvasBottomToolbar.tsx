import React from "react";
import { DEFAULT_CEPH_LANDMARKS_PRESET } from "../cephalometricMath";
import type { LandmarkMap } from "../cephalometric/types";

export interface CephCanvasBottomToolbarProps {
	readonly showPlanes: boolean;
	readonly showPolygon: boolean;
	readonly showLabels: boolean;
	readonly theme: "light" | "dark";
	readonly onTogglePlanes: () => void;
	readonly onTogglePolygon: () => void;
	readonly onToggleLabels: () => void;
	readonly onApplyPreset: (preset: LandmarkMap, name: string) => void;
}

export const CephCanvasBottomToolbar: React.FC<CephCanvasBottomToolbarProps> = ({
	showPlanes,
	showPolygon,
	showLabels,
	theme,
	onTogglePlanes,
	onTogglePolygon,
	onToggleLabels,
	onApplyPreset,
}) => {
	const isLight = theme === "light";
	return (
		<div
			className={`absolute bottom-3 left-4 z-30 flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-xl ${
				isLight ? "bg-white/90 border-slate-200 text-slate-800" : "bg-slate-900/90 border-slate-800 text-slate-200"
			}`}
		>
			<button
				type="button"
				onClick={onTogglePlanes}
				className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
					showPlanes
						? isLight
							? "bg-teal-100 text-teal-800 border border-teal-300"
							: "bg-teal-500/20 text-teal-300 border border-teal-500/40"
						: isLight
							? "text-slate-600 hover:text-slate-900"
							: "text-slate-400 hover:text-slate-200"
				}`}
			>
				Плоскости (FH/SN/MP)
			</button>
			<button
				type="button"
				onClick={onTogglePolygon}
				className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
					showPolygon
						? isLight
							? "bg-teal-100 text-teal-800 border border-teal-300"
							: "bg-teal-500/20 text-teal-300 border border-teal-500/40"
						: isLight
							? "text-slate-600 hover:text-slate-900"
							: "text-slate-400 hover:text-slate-200"
				}`}
			>
				Полигон Штайнера
			</button>
			<button
				type="button"
				onClick={onToggleLabels}
				className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
					showLabels
						? isLight
							? "bg-teal-100 text-teal-800 border border-teal-300"
							: "bg-teal-500/20 text-teal-300 border border-teal-500/40"
						: isLight
							? "text-slate-600 hover:text-slate-900"
							: "text-slate-400 hover:text-slate-200"
				}`}
			>
				Подписи точек
			</button>
			<div className={`h-4 w-px ${isLight ? "bg-slate-300" : "bg-slate-800"}`} />
			<button
				type="button"
				onClick={() => onApplyPreset(DEFAULT_CEPH_LANDMARKS_PRESET, "Анатомическая норма")}
				className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
					isLight
						? "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
						: "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
				}`}
			>
				Загрузить эталон ТРГ
			</button>
		</div>
	);
};
