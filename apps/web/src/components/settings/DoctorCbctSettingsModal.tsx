/**
 * apps/web/src/components/settings/DoctorCbctSettingsModal.tsx
 *
 * Lightweight interactive CBCT parameter tuner modal for doctor personal defaults.
 * Realtime axial and panoramic canvas preview, canonical 4025/525 preset reset,
 * and persistent storage via loadDoctorCbctSettings / saveDoctorCbctSettings.
 *
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x. Mandate 8b (< 800 lines).
 */

import {
	Activity,
	Check,
	Layers,
	RotateCcw,
	Scan,
	Sliders,
	Sparkles,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import {
	CANONICAL_CBCT_SETTINGS,
	type DoctorCbctDefaultSettings,
	loadDoctorCbctSettings,
	resetDoctorCbctSettings,
	saveDoctorCbctSettings,
} from "../radiology/cbctLutMath";
import { reconstructPanoramicView } from "../radiology/dentalCurveEngine";
import {
	generateTunerLut,
	renderAxialSliceToCanvas,
	renderPanoToCanvas,
} from "../radiology/tuner/cbctTunerSliceEngine";
import { useCbctTunerData } from "../radiology/tuner/useCbctTunerData";
import "../radiology/tuner/cbctTunerStyles.css";

export interface DoctorCbctSettingsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSaved?: (settings: DoctorCbctDefaultSettings) => void;
}

