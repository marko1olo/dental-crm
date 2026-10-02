/**
 * DENTE CRM — Alveolar Ridge Cross-Section Grid (Multi-Slice Transverse Gallery)
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i, Carl Misch (2008).
 * Governed by Mandate 8b (file size strict ceiling <= 800 lines) & Mandate 8e (Doctor Autonomy).
 *
 * Implements:
 * 1. Transverse bucco-lingual alveolar ridge cross-sections array along dental arch.
 * 2. Millimeter calibration grid, side scales and vestibular/lingual orientation.
 * 3. Step switcher (1.0 mm, 2.0 mm, 3.0 mm) with real-time arch slice navigation.
 * 4. Automated 3-level ridge width calipers at 2 mm (W2), 4 mm (W4), and 6 mm (W6) depth.
 * 5. Interactive implant overlay with apical taper and 2.0 mm safety corridor.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
	Grid2X2,
	ChevronLeft,
	ChevronRight,
	Maximize2,
	Minimize2,
	Ruler,
	ShieldCheck,
	ShieldAlert,
	Sparkles,
} from "lucide-react";
import type { CrossSectionSliceData } from "../../../dentalCurveEngine";
import {
	type ClinicalImplantSpec,
	type ClinicalImplantPose,
	calculateImplantCrossSectionGeometry,
} from "./implantCatalog";
import { measureCrossSectionRidgeWidths2_4_6 } from "../../../cbctRidgeCaliperMath";
import { get16BitLut } from "../../../cbctLutMath";

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

const STEP_OPTIONS = [
	{ step: 1.0, label: "1.0 мм", desc: "Высокая точность (шаг 1 мм)" },
	{ step: 2.0, label: "2.0 мм", desc: "Стандартный шаг (2 мм)" },
	{ step: 3.0, label: "3.0 мм", desc: "Обзорный шаг (3 мм)" },
] as const;

const GRID_SIZE_OPTIONS = [4, 6, 8] as const;

export const ImplantCrossSectionGrid: React.FC<ImplantCrossSectionGridProps> = ({
	crossSections,
	activeCrossSectionIdx,
	onChangeCrossSectionIdx,
	crossSectionStepMm = 2.0,
	onChangeCrossSectionStepMm,
	selectedImplant,
	implantPose,
	jawType = "mandible",
	onSelectTooth,
	onToggleMaximize,
	isMaximized = false,
	patientDisplayName,
	windowWidth = 4025,
	windowLevel = 525,
	gamma = 1.50,
	airCutoffHU = -500,
	softKnee = false,
	slabThicknessMm = 1.0,
	className = "",
}) => {
	const [gridCount, setGridCount] = useState<number>(6);
	const [showMorphometryLines, setShowMorphometryLines] = useState<boolean>(true);
	const [showMillimeterGrid, setShowMillimeterGrid] = useState<boolean>(true);

	const totalSlices = crossSections.length;

	// Calculate visible slice range centered around active slice
	const visibleSliceIndices = useMemo(() => {
		if (totalSlices === 0) return [];
		const half = Math.floor(gridCount / 2);
		let start = activeCrossSectionIdx - half;
		let end = start + gridCount;

		if (start < 0) {
			start = 0;
			end = Math.min(totalSlices, gridCount);
		} else if (end > totalSlices) {
			end = totalSlices;
			start = Math.max(0, end - gridCount);
		}

		const indices: number[] = [];
		for (let i = start; i < end; i++) {
			indices.push(i);
		}
		return indices;
	}, [totalSlices, activeCrossSectionIdx, gridCount]);

	const handleNavigate = useCallback(
		(delta: number) => {
			if (totalSlices === 0 || !onChangeCrossSectionIdx) return;
			const nextIdx = Math.max(0, Math.min(totalSlices - 1, activeCrossSectionIdx + delta));
			onChangeCrossSectionIdx(nextIdx);
		},
		[totalSlices, activeCrossSectionIdx, onChangeCrossSectionIdx],
	);

	return (
		<div
			className={`flex flex-col min-h-0 min-w-0 w-full h-full bg-zinc-950 text-zinc-100 rounded-md border border-zinc-800 overflow-hidden ${className}`}
			data-testid="cbct-implant-cross-section-grid-root"
		>
			{/* Top Toolbar: Step Switcher, Grid Size, Navigation */}
			<div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0 gap-2 text-xs">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 text-amber-400 font-bold">
						<Grid2X2 className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Плитка срезов гребня</span>
						<span className="sm:hidden">Срезы</span>
					</div>

					{totalSlices > 0 && (
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold" data-testid="cbct-grid-active-indicator">
							#{activeCrossSectionIdx + 1} / {totalSlices}
							{crossSections[activeCrossSectionIdx]?.nearestToothFdi && ` (Зуб #${crossSections[activeCrossSectionIdx]!.nearestToothFdi})`}
						</span>
					)}

					{/* Canonical Contrast Badge */}
					<div
						className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/90 border border-amber-500/40 text-[10px] font-mono text-amber-300"
						title={`Канонический костный контраст: W: ${windowWidth} HU, L: ${windowLevel} HU, Gamma: ${gamma.toFixed(2)}, Air: ${airCutoffHU} HU, Срез: ${slabThicknessMm.toFixed(1)} мм`}
						data-testid="cbct-grid-canonical-contrast-badge"
					>
						<Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
						<span>W:{windowWidth}/L:{windowLevel} • γ{gamma.toFixed(2)} • {slabThicknessMm.toFixed(1)}мм</span>
					</div>
				</div>

				{/* Center: Step Selector (1 mm | 2 mm | 3 mm) */}
				<div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800" role="group" aria-label="Шаг срезов">
					<span className="text-[10px] text-zinc-400 px-1 font-semibold hidden md:inline">Шаг:</span>
					{STEP_OPTIONS.map((opt) => {
						const isCur = Math.abs((crossSectionStepMm ?? 2.0) - opt.step) < 0.2;
						return (
							<button
								key={opt.step}
								type="button"
								onClick={() => onChangeCrossSectionStepMm?.(opt.step)}
								className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
									isCur
										? "bg-amber-600 text-white shadow-xs border border-amber-400"
										: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
								}`}
								title={opt.desc}
								data-testid={`cbct-grid-step-${opt.step}`}
							>
								{opt.label}
							</button>
						);
					})}
				</div>

				{/* Right: Display Toggles & Window Controls */}
				<div className="flex items-center gap-1">
					{/* Toggle Morphometry Lines (W2/W4/W6) */}
					<button
						type="button"
						onClick={() => setShowMorphometryLines((prev) => !prev)}
						className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
							showMorphometryLines
								? "bg-cyan-950 text-cyan-300 border-cyan-500/60"
								: "bg-zinc-800 text-zinc-400 border-zinc-700"
						}`}
						title={showMorphometryLines ? "Скрыть замеры W2/W4/W6" : "Показать замеры гребня W2/W4/W6"}
						data-testid="cbct-grid-toggle-calipers"
					>
						<Ruler className="w-3 h-3 text-cyan-400" />
						<span className="hidden lg:inline">W2/W4/W6</span>
					</button>

					{/* Navigation Arrows */}
					<div className="flex items-center gap-0.5">
						<button
							type="button"
							onClick={() => handleNavigate(-1)}
							disabled={activeCrossSectionIdx <= 0}
							className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 transition-colors"
							title="Предыдущий срез"
							data-testid="cbct-grid-nav-prev"
						>
							<ChevronLeft className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => handleNavigate(1)}
							disabled={activeCrossSectionIdx >= totalSlices - 1}
							className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 transition-colors"
							title="Следующий срез"
							data-testid="cbct-grid-nav-next"
						>
							<ChevronRight className="w-3.5 h-3.5" />
						</button>
					</div>

					{/* Grid Size (4 | 6 | 8) */}
					<div className="hidden sm:flex items-center gap-0.5 pl-1 border-l border-zinc-800">
						{GRID_SIZE_OPTIONS.map((num) => (
							<button
								key={num}
								type="button"
								onClick={() => setGridCount(num)}
								className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
									gridCount === num
										? "bg-zinc-700 text-white font-mono"
										: "text-zinc-500 hover:text-zinc-300"
								}`}
								title={`Показывать ${num} срезов в сетке`}
							>
								{num}
							</button>
						))}
					</div>

					{/* Maximize Toggle */}
					{onToggleMaximize && (
						<button
							type="button"
							onClick={onToggleMaximize}
							className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors ml-1 cursor-pointer"
							title={isMaximized ? "Свернуть плитку" : "Развернуть на весь экран"}
							data-testid="cbct-grid-maximize-btn"
						>
							{isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
						</button>
					)}
				</div>
			</div>

			{/* Main Grid Viewport: Cards */}
			<div
				className="flex-1 min-h-0 p-1.5 grid gap-1.5 overflow-y-auto"
				style={{
					gridTemplateColumns:
						gridCount <= 4
							? "repeat(auto-fit, minmax(240px, 1fr))"
							: gridCount <= 6
								? "repeat(auto-fit, minmax(200px, 1fr))"
								: "repeat(auto-fit, minmax(170px, 1fr))",
				}}
				data-testid="cbct-cross-section-cards-container"
			>
				{visibleSliceIndices.map((sliceIdx) => {
					const slice = crossSections[sliceIdx];
					if (!slice) return null;
					const isActive = sliceIdx === activeCrossSectionIdx;

					return (
						<CrossSectionCard
							key={`cs-${sliceIdx}-${slice.distanceAlongArchMm}`}
							slice={slice}
							sliceIdx={sliceIdx}
							isActive={isActive}
							onClick={() => onChangeCrossSectionIdx?.(sliceIdx)}
							selectedImplant={selectedImplant}
							implantPose={implantPose}
							jawType={jawType}
							showMorphometry={showMorphometryLines}
							showGrid={showMillimeterGrid}
							windowWidth={windowWidth}
							windowLevel={windowLevel}
							gamma={gamma}
							airCutoffHU={airCutoffHU}
							softKnee={softKnee}
						/>
					);
				})}
			</div>
		</div>
	);
};

interface CrossSectionCardProps {
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

const CrossSectionCard: React.FC<CrossSectionCardProps> = ({
	slice,
	sliceIdx,
	isActive,
	onClick,
	selectedImplant,
	implantPose,
	jawType = "mandible",
	showMorphometry,
	showGrid,
	windowWidth = 4025,
	windowLevel = 525,
	gamma = 1.50,
	airCutoffHU = -500,
	softKnee = false,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// Compute automated ridge measurements at 2, 4, 6 mm
	const morphometry = useMemo(() => {
		if (!slice.pixelData || slice.pixelData.length === 0) return null;
		return measureCrossSectionRidgeWidths2_4_6(
			slice.pixelData,
			slice.widthPx,
			slice.heightPx,
			slice.pixelSpacingMm || 0.25,
			jawType,
			slice.rawHuData,
		);
	}, [slice, jawType]);

	// Render canvas frame
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !slice.pixelData || slice.pixelData.length === 0) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const width = slice.widthPx;
		const height = slice.heightPx;
		canvas.width = width;
		canvas.height = height;

		// 1. Draw crisp canonical contrast CT voxels (WW: 4025, WL: 525, Gamma: 1.50, Air: -500 HU, Soft-Knee: false)
		const effectiveWW = windowWidth ?? 4025;
		const effectiveWL = windowLevel ?? 525;
		const effectiveGamma = gamma ?? 1.50;
		const effectiveAirCutoff = airCutoffHU ?? -500;
		const effectiveSoftKnee = softKnee ?? false;
		const lut = get16BitLut(effectiveWW, effectiveWL, false, effectiveGamma, { airCutoffHU: effectiveAirCutoff, enabled: effectiveSoftKnee });

		let imgData: ImageData;
		if (slice.rawHuData && slice.rawHuData.length === width * height) {
			imgData = ctx.createImageData(width, height);
			const raw = slice.rawHuData;
			for (let i = 0; i < raw.length; i++) {
				const hu = raw[i]!;
				const g = lut[(hu + 32768) & 0xffff]!;
				const idx = i * 4;
				imgData.data[idx] = g;
				imgData.data[idx + 1] = g;
				imgData.data[idx + 2] = g;
				imgData.data[idx + 3] = 255;
			}
		} else {
			// Fast pixelData mapping with canonical brightness & contrast enforcement
			imgData = ctx.createImageData(width, height);
			const src = slice.pixelData;
			let maxVal = 0;
			for (let i = 0; i < src.length; i += 16) {
				if (src[i]! > maxVal) maxVal = src[i]!;
			}
			const needBoost = maxVal > 0 && maxVal < 185;

			for (let i = 0; i < src.length; i += 4) {
				let g = src[i]!;
				if (needBoost && g > 10) {
					// Expand dynamic range and apply gamma 1.50 curve so bone trabeculae and cortical plate pop out brightly
					const norm = Math.min(1.0, g / maxVal);
					const curved = Math.pow(norm, 1.0 / effectiveGamma);
					g = Math.min(255, Math.round(curved * 245));
				}
				imgData.data[i] = g;
				imgData.data[i + 1] = g;
				imgData.data[i + 2] = g;
				imgData.data[i + 3] = 255;
			}
		}
		ctx.putImageData(imgData, 0, 0);

		const spacing = slice.pixelSpacingMm || 0.25;
		const pxPerMm = 1.0 / spacing;

		// 2. Millimeter Grid Overlay (5 mm and 10 mm lines)
		if (showGrid) {
			ctx.save();
			ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
			ctx.lineWidth = 0.5;

			const step5Px = 5.0 * pxPerMm;
			for (let x = step5Px; x < width; x += step5Px) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();
			}
			for (let y = step5Px; y < height; y += step5Px) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}
			ctx.restore();
		}

		// 2b. Ez3D-i Millimeter Scales (Vertical 30..-20 mm, Horizontal 20-10-0-10-20 mm)
		ctx.save();
		const centerX = width / 2.0;
		const centerY = height / 2.0;

		// Vertical scale on the right
		const rightX = width - 2;
		ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
		ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
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

		// 3. Alveolar Ridge Caliper Overlay (W2, W4, W6, H)
		if (showMorphometry && morphometry && morphometry.isDetected) {
			ctx.save();
			const toPxX = (mm: number) => mm * pxPerMm;
			const toPxY = (mm: number) => mm * pxPerMm;

			// Horizontal Caliper W2 (Cyan) — only if valid anatomical width (3.0 .. 11.5 mm)
			if (morphometry.w2Valid && morphometry.widthW2Mm >= 3.0 && morphometry.widthW2Mm <= 11.5) {
				ctx.strokeStyle = "#06b6d4";
				ctx.lineWidth = 1.4;
				ctx.beginPath();
				ctx.moveTo(toPxX(morphometry.lineW2.buccal.x), toPxY(morphometry.lineW2.buccal.y));
				ctx.lineTo(toPxX(morphometry.lineW2.lingual.x), toPxY(morphometry.lineW2.lingual.y));
				ctx.stroke();
			}

			// Horizontal Caliper W4 (Emerald) — only if valid anatomical width (3.0 .. 12.0 mm)
			if (morphometry.w4Valid && morphometry.widthW4Mm >= 3.0 && morphometry.widthW4Mm <= 12.0) {
				ctx.strokeStyle = "#10b981";
				ctx.lineWidth = 1.4;
				ctx.beginPath();
				ctx.moveTo(toPxX(morphometry.lineW4.buccal.x), toPxY(morphometry.lineW4.buccal.y));
				ctx.lineTo(toPxX(morphometry.lineW4.lingual.x), toPxY(morphometry.lineW4.lingual.y));
				ctx.stroke();
			}

			// Horizontal Caliper W6 (Purple) — only if valid anatomical width (3.0 .. 13.0 mm)
			if (morphometry.w6Valid && morphometry.widthW6Mm >= 3.0 && morphometry.widthW6Mm <= 13.0) {
				ctx.strokeStyle = "#c084fc";
				ctx.lineWidth = 1.4;
				ctx.beginPath();
				ctx.moveTo(toPxX(morphometry.lineW6.buccal.x), toPxY(morphometry.lineW6.buccal.y));
				ctx.lineTo(toPxX(morphometry.lineW6.lingual.x), toPxY(morphometry.lineW6.lingual.y));
				ctx.stroke();
			}

			// Apex Crest Dot
			ctx.fillStyle = "#f59e0b";
			ctx.beginPath();
			ctx.arc(toPxX(morphometry.crestApexMm.x), toPxY(morphometry.crestApexMm.y), 2.0, 0, Math.PI * 2);
			ctx.fill();

			ctx.restore();
		}

		// 4. Implant Overlay with Apical Taper & 2.0 mm Safety Zone (if Active)
		if (selectedImplant && implantPose) {
			ctx.save();
			const crestRefMm = morphometry?.crestApexMm ?? { x: width * spacing * 0.5, y: height * spacing * 0.3 };
			const geom = calculateImplantCrossSectionGeometry(selectedImplant, implantPose, crestRefMm);

			const toCanvasX = (mmX: number) => mmX * pxPerMm;
			const toCanvasY = (mmY: number) => mmY * pxPerMm;

			// Safety Corridor (2.0 mm dashed halo)
			ctx.strokeStyle = isActive ? "rgba(245, 158, 11, 0.7)" : "rgba(245, 158, 11, 0.4)";
			ctx.lineWidth = 1.2;
			ctx.setLineDash([3, 2]);
			ctx.beginPath();
			geom.safetyZonePolygonMm.forEach((pt, i) => {
				const cx = toCanvasX(pt.x);
				const cy = toCanvasY(pt.y);
				if (i === 0) ctx.moveTo(cx, cy);
				else ctx.lineTo(cx, cy);
			});
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);

			// Fixture Body (Solid with Platform Color)
			ctx.fillStyle = isActive ? "rgba(16, 185, 129, 0.45)" : "rgba(16, 185, 129, 0.25)";
			ctx.strokeStyle = selectedImplant.platformColorHex || "#10b981";
			ctx.lineWidth = 1.6;
			ctx.beginPath();
			geom.implantPolygonMm.forEach((pt, i) => {
				const cx = toCanvasX(pt.x);
				const cy = toCanvasY(pt.y);
				if (i === 0) ctx.moveTo(cx, cy);
				else ctx.lineTo(cx, cy);
			});
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Central Long Axis
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 0.8;
			ctx.beginPath();
			ctx.moveTo(toCanvasX(geom.centralAxisLineMm[0].x), toCanvasY(geom.centralAxisLineMm[0].y));
			ctx.lineTo(toCanvasX(geom.centralAxisLineMm[1].x), toCanvasY(geom.centralAxisLineMm[1].y));
			ctx.stroke();

			ctx.restore();
		}
	}, [slice, morphometry, showMorphometry, showGrid, selectedImplant, implantPose, isActive, windowWidth, windowLevel, gamma, airCutoffHU, softKnee]);

	const fdiTooth = slice.nearestToothFdi;
	const isAdequate = morphometry?.isAdequate ?? true;

	return (
		<div
			onClick={onClick}
			className={`flex flex-col rounded-lg overflow-hidden transition-all cursor-pointer relative bg-zinc-950 select-none ${
				isActive
					? "border-2 border-orange-500 ring-2 ring-orange-500/70 shadow-[0_0_14px_rgba(249,115,22,0.45)]"
					: "border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60"
			}`}
			data-testid={`cbct-cross-section-card-${sliceIdx}`}
			role="button"
			tabIndex={0}
			aria-pressed={isActive}
		>
			{/* Card Header: Section Index, Arc Distance, Anatomical L/B, FDI Tooth */}
			<div
				className={`flex items-center justify-between px-2 py-1 border-b text-[11px] ${
					isActive
						? "bg-orange-950/60 border-orange-500/50"
						: "bg-zinc-900/90 border-zinc-800"
				}`}
			>
				<div className="flex items-center gap-1.5 min-w-0">
					<span className={`font-mono font-bold ${isActive ? "text-orange-300" : "text-zinc-200"}`}>
						Section {sliceIdx + 1}
					</span>
					<span className="text-[10px] text-zinc-400 font-mono">({slice.distanceAlongArchMm.toFixed(1)} мм)</span>
				</div>

				<div className="flex items-center gap-1.5">
					<div className="flex items-center gap-1 text-[9px] font-bold font-mono text-zinc-400">
						<span title="Lingual (Язычная)">L</span>
						<span>•</span>
						<span title="Buccal (Щёчная)">B</span>
					</div>
					{fdiTooth && (
						<span
							className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
								isActive
									? "bg-orange-500/25 text-orange-200 border border-orange-500/40"
									: "bg-zinc-800 text-cyan-300 border border-zinc-700"
							}`}
							title={`Ближайший зуб FDI #${fdiTooth}`}
						>
							#{fdiTooth}
						</span>
					)}
					{isActive && (
						<span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.9)] animate-pulse" />
					)}
				</div>
			</div>

			{/* Canvas Rendering Frame with Millimeter Labels */}
			<div className="relative flex-1 min-h-[140px] max-h-[220px] flex items-center justify-center bg-black overflow-hidden">
				<canvas
					ref={canvasRef}
					className="w-full h-full object-contain pointer-events-none"
					data-testid={`cbct-cross-canvas-${sliceIdx}`}
				/>

				{/* Anatomical Side Markers (L = Lingual top-left, B = Buccal top-right) */}
				<span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-zinc-400 bg-black/60 px-1 rounded pointer-events-none">
					L
				</span>
				<span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold text-zinc-400 bg-black/60 px-1 rounded pointer-events-none">
					B
				</span>

				{/* Morphometry Mini HUD (W2, W4, W6 badges) — compact, non-intrusive */}
				{showMorphometry && morphometry && morphometry.isDetected && morphometry.w2Valid && morphometry.widthW2Mm >= 3.0 && (
					<div className="absolute top-1 right-1 flex flex-col items-end gap-0.5 pointer-events-none font-mono text-[9px] bg-zinc-950/80 px-1 py-0.5 rounded border border-zinc-800/80 shadow-xs backdrop-blur-xs">
						<span className="text-cyan-400">
							W2: <span className="text-zinc-200 font-semibold">{morphometry.widthW2Mm.toFixed(1)}</span> мм
						</span>
						{morphometry.w4Valid && morphometry.widthW4Mm >= 3.0 && (
							<span className="text-emerald-400">
								W4: <span className="text-zinc-200 font-semibold">{morphometry.widthW4Mm.toFixed(1)}</span> мм
							</span>
						)}
						{morphometry.w6Valid && morphometry.widthW6Mm >= 3.0 && (
							<span className="text-purple-400">
								W6: <span className="text-zinc-200 font-semibold">{morphometry.widthW6Mm.toFixed(1)}</span> мм
							</span>
						)}
					</div>
				)}
			</div>

			{/* Card Footer: Clinical Assessment */}
			<div className="px-2 py-1 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
				<span className="font-mono text-zinc-400">
					H: <strong className="text-zinc-200">{morphometry?.isDetected && morphometry.heightValid ? morphometry.availableHeightMm.toFixed(1) : "—"}</strong> мм
				</span>

				<div className="flex items-center gap-1">
					{!morphometry || !morphometry.isDetected ? (
						<span className="text-zinc-500 text-[9px] font-mono">
							—
						</span>
					) : isAdequate ? (
						<span className="text-emerald-400 flex items-center gap-0.5 text-[9px] font-medium" title="Достаточный объем гребня для имплантации">
							<ShieldCheck className="w-3 h-3 text-emerald-400" />
							<span>Норма</span>
						</span>
					) : (
						<span className="text-amber-400 flex items-center gap-0.5 text-[9px] font-medium" title="Рекомендована аугментация / костная пластика">
							<ShieldAlert className="w-3 h-3 text-amber-400" />
							<span>Дефицит</span>
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
