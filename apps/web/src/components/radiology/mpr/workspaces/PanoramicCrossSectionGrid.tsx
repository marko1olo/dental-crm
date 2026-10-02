/**
 * DENTE CRM — Alveolar Ridge Multi-Cross-Section Grid (Panoramic Workspace)
 * Standards: Planmeca Romexis 3D / Vatech Ez3D-i transverse cross-section array.
 * Governed by Mandate 8b (file size strict ceiling <= 800 lines) & Mandate 8e (Doctor Autonomy).
 *
 * Implements:
 * 1. Balanced 2-row multi-slice transverse gallery (6, 8, or 10 slices) centered around cursor.
 * 2. Transverse cuts with 1.0 - 2.0 mm step along the dental arch.
 * 3. Exact relative millimeter labels under each slice (-3.0 mm, -2.0 mm, 0.0 mm center, +1.0 mm...).
 * 4. Canonical radiological contrast (4025/525 HU, Gamma 1.50).
 * 5. Complete removal of bulky 10-20-30 mm ruler clutter.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Grid2X2, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import type { CbctVoxelVolume, Point2D } from "../../cbctMprMath";
import type { CrossSectionSliceData, DentalArchCurve } from "../../dentalCurveEngine";
import { calculateArchTangentsAndNormals } from "../../cbctArchSplineMath";
import {
	findNearestToothAnchorToDistance,
	extractSingleCrossSectionSlice,
} from "../../cbctCrossSectionResliceMath";

export interface MultiCrossSectionItem {
	readonly slice: CrossSectionSliceData;
	readonly deltaOffsetMm: number;
	readonly isCenter: boolean;
	readonly labelMm: string;
}

/**
 * Finds exact 2D point, unit normal and tangent along dental arch curve at a given arc distance.
 */
export function findArchPointAndNormalAtDistance(
	distanceAlongArchMm: number,
	archCurve: DentalArchCurve,
): { point: Point2D; normal: Point2D; tangent: Point2D } {
	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) {
		return {
			point: { x: 0, y: 0 },
			normal: { x: 0, y: 1 },
			tangent: { x: 1, y: 0 },
		};
	}

	const lastIdx = vectorField.length - 1;
	if (distanceAlongArchMm <= vectorField[0]!.distanceAlongArchMm) {
		const f = vectorField[0]!;
		return { point: f.point, normal: f.normal, tangent: f.tangent };
	}
	if (distanceAlongArchMm >= vectorField[lastIdx]!.distanceAlongArchMm) {
		const l = vectorField[lastIdx]!;
		return { point: l.point, normal: l.normal, tangent: l.tangent };
	}

	for (let i = 0; i < lastIdx; i++) {
		const n0 = vectorField[i]!;
		const n1 = vectorField[i + 1]!;
		if (distanceAlongArchMm >= n0.distanceAlongArchMm && distanceAlongArchMm <= n1.distanceAlongArchMm) {
			const span = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
			const t = span > 1e-4 ? (distanceAlongArchMm - n0.distanceAlongArchMm) / span : 0;
			const pt: Point2D = {
				x: n0.point.x + (n1.point.x - n0.point.x) * t,
				y: n0.point.y + (n1.point.y - n0.point.y) * t,
			};
			const norm: Point2D = {
				x: n0.normal.x + (n1.normal.x - n0.normal.x) * t,
				y: n0.normal.y + (n1.normal.y - n0.normal.y) * t,
			};
			const nLen = Math.hypot(norm.x, norm.y) || 1;
			norm.x /= nLen;
			norm.y /= nLen;

			const tang: Point2D = {
				x: n0.tangent.x + (n1.tangent.x - n0.tangent.x) * t,
				y: n0.tangent.y + (n1.tangent.y - n0.tangent.y) * t,
			};
			const tLen = Math.hypot(tang.x, tang.y) || 1;
			tang.x /= tLen;
			tang.y /= tLen;

			return { point: pt, normal: norm, tangent: tang };
		}
	}

	const fallback = vectorField[0]!;
	return { point: fallback.point, normal: fallback.normal, tangent: fallback.tangent };
}

/**
 * Extracts a balanced 2-row multi-slice transverse gallery (6, 8, or 10 slices)
 * centered around the active cursor/tooth position along the dental arch.
 */