export function DoctorCbctSettingsModal({
	isOpen,
	onClose,
	onSaved,
}: DoctorCbctSettingsModalProps) {
	const titleId = useId();
	const modalRef = useRef<HTMLDivElement>(null);
	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement>(null);

	// Load doctor defaults from localStorage on modal activation
	const [initialDefaults] = useState(() => loadDoctorCbctSettings());
	const [windowWidth, setWindowWidth] = useState<number>(initialDefaults.windowWidth);
	const [windowLevel, setWindowLevel] = useState<number>(initialDefaults.windowLevel);
	const [gamma, setGamma] = useState<number>(initialDefaults.gamma);
	const [airCutoffHU, setAirCutoffHU] = useState<number>(initialDefaults.airCutoffHU);
	const [mprThicknessMm, setMprThicknessMm] = useState<number>(initialDefaults.mprThicknessMm);
	const [panoThicknessMm, setPanoThicknessMm] = useState<number>(initialDefaults.panoThicknessMm);

	// Preview tabs & slice navigation
	const [previewTab, setPreviewTab] = useState<"axial" | "pano">("axial");
	const [sliceZIndex, setSliceZIndex] = useState<number>(156);

	// 3D Volume & Arch Curve for real-time slice extraction
	const { volume, archCurve, recommendedZIndex, isLoading, loadStatus } =
		useCbctTunerData("zakharov");

	// Sync recommended slice once volume arrives
	useEffect(() => {
		if (recommendedZIndex && recommendedZIndex > 0) {
			setSliceZIndex(recommendedZIndex);
		}
	}, [recommendedZIndex]);

	// Reset sliders to doctor stored state when modal re-opens
	useEffect(() => {
		if (isOpen) {
			const current = loadDoctorCbctSettings();
			setWindowWidth(current.windowWidth);
			setWindowLevel(current.windowLevel);
			setGamma(current.gamma);
			setAirCutoffHU(current.airCutoffHU);
			setMprThicknessMm(current.mprThicknessMm);
			setPanoThicknessMm(current.panoThicknessMm);
		}
	}, [isOpen]);

	// Escape key to close modal
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Check if current values match canonical standard (4025 HU / 525 HU)
	const isCanonical =
		windowWidth === CANONICAL_CBCT_SETTINGS.windowWidth &&
		windowLevel === CANONICAL_CBCT_SETTINGS.windowLevel &&
		Math.abs(gamma - CANONICAL_CBCT_SETTINGS.gamma) < 0.001 &&
		airCutoffHU === CANONICAL_CBCT_SETTINGS.airCutoffHU &&
		Math.abs(mprThicknessMm - CANONICAL_CBCT_SETTINGS.mprThicknessMm) < 0.001 &&
		Math.abs(panoThicknessMm - CANONICAL_CBCT_SETTINGS.panoThicknessMm) < 0.001;

	// Render Axial Slice
	useEffect(() => {
		if (!isOpen || !volume || !axialCanvasRef.current) return;
		const canvas = axialCanvasRef.current;
		const lut = generateTunerLut({
			windowWidth,
			windowLevel,
			gamma,
			softKneeCeiling: 255,
			useSoftKnee: false,
			airCutoffHU,
			sliceThicknessMm: mprThicknessMm,
			projectionMode: mprThicknessMm > 0 ? "average" : "native",
			sliceZIndex,
			invert: false,
			activePresetId: "",
		});
		renderAxialSliceToCanvas(
			canvas,
			volume,
			{
				windowWidth,
				windowLevel,
				gamma,
				softKneeCeiling: 255,
				useSoftKnee: false,
				airCutoffHU,
				sliceThicknessMm: mprThicknessMm,
				projectionMode: mprThicknessMm > 0 ? "average" : "native",
				sliceZIndex,
				invert: false,
				activePresetId: "",
			},
			lut,
			archCurve,
		);
	}, [
		isOpen,
		volume,
		archCurve,
		sliceZIndex,
		windowWidth,
		windowLevel,
		gamma,
		airCutoffHU,
		mprThicknessMm,
	]);

	// Render Panoramic OPG Slice (debounced)
	useEffect(() => {
		if (!isOpen || !volume || !archCurve || !panoCanvasRef.current || previewTab !== "pano") {
			return;
		}
		const canvas = panoCanvasRef.current;
		let isCancelled = false;

		const timer = setTimeout(() => {
			try {
				const heightMm = volume.dimensions.height * (volume.spacingMm?.y || 0.25);
				const currentZMm =
					volume.originMm && volume.spacingMm
						? volume.originMm.z + sliceZIndex * volume.spacingMm.z
						: undefined;

				const panoResult = reconstructPanoramicView(volume, archCurve, {
					windowWidth,
					windowLevel,
					gamma,
					useSoftKnee: false,
					softKneeCeiling: 255,
					airCutoffHU,
					projectionMode: "average",
					focalTroughThicknessMm: Math.max(1.0, panoThicknessMm),
					...(currentZMm !== undefined ? { centerZMm: currentZMm } : {}),
					heightMm,
					invert: false,
					coarsePreview: false,
				});

				if (!isCancelled && panoResult) {
					renderPanoToCanvas(canvas, panoResult, currentZMm);
				}
			} catch (err) {
				console.error("[DoctorCbctSettingsModal] Pano render failed:", err);
			}
		}, 60);

		return () => {
			isCancelled = true;
			clearTimeout(timer);
		};
	}, [
		isOpen,
		previewTab,
		volume,
		archCurve,
		sliceZIndex,
		windowWidth,
		windowLevel,
		gamma,
		airCutoffHU,
		panoThicknessMm,
	]);

	// Axial wheel for Z-axis slice scrolling
	const handleAxialWheel = useCallback(
		(e: React.WheelEvent<HTMLCanvasElement>) => {
			if (!volume) return;
			e.preventDefault();
			const delta = e.deltaY > 0 ? -1 : 1;
			setSliceZIndex((prev) =>
				Math.max(0, Math.min(volume.dimensions.depth - 1, prev + delta)),
			);
		},
		[volume],
	);

	// Save doctor personal defaults
	const handleSaveDefaults = useCallback(() => {
		const saved = saveDoctorCbctSettings({
			windowWidth,
			windowLevel,
			gamma,
			airCutoffHU,
			mprThicknessMm,
			panoThicknessMm,
		});
		showToast(
			`Персональные параметры КЛКТ сохранены (W: ${saved.windowWidth}, L: ${saved.windowLevel})`,
			"success",
		);
		onSaved?.(saved);
		onClose();
	}, [
		windowWidth,
		windowLevel,
		gamma,
		airCutoffHU,
		mprThicknessMm,
		panoThicknessMm,
		onSaved,
		onClose,
	]);

	// Reset to canonical standards
	const handleResetCanonical = useCallback(() => {
		const canon = resetDoctorCbctSettings();
		setWindowWidth(canon.windowWidth);
		setWindowLevel(canon.windowLevel);
		setGamma(canon.gamma);
		setAirCutoffHU(canon.airCutoffHU);
		setMprThicknessMm(canon.mprThicknessMm);
		setPanoThicknessMm(canon.panoThicknessMm);
		showToast("Сброшено на канонический стандарт КЛКТ (4025 HU / 525 HU)", "info");
	}, []);

	// Fast 1-click clinical presets
	const applyQuickPreset = (ww: number, wl: number, g: number, air: number) => {
		setWindowWidth(ww);
		setWindowLevel(wl);
		setGamma(g);
		setAirCutoffHU(air);
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 cbct-dark-cockpit"
			data-cbct-cockpit="true"
			data-theme="dark"
			style={{ colorScheme: "dark" }}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			ref={modalRef}
		>
			<div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#090d16] text-slate-100 border border-slate-700/80 shadow-2xl overflow-hidden cbct-dark-cockpit" data-cbct-cockpit="true">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0f172a]/90">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/30">
							<Scan size={18} />
						</div>
						<div>
							<h3 id={titleId} className="m-0 text-sm sm:text-base font-bold text-white flex items-center gap-2">
								<span>Интерактивный тюнер КЛКТ</span>
								{isCanonical ? (
									<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
										Канон (4025/525)
									</span>
								) : (
									<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
										Персональный профиль
									</span>
								)}
							</h3>
							<p className="m-0 text-[11px] text-slate-400">
								Калибровка резкости и контраста срезов для всех КТ-исследований клиники
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
						aria-label="Закрыть окно тюнера"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body: Two columns layout (Left: Canvas Preview, Right: Sliders) */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
					{/* Left Column: Interactive Canvas Preview (5 cols) */}
					<div className="lg:col-span-5 flex flex-col space-y-3">
						{/* Tab Switcher */}
						<div className="flex items-center justify-between bg-slate-900/80 p-1 rounded-xl border border-slate-800">
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setPreviewTab("axial")}
									className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
										previewTab === "axial"
											? "bg-teal-600 text-white shadow-xs"
											: "text-slate-400 hover:text-slate-200"
									}`}
								>
									<Scan size={13} />
									<span>Аксиальный срез</span>
								</button>
								<button
									type="button"
									onClick={() => setPreviewTab("pano")}
									className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
										previewTab === "pano"
											? "bg-teal-600 text-white shadow-xs"
											: "text-slate-400 hover:text-slate-200"
									}`}
								>
									<Layers size={13} />
									<span>Панорама (ОПТГ)</span>
								</button>
							</div>

							<span className="text-[10px] text-slate-400 font-mono px-2">
								{volume ? `${volume.dimensions.width}×${volume.dimensions.height}` : "Demo"}
							</span>
						</div>

						{/* Viewport Frame */}
						<div className="relative aspect-square w-full rounded-xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
							{isLoading && (
								<div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-xs text-slate-300">
									<Activity size={24} className="text-teal-400 animate-spin mb-2" />
									<span>{loadStatus || "Загрузка КЛКТ срезов..."}</span>
								</div>
							)}

							<canvas
								ref={axialCanvasRef}
								width={320}
								height={320}
								onWheel={handleAxialWheel}
								className={`w-full h-full object-contain cursor-ns-resize ${previewTab === "axial" ? "block" : "hidden"}`}
								title="Крутите колесо мыши для перемещения по Z-срезам"
							/>

							<canvas
								ref={panoCanvasRef}
								width={320}
								height={320}
								className={`w-full h-full object-contain ${previewTab === "pano" ? "block" : "hidden"}`}
							/>

							{/* HUD Overlay Badge */}
							<div className="absolute top-2 left-2 z-10 pointer-events-none px-2 py-0.5 rounded bg-black/70 border border-slate-700/60 text-[10px] font-mono text-cyan-300">
								{previewTab === "axial"
									? `Z: ${sliceZIndex + 1} / ${volume?.dimensions.depth ?? 312} | Срез: ${mprThicknessMm.toFixed(1)} мм`
									: `ОПТГ Слой: ${panoThicknessMm.toFixed(1)} мм`}
							</div>
						</div>

						{/* Slice Z Scrubbing Slider (for Axial) */}
						{previewTab === "axial" && volume && (
							<div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
								<div className="flex items-center justify-between text-[11px] text-slate-400">
									<span>Уровень среза (Z-ось):</span>
									<span className="font-mono text-cyan-300 font-bold">
										#{sliceZIndex + 1} / {volume.dimensions.depth}
									</span>
								</div>
								<input
									type="range"
									aria-label="Уровень среза Z"
									min={0}
									max={volume.dimensions.depth - 1}
									step={1}
									value={sliceZIndex}
									onChange={(e) => setSliceZIndex(Number(e.target.value))}
									className="w-full cbct-slider cbct-slider--teal"
								/>
							</div>
						)}

						{/* 1-Click Quick Presets */}
						<div className="space-y-1.5 pt-1">
							<span className="text-[11px] font-semibold text-slate-400 block">
								Быстрые пресеты тканей:
							</span>
							<div className="grid grid-cols-2 gap-1.5">
								<button
									type="button"
									onClick={() => applyQuickPreset(4025, 525, 1.5, -500)}
									className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
								>
									<span className="font-bold text-teal-400 block">Канон DENTE</span>
									<span className="text-[9px] text-slate-500">4025 / 525 HU</span>
								</button>
								<button
									type="button"
									onClick={() => applyQuickPreset(2500, 600, 1.2, -400)}
									className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
								>
									<span className="font-bold text-amber-400 block">Костная ткань</span>
									<span className="text-[9px] text-slate-500">2500 / 600 HU</span>
								</button>
								<button
									type="button"
									onClick={() => applyQuickPreset(4400, 1200, 1.4, -600)}
									className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
								>
									<span className="font-bold text-cyan-400 block">Зубы и эмаль</span>
									<span className="text-[9px] text-slate-500">4400 / 1200 HU</span>
								</button>
								<button
									type="button"
									onClick={() => applyQuickPreset(3200, 500, 1.1, -100)}
									className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
								>
									<span className="font-bold text-indigo-400 block">Мягкий обзор</span>
									<span className="text-[9px] text-slate-500">3200 / 500 HU</span>
								</button>
							</div>
						</div>
					</div>

					{/* Right Column: 6 Precision Sliders (7 cols) */}
					<div className="lg:col-span-7 flex flex-col space-y-4">
						{/* 1. Window Width */}
						<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
							<div className="flex items-center justify-between">
								<label className="text-xs font-bold text-white flex items-center gap-1.5">
									<Sliders size={14} className="text-teal-400" />
									<span>Ширина окна (Window Width)</span>
								</label>
								<div className="flex items-center gap-2">
									<span className="text-xs font-mono font-bold text-teal-300">
										{windowWidth} HU
									</span>
									<span className="text-[10px] text-slate-500">(базово: 4025)</span>
								</div>
							</div>
							<input
								type="range"
								aria-label="Ширина окна (Window Width)"
								min={400}
								max={5000}
								step={25}
								value={windowWidth}
								onChange={(e) => setWindowWidth(Number(e.target.value))}
								className="w-full cbct-slider cbct-slider--teal"
							/>
							<div className="flex items-center justify-between text-[10px] text-slate-500">
								<span>400 HU (контраст)</span>
								<span>Динамический диапазон серого</span>
								<span>5000 HU (мягкий)</span>
							</div>
						</div>

						{/* 2. Window Level */}
						<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
							<div className="flex items-center justify-between">
								<label className="text-xs font-bold text-white flex items-center gap-1.5">
									<Sliders size={14} className="text-teal-400" />
									<span>Уровень окна (Window Level / Center)</span>
								</label>
								<div className="flex items-center gap-2">
									<span className="text-xs font-mono font-bold text-teal-300">
										{windowLevel} HU
									</span>
									<span className="text-[10px] text-slate-500">(базово: 525)</span>
								</div>
							</div>
							<input
								type="range"
								aria-label="Уровень окна (Window Level)"
								min={-200}
								max={2000}
								step={25}
								value={windowLevel}
								onChange={(e) => setWindowLevel(Number(e.target.value))}
								className="w-full cbct-slider cbct-slider--teal"
							/>
							<div className="flex items-center justify-between text-[10px] text-slate-500">
								<span>-200 HU (ткани)</span>
								<span>Центральная яркость анатомических структур</span>
								<span>+2000 HU (эмаль)</span>
							</div>
						</div>

						{/* 3. Gamma */}
						<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
							<div className="flex items-center justify-between">
								<label className="text-xs font-bold text-white flex items-center gap-1.5">
									<Sparkles size={14} className="text-teal-400" />
									<span>Гамма-коррекция (Gamma)</span>
								</label>
								<div className="flex items-center gap-2">
									<span className="text-xs font-mono font-bold text-teal-300">
										{gamma.toFixed(2)}
									</span>
									<span className="text-[10px] text-slate-500">(базово: 1.50)</span>
								</div>
							</div>
							<input
								type="range"
								aria-label="Гамма-коррекция (Gamma)"
								min={0.5}
								max={2.5}
								step={0.05}
								value={gamma}
								onChange={(e) => setGamma(Number(Number(e.target.value).toFixed(2)))}
								className="w-full cbct-slider cbct-slider--teal"
							/>
							<div className="flex items-center justify-between text-[10px] text-slate-500">
								<span>0.50 (линейная)</span>
								<span>Выделение трабекулярного рисунка губчатой кости</span>
								<span>2.50 (глубокие тени)</span>
							</div>
						</div>

						{/* 4. Air Cutoff */}
						<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
							<div className="flex items-center justify-between">
								<label className="text-xs font-bold text-white flex items-center gap-1.5">
									<Scan size={14} className="text-teal-400" />
									<span>Отсечение воздуха (Air Cutoff HU)</span>
								</label>
								<div className="flex items-center gap-2">
									<span className="text-xs font-mono font-bold text-teal-300">
										{airCutoffHU} HU
									</span>
									<span className="text-[10px] text-slate-500">(базово: -500)</span>
								</div>
							</div>
							<input
								type="range"
								aria-label="Отсечение воздуха (Air Cutoff HU)"
								min={-1000}
								max={0}
								step={25}
								value={airCutoffHU}
								onChange={(e) => setAirCutoffHU(Number(e.target.value))}
								className="w-full cbct-slider cbct-slider--teal"
							/>
							<div className="flex items-center justify-between text-[10px] text-slate-500">
								<span>-1000 HU (полный воздух)</span>
								<span>Устранение серого ореола вокруг челюсти</span>
								<span>0 HU (вода)</span>
							</div>
						</div>

						{/* 5. MPR Slice Thickness & 6. Pano Thickness (Grid) */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{/* MPR Thickness */}
							<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-white block">
										Толщина MPR среза
									</label>
									<span className="text-xs font-mono font-bold text-teal-300">
										{mprThicknessMm.toFixed(1)} мм
									</span>
								</div>
								<input
									type="range"
									aria-label="Толщина MPR среза"
									min={0.5}
									max={10.0}
									step={0.5}
									value={mprThicknessMm}
									onChange={(e) => setMprThicknessMm(Number(Number(e.target.value).toFixed(1)))}
									className="w-full cbct-slider cbct-slider--teal"
								/>
								<div className="flex items-center justify-between text-[10px] text-slate-500">
									<span>0.5 мм</span>
									<span>Базово: 1.0 мм</span>
									<span>10.0 мм</span>
								</div>
							</div>

							{/* Pano Thickness */}
							<div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-white block">
										Толщина слоя ОПТГ
									</label>
									<span className="text-xs font-mono font-bold text-teal-300">
										{panoThicknessMm.toFixed(1)} мм
									</span>
								</div>
								<input
									type="range"
									aria-label="Толщина слоя ОПТГ"
									min={1.0}
									max={16.0}
									step={0.5}
									value={panoThicknessMm}
									onChange={(e) => setPanoThicknessMm(Number(Number(e.target.value).toFixed(1)))}
									className="w-full cbct-slider cbct-slider--teal"
								/>
								<div className="flex items-center justify-between text-[10px] text-slate-500">
									<span>1.0 мм</span>
									<span>Базово: 1.0 мм</span>
									<span>16.0 мм</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer Controls */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-[#0f172a]/95">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleResetCanonical}
							className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							title="Сбросить все параметры на канон (4025 HU / 525 HU)"
						>
							<RotateCcw size={14} />
							<span>Сбросить на канон (4025/525)</span>
						</button>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-xl border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleSaveDefaults}
							className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/30 transition-all cursor-pointer"
						>
							<Check size={14} className="stroke-[3]" />
							<span>Сохранить как мой дефолт</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") return null;
	return createPortal(modalContent, document.body);
}

export default DoctorCbctSettingsModal;
