/**
 * DENTE CRM — Alveolar Ridge Cross-Section Grid (Multi-Slice Transverse Gallery)
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i, Carl Misch (2008), Mandate 8b (<= 120 lines).
 */

import React, { useState, useMemo, useCallback } from "react";
import type { CrossSectionSliceData } from "../../../dentalCurveEngine";
import type { ClinicalImplantSpec, ClinicalImplantPose } from "./implantCatalog";
import { ImplantGridToolbar } from "./grid/ImplantGridToolbar";
import { CrossSectionCard } from "./grid/CrossSectionCard";

export interface ImplantCrossSectionGridProps {
	readonly crossSections: readonly CrossSectionSliceData[];
	readonly activeCrossSectionIdx: number;
	readonly onChangeCrossSectionIdx?: ((idx: number) => void) | undefined;
	readonly crossSectionStepMm?: number | undefined;
	readonly onChangeCrossSectionStepMm?: ((step: number) => void) | undefined;
	readonly selectedImplant?: ClinicalImplantSpec | undefined;
	readonly implantPose?: ClinicalImplantPose | undefined;
	readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly onSelectTooth?: ((fdi: number | string) => void) | undefined;
	readonly onToggleMaximize?: (() => void) | undefined;
	readonly isMaximized?: boolean | undefined;
	readonly patientDisplayName?: string | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly gamma?: number | undefined;
	readonly airCutoffHU?: number | undefined;
	readonly softKnee?: boolean | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly className?: string | undefined;
}

export const ImplantCrossSectionGrid: React.FC<ImplantCrossSectionGridProps> = ({
	crossSections, activeCrossSectionIdx, onChangeCrossSectionIdx, crossSectionStepMm = 2.0,
	onChangeCrossSectionStepMm, selectedImplant, implantPose, jawType = "mandible",
	onToggleMaximize, isMaximized = false, windowWidth = 4025, windowLevel = 525,
	gamma = 1.50, airCutoffHU = -500, softKnee = false, slabThicknessMm = 1.0, className = "",
}) => {
	const [gridCount, setGridCount] = useState<number>(6);
	const [showMorphometryLines, setShowMorphometryLines] = useState<boolean>(true);
	const totalSlices = crossSections.length;

	const visibleSliceIndices = useMemo(() => {
		if (totalSlices === 0) return [];
		const half = Math.floor(gridCount / 2);
		let start = activeCrossSectionIdx - half;
		let end = start + gridCount;
		if (start < 0) { start = 0; end = Math.min(totalSlices, gridCount); }
		else if (end > totalSlices) { end = totalSlices; start = Math.max(0, end - gridCount); }
		const indices: number[] = [];
		for (let i = start; i < end; i++) indices.push(i);
		return indices;
	}, [totalSlices, activeCrossSectionIdx, gridCount]);

	const handleNavigate = useCallback((delta: number) => {
		if (totalSlices === 0 || !onChangeCrossSectionIdx) return;
		onChangeCrossSectionIdx(Math.max(0, Math.min(totalSlices - 1, activeCrossSectionIdx + delta)));
	}, [totalSlices, activeCrossSectionIdx, onChangeCrossSectionIdx]);

	return (
		<div className={`flex flex-col min-h-0 min-w-0 w-full h-full bg-zinc-950 text-zinc-100 rounded-md border border-zinc-800 overflow-hidden ${className}`} data-testid="cbct-implant-cross-section-grid-root">
			<ImplantGridToolbar
				totalSlices={totalSlices} activeCrossSectionIdx={activeCrossSectionIdx}
				nearestToothFdi={crossSections[activeCrossSectionIdx]?.nearestToothFdi}
				windowWidth={windowWidth} windowLevel={windowLevel} gamma={gamma} slabThicknessMm={slabThicknessMm}
				crossSectionStepMm={crossSectionStepMm} onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
				showMorphometryLines={showMorphometryLines} onToggleMorphometry={() => setShowMorphometryLines((p) => !p)}
				onNavigate={handleNavigate} gridCount={gridCount} onSetGridCount={setGridCount}
				onToggleMaximize={onToggleMaximize} isMaximized={isMaximized}
			/>

			<div
				className="flex-1 min-h-0 p-1.5 grid gap-1.5 overflow-y-auto"
				style={{
					gridTemplateColumns: gridCount <= 4
						? "repeat(auto-fit, minmax(240px, 1fr))"
						: gridCount <= 6 ? "repeat(auto-fit, minmax(200px, 1fr))" : "repeat(auto-fit, minmax(170px, 1fr))",
				}}
				data-testid="cbct-cross-section-cards-container"
			>
				{visibleSliceIndices.map((sliceIdx) => {
					const slice = crossSections[sliceIdx];
					if (!slice) return null;
					return (
						<CrossSectionCard
							key={`cs-${sliceIdx}-${slice.distanceAlongArchMm}`} slice={slice} sliceIdx={sliceIdx}
							isActive={sliceIdx === activeCrossSectionIdx} onClick={() => onChangeCrossSectionIdx?.(sliceIdx)}
							selectedImplant={selectedImplant} implantPose={implantPose} jawType={jawType}
							showMorphometry={showMorphometryLines} showGrid={true} windowWidth={windowWidth}
							windowLevel={windowLevel} gamma={gamma} airCutoffHU={airCutoffHU} softKnee={softKnee}
						/>
					);
				})}
			</div>
		</div>
	);
};
