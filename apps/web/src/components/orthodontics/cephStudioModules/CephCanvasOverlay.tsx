/**
 * apps/web/src/components/orthodontics/cephStudioModules/CephCanvasOverlay.tsx
 *
 * Layer 4: Interactive Viewport Canvas Overlay for TRG Cephalometrics.
 * High-resolution canvas rendering, landmark placement, scaling calibration,
 * planes/polygon toggles, and quick reference preset loader.
 */

import React from "react";
import { CephalometricCanvas } from "../CephalometricCanvas";
import { DEFAULT_CEPH_LANDMARKS_PRESET } from "../cephalometricMath";
import type { CephCanvasOverlayProps } from "./cephStudioTypes";

export const CephCanvasOverlay: React.FC<CephCanvasOverlayProps> = ({
	imageUrl,
	landmarks,
	showPlanes,
	showPolygon,
	showLabels,
	activeTargetKey,
	scaleMmPerPixel,
	filterMode,
	brightness,
	contrast,
	theme,
	onFilterModeChange,
	onLandmarkChange,
	onRemoveLandmark,
	onSelectTargetKey,
	onImageUpload,
	onScaleChange,
	onTogglePlanes,
	onTogglePolygon,
	onToggleLabels,
	onApplyPreset,
}) => {
	return (
		<div className="flex-1 relative bg-[var(--paper)] text-[var(--ink)] flex flex-col overflow-hidden">
			<CephalometricCanvas
				imageUrl={imageUrl}
				landmarks={landmarks}
				showPlanes={showPlanes}
				showPolygon={showPolygon}
				showLabels={showLabels}
				activeTargetKey={activeTargetKey}
				scaleMmPerPixel={scaleMmPerPixel}
				filterMode={filterMode}
				onFilterModeChange={onFilterModeChange}
				brightness={brightness}
				contrast={contrast}
				onLandmarkChange={onLandmarkChange}
				onRemoveLandmark={onRemoveLandmark}
				onSelectTargetKey={onSelectTargetKey}
				onImageUpload={onImageUpload}
				onScaleChange={onScaleChange}
			/>

			{/* Bottom Quick-Action Toolbar */}
			<div
				className={`absolute bottom-3 left-4 z-30 flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-xl ${
					theme === "light"
						? "bg-white/90 border-slate-200 text-slate-800"
						: "bg-slate-900/90 border-slate-800 text-slate-200"
				}`}
			>
				<button
					type="button"
					onClick={onTogglePlanes}
					className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
						showPlanes
							? theme === "light"
								? "bg-teal-100 text-teal-800 border border-teal-300"
								: "bg-teal-500/20 text-teal-300 border border-teal-500/40"
							: theme === "light"
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
							? theme === "light"
								? "bg-teal-100 text-teal-800 border border-teal-300"
								: "bg-teal-500/20 text-teal-300 border border-teal-500/40"
							: theme === "light"
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
							? theme === "light"
								? "bg-teal-100 text-teal-800 border border-teal-300"
								: "bg-teal-500/20 text-teal-300 border border-teal-500/40"
							: theme === "light"
								? "text-slate-600 hover:text-slate-900"
								: "text-slate-400 hover:text-slate-200"
					}`}
				>
					Подписи точек
				</button>

				<div className={`h-4 w-px ${theme === "light" ? "bg-slate-300" : "bg-slate-800"}`} />

				<button
					type="button"
					onClick={() => onApplyPreset(DEFAULT_CEPH_LANDMARKS_PRESET, "Анатомическая норма")}
					className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
						theme === "light"
							? "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
							: "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
					}`}
				>
					Загрузить эталон ТРГ
				</button>
			</div>
		</div>
	);
};
