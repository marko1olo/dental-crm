/**
 * DENTE CRM — Alveolar Ridge Multi-Cross-Section Grid (Panoramic Workspace)
 * Standards: Planmeca Romexis 3D / Vatech Ez3D-i transverse cross-section array.
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useState, useMemo, useCallback } from "react";
import { Layers } from "lucide-react";
import type { CbctVoxelVolume } from "../../cbctMprMath";
import type { CrossSectionSliceData, DentalArchCurve } from "../../dentalCurveEngine";
import { findArchPointAndNormalAtDistance } from "./panoramicGrid/archDistanceMath";
import { type MultiCrossSectionItem, extractMultiCrossSectionsAroundCenter } from "./panoramicGrid/multiCrossSectionExtractor";
import { MultiCrossSectionCard } from "./panoramicGrid/MultiCrossSectionCard";
import { PanoramicCrossSectionToolbar } from "./panoramicGrid/PanoramicCrossSectionToolbar";

export type { MultiCrossSectionItem };
export { findArchPointAndNormalAtDistance, extractMultiCrossSectionsAroundCenter };

export interface PanoramicCrossSectionGridProps {
	readonly volume?: CbctVoxelVolume | null | undefined;
	readonly archCurve?: DentalArchCurve | undefined;
	readonly activeCrossSection?: CrossSectionSliceData | null | undefined;
	readonly activeCrossSectionIdx?: number | undefined;
	readonly crossSections?: readonly CrossSectionSliceData[] | undefined;
	readonly onChangeCrossSectionIdx?: ((idx: number) => void) | undefined;
	readonly crossSectionStepMm?: number | undefined;
	readonly onChangeCrossSectionStepMm?: ((step: number) => void) | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly className?: string | undefined;
}

export const PanoramicCrossSectionGrid: React.FC<PanoramicCrossSectionGridProps> = ({
	volume, archCurve, activeCrossSection, activeCrossSectionIdx = 0, crossSections = [],
	onChangeCrossSectionIdx, crossSectionStepMm = 1.0, onChangeCrossSectionStepMm,
	windowWidth = 4025, windowLevel = 525, className = "",
}) => {
	const [sliceCount, setSliceCount] = useState<6 | 8 | 10>(8);
	const [localStepMm, setLocalStepMm] = useState<number>(crossSectionStepMm || 1.0);
	const activeStep = crossSectionStepMm ?? localStepMm;

	const handleStepChange = useCallback((step: number) => {
		setLocalStepMm(step);
		onChangeCrossSectionStepMm?.(step);
	}, [onChangeCrossSectionStepMm]);

	const centerDistanceMm = useMemo(() => {
		if (activeCrossSection && Number.isFinite(activeCrossSection.distanceAlongArchMm)) return activeCrossSection.distanceAlongArchMm;
		if (crossSections[activeCrossSectionIdx]?.distanceAlongArchMm !== undefined) return crossSections[activeCrossSectionIdx]!.distanceAlongArchMm;
		return (archCurve?.totalArcLengthMm || 100.0) * 0.5;
	}, [activeCrossSection, crossSections, activeCrossSectionIdx, archCurve]);

	const multiSliceItems: MultiCrossSectionItem[] = useMemo(() => {
		if (volume && archCurve && archCurve.splinePointsMm?.length > 1 && !volume.isDisposed) {
			const resliced = extractMultiCrossSectionsAroundCenter(volume, archCurve, centerDistanceMm, {
				count: sliceCount, stepMm: activeStep,
				sliceCenterZMm: activeCrossSection?.centerPointMm?.z ?? archCurve.planeZMm ?? -10.0,
				windowWidth, windowLevel, gamma: 1.50, useGpu: true,
			});
			if (resliced.length > 0) return resliced;
		}

		if (crossSections.length > 0) {
			const centerIdx = sliceCount === 6 ? 2 : sliceCount === 10 ? 4 : 3;
			return Array.from({ length: sliceCount }, (_, i) => {
				const offsetStep = i - centerIdx;
				const deltaOffsetMm = offsetStep * activeStep;
				const targetDist = centerDistanceMm + deltaOffsetMm;
				let bestSlice = crossSections[0]!, minDiff = Infinity;
				for (const s of crossSections) {
					const diff = Math.abs(s.distanceAlongArchMm - targetDist);
					if (diff < minDiff) { minDiff = diff; bestSlice = s; }
				}
				const isCenter = offsetStep === 0;
				const labelMm = isCenter ? "0.0 мм (центр)" : `${deltaOffsetMm > 0 ? "+" : ""}${deltaOffsetMm.toFixed(1)} мм`;
				return { slice: bestSlice, deltaOffsetMm, isCenter, labelMm };
			});
		}
		return [];
	}, [volume, archCurve, centerDistanceMm, sliceCount, activeStep, activeCrossSection, windowWidth, windowLevel, crossSections]);

	const totalSectionsCount = crossSections.length;
	const handleNavigateCenter = useCallback((delta: number) => {
		if (!onChangeCrossSectionIdx || totalSectionsCount === 0) return;
		onChangeCrossSectionIdx(Math.max(0, Math.min(totalSectionsCount - 1, activeCrossSectionIdx + delta)));
	}, [onChangeCrossSectionIdx, totalSectionsCount, activeCrossSectionIdx]);

	const handleCardClick = useCallback((item: MultiCrossSectionItem) => {
		if (!onChangeCrossSectionIdx || totalSectionsCount === 0) return;
		let chosenIdx = activeCrossSectionIdx, minDiff = Infinity;
		for (let i = 0; i < crossSections.length; i++) {
			const diff = Math.abs(crossSections[i]!.distanceAlongArchMm - item.slice.distanceAlongArchMm);
			if (diff < minDiff) { minDiff = diff; chosenIdx = i; }
		}
		onChangeCrossSectionIdx(chosenIdx);
	}, [onChangeCrossSectionIdx, totalSectionsCount, crossSections, activeCrossSectionIdx]);

	const gridColsClass = sliceCount === 6 ? "grid-cols-3 grid-rows-2" : sliceCount === 10 ? "grid-cols-5 grid-rows-2" : "grid-cols-4 grid-rows-2";

	return (
		<div className={`flex flex-col min-h-0 min-w-0 w-full h-full bg-black text-zinc-100 rounded-md overflow-hidden select-none ${className}`} data-testid="cbct-panoramic-cross-section-grid">
			<PanoramicCrossSectionToolbar activeStep={activeStep} onStepChange={handleStepChange} sliceCount={sliceCount} onSliceCountChange={setSliceCount} onNavigateCenter={handleNavigateCenter} activeCrossSectionIdx={activeCrossSectionIdx} totalSectionsCount={totalSectionsCount} />
			<div className={`flex-1 min-h-0 min-w-0 w-full h-full p-1 grid gap-1 overflow-hidden ${gridColsClass}`} data-testid="cbct-panoramic-2row-grid-container">
				{multiSliceItems.map((item, idx) => (
					<MultiCrossSectionCard key={`cs-multi-${idx}-${item.deltaOffsetMm.toFixed(1)}`} item={item} indexInGrid={idx} onClick={() => handleCardClick(item)} />
				))}
				{multiSliceItems.length === 0 && (
					<div className="col-span-full row-span-full flex flex-col items-center justify-center text-zinc-500 text-xs gap-1.5 p-4">
						<Layers className="w-6 h-6 text-zinc-700 animate-pulse" />
						<span>Построение поперечных срезов челюсти...</span>
					</div>
				)}
			</div>
		</div>
	);
};