export function extractMultiCrossSectionsAroundCenter(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	centerDistanceMm: number,
	options: {
		readonly count?: number | undefined;
		readonly stepMm?: number | undefined;
		readonly sliceCenterZMm?: number | undefined;
		readonly windowWidth?: number | undefined;
		readonly windowLevel?: number | undefined;
		readonly gamma?: number | undefined;
		readonly useGpu?: boolean | undefined;
	} = {},
): MultiCrossSectionItem[] {
	const count = options.count === 6 ? 6 : options.count === 10 ? 10 : 8;
	const stepMm = Number.isFinite(options.stepMm) && (options.stepMm ?? 0) > 0 ? options.stepMm! : 1.0;
	const zCenter = Number.isFinite(options.sliceCenterZMm)
		? options.sliceCenterZMm!
		: (archCurve.planeZMm ?? -10.0);
	const windowWidth = options.windowWidth ?? 4025;
	const windowLevel = options.windowLevel ?? 525;
	const gamma = options.gamma ?? 1.50;

	// Center index in array
	const centerIndex = count === 6 ? 2 : count === 10 ? 4 : 3;

	const totalArcLen = archCurve.totalArcLengthMm || 100.0;
	const items: MultiCrossSectionItem[] = [];

	for (let i = 0; i < count; i++) {
		const offsetIdx = i - centerIndex;
		const deltaOffsetMm = offsetIdx * stepMm;
		const targetDistanceMm = Math.max(0, Math.min(totalArcLen, centerDistanceMm + deltaOffsetMm));
		const { point, normal } = findArchPointAndNormalAtDistance(targetDistanceMm, archCurve);
		const nearestAnchor = findNearestToothAnchorToDistance(targetDistanceMm, archCurve);

		const isCenter = offsetIdx === 0;
		const labelMm = isCenter
			? "0.0 мм (центр)"
			: `${deltaOffsetMm > 0 ? "+" : ""}${deltaOffsetMm.toFixed(1)} мм`;

		const slice = extractSingleCrossSectionSlice(
			volume,
			{ x: point.x, y: point.y, z: zCenter },
			normal,
			i + 1,
			targetDistanceMm,
			nearestAnchor,
			{
				windowWidth,
				windowLevel,
				gamma,
				useGpu: options.useGpu ?? true,
				offsetFromMidlineMm: deltaOffsetMm,
			},
		);

		items.push({
			slice,
			deltaOffsetMm,
			isCenter,
			labelMm,
		});
	}

	return items;
}

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

const COUNT_OPTIONS = [6, 8, 10] as const;
const STEP_OPTIONS = [
	{ step: 1.0, label: "1 мм" },
	{ step: 1.5, label: "1.5 мм" },
	{ step: 2.0, label: "2 мм" },
] as const;

