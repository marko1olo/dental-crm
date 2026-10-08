/**
 * DENTE CRM — CBCT 3D Volume Telemetry HUD (Layer 4 Presentation)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x
 */

import { Compass, Scissors } from "lucide-react";
import type React from "react";
import type { CbctVoxelVolume, Point3D } from "../../cbctMprMath";
import { getVolume3DPreset, type Volume3DPresetId } from "../cbctVolume3DMath";

export interface CbctVolume3DTelemetryHudProps {
	readonly volume: CbctVoxelVolume | null;
	readonly activePreset: Volume3DPresetId;
	readonly crosshairMm?: Point3D | undefined;
	readonly yaw: number;
	readonly pitch: number;
	readonly hasActiveClipping: boolean;
	readonly effectiveHibernated: boolean;
	readonly isGpuActive: boolean;
	readonly lastRenderTimeMs?: number | undefined;
	readonly isMarActive: boolean;
}

export const CbctVolume3DTelemetryHud: React.FC<CbctVolume3DTelemetryHudProps> = ({
	volume,
	activePreset,
	crosshairMm,
	yaw,
	pitch,
	hasActiveClipping,
	effectiveHibernated,
	isGpuActive,
	lastRenderTimeMs = 1.5,
	isMarActive,
}) => {
	const activePresetSpec = getVolume3DPreset(activePreset);

	return (
		<div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-zinc-400/80 pointer-events-none z-20 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
			<div className="flex items-center gap-2">
				<span className="flex items-center gap-1 text-cyan-400 font-semibold">
					<Compass className="w-2.5 h-2.5" />
					<span>3D Объем: {activePresetSpec.label}</span>
				</span>
				{volume && (
					<div className="flex items-center gap-1.5 opacity-80">
						<span
							className="text-zinc-300 font-mono"
							data-testid="cbct-3d-fov-telemetry"
						>
							FOV [{Math.round(volume.dimensions.width * volume.spacingMm.x)} × {Math.round(volume.dimensions.depth * volume.spacingMm.z)} мм]
						</span>
						<span
							className="text-zinc-400 font-mono text-[8.5px]"
							data-testid="cbct-3d-axis-telemetry"
						>
							[{crosshairMm ? `${crosshairMm.x.toFixed(1)}, ${crosshairMm.y.toFixed(1)}, ${crosshairMm.z.toFixed(1)}` : "0.0, 0.0, 0.0"}]
						</span>
					</div>
				)}
			</div>

			<div className="flex items-center gap-2">
				<span className="hidden md:inline text-zinc-400 text-[8.5px]">
					Yaw: {Math.round(yaw)}° • Pitch: {Math.round(pitch)}°
				</span>
				{hasActiveClipping && (
					<span
						className="text-amber-400 font-semibold font-mono flex items-center gap-0.5 text-[8.5px]"
						title="Активно 3D отсечение объема черепа"
						data-testid="cbct-hud-clipping-indicator"
					>
						<Scissors className="w-2 h-2" />
						<span>Срез</span>
					</span>
				)}
				{effectiveHibernated && (
					<span
						className="font-mono text-blue-300 flex items-center gap-0.5 text-[8.5px]"
						data-testid="cbct-hud-hibernation-status"
						title="Вкладка свёрнута: рендерер находится в спящем режиме гибернации"
					>
						<span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
						<span>Сон</span>
					</span>
				)}
				<span
					className="font-mono text-emerald-400/90 text-[8.5px]"
					data-testid="cbct-hud-gpu-status"
				>
					{isGpuActive
						? `⚡ GPU (${lastRenderTimeMs.toFixed(1)} мс)`
						: "CPU"}
				</span>
				<span
					className="font-mono text-cyan-400/90 text-[8.5px]"
					data-testid="cbct-hud-mar-status"
				>
					{isMarActive ? "MAR: ON" : "MAR: OFF"}
				</span>
				<span className="text-zinc-400 font-mono text-[8.5px]">
					HU {activePresetSpec.huMin}..{activePresetSpec.huMax}
				</span>
			</div>
		</div>
	);
};
