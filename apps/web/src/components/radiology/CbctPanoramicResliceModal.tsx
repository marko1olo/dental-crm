import {
	Activity,
	ArrowLeft,
	Box,
	Check,
	ClipboardCopy,
	Columns,
	Download,
	Eye,
	EyeOff,
	FileSpreadsheet,
	FileText,
	Layers,
	Maximize2,
	RefreshCcw,
	Save,
	Scan,
	ShieldCheck,
	Sparkles,
	Target,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CbctAxialCurveViewport } from "./CbctAxialCurveViewport";
import { CbctCrossSectionInspector } from "./CbctCrossSectionInspector";
import { CbctSliceCarouselStrip } from "./CbctSliceCarouselStrip";
import {
	exportCrossSectionsToImplantPlan,
	FOCAL_TROUGH_PRESETS,
	formatCrossSectionSummaryDiary043,
	generateCrossSectionBoneProfiles,
	type CrossSectionBoneProfile,
	type FocalTroughThicknessMm,
	type ImplantPlanningCardTransferPayload,
} from "./cbctCrossSectionEngine";
import {
	buildArcLengthParameterizedCurve,
	generateCrossSectionPlanes,
	getStandardDentalArchControlPoints,
	type ArchControlPoint,
	type DentalArchPreset,
} from "./cbctPanoramicCurveMath";
import type { RadiologyStudy } from "./types";

export interface CbctPanoramicResliceModalProps {
	isOpen: boolean;
	onClose: () => void;
	study: RadiologyStudy | null;
	initialJaw?: "maxilla" | "mandible" | undefined;
	initialPreset?: DentalArchPreset | undefined;
	onExportToImplantPlan?: ((payload: ImplantPlanningCardTransferPayload) => void) | undefined;
	onSaveStudy?: ((updatedStudy: RadiologyStudy) => void) | undefined;
}

