import React, { useRef, useMemo, useEffect } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { CrossSectionSliceData } from "../../../../dentalCurveEngine";
import type { ClinicalImplantSpec, ClinicalImplantPose } from "../implantCatalog";
import { measureCrossSectionRidgeWidths2_4_6 } from "../../../../cbctRidgeCaliperMath";
import { renderCrossSectionToCanvas } from "./CrossSectionCanvasRenderer";

export interface CrossSectionCardProps {
	readonly slice: CrossSectionSliceData;
	readonly sliceIdx: number;
	readonly isActive: boolean;
	readonly onClick: () => void;
	readonly selectedImplant?: ClinicalImplantSpec | undefined;
	readonly implantPose?: ClinicalImplantPose | undefined;
	readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly showMorphometry: boolean;
	readonly showGrid: boolean;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly gamma?: number | undefined;
	readonly airCutoffHU?: number | undefined;
	readonly softKnee?: boolean | undefined;
}

export const CrossSectionCard: React.FC<CrossSectionCardProps> = ({
	slice, sliceIdx, isActive, onClick, selectedImplant, implantPose,
	jawType = "mandible", showMorphometry, showGrid, windowWidth, windowLevel, gamma, airCutoffHU, softKnee,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const morphometry = useMemo(() => {
		if (!slice.pixelData || slice.pixelData.length === 0) return null;
		return measureCrossSectionRidgeWidths2_4_6(
			slice.pixelData, slice.widthPx, slice.heightPx, slice.pixelSpacingMm || 0.25, jawType, slice.rawHuData,
		);
	}, [slice, jawType]);

	useEffect(() => {
		if (canvasRef.current) {
			renderCrossSectionToCanvas(canvasRef.current, {
				slice, morphometry, showMorphometry, showGrid, selectedImplant, implantPose,
				isActive, windowWidth, windowLevel, gamma, airCutoffHU, softKnee,
			});
		}
	}, [slice, morphometry, showMorphometry, showGrid, selectedImplant, implantPose, isActive, windowWidth, windowLevel, gamma, airCutoffHU, softKnee]);

	const fdiTooth = slice.nearestToothFdi;
	const isAdequate = morphometry?.isAdequate ?? true;

	return (
		<div
			onClick={onClick}
			className={`flex flex-col rounded-lg overflow-hidden transition-all cursor-pointer relative bg-zinc-950 select-none ${
				isActive ? "border-2 border-orange-500 ring-2 ring-orange-500/70 shadow-[0_0_14px_rgba(249,115,22,0.45)]" : "border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60"
			}`}
			data-testid={`cbct-cross-section-card-${sliceIdx}`}
			role="button" tabIndex={0} aria-pressed={isActive}
		>
			<div className={`flex items-center justify-between px-2 py-1 border-b text-[11px] ${isActive ? "bg-orange-950/60 border-orange-500/50" : "bg-zinc-900/90 border-zinc-800"}`}>
				<div className="flex items-center gap-1.5 min-w-0">
					<span className={`font-mono font-bold ${isActive ? "text-orange-300" : "text-zinc-200"}`}>Section {sliceIdx + 1}</span>
					<span className="text-[10px] text-zinc-400 font-mono">({slice.distanceAlongArchMm.toFixed(1)} мм)</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="flex items-center gap-1 text-[9px] font-bold font-mono text-zinc-400">
						<span title="Lingual (Язычная)">L</span><span>•</span><span title="Buccal (Щёчная)">B</span>
					</div>
					{fdiTooth && (
						<span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${isActive ? "bg-orange-500/25 text-orange-200 border border-orange-500/40" : "bg-zinc-800 text-cyan-300 border border-zinc-700"}`}>
							#{fdiTooth}
						</span>
					)}
					{isActive && <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.9)] animate-pulse" />}
				</div>
			</div>

			<div className="relative flex-1 min-h-[140px] max-h-[220px] flex items-center justify-center bg-black overflow-hidden">
				<canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" data-testid={`cbct-cross-canvas-${sliceIdx}`} />
				<span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-zinc-400 bg-black/60 px-1 rounded pointer-events-none">L</span>
				<span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold text-zinc-400 bg-black/60 px-1 rounded pointer-events-none">B</span>
				{showMorphometry && morphometry?.isDetected && morphometry.w2Valid && morphometry.widthW2Mm >= 3.0 && (
					<div className="absolute top-1 right-1 flex flex-col items-end gap-0.5 pointer-events-none font-mono text-[9px] bg-zinc-950/80 px-1 py-0.5 rounded border border-zinc-800/80 shadow-xs backdrop-blur-xs">
						<span className="text-cyan-400">W2: <span className="text-zinc-200 font-semibold">{morphometry.widthW2Mm.toFixed(1)}</span> мм</span>
						{morphometry.w4Valid && morphometry.widthW4Mm >= 3.0 && (
							<span className="text-emerald-400">W4: <span className="text-zinc-200 font-semibold">{morphometry.widthW4Mm.toFixed(1)}</span> мм</span>
						)}
						{morphometry.w6Valid && morphometry.widthW6Mm >= 3.0 && (
							<span className="text-purple-400">W6: <span className="text-zinc-200 font-semibold">{morphometry.widthW6Mm.toFixed(1)}</span> мм</span>
						)}
					</div>
				)}
			</div>

			<div className="px-2 py-1 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
				<span className="font-mono text-zinc-400">H: <strong className="text-zinc-200">{morphometry?.isDetected && morphometry.heightValid ? morphometry.availableHeightMm.toFixed(1) : "—"}</strong> мм</span>
				<div className="flex items-center gap-1">
					{!morphometry || !morphometry.isDetected ? <span className="text-zinc-500 text-[9px] font-mono">—</span> : isAdequate ? (
						<span className="text-emerald-400 flex items-center gap-0.5 text-[9px] font-medium" title="Достаточный объем гребня для имплантации">
							<ShieldCheck className="w-3 h-3 text-emerald-400" /><span>Норма</span>
						</span>
					) : (
						<span className="text-amber-400 flex items-center gap-0.5 text-[9px] font-medium" title="Рекомендована аугментация / костная пластика">
							<ShieldAlert className="w-3 h-3 text-amber-400" /><span>Дефицит</span>
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
