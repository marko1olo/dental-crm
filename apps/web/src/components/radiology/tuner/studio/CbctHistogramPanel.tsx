/**
 * DENTE CRM — CBCT Telemetry HUD & Density Analysis Panel
 * Realtime voxel telemetry, HU cursor inspector, and Misch bone density classification.
 * Standards: DICOM Part 3 PS 3.3. Mandate 8b (< 800 lines).
 */

import React from "react";
import { Activity, Gauge } from "lucide-react";
import { classifyBoneDensityMisch, type TunerParams } from "../cbctTunerTypes";

export interface CbctHistogramPanelProps {
	readonly params: TunerParams;
	readonly cursorHU: number | null;
}

export const CbctHistogramPanel: React.FC<CbctHistogramPanelProps> = ({
	params,
	cursorHU,
}) => {
	const densityInfo = cursorHU !== null ? classifyBoneDensityMisch(cursorHU) : null;

	return (
		<div className="p-2.5 rounded-lg bg-zinc-900/90 border border-cyan-500/30 flex flex-col gap-2 shadow-lg shrink-0">
			{/* Header */}
			<div className="flex items-center justify-between text-xs font-bold text-cyan-300">
				<span className="flex items-center gap-1.5">
					<Activity className="w-3.5 h-3.5 text-cyan-400" />
					ПАРАМЕТРЫ КЛКТ
				</span>
				<span className="text-[10px] font-mono text-zinc-400">REALTIME</span>
			</div>

			{/* Telemetry Key-Value String */}
			<div
				className="font-mono text-xs text-zinc-200 bg-black/60 p-2.5 rounded-md border border-zinc-800 break-all leading-relaxed"
				data-testid="cbct-tuner-hud-string"
			>
				<div className="flex justify-between border-b border-zinc-850 pb-1">
					<span className="text-zinc-400">Ширина (WW):</span>
					<span className="font-bold text-cyan-400">{params.windowWidth} HU</span>
				</div>
				<div className="flex justify-between border-b border-zinc-850 py-1">
					<span className="text-zinc-400">Уровень (WL):</span>
					<span className="font-bold text-cyan-400">{params.windowLevel} HU</span>
				</div>
				<div className="flex justify-between border-b border-zinc-850 py-1">
					<span className="text-zinc-400">Гамма:</span>
					<span className="font-bold text-amber-300">{params.gamma.toFixed(2)}</span>
				</div>
				<div className="flex justify-between border-b border-zinc-850 py-1">
					<span className="text-zinc-400">Soft-Knee (Эмаль):</span>
					<span className="font-bold text-emerald-400">
						{params.useSoftKnee ? `${params.softKneeCeiling}/255` : "ВЫКЛ (Линейно)"}
					</span>
				</div>
				<div className="flex justify-between border-b border-zinc-850 py-1">
					<span className="text-zinc-400">Отсечка воздуха:</span>
					<span className="font-bold text-blue-400">{params.airCutoffHU} HU</span>
				</div>
				<div className="flex justify-between pt-1">
					<span className="text-zinc-400">Толщина среза:</span>
					<span className="font-bold text-purple-400">
						{params.sliceThicknessMm <= 0.01
							? "0.0 мм (нативный)"
							: `${params.sliceThicknessMm.toFixed(1)} мм (${params.projectionMode})`}
					</span>
				</div>
			</div>

			{/* Misch Bone Density Live Indicator */}
			{densityInfo && (
				<div className="p-2 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono">
					<span className="text-zinc-400 flex items-center gap-1">
						<Gauge className="w-3.5 h-3.5 text-cyan-400" />
						Курсор:
					</span>
					<span className={`font-bold ${densityInfo.colorClass}`}>
						{densityInfo.label}
					</span>
				</div>
			)}
		</div>
	);
};
