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
	readonly sliceNumber: number;
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
 * Extracts a balanced multi-slice transverse gallery (3x3 grid / 9 slices or 2-row 6/8 slices)
 * centered around the active cursor/tooth position along the dental arch (Ez3D-i Section mode).
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
		readonly centerSliceIndex?: number | undefined;
	} = {},
): MultiCrossSectionItem[] {
	const count = options.count === 9 ? 9 : options.count === 6 ? 6 : options.count === 10 ? 10 : 8;
	const stepMm = Number.isFinite(options.stepMm) && (options.stepMm ?? 0) > 0 ? options.stepMm! : 1.0;
	const zCenter = Number.isFinite(options.sliceCenterZMm)
		? options.sliceCenterZMm!
		: (archCurve.planeZMm ?? -10.0);
	const windowWidth = options.windowWidth ?? 4025;
	const windowLevel = options.windowLevel ?? 525;
	const gamma = options.gamma ?? 1.50;
	const centerSliceNumber = (options.centerSliceIndex ?? 8) + 1;

	// Center index in array (4 for 9-grid 3x3, 2 for 6, 3 for 8)
	const centerIndex = count === 9 ? 4 : count === 6 ? 2 : count === 10 ? 4 : 3;

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
		const sliceNumber = Math.max(1, centerSliceNumber + offsetIdx);

		const slice = extractSingleCrossSectionSlice(
			volume,
			{ x: point.x, y: point.y, z: zCenter },
			normal,
			sliceNumber,
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
			sliceNumber,
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
	readonly onSwitchJaw?: ((jaw: "mandible" | "maxilla") => void) | undefined;
	readonly className?: string | undefined;
}

const COUNT_OPTIONS = [
	{ count: 9, label: "3×3" },
	{ count: 8, label: "2×4" },
	{ count: 6, label: "2×3" },
] as const;

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
	onSwitchJaw,
	className = "",
}) => {
	// Default to Ez3D-i canonical 3x3 (9 slices) grid
	const [sliceCount, setSliceCount] = useState<9 | 8 | 6>(9);
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
					centerSliceIndex: activeCrossSectionIdx,
				},
			);
			if (resliced.length > 0) return resliced;
		}

		// Option B: Select from existing crossSections array based on arc distance
		if (crossSections.length > 0) {
			const centerIdx = sliceCount === 9 ? 4 : sliceCount === 6 ? 2 : 3;
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
				const sliceNumber = Math.max(1, activeCrossSectionIdx + 1 + offsetStep);

				items.push({
					slice: bestSlice,
					deltaOffsetMm,
					isCenter,
					labelMm,
					sliceNumber,
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
		activeCrossSectionIdx,
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
						Срезы гребня ({sliceCount === 9 ? "3×3 Ez3D" : sliceCount === 8 ? "2×4" : "2×3"})
					</span>
				</div>

				{/* Center: Controls for Curve 1..8, Step & Count */}
				<div className="flex items-center gap-2">
					{/* Curve Selectors 1..8 (Ez3D-i Arch presets) */}
					<div
						className="hidden sm:flex items-center bg-zinc-900/90 rounded border border-zinc-800 p-0.5 text-[10px]"
						role="group"
						aria-label="Выбор кривой"
					>
						<span className="text-zinc-500 px-1 font-semibold hidden md:inline">Дуга:</span>
						{[1, 2, 3, 4, 5, 6, 7, 8].map((cNum) => {
							const isCur = (jawType === "maxilla" && cNum === 2) || (jawType !== "maxilla" && cNum === 1);
							return (
								<button
									key={cNum}
									type="button"
									onClick={() => {
										if (cNum === 2) onSwitchJaw?.("maxilla");
										else if (cNum === 1) onSwitchJaw?.("mandible");
									}}
									className={`w-4.5 h-4.5 rounded font-mono font-bold flex items-center justify-center transition-colors cursor-pointer ${
										isCur
											? "bg-emerald-600 text-white shadow-xs border border-emerald-400"
											: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
									}`}
									title={cNum === 1 ? "Дуга 1: Нижняя челюсть (НЧ)" : cNum === 2 ? "Дуга 2: Верхняя челюсть (ВЧ)" : `Дуга ${cNum}: Пользовательский сегмент`}
									data-testid={`cbct-curve-btn-${cNum}`}
								>
									{cNum}
								</button>
							);
						})}
					</div>

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
											? "bg-amber-950/70 text-amber-200 border border-amber-500/50 font-semibold shadow-xs"
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

					{/* Count/Layout Selector (3x3 | 2x4 | 2x3) */}
					<div
						className="flex items-center bg-zinc-900/90 rounded border border-zinc-800 p-0.5 text-[10px]"
						role="group"
						aria-label="Сетка срезов"
					>
						{COUNT_OPTIONS.map((opt) => {
							const isCur = sliceCount === opt.count;
							return (
								<button
									key={opt.count}
									type="button"
									onClick={() => setSliceCount(opt.count as 9 | 8 | 6)}
									className={`px-1.5 h-4.5 rounded font-mono font-medium flex items-center justify-center transition-colors cursor-pointer ${
										isCur
											? "bg-orange-950/70 text-orange-200 border border-orange-500/50 font-semibold shadow-xs"
											: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
									}`}
									title={`${opt.label} (${opt.count} срезов)`}
									data-testid={`cbct-grid-count-${opt.count}`}
								>
									{opt.label}
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

			{/* Main Gallery Container (3x3 grid by default, or 2-row) */}
			<div
				className={`flex-1 min-h-0 min-w-0 w-full h-full p-1 grid gap-1 overflow-hidden ${
					sliceCount === 9
						? "grid-cols-3 grid-rows-3"
						: sliceCount === 6
							? "grid-cols-3 grid-rows-2"
							: "grid-cols-4 grid-rows-2"
				}`}
				data-testid="cbct-panoramic-2row-grid-container"
			>
				{multiSliceItems.map((item, idx) => (
					<MultiCrossSectionCard
						key={`cs-multi-${idx}-${item.sliceNumber}-${item.deltaOffsetMm.toFixed(1)}`}
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
	const { slice, isCenter, labelMm, sliceNumber } = item;

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

		// 1. Draw radiological slice voxels
		const imgData = new ImageData(new Uint8ClampedArray(slice.pixelData), width, height);
		ctx.putImageData(imgData, 0, 0);

		// 2. Draw Ez3D-i Millimeter Scales (Vertical 30..-20 mm, Horizontal 20-10-0-10-20 mm)
		ctx.save();
		const spacing = slice.pixelSpacingMm || 0.25;
		const pxPerMm = 1.0 / spacing;
		const centerX = width / 2.0;
		const centerY = height / 2.0;

		// Vertical scale on the right
		const rightX = width - 2;
		ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
		ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
		ctx.font = "8px monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";

		for (let mm = -30; mm <= 30; mm += 1) {
			const y = centerY - mm * pxPerMm;
			if (y < 4 || y > height - 4) continue;
			const is10 = mm % 10 === 0;
			const is5 = mm % 5 === 0;
			const tickLen = is10 ? 5 : is5 ? 3 : 1.5;

			ctx.beginPath();
			ctx.moveTo(rightX, y);
			ctx.lineTo(rightX - tickLen, y);
			ctx.stroke();

			if (is10) {
				ctx.fillText(String(Math.abs(mm)), rightX - 6, y);
			}
		}

		// Horizontal scale at the bottom
		const bottomY = height - 2;
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";

		for (let mm = -20; mm <= 20; mm += 1) {
			const x = centerX + mm * pxPerMm;
			if (x < 6 || x > width - 6) continue;
			const is10 = mm % 10 === 0;
			const is5 = mm % 5 === 0;
			const tickLen = is10 ? 5 : is5 ? 3 : 1.5;

			ctx.beginPath();
			ctx.moveTo(x, bottomY);
			ctx.lineTo(x, bottomY - tickLen);
			ctx.stroke();

			if (is10) {
				ctx.fillText(String(Math.abs(mm)), x, bottomY - 6);
			}
		}

		ctx.restore();
	}, [slice]);

	return (
		<div
			onClick={onClick}
			className={`flex flex-col min-h-0 min-w-0 rounded overflow-hidden transition-all cursor-pointer relative bg-black select-none ${
				isCenter
					? "border-2 border-[#D96B27] ring-2 ring-[#D96B27]/70 shadow-[0_0_14px_rgba(217,107,39,0.45)]"
					: "border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-950/60"
			}`}
			data-testid={`cbct-multi-cross-card-${indexInGrid}`}
			role="button"
			tabIndex={0}
			aria-pressed={isCenter}
			title={`Срез Section ${sliceNumber} (${labelMm}). Клик для центрирования.`}
		>
			{/* Header: Section Number & Anatomical L / B Badges (Ez3D-i style) */}
			<div
				className={`h-4.5 px-1.5 flex items-center justify-between text-[10px] font-mono shrink-0 select-none ${
					isCenter
						? "bg-[#D96B27]/20 border-b border-[#D96B27]/50 text-orange-200 font-bold"
						: "bg-zinc-950/90 border-b border-zinc-900 text-zinc-400"
				}`}
			>
				<span className="truncate">
					Section {sliceNumber}
				</span>
				<div className="flex items-center gap-1.5 text-[9px] font-bold">
					<span className="text-zinc-300" title="Lingual (Язычная сторона)">L</span>
					<span className="text-zinc-500">•</span>
					<span className="text-zinc-300" title="Buccal (Щёчная сторона)">B</span>
				</div>
			</div>

			{/* Canvas Container with Millimeter Overlays */}
			<div className="flex-1 relative min-h-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
				<canvas
					ref={canvasRef}
					className="w-full h-full object-contain pointer-events-none"
					data-testid={`cbct-multi-cross-canvas-${indexInGrid}`}
				/>

				{/* Anatomical Orientation Watermark on Slice Corners */}
				<span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-zinc-400 bg-black/60 px-1 rounded pointer-events-none select-none">
					L
				</span>
				<span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold text-zinc-400 bg-black/60 px-1 rounded pointer-events-none select-none">
					B
				</span>
			</div>

			{/* Sub-label: Exact Millimeter Distance Relative to Center */}
			<div
				className={`h-4 px-1.5 flex items-center justify-between text-[9px] font-mono shrink-0 border-t ${
					isCenter
						? "bg-orange-950/40 border-orange-600/40 text-orange-200 font-bold"
						: "bg-zinc-950/90 border-zinc-900 text-zinc-500"
				}`}
			>
				<span className="truncate">{labelMm}</span>
			</div>
		</div>
	);
};
