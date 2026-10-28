import React from "react";
import { NerveCanal } from "../../icons/DentalIcons";
import type { ImplantModel } from "../implantLibrary";

export interface CbctImplantNerveInspectionCardProps {
	readonly currentImplant: ImplantModel;
	readonly corridorGeometry: {
		cylinderRadiusMm: number;
		totalDiameterMm: number;
		totalLengthMm: number;
		safetyMarginMm: number;
	};
	readonly entryDepthMm: number;
	readonly angulationDeg: number;
	readonly vestibularOffsetMm: number;
	readonly safetyMarginMm: number;
	readonly nerveCanalCenter: { readonly x: number; readonly y: number; readonly z?: number } | null | undefined;
	readonly nerveInspection: {
		safetyStatus: "safe" | "warning" | "danger" | "unmeasured";
		isWarning: boolean;
		isDanger: boolean;
		telemetryTextRu: string;
	};
}

export const CbctImplantNerveInspectionCard: React.FC<CbctImplantNerveInspectionCardProps> = ({
	currentImplant,
	corridorGeometry,
	entryDepthMm,
	angulationDeg,
	vestibularOffsetMm,
	safetyMarginMm,
	nerveCanalCenter,
	nerveInspection,
}) => {
	return (
		<div className="w-full md:w-1/2 p-4 flex flex-col gap-4 bg-zinc-950/40 justify-between">
			{/* Active Fixture Specifications Card */}
			<div className="p-3.5 rounded-md bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-bold text-cyan-300">
						{currentImplant.brandName} {currentImplant.lineName}
					</span>
					<span className="text-xs font-mono text-zinc-400">
						арт. {currentImplant.articleNumber}
					</span>
				</div>

				<div className="grid grid-cols-2 gap-2 text-xs">
					<div className="flex flex-col text-zinc-400">
						<span>Диаметр тела:</span>
						<span className="text-zinc-200 font-mono font-semibold">Ø {currentImplant.diameterMm} мм</span>
					</div>
					<div className="flex flex-col text-zinc-400">
						<span>Длина имплантата:</span>
						<span className="text-zinc-200 font-mono font-semibold">{currentImplant.lengthMm} мм</span>
					</div>
					<div className="flex flex-col text-zinc-400">
						<span>Платформа:</span>
						<span className="text-zinc-200 font-mono">{currentImplant.platformDiameterMm} мм</span>
					</div>
					<div className="flex flex-col text-zinc-400">
						<span>Апекс:</span>
						<span className="text-zinc-200 font-mono">{currentImplant.apexDiameterMm} мм</span>
					</div>
				</div>

				<div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
					{currentImplant.clinicalIndicationRu}
				</div>
			</div>

			{/* 2D Cross-Section Schematic SVG */}
			<div className="flex-1 flex flex-col items-center justify-center p-2 rounded-md bg-black/60 border border-zinc-800/60 min-h-[160px] relative">
				<svg
					viewBox="-20 -5 40 45"
					className="w-full h-40 max-h-48 overflow-visible"
					aria-label="Схема коридора безопасности имплантата"
				>
					{/* Safety corridor outline (dashed cyan) */}
					<rect
						x={-corridorGeometry.cylinderRadiusMm}
						y={entryDepthMm}
						width={corridorGeometry.totalDiameterMm}
						height={corridorGeometry.totalLengthMm}
						rx={corridorGeometry.safetyMarginMm}
						fill="rgba(6, 182, 212, 0.08)"
						stroke="rgba(6, 182, 212, 0.6)"
						strokeWidth="0.5"
						strokeDasharray="1.5, 1"
						transform={`rotate(${angulationDeg}, ${vestibularOffsetMm}, ${entryDepthMm})`}
					/>

					{/* Implant body cylinder (solid ivory/cyan) */}
					<rect
						x={-currentImplant.diameterMm / 2}
						y={entryDepthMm}
						width={currentImplant.diameterMm}
						height={currentImplant.lengthMm}
						rx={0.8}
						fill="rgba(242, 232, 214, 0.85)"
						stroke="#06b6d4"
						strokeWidth="0.75"
						transform={`rotate(${angulationDeg}, ${vestibularOffsetMm}, ${entryDepthMm})`}
					/>

					{/* Nerve canal marker if present */}
					{nerveCanalCenter && (
						<g transform={`translate(${nerveCanalCenter.x}, ${nerveCanalCenter.y})`}>
							<circle r={1.4} fill="rgba(239, 68, 68, 0.5)" stroke="#ef4444" strokeWidth="0.5" />
							<circle
								r={1.4 + safetyMarginMm}
								fill="none"
								stroke="rgba(239, 68, 68, 0.3)"
								strokeWidth="0.4"
								strokeDasharray="1, 1"
							/>
						</g>
					)}
				</svg>

				<div className="absolute top-2 right-2 text-[10px] text-zinc-400 font-mono bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
					Коридор: {safetyMarginMm.toFixed(1)} мм
				</div>
			</div>

			{/* Calm Nerve Telemetry Banner (Doctor Autonomy - Mandate 8e) */}
			<div
				className={`p-3 rounded-md border flex items-center justify-between text-xs ${
					nerveInspection.safetyStatus === "unmeasured"
						? "bg-zinc-900/60 border-zinc-800 text-zinc-300"
						: nerveInspection.isDanger
							? "bg-zinc-900 border-amber-500/40 text-amber-200"
							: nerveInspection.isWarning
								? "bg-zinc-900 border-amber-500/30 text-amber-300"
								: "bg-zinc-900 border-emerald-500/40 text-emerald-300"
				}`}
				data-testid="cbct-nerve-telemetry-banner"
			>
				<div className="flex items-center gap-2">
					<NerveCanal className="w-4 h-4 text-cyan-400" />
					<div className="flex flex-col">
						<span className="font-semibold">Нижнечелюстной канал (N. alveolaris inferior):</span>
						<span className="font-mono font-bold text-sm">
							{nerveInspection.telemetryTextRu}
						</span>
					</div>
				</div>

				<div className="text-[11px] text-right font-medium">
					{nerveInspection.safetyStatus === "safe" && (
						<span className="text-emerald-400">Коридор соблюден</span>
					)}
					{nerveInspection.safetyStatus === "warning" && (
						<span className="text-amber-400">Буферная зона</span>
					)}
					{nerveInspection.safetyStatus === "danger" && (
						<span className="text-amber-300">Приближение к каналу</span>
					)}
					{nerveInspection.safetyStatus === "unmeasured" && (
						<span className="text-zinc-400">Требуется разметка</span>
					)}
				</div>
			</div>
		</div>
	);
};
