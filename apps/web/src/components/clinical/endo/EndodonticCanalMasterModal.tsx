/**
 * DENTE Dental CRM — Endodontic Canal Master & Electronic Apex Locator Modal
 *
 * Implements:
 * - Interactive Endodontic Canal Manager (WL, MAF ISO 15..80, IAF, Taper, Obturation, Sealer)
 * - Live Electronic Apex Locator (EAL) Simulator with Real-Time Web Audio acoustic feedback
 * - 1-Click Irrigation Protocol Presets (NaOCl 3%/5.25%, EDTA 17%, PUI Ultrasonic Activation)
 * - Automated Form 043/u StAR Endodontic Diary generation and clipboard export
 * - Strict >= 44x44px touch targets and full design token theming
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	Copy,
	FileText,
	Info,
	Layers,
	Maximize2,
	Mic,
	Minus,
	Plus,
	Radio,
	RotateCcw,
	Save,
	Sparkles,
	Trash2,
	Volume2,
	VolumeX,
	Waves,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	ApexLocatorAudioEngine,
	evaluateApexDistance,
	type ApexTelemetryState,
	type ApexZone,
} from "./apexLocatorAudioEngine";
import {
	formatCanalsSummaryTable,
	generateEndo043uDiaryEntry,
	getDefaultCanalsForTooth,
	getEndoMorphologyForTooth,
	getIrrigationPreset,
	getIsoColorInfo,
	validateEndoSession,
	CORONAL_RESTORATION_LABELS,
	IRRIGATION_ACTIVATION_LABELS,
	IRRIGATION_PRESETS,
	IRRIGATION_SOLUTION_LABELS,
	ISOLATION_LABELS,
	OBTURATION_METHOD_LABELS,
	SEALER_TYPE_LABELS,
	type EndoCanalRecord,
	type EndodonticToothSession,
	type EndoIrrigationProtocol,
	type EndoTaper,
	type InstrumentationSystem,
	type ObturationMethod,
	type SealerType,
	type WorkingLengthMethod,
} from "./endodonticCanalMath";

export interface EndodonticCanalMasterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothNumber?: number | undefined;
	readonly initialCanals?: readonly EndoCanalRecord[] | undefined;
	readonly initialDiagnosisCode?: string | undefined;
	readonly initialDiagnosisTitle?: string | undefined;
	readonly patientName?: string | undefined;
	readonly onInsertToDiary?: ((diaryText: string) => void) | undefined;
	readonly onSaveCanalParameters?: ((session: EndodonticToothSession) => void) | undefined;
}

const COMMON_DIAGNOSES = [
	{ code: "K04.0", title: "Пульпит (острый/хронический)" },
	{ code: "K04.1", title: "Некроз пульпы (гангрена пульпы)" },
	{ code: "K04.5", title: "Хронический апикальный периодонтит" },
	{ code: "K04.7", title: "Периапикальный абсцесс без свища" },
	{ code: "K04.6", title: "Периапикальный абсцесс со свищом" },
	{ code: "K04.4", title: "Острый апикальный периодонтит" },
];

const TAPERS: EndoTaper[] = [".02", ".04", ".06", ".07", ".08", ".10"];
const MAF_SIZES = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80];
const IAF_SIZES = [6, 8, 10, 15, 20, 25, 30];

export function EndodonticCanalMasterModal({
	isOpen,
	onClose,
	initialToothNumber = 16,
	initialCanals,
	initialDiagnosisCode = "K04.0",
	initialDiagnosisTitle = "Пульпит (острый/хронический)",
	patientName,
	onInsertToDiary,
	onSaveCanalParameters,
}: EndodonticCanalMasterModalProps) {
	// Active tooth & clinical state
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);
	const [diagnosisCode, setDiagnosisCode] = useState<string>(initialDiagnosisCode);
	const [diagnosisTitle, setDiagnosisTitle] = useState<string>(initialDiagnosisTitle);
	const [isolationType, setIsolationType] = useState<"kofferdam" | "optidam" | "cotton_rolls">("kofferdam");
	const [kofferdamClamp, setKofferdamClamp] = useState<string>("W8A");
	const [coronalRestoration, setCoronalRestoration] = useState<"temporary_cavit" | "temporary_gic" | "composite_buildup" | "post_core">("composite_buildup");
	const [selectedPresetKey, setSelectedPresetKey] = useState<string>("standard_star");
	const [irrigationProtocol, setIrrigationProtocol] = useState<EndoIrrigationProtocol>(getIrrigationPreset("standard_star"));
	const [canals, setCanals] = useState<EndoCanalRecord[]>(() => {
		if (initialCanals && initialCanals.length > 0) {
			return initialCanals.map((c) => ({ ...c }));
		}
		return getDefaultCanalsForTooth(initialToothNumber);
	});
	const [selectedCanalId, setSelectedCanalId] = useState<string>(() => canals[0]?.id ?? "c1");

	// Apex Locator Simulator state
	const [probeDistance, setProbeDistance] = useState<number>(0.0); // 0.0 mm = APEX
	const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<"canals" | "protocol043">("canals");
	const [copied, setCopied] = useState<boolean>(false);

	// Audio Engine instance
	const audioEngineRef = useRef<ApexLocatorAudioEngine | null>(null);

	// Initialize audio engine
	useEffect(() => {
		const engine = new ApexLocatorAudioEngine();
		audioEngineRef.current = engine;
		return () => {
			engine.destroy();
			audioEngineRef.current = null;
		};
	}, []);

	// Sync state on modal open
	useEffect(() => {
		if (isOpen) {
			setSelectedTooth(initialToothNumber);
			setDiagnosisCode(initialDiagnosisCode);
			setDiagnosisTitle(initialDiagnosisTitle);
			if (initialCanals && initialCanals.length > 0) {
				setCanals(initialCanals.map((c) => ({ ...c })));
				setSelectedCanalId(initialCanals[0]?.id ?? "c1");
			} else {
				const defaults = getDefaultCanalsForTooth(initialToothNumber);
				setCanals(defaults);
				setSelectedCanalId(defaults[0]?.id ?? "c1");
			}
			setProbeDistance(0.0);
			setCopied(false);
		}
	}, [isOpen, initialToothNumber, initialCanals, initialDiagnosisCode, initialDiagnosisTitle]);

	// ESC key handler
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

	// Handle probe movement & audio sync
	const telemetry: ApexTelemetryState = useMemo(() => {
		return evaluateApexDistance(probeDistance);
	}, [probeDistance]);

	useEffect(() => {
		if (audioEngineRef.current) {
			audioEngineRef.current.updateDistance(probeDistance);
		}
	}, [probeDistance]);

	const toggleAudio = useCallback(() => {
		if (!audioEngineRef.current) return;
		if (isAudioEnabled) {
			audioEngineRef.current.stop();
			setIsAudioEnabled(false);
		} else {
			audioEngineRef.current.init();
			audioEngineRef.current.start();
			audioEngineRef.current.updateDistance(probeDistance);
			setIsAudioEnabled(true);
		}
	}, [isAudioEnabled, probeDistance]);

	// Switch tooth morphology
	const handleToothChange = useCallback((newTooth: number) => {
		setSelectedTooth(newTooth);
		const newCanals = getDefaultCanalsForTooth(newTooth);
		setCanals(newCanals);
		setSelectedCanalId(newCanals[0]?.id ?? "c1");
		showToast(`Загружена анатомическая морфология зуба ${newTooth} (${newCanals.length} канала)`, "info");
	}, []);

	// Irrigation preset change
	const handlePresetChange = useCallback((presetKey: string) => {
		setSelectedPresetKey(presetKey);
		const preset = getIrrigationPreset(presetKey);
		setIrrigationProtocol(preset);
		showToast(`Применен протокол ирригации: ${preset.titleRu}`, "info");
	}, []);

	// Canal field edits
	const updateCanalField = useCallback(<K extends keyof EndoCanalRecord>(
		canalId: string,
		field: K,
		value: EndoCanalRecord[K],
	) => {
		setCanals((prev) =>
			prev.map((c) => (c.id === canalId ? { ...c, [field]: value } : c)),
		);
	}, []);

	// Lock current Apex reading as Working Length (WL)
	const handleLockCurrentWl = useCallback(() => {
		if (!selectedCanalId) return;
		const targetCanal = canals.find((c) => c.id === selectedCanalId);
		if (!targetCanal) return;

		// Calculate realistic WL based on reference length and apex reading
		// If probe is at 0.0 apex, lock canonical length or current distance
		const baseLen = targetCanal.workingLengthMm > 0 ? targetCanal.workingLengthMm : 21.0;
		// If doctor dialed specific distance deviation, apply it
		const adjustedLen = Math.max(10, Math.round((baseLen - probeDistance) * 10) / 10);

		updateCanalField(selectedCanalId, "workingLengthMm", adjustedLen);
		updateCanalField(selectedCanalId, "workingLengthMethod", "apex_locator");
		showToast(`Рабочая длина (WL) для канала «${targetCanal.name}» зафиксирована: ${adjustedLen.toFixed(1)} мм (EAL 0.0)`, "success");
	}, [selectedCanalId, canals, probeDistance, updateCanalField]);

	// Add custom canal
	const handleAddCanal = useCallback(() => {
		const newId = `c_${Date.now().toString(36)}`;
		const newCanal: EndoCanalRecord = {
			id: newId,
			name: `Канал ${canals.length + 1}`,
			referencePoint: "Бугор",
			initialApicalFileIso: 10,
			masterApicalFileIso: 25,
			workingLengthMm: 21.0,
			workingLengthMethod: "apex_locator",
			taper: ".04",
			instrumentation: "rotary_niti",
			obturationMethod: "single_cone_bioceramic",
			sealer: "bioceramic",
			isObturated: true,
		};
		setCanals((prev) => [...prev, newCanal]);
		setSelectedCanalId(newId);
		showToast("Добавлен новый корневой канал", "info");
	}, [canals.length]);

	// Remove canal
	const handleRemoveCanal = useCallback((canalId: string) => {
		if (canals.length <= 1) {
			showToast("В протоколе должен оставаться хотя бы один канал", "warning");
			return;
		}
		setCanals((prev) => {
			const filtered = prev.filter((c) => c.id !== canalId);
			if (selectedCanalId === canalId && filtered.length > 0) {
				setSelectedCanalId(filtered[0]?.id ?? "c1");
			}
			return filtered;
		});
		showToast("Канал удален из журнала", "info");
	}, [canals.length, selectedCanalId]);

	// Active session construct
	const currentSession: EndodonticToothSession = useMemo(() => {
		return {
			toothNumber: selectedTooth,
			diagnosisCode,
			diagnosisTitle,
			canals,
			irrigationProtocol,
			isolationType,
			kofferdamClamp,
			coronalRestoration,
		};
	}, [selectedTooth, diagnosisCode, diagnosisTitle, canals, irrigationProtocol, isolationType, kofferdamClamp, coronalRestoration]);

	// Validation
	const validation = useMemo(() => validateEndoSession(currentSession), [currentSession]);

	// Clinical 043/u text
	const protocol043Text = useMemo(() => {
		return generateEndo043uDiaryEntry(currentSession);
	}, [currentSession]);

	const handleCopy043 = useCallback(() => {
		navigator.clipboard.writeText(protocol043Text);
		setCopied(true);
		showToast("Протокол эндодонтии (Форма 043/у) скопирован в буфер", "success");
		setTimeout(() => setCopied(false), 2500);
	}, [protocol043Text]);

	const handleInsertDiary = useCallback(() => {
		if (onInsertToDiary) {
			onInsertToDiary(protocol043Text);
			showToast("Протокол эндодонтии успешно вставлен в дневник 043/у", "success");
			onClose();
		} else {
			handleCopy043();
		}
	}, [onInsertToDiary, protocol043Text, onClose, handleCopy043]);

	const handleSaveSession = useCallback(() => {
		if (onSaveCanalParameters) {
			onSaveCanalParameters(currentSession);
			showToast("Параметры эндодонтического протокола сохранены", "success");
		}
		onClose();
	}, [onSaveCanalParameters, currentSession, onClose]);

	if (!isOpen) return null;

	const activeCanal = canals.find((c) => c.id === selectedCanalId) ?? canals[0];
	const morphology = getEndoMorphologyForTooth(selectedTooth);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="endo-modal-title"
		>
			<div className="relative w-full max-w-5xl rounded-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xl border border-[var(--glass-border,rgba(0,0,0,0.1))] flex flex-col max-h-[94vh] overflow-hidden">
				
				{/* ── HEADER ────────────────────────────────────────────────────────── */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border,rgba(0,0,0,0.08))] bg-slate-50/80 dark:bg-slate-900/50">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
							<Radio className="h-6 w-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 id="endo-modal-title" className="text-lg font-bold tracking-tight">
									Эндодонтический протокол & Апекслокатор
								</h2>
								<span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
									Зуб FDI {selectedTooth}
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{morphology.toothNameRu} • {morphology.typicalCanalCount} канала в норме • СтАР 043/у
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Tab Switcher */}
						<div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1">
							<button
								type="button"
								onClick={() => setActiveTab("canals")}
								className={`min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
									activeTab === "canals"
										? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
								aria-label="Вкладка параметров каналов"
							>
								<Layers className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
								Журнал каналов (WL)
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("protocol043")}
								className={`min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
									activeTab === "protocol043"
										? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
								aria-label="Вкладка дневника 043/у"
							>
								<FileText className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
								Дневник 043/у (СтАР)
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							aria-label="Закрыть модальное окно"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* ── BODY ──────────────────────────────────────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					
					{/* TOP METADATA BAR: Tooth Selector, Diagnosis & Isolation */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
						{/* Tooth Selector */}
						<div>
							<label className="block text-xs font-medium text-[var(--muted,#64748b)] mb-1">
								Номер зуба (FDI)
							</label>
							<select
								value={selectedTooth}
								onChange={(e) => handleToothChange(Number(e.target.value))}
								className="w-full min-h-[44px] px-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
								aria-label="Выбор зуба FDI"
							>
								<optgroup label="Верхняя челюсть (18..28)">
									{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => {
										const morph = getEndoMorphologyForTooth(t);
										const cleanName = (morph.toothNameRu.split("(")[0] ?? "").trim();
										return (
											<option key={t} value={t}>
												Зуб {t} ({cleanName})
											</option>
										);
									})}
								</optgroup>
								<optgroup label="Нижняя челюсть (48..38)">
									{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => {
										const morph = getEndoMorphologyForTooth(t);
										const cleanName = (morph.toothNameRu.split("(")[0] ?? "").trim();
										return (
											<option key={t} value={t}>
												Зуб {t} ({cleanName})
											</option>
										);
									})}
								</optgroup>
							</select>
						</div>

						{/* Diagnosis */}
						<div className="md:col-span-2">
							<label className="block text-xs font-medium text-[var(--muted,#64748b)] mb-1">
								Диагноз по МКБ-10
							</label>
							<select
								value={diagnosisCode}
								onChange={(e) => {
									const item = COMMON_DIAGNOSES.find((d) => d.code === e.target.value);
									if (item) {
										setDiagnosisCode(item.code);
										setDiagnosisTitle(item.title);
									}
								}}
								className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
								aria-label="Выбор диагноза по МКБ-10"
							>
								{COMMON_DIAGNOSES.map((d) => (
									<option key={d.code} value={d.code}>
										{d.code} — {d.title}
									</option>
								))}
							</select>
						</div>

						{/* Isolation & Clamp */}
						<div>
							<label className="block text-xs font-medium text-[var(--muted,#64748b)] mb-1">
								Изоляция / Кламп
							</label>
							<div className="flex gap-1.5">
								<select
									value={isolationType}
									onChange={(e) => setIsolationType(e.target.value as "kofferdam" | "optidam" | "cotton_rolls")}
									className="flex-1 min-h-[44px] px-2 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
									aria-label="Тип изоляции"
								>
									<option value="kofferdam">Коффердам</option>
									<option value="optidam">Оптидам 3D</option>
									<option value="cotton_rolls">Относительная</option>
								</select>
								{isolationType !== "cotton_rolls" && (
									<input
										type="text"
										value={kofferdamClamp}
										onChange={(e) => setKofferdamClamp(e.target.value)}
										placeholder="Кламп"
										title="Номер клампа"
										className="w-16 min-h-[44px] px-2 py-2 text-xs font-mono text-center rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
										aria-label="Номер клампа"
									/>
								)}
							</div>
						</div>
					</div>

					{activeTab === "canals" ? (
						<>
							{/* ── 1. ELECTRONIC APEX LOCATOR SIMULATOR BAR ───────────────────────── */}
							<div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 space-y-4">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div className="flex items-center gap-2.5">
										<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
											<Zap className="h-5 w-5 animate-pulse" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<h3 className="text-sm font-bold tracking-wider uppercase text-emerald-400">
													Электронный Апекслокатор (EAL 6th Gen)
												</h3>
												<span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
													Канал: {activeCanal?.name ?? "—"}
												</span>
											</div>
											<p className="text-xs text-slate-400">
												Высокоточная мультичастотная апекслокация • Акустический мониторинг
											</p>
										</div>
									</div>

									{/* Audio and Quick Preset Controls */}
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={toggleAudio}
											className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 border ${
												isAudioEnabled
													? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs shadow-emerald-500/20"
													: "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
											}`}
											aria-label={isAudioEnabled ? "Выключить звук апекслокатора" : "Включить звук апекслокатора"}
										>
											{isAudioEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
											<span>{isAudioEnabled ? "Звук Вкл" : "Звук Выкл"}</span>
										</button>

										<button
											type="button"
											onClick={() => setProbeDistance(0.0)}
											className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all"
											aria-label="Установить позицию APEX 0.0"
										>
											APEX 0.0
										</button>
									</div>
								</div>

								{/* Apex Locator Visual Bar & Needle Gauge */}
								<div className="space-y-2">
									{/* Scale Markings */}
									<div className="flex justify-between text-[11px] font-mono text-slate-400 px-2">
										<span>2.0 мм (Коронковая)</span>
										<span>1.5</span>
										<span>1.0</span>
										<span className="text-amber-400 font-bold">0.5 (Апикальная)</span>
										<span className="text-amber-300">0.2</span>
										<span className="text-emerald-400 font-bold text-xs">★ APEX 0.0</span>
										<span className="text-red-400 font-bold">OVER +0.5</span>
									</div>

									{/* Multi-Segment Bargraph */}
									<div className="relative h-9 w-full rounded-xl bg-slate-800/90 border border-slate-700 p-1 flex overflow-hidden shadow-inner">
										{/* Progress fill */}
										<div
											className={`h-full rounded-lg transition-all duration-150 flex items-center justify-end pr-2 text-xs font-black ${
												telemetry.isOverApex
													? "bg-gradient-to-r from-blue-600 via-emerald-500 to-red-600 text-white animate-pulse"
													: telemetry.isApexReached
													? "bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/50"
													: "bg-gradient-to-r from-blue-600 to-amber-500 text-slate-900"
											}`}
											style={{ width: `${Math.min(100, Math.max(5, telemetry.progressPercent))}%` }}
										>
											{telemetry.isApexReached && "✓ 0.0"}
											{telemetry.isOverApex && "OVER!"}
										</div>

										{/* Target Apex Constriction Line Marker */}
										<div
											className="absolute top-0 bottom-0 w-1 bg-white shadow-lg shadow-white"
											style={{ left: "80%" }}
											title="Физиологический апекс (0.0)"
										/>
									</div>
								</div>

								{/* Telemetry Status Card & Distance Slider */}
								<div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
									{/* Status Badge */}
									<div className="md:col-span-4 flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
										<div
											className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs"
											style={{ backgroundColor: telemetry.zoneColorHex, color: "#ffffff" }}
										>
											{telemetry.isApexReached ? "0.0" : telemetry.distanceMm.toFixed(1)}
										</div>
										<div className="min-w-0">
											<div className="text-xs font-bold truncate text-white">{telemetry.zoneLabelRu}</div>
											<div className="text-[11px] text-slate-400 truncate">{telemetry.guidanceTextRu}</div>
										</div>
									</div>

									{/* Probe slider controller */}
									<div className="md:col-span-5 flex items-center gap-2">
										<button
											type="button"
											onClick={() => setProbeDistance((p) => Math.round((p + 0.1) * 10) / 10)}
											className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
											title="Выдвинуть файл назад (+0.1 мм)"
											aria-label="Увеличить дистанцию на 0.1 мм"
										>
											<Plus className="h-4 w-4" />
										</button>

										<div className="flex-1 space-y-1">
											<input
												type="range"
												min="-0.5"
												max="2.5"
												step="0.1"
												value={probeDistance}
												onChange={(e) => setProbeDistance(parseFloat(e.target.value))}
												className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
												aria-label="Регулятор глубины погружения файла апекслокатора"
											/>
											<div className="flex justify-between text-[10px] text-slate-400 font-mono">
												<span>Назад (+2.5 мм)</span>
												<span>Апекс (0.0)</span>
												<span>За апекс (-0.5 мм)</span>
											</div>
										</div>

										<button
											type="button"
											onClick={() => setProbeDistance((p) => Math.round((p - 0.1) * 10) / 10)}
											className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
											title="Погрузить файл глубже (-0.1 мм)"
											aria-label="Уменьшить дистанцию на 0.1 мм"
										>
											<Minus className="h-4 w-4" />
										</button>
									</div>

									{/* 1-Click Lock WL Button */}
									<div className="md:col-span-3">
										<button
											type="button"
											onClick={handleLockCurrentWl}
											className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
											aria-label="Зафиксировать рабочую длину для выбранного канала"
										>
											<Check className="h-4 w-4" />
											<span>Зафиксировать WL</span>
										</button>
									</div>
								</div>
							</div>

							{/* ── 2. CANAL MEASUREMENT JOURNAL TABLE ───────────────────────────── */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<h3 className="text-sm font-bold tracking-tight">
											Журнал измерений корневых каналов ({canals.length})
										</h3>
										<span className="text-xs text-[var(--muted,#64748b)]">
											(Ориентир • WL • IAF • MAF • Конусность • Обтурация)
										</span>
									</div>

									<button
										type="button"
										onClick={handleAddCanal}
										className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
										aria-label="Добавить канал"
									>
										<Plus className="h-4 w-4" />
										<span>Добавить канал</span>
									</button>
								</div>

								{/* Table */}
								<div className="overflow-x-auto rounded-xl border border-[var(--glass-border,rgba(0,0,0,0.1))]">
									<table className="w-full text-left text-xs border-collapse">
										<thead>
											<tr className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-semibold text-[var(--muted,#64748b)]">
												<th className="py-3 px-3">Канал</th>
												<th className="py-3 px-3">Ориентир (Cusp/Edge)</th>
												<th className="py-3 px-3 text-center">WL (мм)</th>
												<th className="py-3 px-3 text-center">IAF (ISO)</th>
												<th className="py-3 px-3 text-center">MAF (ISO / Конус)</th>
												<th className="py-3 px-3">Метод обтурации</th>
												<th className="py-3 px-3">Силер</th>
												<th className="py-3 px-2 text-center">Удалить</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
											{canals.map((canal) => {
												const isSelected = canal.id === selectedCanalId;
												const mafColor = getIsoColorInfo(canal.masterApicalFileIso);

												return (
													<tr
														key={canal.id}
														onClick={() => setSelectedCanalId(canal.id)}
														className={`transition-colors cursor-pointer ${
															isSelected
																? "bg-blue-50/80 dark:bg-blue-950/30 ring-1 ring-inset ring-blue-500/40 font-medium"
																: "hover:bg-slate-50 dark:hover:bg-slate-800/40"
														}`}
													>
														{/* Canal Name */}
														<td className="py-2.5 px-3">
															<input
																type="text"
																value={canal.name}
																onChange={(e) => updateCanalField(canal.id, "name", e.target.value)}
																className="min-h-[44px] w-28 px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
																aria-label={`Наименование канала ${canal.name}`}
															/>
														</td>

														{/* Reference Cusp */}
														<td className="py-2.5 px-3">
															<input
																type="text"
																value={canal.referencePoint}
																onChange={(e) => updateCanalField(canal.id, "referencePoint", e.target.value)}
																placeholder="Ориентир"
																className="min-h-[44px] w-36 px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
																aria-label={`Ориентир канала ${canal.name}`}
															/>
														</td>

														{/* WL (mm) with Stepper */}
														<td className="py-2.5 px-3">
															<div className="flex items-center justify-center gap-1">
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		updateCanalField(canal.id, "workingLengthMm", Math.max(5, Math.round((canal.workingLengthMm - 0.5) * 10) / 10));
																	}}
																	className="min-h-[44px] min-w-[32px] px-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold"
																	aria-label="Уменьшить WL на 0.5 мм"
																>
																	-
																</button>
																<input
																	type="number"
																	step="0.5"
																	min="5"
																	max="35"
																	value={canal.workingLengthMm}
																	onChange={(e) => updateCanalField(canal.id, "workingLengthMm", parseFloat(e.target.value) || 0)}
																	className="min-h-[44px] w-16 px-1 py-1 text-center font-mono font-bold text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
																	aria-label={`Рабочая длина в мм для канала ${canal.name}`}
																/>
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		updateCanalField(canal.id, "workingLengthMm", Math.min(35, Math.round((canal.workingLengthMm + 0.5) * 10) / 10));
																	}}
																	className="min-h-[44px] min-w-[32px] px-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold"
																	aria-label="Увеличить WL на 0.5 мм"
																>
																	+
																</button>
															</div>
														</td>

														{/* IAF */}
														<td className="py-2.5 px-3">
															<select
																value={canal.initialApicalFileIso}
																onChange={(e) => updateCanalField(canal.id, "initialApicalFileIso", Number(e.target.value))}
																className="min-h-[44px] w-18 px-1 py-1 text-xs text-center font-mono rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
																aria-label={`IAF для канала ${canal.name}`}
															>
																{IAF_SIZES.map((iso) => (
																	<option key={iso} value={iso}>
																		{iso}
																	</option>
																))}
															</select>
														</td>

														{/* MAF & Taper */}
														<td className="py-2.5 px-3">
															<div className="flex items-center justify-center gap-1.5">
																<div className="relative">
																	<select
																		value={canal.masterApicalFileIso}
																		onChange={(e) => updateCanalField(canal.id, "masterApicalFileIso", Number(e.target.value))}
																		className="min-h-[44px] w-20 pl-2 pr-5 py-1 text-xs font-mono font-bold rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden border"
																		style={{
																			backgroundColor: mafColor.hexColor,
																			color: mafColor.textColor,
																			borderColor: mafColor.iso === 15 || mafColor.iso === 45 ? "#cbd5e1" : "transparent",
																		}}
																		aria-label={`MAF для канала ${canal.name}`}
																	>
																		{MAF_SIZES.map((iso) => (
																			<option key={iso} value={iso} style={{ backgroundColor: "#ffffff", color: "#111827" }}>
																				ISO {iso}
																			</option>
																		))}
																	</select>
																</div>

																<select
																	value={canal.taper}
																	onChange={(e) => updateCanalField(canal.id, "taper", e.target.value as EndoTaper)}
																	className="min-h-[44px] w-18 px-1 py-1 text-xs text-center font-mono rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
																	aria-label={`Конусность для канала ${canal.name}`}
																>
																	{TAPERS.map((t) => (
																		<option key={t} value={t}>
																			{t}
																		</option>
																	))}
																</select>
															</div>
														</td>

														{/* Obturation Method */}
														<td className="py-2.5 px-3">
															<select
																value={canal.obturationMethod}
																onChange={(e) => updateCanalField(canal.id, "obturationMethod", e.target.value as ObturationMethod)}
																className="min-h-[44px] w-44 px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
																aria-label={`Метод обтурации для канала ${canal.name}`}
															>
																{Object.entries(OBTURATION_METHOD_LABELS).map(([k, v]) => (
																	<option key={k} value={k}>
																		{v.titleRu}
																	</option>
																))}
															</select>
														</td>

														{/* Sealer */}
														<td className="py-2.5 px-3">
															<select
																value={canal.sealer}
																onChange={(e) => updateCanalField(canal.id, "sealer", e.target.value as SealerType)}
																className="min-h-[44px] w-36 px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
																aria-label={`Силер для канала ${canal.name}`}
															>
																{Object.entries(SEALER_TYPE_LABELS).map(([k, v]) => (
																	<option key={k} value={k}>
																		{v.titleRu}
																	</option>
																))}
															</select>
														</td>

														{/* Delete */}
														<td className="py-2.5 px-2 text-center">
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	handleRemoveCanal(canal.id);
																}}
																className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
																aria-label={`Удалить канал ${canal.name}`}
															>
																<Trash2 className="h-4 w-4" />
															</button>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>

							{/* ── 3. 1-CLICK IRRIGATION PROTOCOL BAR ────────────────────────────── */}
							<div className="space-y-3 p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<Waves className="h-4 w-4 text-blue-600 dark:text-blue-400" />
										<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
											1-Клик протокол ирригации & активации
										</span>
									</div>
									<span className="text-xs font-medium text-blue-600 dark:text-blue-400">
										{IRRIGATION_ACTIVATION_LABELS[irrigationProtocol.activation]} ({irrigationProtocol.activationDurationSeconds} сек)
									</span>
								</div>

								{/* Preset Chips */}
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
									{Object.values(IRRIGATION_PRESETS).map((preset) => {
										const isActive = selectedPresetKey === preset.protocolKey;
										return (
											<button
												key={preset.protocolKey}
												type="button"
												onClick={() => handlePresetChange(preset.protocolKey)}
												className={`min-h-[44px] p-2.5 text-left rounded-xl border text-xs transition-all ${
													isActive
														? "bg-white dark:bg-slate-800 border-blue-500 text-blue-700 dark:text-blue-300 shadow-md ring-2 ring-blue-500/20 font-bold"
														: "bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
												}`}
												aria-label={`Выбрать протокол ирригации ${preset.titleRu}`}
											>
												<div className="flex items-center gap-1.5 mb-1">
													<div className={`h-2 w-2 rounded-full ${isActive ? "bg-blue-500 animate-ping" : "bg-slate-400"}`} />
													<span className="truncate">{preset.titleRu}</span>
												</div>
												<div className="text-[11px] text-[var(--muted,#64748b)] line-clamp-2 font-normal">
													{preset.descriptionRu}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Coronal Build-up Picker */}
							<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800">
								<div className="text-xs font-semibold text-[var(--muted,#64748b)]">
									Коронковое восстановление после обтурации:
								</div>
								<div className="flex-1 max-w-md">
									<select
										value={coronalRestoration}
										onChange={(e) => setCoronalRestoration(e.target.value as "temporary_cavit" | "temporary_gic" | "composite_buildup" | "post_core")}
										className="w-full min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
										aria-label="Выбор коронкового восстановления"
									>
										{Object.entries(CORONAL_RESTORATION_LABELS).map(([k, label]) => (
											<option key={k} value={k}>
												{label}
											</option>
										))}
									</select>
								</div>
							</div>
						</>
					) : (
						/* ── PROTOCOL 043/U PREVIEW TAB ──────────────────────────────────── */
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<FileText className="h-5 w-5 text-blue-600" />
									<h3 className="text-sm font-bold">
										Предпросмотр протокола эндодонтического лечения (Форма 043/у)
									</h3>
								</div>
								<button
									type="button"
									onClick={handleCopy043}
									className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
									aria-label="Скопировать протокол в буфер"
								>
									{copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
									<span>{copied ? "Скопировано!" : "Скопировать"}</span>
								</button>
							</div>

							<div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-100 leading-relaxed overflow-x-auto shadow-inner whitespace-pre-wrap">
								{protocol043Text}
							</div>
						</div>
					)}

					{/* Validation Warnings if any */}
					{validation.warnings.length > 0 && (
						<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
							<div className="flex items-center gap-1.5 font-bold">
								<AlertTriangle className="h-4 w-4 text-amber-600" />
								<span>Клинические рекомендации:</span>
							</div>
							<ul className="list-disc list-inside space-y-0.5 text-[11px]">
								{validation.warnings.map((w) => (
									<li key={w}>{w}</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* ── FOOTER ────────────────────────────────────────────────────────── */}
				<div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-[var(--glass-border,rgba(0,0,0,0.08))] bg-slate-50/90 dark:bg-slate-900/50">
					<div className="text-xs text-[var(--muted,#64748b)]">
						{patientName && <span>Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> • </span>}
						Каналов: <strong>{canals.length}</strong> • Обтурация: <strong>{canals.filter((c) => c.isObturated).length} запломбировано</strong>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopy043}
							className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
							aria-label="Скопировать протокол в буфер"
						>
							<Copy className="h-4 w-4" />
							<span>Скопировать</span>
						</button>

						<button
							type="button"
							onClick={handleInsertDiary}
							className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
							aria-label="Вставить протокол в дневник 043/у"
						>
							<Check className="h-4 w-4" />
							<span>Вставить в дневник 043/у</span>
						</button>

						<button
							type="button"
							onClick={handleSaveSession}
							className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5"
							aria-label="Сохранить параметры эндодонтического протокола"
						>
							<Save className="h-4 w-4" />
							<span>Сохранить параметры</span>
						</button>
					</div>
				</div>

			</div>
		</div>
	);
}
