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
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import {
	CephalometricCanvas,
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
	readonly patientId?: string;
	readonly patientName?: string;
	readonly initialImageUrl?: string;
	readonly onInsertToProtocol?: (protocolText: string) => void;
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

	// Landmarks State
	const [landmarks, setLandmarks] = useState<LandmarkMap>(DEFAULT_CEPH_LANDMARKS_PRESET);
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>("S");

	// Image & Filters State
	const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
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

	// Perform Cephalometric Calculations
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
		setActiveTargetKey("S");
		showToast("Разметка ориентиров сброшена", "info");
	};

	const handleLoadPreset = () => {
		setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
		setActiveTargetKey(null);
		showToast("Загружена эталонная анатомическая разметка ТРГ", "success");
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
				<header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
							<Activity size={22} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--ink,#0f172a)] dark:text-white m-0">
									Цефалометрический анализ ТРГ (Телерентгенография)
								</h2>
								<span className="text-[10px] uppercase tracking-wider font-extrabold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
									Steiner / Tweed / Ricketts
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mt-0.5">
								{patientName ? `Пациент: ${patientName}` : "Ортодонтический модуль"} · Форма 043/у
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть окно цефалометрического анализа"
							className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--muted,#64748b)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] dark:hover:text-white transition-colors cursor-pointer"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* ── Main Content Body ───────────────────────────────────────── */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
					{/* ── Left Column: Lateral Cephalogram Viewer & Image Controls (7 Cols) ── */}
					<div className="lg:col-span-7 flex flex-col p-4 bg-slate-950 border-r border-slate-800 overflow-y-auto">
						{/* X-ray Canvas Component */}
						<CephalometricCanvas
							landmarks={landmarks}
							onLandmarkChange={handleLandmarkChange}
							onRemoveLandmark={handleRemoveLandmark}
							activeTargetKey={activeTargetKey}
							onSelectTargetKey={setActiveTargetKey}
							imageUrl={imageUrl}
							filterMode={filterMode}
							brightness={brightness}
							contrast={contrast}
							showPolygon={showPolygon}
							showPlanes={showPlanes}
							showLabels={showLabels}
							scaleMmPerPixel={scaleMmPerPixel}
							onScaleChange={setScaleMmPerPixel}
						/>

						{/* Bottom Controls: Filters, Overlays & Upload Toolbar */}
						<div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 border border-slate-800 rounded-xl p-3">
							{/* Filter Modes */}
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
									<Filter size={13} /> Фильтры:
								</span>
								{(
									[
										{ id: "normal", label: "Стандарт" },
										{ id: "invert", label: "Инверсия" },
										{ id: "bone", label: "Костный (Bone+)" },
										{ id: "edge", label: "Контуры" },
									] as const
								).map((flt) => (
									<button
										key={flt.id}
										type="button"
										onClick={() => setFilterMode(flt.id)}
										className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
											filterMode === flt.id
												? "bg-teal-600 text-white shadow-sm"
												: "bg-slate-800 text-slate-400 hover:text-slate-200"
										}`}
									>
										{flt.label}
									</button>
								))}
							</div>

							{/* Overlays Toggles */}
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => setShowPolygon((prev) => !prev)}
									className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
										showPolygon
											? "bg-cyan-600 text-white"
											: "bg-slate-800 text-slate-400 hover:text-slate-200"
									}`}
								>
									<Layers size={13} /> Полигон
								</button>
								<button
									type="button"
									onClick={() => setShowPlanes((prev) => !prev)}
									className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
										showPlanes
											? "bg-cyan-600 text-white"
											: "bg-slate-800 text-slate-400 hover:text-slate-200"
									}`}
								>
									Плоскости
								</button>
								<button
									type="button"
									onClick={() => setShowLabels((prev) => !prev)}
									className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
										showLabels
											? "bg-cyan-600 text-white"
											: "bg-slate-800 text-slate-400 hover:text-slate-200"
									}`}
								>
									Подписи
								</button>
							</div>

							{/* Actions: Demo preset, Upload & Clear */}
							<div className="flex items-center gap-2 flex-wrap w-full pt-2 border-t border-slate-800/80 justify-between">
								<div className="flex items-center gap-2">
									<label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700">
										<UploadCloud size={14} />
										<span>Загрузить снимок ТРГ</span>
										<input
											type="file"
											accept="image/*"
											onChange={handleFileUpload}
											className="hidden"
										/>
									</label>
									<button
										type="button"
										onClick={handleLoadPreset}
										className="px-3 py-1.5 rounded-lg bg-teal-950/80 hover:bg-teal-900 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-teal-500/30 cursor-pointer"
										title="Загрузить эталонную разметку"
									>
										<Sparkles size={14} />
										<span>Эталонная разметка</span>
									</button>
								</div>

								<button
									type="button"
									onClick={handleResetLandmarks}
									className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-800/40 cursor-pointer"
									title="Сбросить все точки"
								>
									<Trash2 size={13} />
									<span>Сбросить</span>
								</button>
							</div>
						</div>
					</div>

					{/* ── Right Column: Interactive Sidebar (Landmarks, Measurements & Form 043/y) (5 Cols) ── */}
					<div className="lg:col-span-5 flex flex-col bg-[var(--paper,#ffffff)] dark:bg-slate-900 overflow-hidden">
						{/* Tab Navigation */}
						<div className="flex items-center border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/70 px-4 pt-3 shrink-0">
							<button
								type="button"
								onClick={() => setActiveTab("landmarks")}
								className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
									activeTab === "landmarks"
										? "border-teal-600 text-teal-700 dark:text-teal-400 bg-[var(--paper,#ffffff)] dark:bg-slate-900 rounded-t-lg"
										: "border-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
								}`}
							>
								<span>1. Ориентиры</span>
								<span className="text-[10px] bg-teal-100 dark:bg-teal-950 px-1.5 py-0.2 rounded-full font-extrabold text-teal-800 dark:text-teal-300">
									{analysis.placedCount}/{analysis.totalCount}
								</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("metrics")}
								className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
									activeTab === "metrics"
										? "border-teal-600 text-teal-700 dark:text-teal-400 bg-[var(--paper,#ffffff)] dark:bg-slate-900 rounded-t-lg"
										: "border-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
								}`}
							>
								<span>2. Расчет углов</span>
								{analysis.isComplete && (
									<CheckCircle2 size={13} className="text-emerald-500" />
								)}
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("report")}
								className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
									activeTab === "report"
										? "border-teal-600 text-teal-700 dark:text-teal-400 bg-[var(--paper,#ffffff)] dark:bg-slate-900 rounded-t-lg"
										: "border-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
								}`}
							>
								<FileText size={13} />
								<span>3. Форма 043/у</span>
							</button>
						</div>

						{/* Tab 1: Landmarks List & Placement Guidance */}
						{activeTab === "landmarks" && (
							<div className="flex-1 flex flex-col p-4 overflow-y-auto">
								{/* Progress Bar */}
								<div className="mb-4 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/70 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800">
									<div className="flex items-center justify-between text-xs font-bold mb-1.5">
										<span className="text-[var(--ink,#0f172a)] dark:text-slate-200">
											Прогресс разметки ТРГ
										</span>
										<span className="text-teal-700 dark:text-teal-300">{placedPercent}%</span>
									</div>
									<div className="h-2 w-full bg-[var(--line,#e2e8f0)] dark:bg-slate-700 rounded-full overflow-hidden">
										<div
											className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300"
											style={{ width: `${placedPercent}%` }}
										/>
									</div>
									<p className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mt-2">
										Кликните ориентир ниже, затем щелкните на рентгенограмме слева для установки.
									</p>
								</div>

								{/* Landmark Item Cards */}
								<div className="space-y-2 flex-1 overflow-y-auto pr-1">
									{CEPHALOMETRIC_LANDMARKS.map((lm) => {
										const isPlaced = landmarks[lm.key] !== undefined;
										const isTarget = activeTargetKey === lm.key;

										return (
											<button
												key={lm.key}
												type="button"
												onClick={() => setActiveTargetKey(lm.key)}
												className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
													isTarget
														? "bg-teal-50 dark:bg-teal-950/70 border-teal-500 shadow-sm"
														: isPlaced
															? "bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60 border-[var(--line,#e2e8f0)] dark:border-slate-800"
															: "bg-[var(--paper,#ffffff)] dark:bg-slate-900/60 border-dashed border-[var(--line,#cbd5e1)] dark:border-slate-700 opacity-80"
												}`}
											>
												<div className="flex items-center gap-2.5 min-w-0">
													<div
														className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-sm"
														style={{ backgroundColor: lm.color }}
													>
														{lm.code}
													</div>
													<div className="min-w-0">
														<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 truncate">
															{lm.nameRu}
														</div>
														<div className="text-[10px] text-[var(--muted,#64748b)] dark:text-slate-400 truncate">
															{lm.anatomicalDescription}
														</div>
													</div>
												</div>

												<div className="shrink-0 flex items-center gap-1.5">
													{isPlaced ? (
														<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
															<Check size={11} /> Задана
														</span>
													) : (
														<span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
															Ожидает
														</span>
													)}
												</div>
											</button>
										);
									})}
								</div>

								{/* Bottom Action */}
								<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
									<button
										type="button"
										onClick={() => setActiveTab("metrics")}
										className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
									>
										<span>Перейти к расчету углов</span>
										<ArrowRight size={15} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 2: Cephalometric Measurements Table & Cards */}
						{activeTab === "metrics" && (
							<div className="flex-1 flex flex-col p-4 overflow-y-auto">
								{/* Quick Diagnosis Banner */}
								<div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-500/40">
									<div className="text-xs font-black text-teal-800 dark:text-teal-300 uppercase tracking-wider">
										Клиническое резюме
									</div>
									<div className="text-sm font-extrabold text-[var(--ink,#0f172a)] dark:text-white mt-1">
										{analysis.diagnosis.skeletalClassRu}
									</div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-300 mt-1 leading-relaxed">
										{analysis.diagnosis.summaryRu}
									</div>
								</div>

								{/* Measurements Grouped by Category */}
								<div className="space-y-3 flex-1 overflow-y-auto pr-1">
									{/* Category: Sagittal */}
									<div>
										<div className="text-[11px] font-extrabold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2">
											1. Сагиттальные параметры (Steiner / Jacobson)
										</div>
										<div className="space-y-1.5">
											{analysis.measurements
												.filter((m) => m.category === "sagittal")
												.map((m) => (
													<div
														key={m.id}
														className="p-2.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/70 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
													>
														<div>
															<div className="font-bold text-[var(--ink,#0f172a)] dark:text-white">
																{m.name}
															</div>
															<div className="text-[10px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
																{m.clinicalInterpretation} · Норма: {m.normText}
															</div>
														</div>
														<div className="text-right shrink-0">
															<div
																className={`text-sm font-black ${
																	m.status === "normal"
																		? "text-emerald-600 dark:text-emerald-400"
																		: m.status === "increased"
																			? "text-rose-600 dark:text-rose-400"
																			: m.status === "decreased"
																				? "text-sky-600 dark:text-sky-400"
																				: "text-[var(--muted,#64748b)]"
																}`}
															>
																{m.value !== null ? `${m.value}${m.unit}` : "—"}
															</div>
															<span
																className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded ${
																	m.status === "normal"
																		? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
																		: m.status === "increased"
																			? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
																			: m.status === "decreased"
																				? "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300"
																				: "bg-slate-100 dark:bg-slate-800 text-slate-500"
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

									{/* Category: Vertical & Growth Pattern */}
									<div className="pt-2">
										<div className="text-[11px] font-extrabold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2">
											2. Вертикальные параметры и тип роста (Tweed / Steiner)
										</div>
										<div className="space-y-1.5">
											{analysis.measurements
												.filter((m) => m.category === "vertical")
												.map((m) => (
													<div
														key={m.id}
														className="p-2.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/70 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
													>
														<div>
															<div className="font-bold text-[var(--ink,#0f172a)] dark:text-white">
																{m.name}
															</div>
															<div className="text-[10px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
																{m.clinicalInterpretation} · Норма: {m.normText}
															</div>
														</div>
														<div className="text-right shrink-0">
															<div
																className={`text-sm font-black ${
																	m.status === "normal"
																		? "text-emerald-600 dark:text-emerald-400"
																		: m.status === "increased"
																			? "text-rose-600 dark:text-rose-400"
																			: m.status === "decreased"
																				? "text-sky-600 dark:text-sky-400"
																				: "text-[var(--muted,#64748b)]"
																}`}
															>
																{m.value !== null ? `${m.value}${m.unit}` : "—"}
															</div>
															<span
																className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded ${
																	m.status === "normal"
																		? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
																		: m.status === "increased"
																			? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
																			: m.status === "decreased"
																				? "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300"
																				: "bg-slate-100 dark:bg-slate-800 text-slate-500"
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

									{/* Category: Dental & Incisors */}
									<div className="pt-2">
										<div className="text-[11px] font-extrabold text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider mb-2">
											3. Дентальные параметры резцов
										</div>
										<div className="space-y-1.5">
											{analysis.measurements
												.filter((m) => m.category === "dental")
												.map((m) => (
													<div
														key={m.id}
														className="p-2.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/70 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
													>
														<div>
															<div className="font-bold text-[var(--ink,#0f172a)] dark:text-white">
																{m.name}
															</div>
															<div className="text-[10px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
																{m.clinicalInterpretation} · Норма: {m.normText}
															</div>
														</div>
														<div className="text-right shrink-0">
															<div
																className={`text-sm font-black ${
																	m.status === "normal"
																		? "text-emerald-600 dark:text-emerald-400"
																		: m.status === "increased"
																			? "text-rose-600 dark:text-rose-400"
																			: m.status === "decreased"
																				? "text-sky-600 dark:text-sky-400"
																				: "text-[var(--muted,#64748b)]"
																}`}
															>
																{m.value !== null ? `${m.value}${m.unit}` : "—"}
															</div>
															<span
																className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded ${
																	m.status === "normal"
																		? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
																		: m.status === "increased"
																			? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
																			: m.status === "decreased"
																				? "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300"
																				: "bg-slate-100 dark:bg-slate-800 text-slate-500"
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
								<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
									<button
										type="button"
										onClick={() => setActiveTab("report")}
										className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
									>
										<span>Сформировать протокол Формы 043/у</span>
										<ArrowRight size={15} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 3: Structured Protocol for Form 043/y */}
						{activeTab === "report" && (
							<div className="flex-1 flex flex-col p-4 overflow-y-auto">
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2">
										<FileText size={18} className="text-teal-600 dark:text-teal-400" />
										<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">
											Предпросмотр протокола для карты 043/у
										</span>
									</div>
									<button
										type="button"
										onClick={handleCopyText}
										className="px-2.5 py-1 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-1.5 transition-colors border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer"
									>
										{copied ? <Check size={13} className="text-emerald-500" /> : <Clipboard size={13} />}
										<span>{copied ? "Скопировано" : "Копировать"}</span>
									</button>
								</div>

								{/* Protocol Text Area */}
								<textarea
									readOnly
									value={analysis.diagnosis.protocol043Text}
									aria-label="Текст протокола ТРГ для формы 043/у"
									className="flex-1 min-h-[300px] p-3.5 bg-[var(--surface,#f8fafc)] dark:bg-slate-950 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-xl font-mono text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 resize-none outline-none focus:border-teal-500 leading-relaxed shadow-inner"
								/>

								{/* Bottom Action: 1-Click Insert into Orthodontic Card */}
								<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2">
									<button
										type="button"
										onClick={handleInsertToChart}
										className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 active:scale-95 transition-all cursor-pointer border border-teal-500/30"
									>
										<Sparkles size={16} />
										<span>Вставить в ортодонтическую карту Формы 043/у</span>
									</button>
									<p className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 text-center m-0">
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

	return modalContent;
}