export const PanoramicCrossSectionGrid: React.FC<PanoramicCrossSectionGridProps> = ({
	volume,
	archCurve,
	activeCrossSection,
	activeCrossSectionIdx = 0,
	crossSections = [],
	onChangeCrossSectionIdx,
	crossSectionStepMm = 1.0,
	onChangeCrossSectionStepMm,
	windowWidth = 4025,
	windowLevel = 525,
	jawType = "mandible",
	className = "",
}) => {
	const [sliceCount, setSliceCount] = useState<6 | 8 | 10>(8);
	const [localStepMm, setLocalStepMm] = useState<number>(crossSectionStepMm || 1.0);

	const activeStep = crossSectionStepMm ?? localStepMm;

	const handleStepChange = useCallback(
		(step: number) => {
			setLocalStepMm(step);
			onChangeCrossSectionStepMm?.(step);
		},
		[onChangeCrossSectionStepMm],
	);

	// Determine active center distance along arch
	const centerDistanceMm = useMemo(() => {
		if (activeCrossSection && Number.isFinite(activeCrossSection.distanceAlongArchMm)) {
			return activeCrossSection.distanceAlongArchMm;
		}
		if (crossSections[activeCrossSectionIdx]?.distanceAlongArchMm !== undefined) {
			return crossSections[activeCrossSectionIdx]!.distanceAlongArchMm;
		}
		const totalArc = archCurve?.totalArcLengthMm || 100.0;
		return totalArc * 0.5;
	}, [activeCrossSection, crossSections, activeCrossSectionIdx, archCurve]);

	// Extract or select multi-slice items around center
	const multiSliceItems: MultiCrossSectionItem[] = useMemo(() => {
		// Option A: Live reslice directly from CBCT volume on GPU if volume and curve are present
		if (volume && archCurve && archCurve.splinePointsMm?.length > 1 && !volume.isDisposed) {
			const resliced = extractMultiCrossSectionsAroundCenter(
				volume,
				archCurve,
				centerDistanceMm,
				{
					count: sliceCount,
					stepMm: activeStep,
					sliceCenterZMm: activeCrossSection?.centerPointMm?.z ?? archCurve.planeZMm ?? -10.0,
					windowWidth,
					windowLevel,
					gamma: 1.50,
					useGpu: true,
				},
			);
			if (resliced.length > 0) return resliced;
		}

		// Option B: Select from existing crossSections array based on arc distance
		if (crossSections.length > 0) {
			const centerIdx = sliceCount === 6 ? 2 : sliceCount === 10 ? 4 : 3;
			const items: MultiCrossSectionItem[] = [];

			for (let i = 0; i < sliceCount; i++) {
				const offsetStep = i - centerIdx;
				const deltaOffsetMm = offsetStep * activeStep;
				const targetDist = centerDistanceMm + deltaOffsetMm;

				// Find closest slice in array
				let bestSlice = crossSections[0]!;
				let minDiff = Infinity;
				for (const s of crossSections) {
					const diff = Math.abs(s.distanceAlongArchMm - targetDist);
					if (diff < minDiff) {
						minDiff = diff;
						bestSlice = s;
					}
				}

				const isCenter = offsetStep === 0;
				const labelMm = isCenter
					? "0.0 мм (центр)"
					: `${deltaOffsetMm > 0 ? "+" : ""}${deltaOffsetMm.toFixed(1)} мм`;

				items.push({
					slice: bestSlice,
					deltaOffsetMm,
					isCenter,
					labelMm,
				});
			}

			return items;
		}

		return [];
	}, [
		volume,
		archCurve,
		centerDistanceMm,
		sliceCount,
		activeStep,
		activeCrossSection,
		windowWidth,
		windowLevel,
		crossSections,
	]);

	const totalSectionsCount = crossSections.length;

	const handleNavigateCenter = useCallback(
		(delta: number) => {
			if (!onChangeCrossSectionIdx || totalSectionsCount === 0) return;
			const nextIdx = Math.max(0, Math.min(totalSectionsCount - 1, activeCrossSectionIdx + delta));
			onChangeCrossSectionIdx(nextIdx);
		},
		[onChangeCrossSectionIdx, totalSectionsCount, activeCrossSectionIdx],
	);

	const handleCardClick = useCallback(
		(item: MultiCrossSectionItem) => {
			if (!onChangeCrossSectionIdx || totalSectionsCount === 0) return;
			// Find corresponding slice index in crossSections array
			let chosenIdx = activeCrossSectionIdx;
			let minDiff = Infinity;
			for (let i = 0; i < crossSections.length; i++) {
				const diff = Math.abs(crossSections[i]!.distanceAlongArchMm - item.slice.distanceAlongArchMm);
				if (diff < minDiff) {
					minDiff = diff;
					chosenIdx = i;
				}
			}
			onChangeCrossSectionIdx(chosenIdx);
		},
		[onChangeCrossSectionIdx, totalSectionsCount, crossSections, activeCrossSectionIdx],
	);

	return (
		<div
			className={`flex flex-col min-h-0 min-w-0 w-full h-full bg-black text-zinc-100 rounded-md overflow-hidden select-none ${className}`}
			data-testid="cbct-panoramic-cross-section-grid"
		>
			{/* Top Toolbar: Density-Optimized Bar (28px height, Mandate 8k) */}
			<div className="h-7 px-2 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between gap-1.5 text-xs shrink-0">
				{/* Left: Title & Density Icon */}
				<div className="flex items-center gap-1.5 min-w-0">
					<Grid2X2 className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
					<span className="font-medium text-zinc-400 text-[11px] truncate">
						Срезы гребня (2 ряда)
					</span>
				</div>

				{/* Center: Controls for Step (1 mm | 1.5 mm | 2 mm) & Count (6 | 8 | 10) */}
				<div className="flex items-center gap-2">
					{/* Step Selector */}
					<div
						className="flex items-center bg-zinc-900/90 rounded border border-zinc-800 p-0.5 text-[10px]"
						role="group"
						aria-label="Шаг срезов"
					>
						<span className="text-zinc-500 px-1 font-semibold hidden sm:inline">Шаг:</span>
						{STEP_OPTIONS.map((opt) => {
							const isCur = Math.abs(activeStep - opt.step) < 0.2;
							return (
								<button
									key={opt.step}
									type="button"
									onClick={() => handleStepChange(opt.step)}
									className={`px-1.5 py-0.2 rounded font-mono font-medium transition-colors cursor-pointer ${
										isCur
											? "bg-amber-600/90 text-white font-bold shadow-xs"
											: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
									}`}
									title={`Шаг нарезки ${opt.label}`}
									data-testid={`cbct-grid-step-${opt.step}`}
								>
									{opt.label}
								</button>
							);
						})}
					</div>

					{/* Count Selector */}
					<div
						className="flex items-center bg-zinc-900/90 rounded border border-zinc-800 p-0.5 text-[10px]"
						role="group"
						aria-label="Количество срезов"
					>
						<span className="text-zinc-500 px-1 font-semibold hidden md:inline">Срезов:</span>
						{COUNT_OPTIONS.map((cnt) => {
							const isCur = sliceCount === cnt;
							return (
								<button
									key={cnt}
									type="button"
									onClick={() => setSliceCount(cnt)}
									className={`w-5 h-4.5 rounded font-mono font-medium flex items-center justify-center transition-colors cursor-pointer ${
										isCur
											? "bg-purple-600/90 text-white font-bold shadow-xs"
											: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
									}`}
									title={`${cnt} срезов в 2 ряда`}
									data-testid={`cbct-grid-count-${cnt}`}
								>
									{cnt}
								</button>
							);
						})}
					</div>
				</div>

				{/* Right: Step Navigation (< / >) */}
				<div className="flex items-center gap-0.5 shrink-0">
					<button
						type="button"
						onClick={() => handleNavigateCenter(-1)}
						disabled={activeCrossSectionIdx <= 0}
						className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
						title="Сдвиг центра назад"
						data-testid="cbct-grid-nav-prev"
					>
						<ChevronLeft className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => handleNavigateCenter(1)}
						disabled={totalSectionsCount === 0 || activeCrossSectionIdx >= totalSectionsCount - 1}
						className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
						title="Сдвиг центра вперед"
						data-testid="cbct-grid-nav-next"
					>
						<ChevronRight className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{/* Main 2-Row Gallery Container */}
			<div
				className={`flex-1 min-h-0 min-w-0 w-full h-full p-1 grid gap-1 overflow-hidden ${
					sliceCount === 6
						? "grid-cols-3 grid-rows-2"
						: sliceCount === 10
							? "grid-cols-5 grid-rows-2"
							: "grid-cols-4 grid-rows-2"
				}`}
				data-testid="cbct-panoramic-2row-grid-container"
			>
				{multiSliceItems.map((item, idx) => (
					<MultiCrossSectionCard
						key={`cs-multi-${idx}-${item.deltaOffsetMm.toFixed(1)}`}
						item={item}
						indexInGrid={idx}
						onClick={() => handleCardClick(item)}
					/>
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

interface MultiCrossSectionCardProps {
	readonly item: MultiCrossSectionItem;
	readonly indexInGrid: number;
	readonly onClick: () => void;
}

const MultiCrossSectionCard: React.FC<MultiCrossSectionCardProps> = ({
	item,
	indexInGrid,
	onClick,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const { slice, isCenter, labelMm } = item;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !slice.pixelData || slice.pixelData.length === 0) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const width = slice.widthPx;
		const height = slice.heightPx;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		// Draw crisp radiological voxels
		const imgData = new ImageData(new Uint8ClampedArray(slice.pixelData), width, height);
		ctx.putImageData(imgData, 0, 0);
	}, [slice]);

	return (
		<div
			onClick={onClick}
			className={`flex flex-col min-h-0 min-w-0 rounded overflow-hidden border transition-all cursor-pointer relative bg-black select-none ${
				isCenter
					? "border-amber-500/90 shadow-[0_0_8px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/70"
					: "border-zinc-850 hover:border-zinc-700 hover:bg-zinc-950/60"
			}`}
			data-testid={`cbct-multi-cross-card-${indexInGrid}`}
			role="button"
			tabIndex={0}
			aria-pressed={isCenter}
			title={`Срез со смещением ${labelMm}. Клик для центрирования.`}
		>
			{/* Canvas Container with Anatomical Vestibular (B) / Lingual (L) markers */}
			<div className="flex-1 relative min-h-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
				<canvas
					ref={canvasRef}
					className="w-full h-full object-contain pointer-events-none"
					data-testid={`cbct-multi-cross-canvas-${indexInGrid}`}
				/>

				{/* Anatomical Side Markers (B = Buccal, L = Lingual) — Quiet text */}
				<span className="absolute bottom-0.5 left-1 text-[8px] font-mono font-bold text-zinc-600 uppercase pointer-events-none select-none">
					B
				</span>
				<span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-zinc-600 uppercase pointer-events-none select-none">
					L
				</span>
			</div>

			{/* Sub-label: Exact Millimeter Distance Relative to Center */}
			<div
				className={`h-4.5 px-1 flex items-center justify-between text-[10px] font-mono shrink-0 border-t ${
					isCenter
						? "bg-amber-950/40 border-amber-600/40 text-amber-300 font-bold"
						: "bg-zinc-950/90 border-zinc-900 text-zinc-500"
				}`}
			>
				<span className="truncate">{labelMm}</span>
			</div>
		</div>
	);
};
