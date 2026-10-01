/**
 * DENTE CRM — CBCT Contrast & Slice Tuner Playground (FEAT-010 / CLINICAL TUNER)
 * Independent fullscreen playground for real-time fine-tuning of CBCT voxel contrast,
 * window width/level, soft-knee rational compression, slice slab thickness, and panoramic CPR.
 *
 * Direct URL access: http://127.0.0.1:5173/?cbct=tuner
 * Header bar button: "🧪 Тюнер контраста"
 * Strict adherence to Mandate 8b (< 800 lines).
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
	Activity,
	Check,
	Copy,
	Download,
	Eye,
	Layers,
	Maximize2,
	RefreshCw,
	Sliders,
	Sun,
	Volume2,
	X,
	Zap,
} from "lucide-react";
import type { CbctVoxelVolume } from "../cbctMprMath";
import { reconstructPanoramicView } from "../dentalCurveEngine";
import {
	DEFAULT_TUNER_PARAMS,
	TUNER_PRESETS,
	type TunerParams,
	type TunerProjectionMode,
	formatTunerParamString,
} from "./cbctTunerTypes";
import {
	generateTunerLut,
	renderAxialSliceToCanvas,
	renderPanoToCanvas,
} from "./cbctTunerSliceEngine";
import { TUNER_PATIENTS, useCbctTunerData } from "./useCbctTunerData";

export interface CbctTunerPlaygroundProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly initialPatientId?: string;
}

export const CbctTunerPlayground: React.FC<CbctTunerPlaygroundProps> = ({
	isOpen = true,
	onClose,
	initialPatientId = "zakharov",
}) => {
	const playgroundId = useId();

	// Tuner Parameters State
	const [params, setParams] = useState<TunerParams>(DEFAULT_TUNER_PARAMS);
	const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
	const [cursorHU, setCursorHU] = useState<number | null>(null);

	// Patient Dataset Hook
	const {
		selectedPatientId,
		setSelectedPatientId,
		volume,
		archCurve,
		recommendedZIndex,
		isLoading,
		loadStatus,
		reloadPatient,
	} = useCbctTunerData(initialPatientId);

	// Canvas References
	const axialCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Sync Z-slider max with loaded volume depth and recommended plane
	useEffect(() => {
		if (volume?.dimensions?.depth) {
			setParams((prev) => ({
				...prev,
				sliceZIndex: Math.min(volume.dimensions.depth - 1, Math.max(0, recommendedZIndex)),
			}));
		}
	}, [volume?.id, recommendedZIndex]);

	// Precomputed 16-Bit LUT
	const currentLut = useMemo(() => {
		return generateTunerLut(params);
	}, [params]);

	// Render Axial Slice (Immediate on param change)
	useEffect(() => {
		const canvas = axialCanvasRef.current;
		if (!canvas || !volume) return;
		renderAxialSliceToCanvas(canvas, volume, params, currentLut, archCurve);
	}, [volume, params, currentLut, archCurve]);

	// Render Panoramic View (Debounced CPR reconstruction)
	useEffect(() => {
		const canvas = panoCanvasRef.current;
		if (!canvas || !volume || !archCurve) return;

		let isCancelled = false;
		const timer = setTimeout(() => {
			if (isCancelled) return;
			try {
				const effectivePanoThickness = params.sliceThicknessMm > 0.05
					? Math.max(1.0, params.sliceThicknessMm)
					: 3.0;
				const currentZMm = volume.originMm && volume.spacingMm
					? volume.originMm.z + params.sliceZIndex * volume.spacingMm.z
					: undefined;
				const maxPhysZ = volume.dimensions.depth * (volume.spacingMm?.z || 0.25);
				const heightMm = Math.min(maxPhysZ * 0.9, 65.0);
				const panoResult = reconstructPanoramicView(volume, archCurve, {
					windowWidth: params.windowWidth,
					windowLevel: params.windowLevel,
					projectionMode: params.projectionMode === "native" ? "average" : params.projectionMode,
					focalTroughThicknessMm: effectivePanoThickness,
					centerZMm: currentZMm,
					heightMm,
					invert: params.invert,
					softKnee: params.useSoftKnee
						? { peakEnamel: params.softKneeCeiling, airCutoffHU: params.airCutoffHU }
						: false,
					coarsePreview: false,
				});

				if (!isCancelled && panoResult) {
					const currentZMm = volume.originMm && volume.spacingMm
						? volume.originMm.z + params.sliceZIndex * volume.spacingMm.z
						: undefined;
					renderPanoToCanvas(canvas, panoResult, currentZMm);
				}
			} catch (err) {
				console.error("[CbctTuner] Pano reconstruction error:", err);
			}
		}, 60);

		return () => {
			isCancelled = true;
			clearTimeout(timer);
		};
	}, [volume, archCurve, params]);

	// Copy formatted string to clipboard
	const handleCopyParams = useCallback(() => {
		const text = formatTunerParamString(params);
		if (navigator.clipboard) {
			navigator.clipboard.writeText(text).then(() => {
				setCopiedFeedback(true);
				setTimeout(() => setCopiedFeedback(false), 2000);
			});
		}
	}, [params]);

	// Apply Preset
	const handleApplyPreset = useCallback((presetId: string) => {
		const preset = TUNER_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setParams((prev) => ({
			...prev,
			...preset.params,
			activePresetId: presetId,
		}));
	}, []);

	// Axial Canvas Wheel for Z Scrubbing
	const handleAxialWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? -1 : 1;
		setParams((prev) => {
			const maxZ = volume.dimensions.depth - 1;
			const nextZ = Math.max(0, Math.min(maxZ, prev.sliceZIndex + delta));
			return { ...prev, sliceZIndex: nextZ };
		});
	}, [volume]);

	// Mouse move over axial canvas to inspect HU
	const handleAxialMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = axialCanvasRef.current;
		if (!canvas || !volume?.data) return;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const vx = Math.floor((e.clientX - rect.left) * scaleX);
		const vy = Math.floor((e.clientY - rect.top) * scaleY);
		const { width, height, depth } = volume.dimensions;

		if (vx >= 0 && vx < width && vy >= 0 && vy < height && params.sliceZIndex < depth) {
			const idx = params.sliceZIndex * (width * height) + (vy * width + vx);
			const hu = volume.data[idx];
			if (typeof hu === "number") setCursorHU(hu);
		}
	}, [volume, params.sliceZIndex]);

	if (!isOpen) return null;

	const maxDepth = volume ? volume.dimensions.depth - 1 : 300;
	const currentZMm = volume?.originMm?.z !== undefined && volume?.spacingMm?.z !== undefined
		? (volume.originMm.z + params.sliceZIndex * volume.spacingMm.z).toFixed(1)
		: String(params.sliceZIndex);

	return (
		<div
			id={`cbct-tuner-playground-${playgroundId}`}
			data-testid="cbct-tuner-playground"
			className="fixed inset-0 z-[999999] flex flex-col bg-black text-zinc-100 select-none overflow-hidden font-sans"
		>
			{/* Top Bar Header */}
			<header className="h-12 border-b border-zinc-800 bg-zinc-950/90 px-3 flex items-center justify-between shrink-0 backdrop-blur-md">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wide">
						<span className="p-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">🧪</span>
						<span>ТЮНЕР КОНТРАСТА И СРЕЗОВ КЛКТ</span>
						<span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
							60 FPS WEBGL / CANVAS
						</span>
					</div>

					{/* Patient Selector */}
					<div className="flex items-center gap-1.5 ml-2">
						<span className="text-[11px] text-zinc-400 hidden md:inline">Пациент:</span>
						<select
							aria-label="Выбор пациента КЛКТ"
							value={selectedPatientId}
							onChange={(e) => setSelectedPatientId(e.target.value)}
							className="bg-zinc-900 border border-zinc-700 text-cyan-300 text-xs font-semibold rounded px-2.5 py-1 focus:outline-none focus:border-cyan-400 cursor-pointer"
							data-testid="cbct-tuner-patient-select"
						>
							{TUNER_PATIENTS.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name} ({p.badge})
								</option>
							))}
						</select>
						{isLoading && (
							<span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono animate-pulse">
								<RefreshCw className="w-3 h-3 animate-spin" />
								{loadStatus || "Загрузка..."}
							</span>
						)}
					</div>
				</div>

				{/* Right Actions: Copy Params & Close */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopyParams}
						className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
							copiedFeedback
								? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
								: "bg-cyan-950/70 text-cyan-300 border-cyan-500/60 hover:bg-cyan-900/90"
						}`}
						data-testid="cbct-tuner-copy-params-btn"
						title="Скопировать текущие параметры в буфер обмена для отправки в чат"
					>
						{copiedFeedback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
						<span>{copiedFeedback ? "СКОПИРОВАНО!" : "📋 Скопировать параметры"}</span>
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
							data-testid="cbct-tuner-close-btn"
							title="Закрыть тюнер и вернуться в CRM"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			</header>

			{/* Main Workspace Body */}
			<div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
				{/* Viewports Container (2D Axial Slice + OPG Panorama) */}
				<div className="flex-1 flex flex-col sm:flex-row gap-1 p-1 bg-black overflow-hidden">
					{/* Left Viewport: 2D Axial Slice */}
					<div className="flex-1 flex flex-col bg-black rounded border border-zinc-900 overflow-hidden relative group">
						<div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/80 px-2 py-1 rounded border border-zinc-800 text-[11px] font-mono text-cyan-300 backdrop-blur-sm pointer-events-none">
							<span className="font-bold text-white">АКСИАЛЬНЫЙ СРЕЗ (2D)</span>
							<span>• Z: {params.sliceZIndex} ({currentZMm} мм)</span>
							{params.sliceThicknessMm > 0 && (
								<span className="text-amber-400 font-bold">• СРЕЗ {params.sliceThicknessMm.toFixed(1)} мм ({params.projectionMode})</span>
							)}
							{cursorHU !== null && (
								<span className="text-emerald-400">• HU: {cursorHU}</span>
							)}
						</div>

						<div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
							<canvas
								ref={axialCanvasRef}
								onWheel={handleAxialWheel}
								onMouseMove={handleAxialMouseMove}
								onMouseLeave={() => setCursorHU(null)}
								className="max-w-full max-h-full object-contain cursor-crosshair shadow-2xl"
								data-testid="cbct-tuner-axial-canvas"
							/>
						</div>

						{/* Axial Z-Scrubbing Slider Bar */}
						<div className="h-7 bg-zinc-950 border-t border-zinc-850 px-3 flex items-center gap-2 shrink-0">
							<span className="text-[10px] font-mono text-zinc-400 shrink-0">Высота Z:</span>
							<input
								type="range"
								aria-label="Высота среза Z"
								min={0}
								max={maxDepth}
								value={params.sliceZIndex}
								onChange={(e) => setParams((p) => ({ ...p, sliceZIndex: Number(e.target.value) }))}
								className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								data-testid="cbct-tuner-z-slider"
							/>
							<span className="text-[10px] font-mono text-cyan-300 w-12 text-right shrink-0">
								{params.sliceZIndex}/{maxDepth}
							</span>
						</div>
					</div>

					{/* Right Viewport: OPG Panoramic View */}
					<div className="flex-1 flex flex-col bg-black rounded border border-zinc-900 overflow-hidden relative">
						<div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/80 px-2 py-1 rounded border border-zinc-800 text-[11px] font-mono text-emerald-300 backdrop-blur-sm pointer-events-none">
							<span className="font-bold text-white">ОПТГ ПАНОРАМА (CPR)</span>
							<span>• Слой: {params.sliceThicknessMm > 0 ? params.sliceThicknessMm.toFixed(1) : "3.0"} мм</span>
							<span className="text-zinc-400">• Горизонт: {currentZMm} мм</span>
						</div>

						<div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
							<canvas
								ref={panoCanvasRef}
								className="max-w-full max-h-full object-contain shadow-2xl"
								data-testid="cbct-tuner-pano-canvas"
							/>
						</div>
					</div>
				</div>

				{/* Controls & Sliders Side Panel */}
				<aside className="w-full lg:w-96 bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col shrink-0 overflow-y-auto p-3 gap-3">
					{/* Realtime Live Telemetry HUD Card */}
					<div className="p-2.5 rounded-lg bg-zinc-900/90 border border-cyan-500/30 flex flex-col gap-1.5 shadow-lg">
						<div className="flex items-center justify-between text-xs font-bold text-cyan-300">
							<span className="flex items-center gap-1.5">
								<Activity className="w-3.5 h-3.5 text-cyan-400" />
								ТЕКУЩИЕ ПАРАМЕТРЫ КЛКТ
							</span>
							<span className="text-[10px] font-mono text-zinc-400">REALTIME</span>
						</div>
						<div
							className="font-mono text-xs text-zinc-200 bg-black/60 p-2 rounded border border-zinc-800 break-all leading-relaxed"
							data-testid="cbct-tuner-hud-string"
						>
							<div className="flex justify-between border-b border-zinc-850 pb-1">
								<span className="text-zinc-400">Ширина (WW):</span>
								<span className="font-bold text-cyan-400">{params.windowWidth}</span>
							</div>
							<div className="flex justify-between border-b border-zinc-850 py-0.5">
								<span className="text-zinc-400">Уровень (WL):</span>
								<span className="font-bold text-cyan-400">{params.windowLevel}</span>
							</div>
							<div className="flex justify-between border-b border-zinc-850 py-0.5">
								<span className="text-zinc-400">Гамма:</span>
								<span className="font-bold text-amber-300">{params.gamma.toFixed(2)}</span>
							</div>
							<div className="flex justify-between border-b border-zinc-850 py-0.5">
								<span className="text-zinc-400">Soft-Knee (Эмаль):</span>
								<span className="font-bold text-emerald-400">
									{params.useSoftKnee ? `${params.softKneeCeiling}/255` : "ВЫКЛ (Линейно)"}
								</span>
							</div>
							<div className="flex justify-between border-b border-zinc-850 py-0.5">
								<span className="text-zinc-400">Отсечка воздуха:</span>
								<span className="font-bold text-blue-400">{params.airCutoffHU} HU</span>
							</div>
							<div className="flex justify-between pt-1">
								<span className="text-zinc-400">Толщина среза:</span>
								<span className="font-bold text-purple-400">
									{params.sliceThicknessMm <= 0.01 ? "0.0 мм (нативный)" : `${params.sliceThicknessMm.toFixed(1)} мм (${params.projectionMode})`}
								</span>
							</div>
						</div>
					</div>

					{/* Fast Presets Grid */}
					<div className="flex flex-col gap-1.5">
						<span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
							<Zap className="w-3.5 h-3.5 text-amber-400" />
							Быстрые пресеты для сравнения:
						</span>
						<div className="grid grid-cols-2 gap-1.5">
							{TUNER_PRESETS.map((p) => {
								const isSelected = params.activePresetId === p.id;
								return (
									<button
										key={p.id}
										type="button"
										onClick={() => handleApplyPreset(p.id)}
										className={`p-1.5 rounded text-left text-xs font-semibold transition-all border cursor-pointer ${
											isSelected
												? "bg-cyan-950/80 text-cyan-200 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)] font-bold"
												: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
										}`}
										data-testid={`cbct-preset-btn-${p.id}`}
										title={p.description}
									>
										<div>{p.shortLabel}</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Sliders Controller Group */}
					<div className="flex flex-col gap-3">
						{/* 1. Window Width (WW) */}
						<div className="flex flex-col gap-1">
							<div className="flex justify-between text-xs">
								<span className="text-zinc-300 font-semibold">Ширина окна (Window Width):</span>
								<span className="font-mono text-cyan-400 font-bold">{params.windowWidth} HU</span>
							</div>
							<input
								type="range"
								aria-label="Ширина окна (Window Width)"
								min={400}
								max={5000}
								step={25}
								value={params.windowWidth}
								onChange={(e) => setParams((p) => ({ ...p, windowWidth: Number(e.target.value) }))}
								className="h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								data-testid="cbct-slider-window-width"
							/>
							<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
								<span>400 (контрастный)</span>
								<span>5000 (мягкий)</span>
							</div>
						</div>

						{/* 2. Window Level (WL) */}
						<div className="flex flex-col gap-1">
							<div className="flex justify-between text-xs">
								<span className="text-zinc-300 font-semibold">Уровень окна (Window Level):</span>
								<span className="font-mono text-cyan-400 font-bold">{params.windowLevel} HU</span>
							</div>
							<input
								type="range"
								aria-label="Уровень окна (Window Level)"
								min={-200}
								max={2000}
								step={25}
								value={params.windowLevel}
								onChange={(e) => setParams((p) => ({ ...p, windowLevel: Number(e.target.value) }))}
								className="h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								data-testid="cbct-slider-window-level"
							/>
							<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
								<span>-200 (ткани)</span>
								<span>2000 (дентин/эмаль)</span>
							</div>
						</div>

						{/* 3. Gamma */}
						<div className="flex flex-col gap-1">
							<div className="flex justify-between text-xs">
								<span className="text-zinc-300 font-semibold">Гамма (Нелинейность):</span>
								<span className="font-mono text-amber-300 font-bold">{params.gamma.toFixed(2)}</span>
							</div>
							<input
								type="range"
								aria-label="Гамма (Нелинейность)"
								min={0.5}
								max={2.5}
								step={0.05}
								value={params.gamma}
								onChange={(e) => setParams((p) => ({ ...p, gamma: Number(e.target.value) }))}
								className="h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
								data-testid="cbct-slider-gamma"
							/>
							<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
								<span>0.5 (ярче тени)</span>
								<span>1.0 (линейно)</span>
								<span>2.5 (глубже кость)</span>
							</div>
						</div>

						{/* 4. Soft-Knee Enamel Compression */}
						<div className="flex flex-col gap-1.5 p-2 rounded bg-zinc-900 border border-zinc-800">
							<div className="flex items-center justify-between text-xs">
								<label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-300">
									<input
										type="checkbox"
										checked={params.useSoftKnee}
										onChange={(e) => setParams((p) => ({ ...p, useSoftKnee: e.target.checked }))}
										className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
										data-testid="cbct-checkbox-soft-knee"
									/>
									<span>Потолок эмали (Soft-Knee)</span>
								</label>
								<span className="font-mono text-emerald-400 font-bold text-xs">
									{params.useSoftKnee ? `${params.softKneeCeiling} / 255` : "ВЫКЛ"}
								</span>
							</div>
							{params.useSoftKnee && (
								<input
									type="range"
									aria-label="Потолок компрессии эмали"
									min={120}
									max={255}
									step={1}
									value={params.softKneeCeiling}
									onChange={(e) => setParams((p) => ({ ...p, softKneeCeiling: Number(e.target.value) }))}
									className="h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
									data-testid="cbct-slider-soft-knee"
								/>
							)}
						</div>

						{/* 5. Air Cutoff HU */}
						<div className="flex flex-col gap-1">
							<div className="flex justify-between text-xs">
								<span className="text-zinc-300 font-semibold">Отсечка воздуха (Air Cutoff):</span>
								<span className="font-mono text-blue-400 font-bold">{params.airCutoffHU} HU</span>
							</div>
							<input
								type="range"
								aria-label="Отсечка воздуха (Air Cutoff)"
								min={-1000}
								max={0}
								step={25}
								value={params.airCutoffHU}
								onChange={(e) => setParams((p) => ({ ...p, airCutoffHU: Number(e.target.value) }))}
								className="h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
								data-testid="cbct-slider-air-cutoff"
							/>
							<div className="flex justify-between text-[10px] text-zinc-500 font-mono">
								<span>-1000 HU (весь фон)</span>
								<span>-100 HU (чистый черный)</span>
								<span>0 HU</span>
							</div>
						</div>

						{/* 6. Slice Thickness & Projection Mode */}
						<div className="flex flex-col gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
							<div className="flex justify-between text-xs">
								<span className="text-zinc-300 font-semibold">Толщина среза (Thickness):</span>
								<span className="font-mono text-purple-400 font-bold">
									{params.sliceThicknessMm <= 0.01 ? "0.0 мм (нативный воксел)" : `${params.sliceThicknessMm.toFixed(1)} мм`}
								</span>
							</div>
							<input
								type="range"
								aria-label="Толщина среза (Thickness)"
								min={0.0}
								max={25.0}
								step={0.5}
								value={params.sliceThicknessMm}
								onChange={(e) => setParams((p) => ({ ...p, sliceThicknessMm: Number(e.target.value) }))}
								className="h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
								data-testid="cbct-slider-thickness"
							/>

							{/* Projection Mode Radio Buttons */}
							<div className="flex flex-col gap-1 mt-1">
								<span className="text-[11px] text-zinc-400 font-semibold">Режим проекции пласта:</span>
								<div className="grid grid-cols-2 gap-1">
									{(["native", "average", "mip", "ray_sum"] as TunerProjectionMode[]).map((mode) => (
										<button
											key={mode}
											type="button"
											onClick={() => setParams((p) => ({ ...p, projectionMode: mode }))}
											className={`py-1 px-1.5 rounded text-[11px] font-semibold border cursor-pointer ${
												params.projectionMode === mode
													? "bg-purple-950/70 text-purple-200 border-purple-400 font-bold shadow-[0_0_8px_rgba(168,85,247,0.3)]"
													: "bg-zinc-800/80 text-zinc-400 border-zinc-750 hover:text-white"
											}`}
											data-testid={`cbct-tuner-mode-${mode}`}
										>
											{mode === "native" && "Нативный (0 мм)"}
											{mode === "average" && "Среднее (Avg)"}
											{mode === "mip" && "MIP (Максимум)"}
											{mode === "ray_sum" && "Ray-Sum (Сумма)"}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* 7. Invert Colors (X-ray Negative) */}
						<div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
							<span className="text-xs text-zinc-300 font-semibold">Инверсия цвета (Рентген):</span>
							<button
								type="button"
								onClick={() => setParams((p) => ({ ...p, invert: !p.invert }))}
								className={`px-3 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
									params.invert
										? "bg-amber-950/70 text-amber-300 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
										: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
								}`}
								data-testid="cbct-tuner-invert-btn"
							>
								{params.invert ? "НЕГАТИВ (ПЛЕНКА)" : "ПОЗИТИВ (МОНИТОР)"}
							</button>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
};
