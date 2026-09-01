/**
 * OrthodonticCephTrackerModal.tsx — Интерактивный модуль цефалометрического анализа ТРГ (боковая проекция)
 * 
 * Включает:
 * - Укладку 16 анатомических ориентиров (S, N, A, B, Po, Or, Pog, Gn, Go, Me, ANS, PNS, U1t, U1a, L1t, L1a)
 * - Расчет цефалометрии по Штайнеру (SNA, SNB, ANB, 1-NA, 1-NB, U1-L1, Wits)
 * - Расчет триады Твида (FMA, IMPA, FMIA) и параметров Даунса / Ярабака
 * - Голосовую диктовку ориентиров через globalDentalVoiceEngine
 * - Полифонический Web Audio фидбек
 * - 1-клик вставку структурированного ортодонтического протокола в дневник Формы 043/у
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
	Mic,
	MicOff,
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
import { showToast } from "../GlobalToast";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { globalDentalVoiceEngine } from "../../services/voice";
import { useVisitStore } from "../../store/visitStore";
import "./orthoCephTracker.css";
import {
	CephalometricCanvas,
	SAMPLE_TRG_CEPHALOGRAM_URL,
	type XrayFilterMode,
} from "./CephalometricCanvas";
import {
	calculateCephalometrics,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	generateForm043OrthodonticProtocolText,
	type LandmarkDefinition,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
} from "./cephalometricMath";

export interface OrthodonticCephTrackerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly initialImageUrl?: string | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

export const OrthodonticCephTrackerModal: React.FC<OrthodonticCephTrackerModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientName = "Пациент",
	initialImageUrl,
	onInsertToProtocol,
}) => {
	// Active Tab inside sidebar: 'landmarks' | 'metrics' | 'report'
	const [activeTab, setActiveTab] = useState<"landmarks" | "metrics" | "report">("landmarks");
	const [mobileView, setMobileView] = useState<"canvas" | "landmarks" | "metrics" | "report">("canvas");

	// Landmarks State
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

	// Scale (mm per pixel)
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(0.15);

	// Voice STT State
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");

	// Protocol Copied State
	const [copied, setCopied] = useState<boolean>(false);

	// Cephalometric Math Calculation
	const analysis = useMemo(() => {
		return calculateCephalometrics(landmarks, scaleMmPerPixel);
	}, [landmarks, scaleMmPerPixel]);

	// Landmark Placement
	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => ({
			...prev,
			[key]: point,
		}));
		void SoundFeedbackService.getInstance().playActionSuccess();

		// Auto advance to next unplaced landmark
		const currentIndex = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === key);
		if (currentIndex !== -1) {
			const nextUnplaced = CEPHALOMETRIC_LANDMARKS.slice(currentIndex + 1).find(
				(l) => !landmarks[l.key] && l.key !== key,
			);
			if (nextUnplaced) {
				setActiveTargetKey(nextUnplaced.key);
			}
		}
	}, [landmarks]);

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

	const handleLoadDemoImage = () => {
		setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
		setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
		setActiveTargetKey("S");
		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Загружена эталонная ТРГ с калибровкой", "success");
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			if (typeof event.target?.result === "string") {
				setImageUrl(event.target.result);
				setLandmarks({});
				setActiveTargetKey("S");
				showToast(`ТРГ снимок загружен: ${file.name}`, "success");
			}
		};
		reader.readAsDataURL(file);
	};

	// 1-Click Form 043/u Protocol Generation & Transfer
	const protocolText = useMemo(() => {
		return generateForm043OrthodonticProtocolText(analysis, {
			patientName,
			doctorName: "Врач-ортодонт",
			customScaleMmPerPx: scaleMmPerPixel,
		});
	}, [analysis, patientName, scaleMmPerPixel]);

	const handleInsertTo043Diary = () => {
		// 1. Local Callback
		onInsertToProtocol?.(protocolText);

		// 2. Global Visit Store Sync
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${protocolText}`
					: protocolText,
			}));
		} catch {
			// fallback
		}

		// 3. Custom Event
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						protocolText,
						title: "Цефалометрический статус (Штайнер / Твид / ТРГ)",
					},
				}),
			);
		}

		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Протокол цефалометрии перенесен в карту 043/у", "success");
	};

	const handleCopyProtocol = async () => {
		try {
			await navigator.clipboard.writeText(protocolText);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			showToast("Протокол скопирован в буфер обмена", "info");
		} catch {
			showToast("Ошибка копирования в буфер", "error");
		}
	};

	// Listen to Voice Engine for Landmark selection
	useEffect(() => {
		if (!isOpen) return;

		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onTranscriptChange: (interim, final) => {
				setVoiceInterimText(interim || final || "");
			},
			onIntentParsed: (intent) => {
				if (intent.cephLandmarks && intent.cephLandmarks.length > 0) {
					const firstL = intent.cephLandmarks[0];
					if (firstL) {
						const matchedDef = CEPHALOMETRIC_LANDMARKS.find(
							(l) => l.key.toLowerCase() === firstL.landmarkKey.toLowerCase(),
						);
						if (matchedDef) {
							if (firstL.action === "clear") {
								handleRemoveLandmark(matchedDef.key);
								showToast(`Голос: Сброшена ${matchedDef.nameRu}`, "info");
							} else {
								setActiveTargetKey(matchedDef.key);
								void SoundFeedbackService.getInstance().playActionSuccess();
								showToast(`Голос: Выбран ориентир ${matchedDef.nameRu}`, "success");
							}
						}
					}
				}
			},
		});

		return () => unsub();
	}, [isOpen, handleRemoveLandmark]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="ortho-ceph-modal-backdrop" onClick={onClose}>
			<div
				className="ortho-ceph-modal-container"
				onClick={(e) => e.stopPropagation()}
				data-testid="ortho-ceph-modal"
			>
				{/* 1. Modal Header */}
				<header className="ortho-ceph-header">
					<div className="ortho-ceph-title-group">
						<Activity size={22} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<h2 className="text-base sm:text-lg font-black flex items-center gap-2">
								<span>Цефалометрический трекер ТРГ & Анализ Штайнера/Твида</span>
								<span className="ortho-ceph-badge">043/у</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{patientName} {patientId ? `• ID: ${patientId}` : ""} • {analysis.completionPercentage}% ориентиров установлено
							</p>
						</div>
					</div>

					<div className="ortho-ceph-header-actions">
						{isVoiceListening && (
							<div className="ortho-ceph-voice-bar" title="Идет голосовая диктовка ориентиров">
								<Mic size={16} className="animate-pulse text-[var(--teal,#0d9488)]" />
								<span>Голос: {voiceInterimText || "Слушаю («точка Назион», «точка А»)..."}</span>
							</div>
						)}

						<button
							type="button"
							onClick={handleInsertTo043Diary}
							className="ortho-ceph-btn-primary"
							title="Перенести расчеты цефалометрии в дневник формы 043/у"
							data-testid="btn-insert-ceph-protocol"
						>
							<FileText size={18} />
							<span>В карту 043/у</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="ortho-ceph-btn-icon"
							title="Закрыть окно цефалометрии (Esc)"
							data-testid="btn-close-ceph-modal"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* 2. Main Body Grid */}
				<div className="ortho-ceph-body">
					{/* Left: Interactive TRG Canvas Viewport */}
					<section className="ortho-ceph-canvas-section">
						{/* Canvas Floating Quick Toolbar */}
						<div className="ortho-ceph-canvas-toolbar">
							<label className="ortho-ceph-tool-btn cursor-pointer" title="Загрузить файл снимка ТРГ (DICOM/JPG/PNG)">
								<UploadCloud size={16} />
								<span>Снимок</span>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={handleFileUpload}
								/>
							</label>

							{!imageUrl && (
								<button
									type="button"
									onClick={handleLoadDemoImage}
									className="ortho-ceph-tool-btn"
									title="Загрузить демо ТРГ снимок"
								>
									<Sparkles size={16} className="text-amber-400" />
									<span>Демо ТРГ</span>
								</button>
							)}

							<div className="h-4 w-[1px] bg-white/20 mx-1" />

							{/* Filter Modes */}
							<button
								type="button"
								onClick={() => setFilterMode("normal")}
								className={`ortho-ceph-tool-btn ${filterMode === "normal" ? "active" : ""}`}
								title="Обычный режим"
							>
								Норма
							</button>
							<button
								type="button"
								onClick={() => setFilterMode("invert")}
								className={`ortho-ceph-tool-btn ${filterMode === "invert" ? "active" : ""}`}
								title="Инверсия рентген-лучей (негатив)"
							>
								Инверсия
							</button>
							<button
								type="button"
								onClick={() => setFilterMode("bone")}
								className={`ortho-ceph-tool-btn ${filterMode === "bone" ? "active" : ""}`}
								title="Фильтр плотности костной ткани"
							>
								<Bone size={14} />
								<span>Кость</span>
							</button>

							<div className="h-4 w-[1px] bg-white/20 mx-1" />

							{/* Overlays */}
							<button
								type="button"
								onClick={() => setShowPlanes((prev) => !prev)}
								className={`ortho-ceph-tool-btn ${showPlanes ? "active" : ""}`}
								title="Показать / скрыть плоскости (SN, FH, MP, OP)"
							>
								Плоскости
							</button>
							<button
								type="button"
								onClick={() => setShowPolygon((prev) => !prev)}
								className={`ortho-ceph-tool-btn ${showPolygon ? "active" : ""}`}
								title="Показать / скрыть полигон Штайнера / Твида"
							>
								Полигон
							</button>
							<button
								type="button"
								onClick={() => setShowLabels((prev) => !prev)}
								className={`ortho-ceph-tool-btn ${showLabels ? "active" : ""}`}
								title="Показать / скрыть подписи ориентиров"
							>
								Метки
							</button>

							<button
								type="button"
								onClick={handleResetLandmarks}
								className="ortho-ceph-tool-btn text-rose-300 hover:text-rose-100 ml-auto"
								title="Сбросить все точки"
							>
								<Trash2 size={16} />
							</button>
						</div>

						{/* Interactive SVG / Canvas Viewport */}
						<div className="ortho-ceph-canvas-wrapper">
							<CephalometricCanvas
								imageUrl={imageUrl}
								landmarks={landmarks}
								activeTargetKey={activeTargetKey}
								filterMode={filterMode}
								brightness={brightness}
								contrast={contrast}
								showPolygon={showPolygon}
								showPlanes={showPlanes}
								showLabels={showLabels}
								onLandmarkChange={handleLandmarkChange}
								onSelectTargetKey={setActiveTargetKey}
								onLoadPreset={handleLoadDemoImage}
								scaleMmPerPixel={scaleMmPerPixel}
							/>
						</div>
					</section>

					{/* Right: Sidebar with Landmark Selector & Metric Cards */}
					<aside className="ortho-ceph-sidebar">
						{/* Tabs Navigation */}
						<nav className="ortho-ceph-tabs-nav">
							<button
								type="button"
								onClick={() => setActiveTab("landmarks")}
								className={`ortho-ceph-tab-btn ${activeTab === "landmarks" ? "active" : ""}`}
							>
								<Layers size={16} />
								<span>Точки ({Object.keys(landmarks).length}/16)</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("metrics")}
								className={`ortho-ceph-tab-btn ${activeTab === "metrics" ? "active" : ""}`}
							>
								<Zap size={16} />
								<span>Анализ</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("report")}
								className={`ortho-ceph-tab-btn ${activeTab === "report" ? "active" : ""}`}
							>
								<FileText size={16} />
								<span>043/у</span>
							</button>
						</nav>

						{/* Tab 1: Landmarks Placement List */}
						{activeTab === "landmarks" && (
							<div className="ortho-ceph-tab-content">
								<div className="p-3 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-xl text-xs leading-relaxed text-[var(--muted,#64748b)]">
									💡 Кликните по нужному ориентиру ниже, затем коснитесь анатомической структуры на ТРГ снимке или используйте голосовую диктовку («Точка Сэлла», «Точка Назион»).
								</div>

								<div className="ortho-ceph-landmark-grid">
									{CEPHALOMETRIC_LANDMARKS.map((item: LandmarkDefinition) => {
										const isPlaced = Boolean(landmarks[item.key]);
										const isActive = activeTargetKey === item.key;

										return (
											<button
												key={item.key}
												type="button"
												onClick={() => setActiveTargetKey(item.key)}
												className={`ortho-ceph-landmark-pill ${isActive ? "active" : ""} ${isPlaced ? "placed" : ""}`}
												title={`${item.nameRu} (${item.latinName}): ${item.anatomicalDescription}`}
												data-testid={`landmark-pill-${item.key}`}
											>
												<div className="flex items-center gap-2 min-w-0">
													<div
														className="w-3 h-3 rounded-full shrink-0"
														style={{ backgroundColor: item.color }}
													/>
													<span className="text-xs font-bold truncate">
														{item.code} ({item.key})
													</span>
												</div>

												{isPlaced ? (
													<Check size={14} className="text-emerald-600 shrink-0" />
												) : (
													<span className="text-[10px] text-zinc-400">пусто</span>
												)}
											</button>
										);
									})}
								</div>
							</div>
						)}

						{/* Tab 2: Steiner & Tweed Metric Analysis */}
						{activeTab === "metrics" && (
							<div className="ortho-ceph-tab-content">
								{/* Skeletal Class Summary Card */}
								<div className="ortho-ceph-metric-card border-l-4 border-l-[var(--teal,#0d9488)]">
									<div className="ortho-ceph-metric-header">
										<span className="flex items-center gap-1.5 text-xs text-[var(--teal,#0d9488)] uppercase font-extrabold">
											<Award size={16} />
											Скелетный класс и профиль
										</span>
									</div>
									<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
										{analysis.diagnosis.skeletalClassRu}
									</div>
									<div className="text-xs text-[var(--muted,#64748b)]">
										{analysis.diagnosis.growthPatternRu}
									</div>
								</div>

								{/* Steiner Sagittal Measurements */}
								<div className="ortho-ceph-metric-card">
									<div className="ortho-ceph-metric-header">
										<span>Анализ Штайнера (Сагитталь)</span>
									</div>

									{analysis.measurements
										.filter((m) => m.category === "sagittal")
										.map((m) => (
											<div key={m.id} className="ortho-ceph-metric-row">
												<div>
													<div className="ortho-ceph-metric-name">
														{m.symbol} ({m.name})
													</div>
													<div className="ortho-ceph-metric-norm">
														Норма: {m.normMin}° – {m.normMax}°
													</div>
												</div>
												<div
													className={`ortho-ceph-metric-val ${
														m.status === "normal"
															? "ortho-ceph-val-norm"
															: m.status === "increased" || m.status === "decreased"
																? "ortho-ceph-val-warn"
																: "ortho-ceph-val-crit"
													}`}
												>
													{m.value !== null ? `${m.value.toFixed(1)}°` : "—"}
												</div>
											</div>
										))}
								</div>

								{/* Tweed & Vertical Measurements */}
								<div className="ortho-ceph-metric-card">
									<div className="ortho-ceph-metric-header">
										<span>Триада Твида и вертикальные углы</span>
									</div>

									{analysis.measurements
										.filter((m) => m.category === "vertical")
										.map((m) => (
											<div key={m.id} className="ortho-ceph-metric-row">
												<div>
													<div className="ortho-ceph-metric-name">
														{m.symbol} ({m.name})
													</div>
													<div className="ortho-ceph-metric-norm">
														Норма: {m.normMin}° – {m.normMax}°
													</div>
												</div>
												<div
													className={`ortho-ceph-metric-val ${
														m.status === "normal"
															? "ortho-ceph-val-norm"
															: m.status === "increased" || m.status === "decreased"
																? "ortho-ceph-val-warn"
																: "ortho-ceph-val-crit"
													}`}
												>
													{m.value !== null ? `${m.value.toFixed(1)}°` : "—"}
												</div>
											</div>
										))}
								</div>

								{/* Dental Incisor Inclinations */}
								<div className="ortho-ceph-metric-card">
									<div className="ortho-ceph-metric-header">
										<span>Инклинация резцов (1-NA, 1-NB, U1-L1)</span>
									</div>

									{analysis.measurements
										.filter((m) => m.category === "dental" || m.category === "linear")
										.map((m) => (
											<div key={m.id} className="ortho-ceph-metric-row">
												<div>
													<div className="ortho-ceph-metric-name">
														{m.symbol} ({m.name})
													</div>
													<div className="ortho-ceph-metric-norm">
														Норма: {m.normMin} – {m.normMax} {m.unit}
													</div>
												</div>
												<div
													className={`ortho-ceph-metric-val ${
														m.status === "normal"
															? "ortho-ceph-val-norm"
															: m.status === "increased" || m.status === "decreased"
																? "ortho-ceph-val-warn"
																: "ortho-ceph-val-crit"
													}`}
												>
													{m.value !== null
														? `${m.value.toFixed(1)} ${m.unit}`
														: "—"}
												</div>
											</div>
										))}
								</div>
							</div>
						)}

						{/* Tab 3: Medical Record 043/u Protocol */}
						{activeTab === "report" && (
							<div className="ortho-ceph-tab-content">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-[var(--muted,#64748b)]">
										Предпросмотр протокола для Карты 043/у:
									</span>
									<button
										type="button"
										onClick={handleCopyProtocol}
										className="ortho-ceph-btn-secondary min-h-[48px] px-4 text-xs"
									>
										{copied ? <Check size={16} /> : <Clipboard size={16} />}
										<span>{copied ? "Скопировано" : "Копировать"}</span>
									</button>
								</div>

								<textarea
									readOnly
									value={protocolText}
									className="ortho-ceph-protocol-preview"
									rows={14}
								/>

								<button
									type="button"
									onClick={handleInsertTo043Diary}
									className="ortho-ceph-btn-primary w-full justify-center mt-2"
								>
									<FileText size={18} />
									<span>Вставить в дневник Формы 043/у</span>
								</button>
							</div>
						)}
					</aside>
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