export const CbctPanoramicResliceModal: React.FC<CbctPanoramicResliceModalProps> = ({
	isOpen,
	onClose,
	study,
	initialJaw = "mandible",
	initialPreset = "standard_mandible",
	onExportToImplantPlan,
	onSaveStudy,
}) => {
	const modalId = useId();

	// Active State
	const [jaw, setJaw] = useState<"maxilla" | "mandible">(initialJaw);
	const [archPreset, setArchPreset] = useState<DentalArchPreset>(initialPreset);
	const [focalTroughMm, setFocalTroughMm] = useState<FocalTroughThicknessMm>(10);
	const [planeCount, setPlaneCount] = useState<number>(36);
	const [activeSliceIndex, setActiveSliceIndex] = useState<number>(18); // center by default

	// Visual display toggles
	const [showNormals, setShowNormals] = useState<boolean>(true);
	const [showToothBadges, setShowToothBadges] = useState<boolean>(true);
	const [showFocalTrough, setShowFocalTrough] = useState<boolean>(true);
	const [isEditMode, setIsEditMode] = useState<boolean>(true);

	// User measurement calibrations per slice
	const [customHeightMap, setCustomHeightMap] = useState<Record<number, number>>({});
	const [customWidthMap, setCustomWidthMap] = useState<Record<number, number>>({});

	// Toast & Copy status feedback
	const [copyStatus, setCopyStatus] = useState<string | null>(null);
	const [exportSuccess, setExportSuccess] = useState<boolean>(false);

	// Interactive Control Points for the panoramic spline curve
	const [controlPoints, setControlPoints] = useState<ArchControlPoint[]>(() =>
		getStandardDentalArchControlPoints(initialPreset, initialJaw),
	);

	// Reset control points when jaw or preset changes
	const handleResetCurvePreset = useCallback(
		(newPreset: DentalArchPreset, newJaw: "maxilla" | "mandible") => {
			setArchPreset(newPreset);
			setJaw(newJaw);
			const pts = getStandardDentalArchControlPoints(newPreset, newJaw);
			setControlPoints(pts);
			setCustomHeightMap({});
			setCustomWidthMap({});
		},
		[],
	);

	// Sync when modal opens
	useEffect(() => {
		if (isOpen) {
			const preset = jaw === "maxilla" ? "standard_maxilla" : "standard_mandible";
			setControlPoints(getStandardDentalArchControlPoints(preset, jaw));
			setActiveSliceIndex(Math.floor(planeCount / 2));
			setExportSuccess(false);
			setCopyStatus(null);
		}
	}, [isOpen, jaw, planeCount]);

	// Geometric Curve Interpolation (Samples)
	const curveSamples = useMemo(() => {
		const rawPts = controlPoints.map((p) => ({ x: p.x, y: p.y }));
		return buildArcLengthParameterizedCurve(rawPts, 1.0, 120.0, 120.0);
	}, [controlPoints]);

	// Cross-Section Planes (32–40 slices)
	const crossSectionPlanes = useMemo(() => {
		const rawPts = controlPoints.map((p) => ({ x: p.x, y: p.y }));
		return generateCrossSectionPlanes({
			controlPoints: rawPts,
			planeCount,
			focalTroughThicknessMm: focalTroughMm,
			crossSectionWidthMm: 30.0,
			crossSectionHeightMm: 35.0,
			jawType: jaw,
			imageWidthMm: 120.0,
			imageHeightMm: 120.0,
		});
	}, [controlPoints, planeCount, focalTroughMm, jaw]);

	// Clinical Bone Profiles for all cross-sections
	const boneProfiles: CrossSectionBoneProfile[] = useMemo(() => {
		return generateCrossSectionBoneProfiles({
			planes: crossSectionPlanes,
			jaw,
			focalTroughThicknessMm: focalTroughMm,
			customHeightMapMm: customHeightMap,
			customWidthMapMm: customWidthMap,
		});
	}, [crossSectionPlanes, jaw, focalTroughMm, customHeightMap, customWidthMap]);

	// Active selected bone profile
	const activeProfile = useMemo(() => {
		return boneProfiles[activeSliceIndex] ?? boneProfiles[0] ?? null;
	}, [boneProfiles, activeSliceIndex]);

	// Update slice height & width from inspector sliders
	const handleUpdateActiveMeasurements = useCallback(
		(heightMm: number, widthMm: number) => {
			setCustomHeightMap((prev) => ({ ...prev, [activeSliceIndex]: heightMm }));
			setCustomWidthMap((prev) => ({ ...prev, [activeSliceIndex]: widthMm }));
		},
		[activeSliceIndex],
	);

	// 1-Click Export to Dental Implant Planning Card
	const handleExportToImplantPlan = () => {
		const payload = exportCrossSectionsToImplantPlan(
			study?.id || "study-cbct-001",
			boneProfiles,
			jaw,
			study?.patientId,
		);

		if (onExportToImplantPlan) {
			onExportToImplantPlan(payload);
		}

		setExportSuccess(true);
		setTimeout(() => setExportSuccess(false), 4000);
	};

	// Copy 043/u summary to clipboard
	const handleCopyDiary043 = () => {
		const summaryText = formatCrossSectionSummaryDiary043(boneProfiles);
		if (navigator.clipboard) {
			navigator.clipboard.writeText(summaryText).then(() => {
				setCopyStatus("Протокол скопирован в буфер обмена!");
				setTimeout(() => setCopyStatus(null), 3000);
			});
		}
	};

	// Keyboard shortcuts (Esc, ArrowLeft, ArrowRight)
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "ArrowLeft") {
				setActiveSliceIndex((prev) => Math.max(0, prev - 1));
			} else if (e.key === "ArrowRight") {
				setActiveSliceIndex((prev) => Math.min(planeCount - 1, prev + 1));
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, planeCount]);

	if (!isOpen) return null;

	return createPortal(
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="КЛКТ Панорамная кривая и Кросс-секционный реслайсер"
			data-testid="cbct-panoramic-reslice-modal"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP HEADER (Cyber Ergonomics & Study Info)
			    ═══════════════════════════════════════════════════════════════════ */}
			<header className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-[var(--teal,#06b6d4)]/20 backdrop-blur-md z-30 shrink-0">
				{/* Left: Close & Title */}
				<div className="flex items-center gap-3 min-w-0">
					<button
						type="button"
						onClick={onClose}
						className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-[var(--teal,#06b6d4)] hover:border-[var(--teal,#06b6d4)]/50 hover:bg-slate-700/60 active:scale-95 transition-all"
						title="Закрыть модуль (Esc)"
						data-testid="cbct-reslice-close-btn"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>

					<div className="flex flex-col min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="px-2.5 py-0.5 rounded-lg bg-[var(--teal-surface,#083344)] border border-[var(--teal,#06b6d4)]/40 text-[var(--teal,#06b6d4)] text-xs font-extrabold uppercase tracking-wide">
								3D КЛКТ MPR
							</span>
							<h1 className="text-sm md:text-base font-bold text-slate-100 truncate">
								Панорамная кривая зубной дуги & Кросс-секции (Шаг 1-2 мм)
							</h1>
						</div>
						<div className="flex items-center gap-3 text-xs text-slate-400 truncate mt-0.5">
							<span>Пациент: <strong className="text-slate-200">{study?.patientName || "Иванов И.И."}</strong></span>
							<span>•</span>
							<span>{study?.studyDate || "2026-08-15"}</span>
							<span>•</span>
							<span className="text-[var(--teal,#06b6d4)] font-semibold">
								Длина дуги: {boneProfiles[boneProfiles.length - 1]?.arcPositionMm || 105.0} мм
							</span>
						</div>
					</div>
				</div>

				{/* Center: Jaw Switcher Tabs */}
				<div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700">
					<button
						type="button"
						onClick={() => handleResetCurvePreset("standard_mandible", "mandible")}
						className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
							jaw === "mandible"
								? "bg-[var(--teal,#06b6d4)] text-slate-950 shadow-sm"
								: "text-slate-300 hover:text-white"
						}`}
						data-testid="select-jaw-mandible"
					>
						Нижняя челюсть (Н/Ч)
					</button>
					<button
						type="button"
						onClick={() => handleResetCurvePreset("standard_maxilla", "maxilla")}
						className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
							jaw === "maxilla"
								? "bg-[var(--teal,#06b6d4)] text-slate-950 shadow-sm"
								: "text-slate-300 hover:text-white"
						}`}
						data-testid="select-jaw-maxilla"
					>
						Верхняя челюсть (В/Ч)
					</button>
				</div>

				{/* Right: Quick Action Buttons */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopyDiary043}
						className="hidden sm:flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-[var(--teal,#06b6d4)] text-xs font-bold transition-all"
						title="Скопировать протокол замеров в дневник приема 043/у"
					>
						<ClipboardCopy className="w-4 h-4 text-[var(--teal,#06b6d4)]" />
						<span>В дневник 043/у</span>
					</button>

					<button
						type="button"
						onClick={handleExportToImplantPlan}
						className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
						title="1-Клик перенос всех замеров и рекомендаций в карту имплантации"
						data-testid="export-implant-plan-btn"
					>
						<Sparkles className="w-4 h-4" />
						<span>Перенести в карту имплантации</span>
					</button>
				</div>
			</header>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. PARAMETER TOOLBAR (Arch Presets, Focal Trough, Slices)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs gap-3 overflow-x-auto">
				{/* Dental Arch Preset Dropdown */}
				<div className="flex items-center gap-2 shrink-0">
					<span className="font-semibold text-slate-400">Форма дуги:</span>
					<select
						value={archPreset}
						onChange={(e) => handleResetCurvePreset(e.target.value as DentalArchPreset, jaw)}
						className="min-h-[40px] px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-semibold cursor-pointer"
						data-testid="arch-preset-select"
					>
						<option value="standard_mandible">Стандартная парабола (Н/Ч)</option>
						<option value="standard_maxilla">Анатомическая дуга (В/Ч)</option>
						<option value="narrow_v_shape">V-образная (узкая готическая)</option>
						<option value="wide_u_shape">U-образная (широкая квадратная)</option>
						<option value="asymmetric_left">Асимметричная (сдвиг влево)</option>
						<option value="asymmetric_right">Асимметричная (сдвиг вправо)</option>
					</select>
				</div>

				{/* Focal Trough Slab Thickness */}
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="font-semibold text-slate-400">Толщина слоя:</span>
					{FOCAL_TROUGH_PRESETS.map((p) => {
						const isSelected = focalTroughMm === p.thicknessMm;
						return (
							<button
								key={`trough-${p.thicknessMm}`}
								type="button"
								onClick={() => setFocalTroughMm(p.thicknessMm)}
								className={`min-h-[40px] px-3 py-1 rounded-xl font-bold transition-all ${
									isSelected
										? "bg-[var(--teal-surface,#083344)] border border-[var(--teal,#06b6d4)] text-[var(--teal,#06b6d4)] shadow-sm"
										: "bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white"
								}`}
								title={p.description}
								data-testid={`focal-trough-${p.thicknessMm}`}
							>
								{p.thicknessMm} мм
							</button>
						);
					})}
				</div>

				{/* Slice Plane Count (32, 36, 40) */}
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="font-semibold text-slate-400">Срезов:</span>
					{[32, 36, 40].map((count) => {
						const isSelected = planeCount === count;
						return (
							<button
								key={`count-${count}`}
								type="button"
								onClick={() => {
									setPlaneCount(count);
									setActiveSliceIndex(Math.min(activeSliceIndex, count - 1));
								}}
								className={`min-h-[40px] px-3 py-1 rounded-xl font-bold transition-all ${
									isSelected
										? "bg-[var(--teal-surface,#083344)] border border-[var(--teal,#06b6d4)] text-[var(--teal,#06b6d4)]"
										: "bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white"
								}`}
							>
								{count}
							</button>
						);
					})}
				</div>

				{/* Visual Display Toggles */}
				<div className="flex items-center gap-1 shrink-0 ml-auto">
					<button
						type="button"
						onClick={() => setShowNormals((prev) => !prev)}
						className={`min-h-[40px] px-2.5 py-1 rounded-xl border transition-all ${
							showNormals
								? "bg-[var(--teal-surface,#083344)] border-[var(--teal,#06b6d4)]/40 text-[var(--teal,#06b6d4)]"
								: "bg-slate-800 border-slate-700 text-slate-400"
						}`}
						title="Показать/скрыть перпендикуляры срезов"
					>
						Нормали
					</button>

					<button
						type="button"
						onClick={() => setShowToothBadges((prev) => !prev)}
						className={`min-h-[40px] px-2.5 py-1 rounded-xl border transition-all ${
							showToothBadges
								? "bg-[var(--teal-surface,#083344)] border-[var(--teal,#06b6d4)]/40 text-[var(--teal,#06b6d4)]"
								: "bg-slate-800 border-slate-700 text-slate-400"
						}`}
						title="Показать/скрыть номера зубов FDI"
					>
						Зубы FDI
					</button>

					<button
						type="button"
						onClick={() => setShowFocalTrough((prev) => !prev)}
						className={`min-h-[40px] px-2.5 py-1 rounded-xl border transition-all ${
							showFocalTrough
								? "bg-[var(--teal-surface,#083344)] border-[var(--teal,#06b6d4)]/40 text-[var(--teal,#06b6d4)]"
								: "bg-slate-800 border-slate-700 text-slate-400"
						}`}
						title="Показать/скрыть фокальный коридор"
					>
						Слой {focalTroughMm}мм
					</button>

					<button
						type="button"
						onClick={() => handleResetCurvePreset(archPreset, jaw)}
						className="min-h-[40px] px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-[var(--teal,#06b6d4)] hover:bg-slate-700"
						title="Сбросить кривую к базовому пресету"
					>
						<RefreshCcw className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Toast Notifications */}
			{copyStatus && (
				<div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500/90 text-slate-950 font-bold text-xs shadow-2xl backdrop-blur-md animate-in fade-in duration-150 flex items-center gap-2">
					<Check className="w-4 h-4" />
					<span>{copyStatus}</span>
				</div>
			)}
			{exportSuccess && (
				<div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-extrabold text-sm shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-150 flex items-center gap-2">
					<Sparkles className="w-5 h-5" />
					<span>Замеры и параметры имплантации успешно экспортированы в карту!</span>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    3. MAIN DUAL VIEWPORT (Left: Axial Scout | Right: Cross Section)
			    ═══════════════════════════════════════════════════════════════════ */}
			<main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 min-h-0 bg-slate-950 overflow-hidden">
				{/* Left Viewport: Interactive Axial CBCT View with Spline Curve */}
				<section className="flex flex-col h-full min-h-0 bg-slate-900/50 rounded-2xl border border-slate-800 p-2 overflow-hidden">
					<div className="flex items-center justify-between px-2 pb-2 text-xs text-slate-300 font-bold border-b border-slate-800 mb-2">
						<span className="flex items-center gap-2">
							<Scan className="w-4 h-4 text-[var(--teal,#06b6d4)]" />
							Аксиальный срез КЛКТ & Интерактивная кривая дуги
						</span>
						<span className="text-[11px] font-normal text-slate-400">
							Тяните точки для подгонки под анатомию челюсти
						</span>
					</div>
					<div className="flex-1 min-h-0">
						<CbctAxialCurveViewport
							imageUrl={study?.imageUrl}
							controlPoints={controlPoints}
							onUpdateControlPoints={setControlPoints}
							curveSamples={curveSamples}
							crossSectionPlanes={crossSectionPlanes}
							activeSliceIndex={activeSliceIndex}
							onSelectSliceIndex={setActiveSliceIndex}
							showNormals={showNormals}
							showToothBadges={showToothBadges}
							showFocalTrough={showFocalTrough}
							isEditMode={isEditMode}
							focalTroughThicknessMm={focalTroughMm}
						/>
					</div>
				</section>

				{/* Right Viewport: Pararadicular Cross-Section Inspector */}
				<section className="flex flex-col h-full min-h-0 overflow-hidden">
					{activeProfile ? (
						<CbctCrossSectionInspector
							profile={activeProfile}
							onUpdateMeasurements={handleUpdateActiveMeasurements}
							showVirtualImplant={true}
						/>
					) : (
						<div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
							Выберите срез для инспекции
						</div>
					)}
				</section>
			</main>

			{/* ═══════════════════════════════════════════════════════════════════
			    4. BOTTOM CROSS-SECTION CAROUSEL STRIP (32–40 Slices)
			    ═══════════════════════════════════════════════════════════════════ */}
			<footer className="shrink-0">
				<CbctSliceCarouselStrip
					slices={boneProfiles}
					activeSliceIndex={activeSliceIndex}
					onSelectSlice={setActiveSliceIndex}
				/>
			</footer>
		</div>,
		document.body,
	);
};
