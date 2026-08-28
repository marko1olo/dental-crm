import {
	Activity,
	AlertTriangle,
	ArrowRight,
	Award,
	Bone,
	Check,
	CheckCircle2,
	ChevronRight,
	Clipboard,
	Contrast,
	Download,
	Eye,
	FileText,
	Filter,
	Flame,
	Layers,
	Printer,
	RefreshCw,
	RotateCcw,
	Sliders,
	Sparkles,
	Sun,
	Trash2,
	UploadCloud,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import "./CephalometricAnalysisModal.css";
import {
	CephalometricCanvas,
	SAMPLE_TRG_CEPHALOGRAM_URL,
	type XrayFilterMode,
} from "./CephalometricCanvas";
import {
	calculateCephalometrics,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
} from "./cephalometricMath";

export interface CephalometricAnalysisModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly initialImageUrl?: string | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

export function CephalometricAnalysisModal({
	isOpen,
	onClose,
	patientId,
	patientName,
	initialImageUrl,
	onInsertToProtocol,
}: CephalometricAnalysisModalProps) {
	// Active Tab inside the sidebar: 'landmarks' | 'metrics' | 'report'
	const [activeTab, setActiveTab] = useState<"landmarks" | "metrics" | "report">("landmarks");
	// Mobile Viewport Control (< lg / 390px): 'canvas' | 'landmarks' | 'metrics' | 'report'
	const [mobileView, setMobileView] = useState<"canvas" | "landmarks" | "metrics" | "report">("canvas");

	// Landmarks State (Initialized empty when no image is loaded to prevent fake 100% status)
	const [landmarks, setLandmarks] = useState<LandmarkMap>(() =>
		initialImageUrl ? DEFAULT_CEPH_LANDMARKS_PRESET : {},
	);
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>(
		initialImageUrl ? "S" : null,
	);

	// Image & Filters State
	const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
	const isImageLoaded = Boolean(imageUrl);
	const [filterMode, setFilterMode] = useState<XrayFilterMode>("normal");
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);

	// Overlay Toggles
	const [showPolygon, setShowPolygon] = useState<boolean>(true);
	const [showPlanes, setShowPlanes] = useState<boolean>(true);
	const [showLabels, setShowLabels] = useState<boolean>(true);

	// Calibration & Scale (mm per pixel)
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(0.15);

	// Copied state
	const [copied, setCopied] = useState<boolean>(false);

	// Perform Cephalometric Calculations (Steiner, Tweed, Downs, Jacobson, Ricketts)
	const analysis = useMemo(() => {
		return calculateCephalometrics(landmarks, scaleMmPerPixel);
	}, [landmarks, scaleMmPerPixel]);

	// Landmark Placement Handlers
	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => ({
			...prev,
			[key]: point,
		}));
	}, []);

	const handleRemoveLandmark = useCallback((key: LandmarkKey) => {
		setLandmarks((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const handleResetLandmarks = () => {
		setLandmarks({});
		setActiveTargetKey(null);
		showToast("Разметка ориентиров сброшена", "info");
	};

	const handleLoadPreset = () => {
		setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
		setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
		setActiveTargetKey(null);
		showToast("Загружена эталонная анатомическая разметка ТРГ со снимком", "success");
	};

	// File Upload Handler for Custom Ceph X-ray
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			showToast("Пожалуйста, выберите файл изображения (JPG, PNG, WebP)", "error");
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			if (typeof ev.target?.result === "string") {
				setImageUrl(ev.target.result);
				if (Object.keys(landmarks).length === 0) {
					setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
				}
				showToast(`Снимок ТРГ "${file.name}" успешно загружен`, "success");
			}
		};
		reader.readAsDataURL(file);
	};

	// Insert into Form 043/y Callback
	const handleInsertToChart = () => {
		if (onInsertToProtocol) {
			onInsertToProtocol(analysis.diagnosis.protocol043Text);
		}
		showToast("Протокол ТРГ успешно вставлен в ортодонтическую карту Формы 043/у!", "success");
		onClose();
	};

	// Copy Protocol Text
	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(analysis.diagnosis.protocol043Text);
			setCopied(true);
			showToast("Протокол ТРГ скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	if (!isOpen) return null;

	const placedPercent = Math.round((analysis.placedCount / analysis.totalCount) * 100);

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Ортодонтический цефалометрический анализ ТРГ"
			data-testid="cephalometric-analysis-modal"
		>
			<div className="relative w-full max-w-7xl max-h-[96vh] bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] dark:text-slate-100">
				{/* ── Modal Header ────────────────────────────────────────────── */}
				<header className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/95 shrink-0">
					<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
						<div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shadow-sm shrink-0">
							<Activity size={22} className="sm:w-6 sm:h-6" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
								<h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-[var(--ink,#0f172a)] dark:text-white m-0 truncate">
									Цефалометрический анализ ТРГ (Телерентгенография)
								</h2>
								<span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0">
									Steiner / Tweed / Downs / Ricketts
								</span>
							</div>
							<p className="text-xs sm:text-sm text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mt-0.5 truncate">
								{patientName ? `Пациент: ${patientName}` : "Ортодонтический модуль"} · Форма 043/у (Приказ МЗ РФ №834н)
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={onClose}
							data-testid="ceph-modal-close-btn"
							aria-label="Закрыть окно цефалометрического анализа"
							className="w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--muted,#64748b)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] dark:hover:text-white transition-colors cursor-pointer"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ── Mobile Viewport Tab Switcher (< lg / 390px) ─────────────── */}
				<div className="lg:hidden flex items-center gap-1 bg-slate-900 border-b border-slate-800 p-1.5 shrink-0 overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none">
					<button
						type="button"
						onClick={() => setMobileView("canvas")}
						className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "canvas"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						}`}
						data-testid="ceph-mobile-tab-canvas"
					>
						<Layers size={14} />
						<span>Снимок / Разметка</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setMobileView("landmarks");
							setActiveTab("landmarks");
						}}
						className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "landmarks"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						}`}
						data-testid="ceph-mobile-tab-landmarks"
					>
						<span>16 ориентиров ({isImageLoaded ? analysis.placedCount : 0}/16)</span>
					</button>

					<button
						type="button"
						onClick={() => {
							if (!isImageLoaded) {
								showToast("Сначала загрузите снимок ТРГ", "warning");
								return;
							}
							setMobileView("metrics");
							setActiveTab("metrics");
						}}
						className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "metrics"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
						data-testid="ceph-mobile-tab-metrics"
					>
						<span>Расчет углов</span>
						{isImageLoaded && analysis.isComplete && (
							<CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
						)}
					</button>

					<button
						type="button"
						onClick={() => {
							if (!isImageLoaded) {
								showToast("Сначала загрузите снимок ТРГ", "warning");
								return;
							}
							setMobileView("report");
							setActiveTab("report");
						}}
						className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "report"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
						data-testid="ceph-mobile-tab-report"
					>
						<FileText size={14} />
						<span>Форма 043/у</span>
					</button>
				</div>

				{/* ── Main Content Body ───────────────────────────────────────── */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto lg:overflow-hidden min-h-0">
					{/* ── Left Column: Lateral Cephalogram Viewer & Unified 36px HUD Strip (7 Cols) ── */}
					<div
						className={`lg:col-span-7 flex-col p-2.5 sm:p-3 bg-slate-950 border-r border-slate-800 shrink-0 lg:overflow-hidden ${
							mobileView === "canvas" ? "flex flex-1 min-h-[360px]" : "hidden lg:flex"
						}`}
					>
						{/* X-ray Canvas Component with Unified 36px HUD Strip & Maximum Vertical Screen Utilization */}
						<div className="flex-1 min-h-[340px] sm:min-h-[440px] lg:min-h-[620px] flex items-center justify-center relative overflow-hidden">
							<CephalometricCanvas
								landmarks={landmarks}
								onLandmarkChange={handleLandmarkChange}
								onRemoveLandmark={handleRemoveLandmark}
								activeTargetKey={activeTargetKey}
								onSelectTargetKey={setActiveTargetKey}
								imageUrl={imageUrl}
								onImageUpload={(url) => {
									setImageUrl(url);
									if (Object.keys(landmarks).length === 0) {
										setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
									}
									showToast("Снимок ТРГ успешно загружен", "success");
								}}
								filterMode={filterMode}
								onFilterModeChange={setFilterMode}
								brightness={brightness}
								contrast={contrast}
								showPolygon={showPolygon}
								onTogglePolygon={() => setShowPolygon((prev) => !prev)}
								showPlanes={showPlanes}
								onTogglePlanes={() => setShowPlanes((prev) => !prev)}
								showLabels={showLabels}
								onToggleLabels={() => setShowLabels((prev) => !prev)}
								scaleMmPerPixel={scaleMmPerPixel}
								onScaleChange={setScaleMmPerPixel}
								onLoadPreset={handleLoadPreset}
								onResetLandmarks={handleResetLandmarks}
							/>
						</div>
					</div>

					{/* ── Right Column: Interactive Sidebar (Landmarks, Measurements & Form 043/y) (5 Cols) ── */}
					<div
						className={`lg:col-span-5 flex-col bg-[var(--paper)] overflow-hidden ${
							mobileView !== "canvas" ? "flex flex-1" : "hidden lg:flex"
						}`}
					>
						{/* Tab Navigation with Symmetric 3-Column Grid (Zero Truncation) */}
						<div className="grid grid-cols-3 border-b border-[var(--line)] bg-[var(--paper-soft)] px-2 pt-1.5 shrink-0 gap-1 w-full">
							<button
								type="button"
								onClick={() => {
									setActiveTab("landmarks");
									setMobileView("landmarks");
								}}
								className={`h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
									activeTab === "landmarks"
										? "border-[var(--teal)] text-[var(--teal)] bg-[var(--paper)] rounded-t-lg shadow-xs"
										: "border-transparent text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
								}`}
								title="Ориентиры ТРГ"
							>
								<span className="hidden sm:inline whitespace-nowrap">1. Ориентиры ({isImageLoaded ? analysis.placedCount : 0})</span>
								<span className="sm:hidden whitespace-nowrap">1. Точки ({isImageLoaded ? analysis.placedCount : 0})</span>
							</button>

							<button
								type="button"
								onClick={() => {
									if (isImageLoaded) {
										setActiveTab("metrics");
										setMobileView("metrics");
									} else {
										showToast("Сначала загрузите снимок ТРГ", "warning");
									}
								}}
								className={`h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
									activeTab === "metrics"
										? "border-[var(--teal)] text-[var(--teal)] bg-[var(--paper)] rounded-t-lg shadow-xs"
										: "border-transparent text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
								} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
								title="Расчет углов (Steiner, Tweed, Downs)"
							>
								<span className="hidden sm:inline whitespace-nowrap">2. Расчет углов</span>
								<span className="sm:hidden whitespace-nowrap">2. Углы</span>
								{isImageLoaded && analysis.isComplete && (
									<CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
								)}
							</button>

							<button
								type="button"
								onClick={() => {
									if (isImageLoaded) {
										setActiveTab("report");
										setMobileView("report");
									} else {
										showToast("Сначала загрузите снимок ТРГ", "warning");
									}
								}}
								className={`h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
									activeTab === "report"
										? "border-[var(--teal)] text-[var(--teal)] bg-[var(--paper)] rounded-t-lg shadow-xs"
										: "border-transparent text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
								} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
								title="Форма 043/у-ТРГ (Ортодонтический протокол)"
							>
								<FileText size={14} className="shrink-0" />
								<span className="hidden sm:inline whitespace-nowrap">3. Форма 043/у</span>
								<span className="sm:hidden whitespace-nowrap">3. 043/у</span>
							</button>
						</div>

						{/* Tab 1: Landmarks List & Placement Guidance (All Landmarks with >= 44x44px Touch Targets) */}
						{activeTab === "landmarks" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden">
								{/* Progress Bar */}
								<div className="mb-3.5 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
									<div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
										<span className="text-[var(--ink,#0f172a)] dark:text-slate-200">
											Прогресс разметки ТРГ
										</span>
										<span className="text-[var(--teal)] font-extrabold">{placedPercent}%</span>
									</div>
									<div className="h-2.5 w-full bg-[var(--line,#e2e8f0)] dark:bg-slate-700 rounded-full overflow-hidden">
										<div
											className="h-full bg-[var(--teal)] rounded-full transition-all duration-300"
											style={{ width: `${placedPercent}%` }}
										/>
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mt-2 min-w-0 break-words">
										{isImageLoaded
											? "Кликните ориентир ниже, затем укажите его положение на снимке ТРГ слева."
											: "Загрузите боковую ТРГ пациента или выберите эталонный снимок для начала анализа."}
									</p>
								</div>

								{/* Landmark Item Cards with Touch Targets >= 44x44px (min-h-[52px]) */}
								<div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-28">
									{CEPHALOMETRIC_LANDMARKS.map((lm) => {
										const isPlaced = isImageLoaded && landmarks[lm.key] !== undefined;
										const isTarget = isImageLoaded && activeTargetKey === lm.key;

										return (
											<button
												key={lm.key}
												type="button"
												onClick={() => {
													if (!isImageLoaded) {
														showToast("Сначала загрузите снимок ТРГ", "warning");
														return;
													}
													setActiveTargetKey(lm.key);
													setMobileView("canvas");
													showToast(`Укажите точку «${lm.nameRu}» на снимке`, "info");
												}}
												className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[52px] ${
													isTarget
														? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-md ring-1 ring-[var(--teal-soft)]"
														: isPlaced
															? "bg-[var(--surface,#f8fafc)] dark:bg-slate-800/70 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-[var(--teal)]"
															: "bg-[var(--paper,#ffffff)] dark:bg-slate-900/60 border-dashed border-[var(--line,#cbd5e1)] dark:border-slate-700 opacity-85 hover:opacity-100"
												}`}
											>
												<div className="flex items-center gap-3 min-w-0">
													<div
														className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 text-white shadow-sm"
														style={{ backgroundColor: isImageLoaded ? lm.color : "#64748b" }}
													>
														{lm.code}
													</div>
													<div className="min-w-0">
														<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 min-w-0 break-words">
															{lm.nameRu}
														</div>
														<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 min-w-0 break-words leading-snug">
															{lm.anatomicalDescription}
														</div>
													</div>
												</div>

												<div className="shrink-0 flex items-center gap-1.5">
													{isPlaced ? (
														<span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1">
															<Check size={13} /> Задана
														</span>
													) : (
														<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
															Не задана
														</span>
													)}
												</div>
											</button>
										);
									})}
								</div>

								{/* Bottom Action */}
								<div className="mt-3 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
									<button
										type="button"
										disabled={!isImageLoaded || placedPercent === 0}
										onClick={() => {
											setActiveTab("metrics");
											setMobileView("metrics");
										}}
										className={`w-full min-h-[48px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
											!isImageLoaded || placedPercent === 0
												? "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
												: "bg-[var(--teal)] hover:opacity-90 text-white cursor-pointer"
										}`}
									>
										<span>Перейти к расчету углов (Steiner, Tweed, Downs)</span>
										<ArrowRight size={16} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 2: Cephalometric Measurements Table & Cards (Steiner, Tweed, Downs, Jacobson, Ricketts) */}
						{activeTab === "metrics" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto">
								{/* Quick Diagnosis Banner */}
								<div className="mb-4 p-4 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] shadow-sm">
									<div className="text-xs font-black text-[var(--teal)] uppercase tracking-wider">
										Клиническое резюме анализа
									</div>
									<div className="text-base font-black text-[var(--ink,#0f172a)] dark:text-white mt-1 min-w-0 break-words">
										{analysis.diagnosis.skeletalClassRu}
									</div>
									<div className="text-sm text-[var(--muted,#64748b)] dark:text-slate-300 mt-1.5 leading-relaxed min-w-0 break-words">
										{analysis.diagnosis.summaryRu}
									</div>
								</div>

								{/* Measurements Grouped by Category */}
								<div className="space-y-4 flex-1 overflow-y-auto pr-1">
									{/* Category 1: Sagittal (Steiner, Downs, Jacobson Wits) */}
									<div>
										<div className="text-xs font-black text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2.5">
											1. Сагиттальные параметры (Steiner, Downs, Jacobson)
										</div>
										<div className="space-y-2">
											{analysis.measurements
												.filter((m) => m.category === "sagittal")
												.map((m) => (
													<div
														key={m.id}
														className="p-3 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/70 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between gap-3 min-h-[52px]"
													>
														<div className="min-w-0">
															<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white min-w-0 break-words">
																{m.name}
															</div>
															<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5 min-w-0 break-words">
																{m.clinicalInterpretation} · Норма: <span className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">{m.normText}</span>
															</div>
														</div>
														<div className="text-right shrink-0 flex flex-col items-end gap-1">
															<div
																className={`text-base font-black ${
																	m.status === "normal"
																		? "text-emerald-600 dark:text-emerald-400"
																		: m.status === "increased"
																			? "text-rose-600 dark:text-rose-400"
																			: m.status === "decreased"
																				? "text-[var(--info-fg,#0284c7)]"
																				: "text-[var(--muted,#64748b)]"
																}`}
															>
																{m.value !== null ? `${m.value}${m.unit}` : "—"}
															</div>
															<span
																className={`text-xs uppercase font-black px-2.5 py-1 rounded-lg border ${
																	m.status === "normal"
																		? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
																		: m.status === "increased"
																			? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-500/40"
																			: m.status === "decreased"
																				? "bg-[var(--info-bg,rgba(2,132,199,0.1))] text-[var(--info-fg,#0284c7)] border-[var(--info-fg,rgba(2,132,199,0.3))]"
																				: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-600/30"
																}`}
															>
																{m.status === "normal"
																	? "Норма"
																	: m.status === "increased"
																		? "Увеличен"
																		: m.status === "decreased"
																			? "Уменьшен"
																			: "Нет данных"}
															</span>
														</div>
													</div>
												))}
										</div>
									</div>

									{/* Category 2: Vertical & Growth Pattern (Tweed, Steiner, Downs, Ricketts) */}
									<div className="pt-2">
										<div className="text-xs font-black text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2.5">
											2. Вертикальные параметры и тип роста (Tweed, Steiner, Downs, Ricketts)
										</div>
										<div className="space-y-2">
											{analysis.measurements
												.filter((m) => m.category === "vertical")
												.map((m) => (
													<div
														key={m.id}
														className="p-3 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/70 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between gap-3 min-h-[52px]"
													>
														<div className="min-w-0">
															<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white min-w-0 break-words">
																{m.name}
															</div>
															<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5 min-w-0 break-words">
																{m.clinicalInterpretation} · Норма: <span className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">{m.normText}</span>
															</div>
														</div>
														<div className="text-right shrink-0 flex flex-col items-end gap-1">
															<div
																className={`text-base font-black ${
																	m.status === "normal"
																		? "text-emerald-600 dark:text-emerald-400"
																		: m.status === "increased"
																			? "text-rose-600 dark:text-rose-400"
																			: m.status === "decreased"
																				? "text-[var(--info-fg,#0284c7)]"
																				: "text-[var(--muted,#64748b)]"
																}`}
															>
																{m.value !== null ? `${m.value}${m.unit}` : "—"}
															</div>
															<span
																className={`text-xs uppercase font-black px-2.5 py-1 rounded-lg border ${
																	m.status === "normal"
																		? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
																		: m.status === "increased"
																			? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-500/40"
																			: m.status === "decreased"
																				? "bg-[var(--info-bg,rgba(2,132,199,0.1))] text-[var(--info-fg,#0284c7)] border-[var(--info-fg,rgba(2,132,199,0.3))]"
																				: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-600/30"
																}`}
															>
																{m.status === "normal"
																	? "Норма"
																	: m.status === "increased"
																		? "Увеличен"
																		: m.status === "decreased"
																			? "Уменьшен"
																			: "Нет данных"}
															</span>
														</div>
													</div>
												))}
										</div>
									</div>

									{/* Category 3: Dental & Incisors (Steiner, Tweed) */}
									<div className="pt-2">
										<div className="text-xs font-black text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2.5">
											3. Дентальные параметры резцов (Steiner, Tweed)
										</div>
										<div className="space-y-2">
											{analysis.measurements
												.filter((m) => m.category === "dental")
												.map((m) => (
													<div
														key={m.id}
														className="p-3 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/70 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between gap-3 min-h-[52px]"
													>
														<div className="min-w-0">
															<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white min-w-0 break-words">
																{m.name}
															</div>
															<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5 min-w-0 break-words">
																{m.clinicalInterpretation} · Норма: <span className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">{m.normText}</span>
															</div>
														</div>
														<div className="text-right shrink-0 flex flex-col items-end gap-1">
															<div
																className={`text-base font-black ${
																	m.status === "normal"
																		? "text-emerald-600 dark:text-emerald-400"
																		: m.status === "increased"
																			? "text-rose-600 dark:text-rose-400"
																			: m.status === "decreased"
																				? "text-[var(--info-fg,#0284c7)]"
																				: "text-[var(--muted,#64748b)]"
																}`}
															>
																{m.value !== null ? `${m.value}${m.unit}` : "—"}
															</div>
															<span
																className={`text-xs uppercase font-black px-2.5 py-1 rounded-lg border ${
																	m.status === "normal"
																		? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
																		: m.status === "increased"
																			? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-500/40"
																			: m.status === "decreased"
																				? "bg-[var(--info-bg,rgba(2,132,199,0.1))] text-[var(--info-fg,#0284c7)] border-[var(--info-fg,rgba(2,132,199,0.3))]"
																				: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-600/30"
																}`}
															>
																{m.status === "normal"
																	? "Норма"
																	: m.status === "increased"
																		? "Увеличен"
																		: m.status === "decreased"
																			? "Уменьшен"
																			: "Нет данных"}
															</span>
														</div>
													</div>
												))}
										</div>
									</div>
								</div>

								{/* Bottom Action */}
								<div className="mt-3 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
									<button
										type="button"
										onClick={() => {
											setActiveTab("report");
											setMobileView("report");
										}}
										className="w-full min-h-[48px] py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
									>
										<span>Сформировать протокол Формы 043/у</span>
										<ArrowRight size={16} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 3: Structured Protocol for Form 043/y */}
						{activeTab === "report" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto">
								<div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
									<div className="flex items-center gap-2 min-w-0">
										<FileText size={20} className="text-[var(--teal)] shrink-0" />
										<span className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white min-w-0 break-words">
											Предпросмотр протокола для карты 043/у
										</span>
									</div>
									<button
										type="button"
										onClick={handleCopyText}
										className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 transition-colors border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer shadow-sm"
									>
										{copied ? <Check size={15} className="text-emerald-500" /> : <Clipboard size={15} />}
										<span>{copied ? "Скопировано" : "Копировать"}</span>
									</button>
								</div>

								{/* Protocol Text Area */}
								<textarea
									readOnly
									value={analysis.diagnosis.protocol043Text}
									aria-label="Текст протокола ТРГ для формы 043/у"
									className="flex-1 min-h-[320px] p-4 bg-[var(--surface,#f8fafc)] dark:bg-slate-950 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-xl font-mono text-xs sm:text-sm text-[var(--ink,#0f172a)] dark:text-slate-200 resize-none outline-none focus:border-[var(--teal)] leading-relaxed shadow-inner"
								/>

								{/* Bottom Action: 1-Click Insert into Orthodontic Card */}
								<div className="mt-3 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2">
									<button
										type="button"
										onClick={handleInsertToChart}
										className="w-full min-h-[48px] py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border border-[var(--teal-soft)]"
									>
										<Sparkles size={18} />
										<span>Вставить в ортодонтическую карту Формы 043/у</span>
									</button>
									<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 text-center m-0 min-w-0 break-words">
										Текст и угловые расчеты будут добавлены в дневник приёма и историю болезни пациента
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
