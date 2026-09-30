import {
	Activity,
	ArrowRight,
	Check,
	CheckCircle2,
	FileText,
	Mic,
	MicOff,
	Save,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { globalDentalVoiceEngine } from "../../services/voice";
import { useVisitStore } from "../../store/visitStore";
if (typeof document !== "undefined") {
	import("../orthodontics/CephalometricAnalysisModal.css");
}
import {
	CephalometricCanvas,
	SAMPLE_TRG_CEPHALOGRAM_URL,
	type XrayFilterMode,
} from "../orthodontics/CephalometricCanvas";
import {
	calculateCephalometrics,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
	LANDMARK_CLINICAL_ROLES,
	getRequiredLandmarksForMeasurement,
	generateConsultationNoteWithoutCeph,
} from "./cephalometricMath";
import {
	CephalometricReportTab,
	CephalometricMeasurementsCategories,
	CephalometricMobileAccordion,
	CephalometricPresetsBar,
	CephalometricLandmarksList,
	CephalometricMobileNav,
} from "./CephalometricReportTab";

export { LANDMARK_CLINICAL_ROLES, getRequiredLandmarksForMeasurement };

export interface CephalometricAnalysisModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly initialImageUrl?: string | undefined;
	readonly initialTab?: ("landmarks" | "metrics" | "report") | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

export function CephalometricAnalysisModal({
	isOpen,
	onClose,
	patientId,
	patientName,
	initialImageUrl,
	initialTab,
	onInsertToProtocol,
}: CephalometricAnalysisModalProps) {
	const [activeTab, setActiveTab] = useState<"landmarks" | "metrics" | "report">(initialTab ?? "landmarks");
	const [mobileView, setMobileView] = useState<"canvas" | "landmarks" | "metrics" | "report">(initialTab ? initialTab : "canvas");
	const [landmarks, setLandmarks] = useState<LandmarkMap>(() => (initialImageUrl ? DEFAULT_CEPH_LANDMARKS_PRESET : {}));
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>(initialImageUrl ? "S" : null);

	const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
	const isImageLoaded = Boolean(imageUrl);
	const [filterMode, setFilterMode] = useState<XrayFilterMode>("normal");
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [showPolygon, setShowPolygon] = useState<boolean>(true);
	const [showPlanes, setShowPlanes] = useState<boolean>(true);
	const [showLabels, setShowLabels] = useState<boolean>(true);
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(0.15);
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");
	const [copied, setCopied] = useState<boolean>(false);

	const analysis = useMemo(() => calculateCephalometrics(landmarks, scaleMmPerPixel), [landmarks, scaleMmPerPixel]);
	const activeLm = useMemo(() => (activeTargetKey ? CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey) ?? null : null), [activeTargetKey]);
	const isAllPlaced = analysis.placedCount === CEPHALOMETRIC_LANDMARKS.length;

	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => ({ ...prev, [key]: point }));
		void SoundFeedbackService.getInstance().playActionSuccess();
		const currentIndex = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === key);
		if (currentIndex !== -1) {
			const count = CEPHALOMETRIC_LANDMARKS.length;
			const nextUnplaced = Array.from({ length: count }, (_, offset) => {
				const idx = (currentIndex + 1 + offset) % count;
				return CEPHALOMETRIC_LANDMARKS[idx]!;
			}).find((l) => l.key !== key && !landmarks[l.key]);
			setActiveTargetKey(nextUnplaced ? nextUnplaced.key : null);
		}
	}, [landmarks]);

	const handleRemoveLandmark = useCallback((key: LandmarkKey) => {
		setLandmarks((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onTranscriptChange: (interim, final) => setVoiceInterimText(interim || final || ""),
			onIntentParsed: (intent) => {
				if (intent.cephLandmarks && intent.cephLandmarks.length > 0) {
					const firstL = intent.cephLandmarks[0];
					if (firstL) {
						const matchedDef = CEPHALOMETRIC_LANDMARKS.find((l) => l.key.toLowerCase() === firstL.landmarkKey.toLowerCase());
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

	const handleApplyPreset = useCallback((preset: LandmarkMap, label: string) => {
		if (!imageUrl) setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
		setLandmarks(preset);
		setActiveTargetKey(null);
		showToast(`Применен пресет: ${label}`, "success");
		void SoundFeedbackService.getInstance().playActionSuccess();
	}, [imageUrl]);

	const handleResetLandmarks = useCallback(() => {
		setLandmarks({});
		setActiveTargetKey(null);
		showToast("Разметка ориентиров сброшена", "info");
	}, []);

	const handleLoadPreset = () => {
		setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
		setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
		setActiveTargetKey(null);
		showToast("Загружена эталонная анатомическая разметка ТРГ со снимком", "success");
	};

	const currentEffectiveProtocolText = useMemo(() => {
		if (analysis.placedCount >= 10) return analysis.diagnosis.protocol043Text;
		return generateConsultationNoteWithoutCeph(patientName, isImageLoaded, analysis.placedCount, analysis.totalCount);
	}, [analysis.placedCount, analysis.diagnosis.protocol043Text, patientName, isImageLoaded, analysis.totalCount]);

	const handleInsertToChart = () => {
		if (onInsertToProtocol) onInsertToProtocol(currentEffectiveProtocolText);
		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint ? `${prev.complaint}\n\n[Ортодонтия] Ортодонтический прием (ТРГ)` : "Ортодонтический приём. Жалобы на скученность зубов и прикус.",
					objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${currentEffectiveProtocolText}` : currentEffectiveProtocolText,
					treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] Диагностический протокол ТРГ сохранен.` : "Ортодонтическое лечение: протокол ТРГ сохранен, согласование аппаратуры.",
				}));
			}
		} catch { /* ignore */ }

		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { protocolText: currentEffectiveProtocolText, title: "Протокол ТРГ (Медицинская карта)", soap: { treatmentDescription: currentEffectiveProtocolText }, mode: "smart_append" },
				}));
			} catch { /* ignore */ }
		}
		showToast("Протокол ТРГ успешно вставлен в медицинскую карту!", "success");
		onClose();
	};

	const handleSaveConsultationWithoutCeph = useCallback(() => {
		const consultationText = generateConsultationNoteWithoutCeph(patientName, isImageLoaded, analysis.placedCount, analysis.totalCount);
		if (onInsertToProtocol) onInsertToProtocol(consultationText);
		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint ? `${prev.complaint}\n\n[Ортодонтия] Первичная консультация ортодонта` : "Консультация врача-ортодонта. Жалобы на скученность зубов и нарушение прикуса.",
					objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${consultationText}` : consultationText,
					treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] Направлен на диагностический сетап, санацию и профгигиену.` : "Ортодонтическое лечение: диагностический сетап, санация, согласование брекетов/элайнеров.",
				}));
			}
		} catch { /* ignore */ }

		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { protocolText: consultationText, title: "Ортодонтическая консультация (без полного ТРГ-расчета)", soap: { treatmentDescription: consultationText }, mode: "smart_append" },
				}));
			} catch { /* ignore */ }
		}
		if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(consultationText).catch(() => {});
		showToast("Консультация сохранена в карту (без полного ТРГ-расчета)", "success");
		onClose();
	}, [patientName, isImageLoaded, analysis.placedCount, analysis.totalCount, onInsertToProtocol, onClose]);

	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(currentEffectiveProtocolText);
			setCopied(true);
			showToast("Протокол скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	if (!isOpen) return null;
	const placedPercent = Math.round((analysis.placedCount / analysis.totalCount) * 100);

	const renderHeroCard = (id: "SNA" | "SNB" | "ANB" | "1-NA" | "1-NB", label: string, norm: string) => {
		const measId = id === "1-NA" ? "1-NA-Angle" : id === "1-NB" ? "1-NB-Angle" : id;
		const meas = analysis.measurements.find((m) => m.id === measId);
		const distMeas = id === "1-NA" ? analysis.measurements.find((m) => m.id === "1-NA-Dist") : id === "1-NB" ? analysis.measurements.find((m) => m.id === "1-NB-Dist") : undefined;
		const isValValid = meas?.value !== null && meas?.value !== undefined && Number.isFinite(meas.value);
		const isDistValid = distMeas?.value !== null && distMeas?.value !== undefined && Number.isFinite(distMeas.value);
		const missing = getRequiredLandmarksForMeasurement(measId).filter((k) => !landmarks[k]);
		const cardClassName = "p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between min-h-[76px]";
		const cardBody = (
			<>
				<div className="flex items-center justify-between gap-1">
					<span className="text-[11px] font-bold text-slate-300 truncate">{label}</span>
					<span className="text-[9px] text-slate-400 font-mono">{norm}</span>
				</div>
				<div className="my-1 flex items-baseline gap-1">
					{isValValid ? (
						<span className={`text-base font-black font-mono leading-none ${meas.status === "normal" ? "text-emerald-400" : meas.status === "increased" ? "text-rose-400" : "text-cyan-400"}`}>
							{meas.value}{meas.unit || "°"}
						</span>
					) : (
						<span className="text-sm font-semibold text-slate-500 leading-none">—</span>
					)}
					{isDistValid && <span className="text-[11px] font-bold text-slate-300 font-mono leading-none">({distMeas.value}мм)</span>}
				</div>
				<div>
					{isValValid ? (
						<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${meas.status === "normal" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : meas.status === "increased" ? "bg-rose-950 text-rose-300 border border-rose-500/40" : "bg-cyan-950 text-cyan-300 border border-cyan-500/40"}`}>
							{id === "ANB" ? (meas.status === "normal" ? "Класс I" : meas.status === "increased" ? "Класс II" : "Класс III") : id === "1-NA" || id === "1-NB" ? (meas.status === "normal" ? "Норма" : meas.status === "increased" ? "Протрузия" : "Ретрузия") : (meas.status === "normal" ? "Норма" : meas.status === "increased" ? "Увеличен" : "Уменьшен")}
						</span>
					) : (
						<span className="text-[9px] font-medium text-amber-400/90 truncate block">{missing.length > 0 ? `Ждёт: ${missing.join(",")}` : "Нет данных"}</span>
					)}
				</div>
			</>
		);

		if (id === "SNA") return <div key={id} data-testid="core-hero-SNA" className={cardClassName}>{cardBody}</div>;
		if (id === "SNB") return <div key={id} data-testid="core-hero-SNB" className={cardClassName}>{cardBody}</div>;
		if (id === "ANB") return <div key={id} data-testid="core-hero-ANB" className={cardClassName}>{cardBody}</div>;
		if (id === "1-NA") return <div key={id} data-testid="core-hero-1-NA" className={cardClassName}>{cardBody}</div>;
		return <div key={id} data-testid="core-hero-1-NB" className={cardClassName}>{cardBody}</div>;
	};

	const modalContent = (
		<div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden" role="dialog" aria-modal="true" aria-label="Ортодонтический цефалометрический анализ ТРГ" data-testid="cephalometric-analysis-modal">
			<div className="relative w-full max-w-7xl max-h-[96vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100" style={{ backgroundColor: "var(--paper, #020617)", color: "var(--ink, #f8fafc)", borderColor: "var(--line, #1e293b)" }}>
				<header className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/95 shrink-0" style={{ backgroundColor: "var(--paper-panel, #0f172a)", borderColor: "var(--line, #1e293b)" }}>
					<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
						<div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-950/80 border border-teal-500/50 flex items-center justify-center text-teal-400 shadow-sm shrink-0">
							<Activity size={22} className="sm:w-6 sm:h-6" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
								<h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white m-0 truncate" style={{ color: "var(--ink, #ffffff)", margin: 0 }}>
									Цефалометрический анализ ТРГ (Телерентгенография)
								</h2>
								<span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold bg-teal-950/80 text-teal-300 border border-teal-500/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0">
									Steiner / Tweed / Downs / Ricketts / McNamara
								</span>
								<span className="text-xs text-teal-400 font-semibold hidden md:inline">· Цефалометрический трекер ТРГ</span>
							</div>
							<p className="text-xs sm:text-sm text-slate-400 m-0 mt-0.5 truncate" style={{ color: "var(--muted, #94a3b8)", margin: 0 }}>
								{patientName ? `Пациент: ${patientName}` : "Ортодонтический модуль"} {patientId ? `• ID: ${patientId}` : ""} · Медицинская карта
							</p>
						</div>
					</div>

					<CephalometricPresetsBar variant="header" onApplyPreset={handleApplyPreset} onResetLandmarks={handleResetLandmarks} />

					<div className="flex items-center gap-2 shrink-0">
						{isVoiceListening && (
							<div className="ceph-voice-bar hidden md:inline-flex" title="Идет голосовая диктовка ориентиров">
								<Mic size={14} className="animate-pulse text-teal-400" />
								<span className="max-w-[180px] truncate">{voiceInterimText || "Слушаю («точка Назион», «точка А»)..."}</span>
							</div>
						)}
						<button
							type="button"
							onClick={async () => {
								if (isVoiceListening) {
									globalDentalVoiceEngine.stop();
								} else {
									const started = await globalDentalVoiceEngine.start();
									if (!started) showToast("Не удалось запустить микрофон", "warning");
								}
							}}
							className={`min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${isVoiceListening ? "bg-teal-600/30 border-teal-500 text-teal-200 animate-pulse" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white"}`}
							title="Голосовая диктовка ориентиров цефалометрии"
							data-testid="ceph-voice-toggle-btn"
						>
							{isVoiceListening ? <MicOff size={16} /> : <Mic size={16} />}
							<span className="hidden sm:inline">{isVoiceListening ? "Стоп голос" : "Голос"}</span>
						</button>

						<button
							type="button"
							onClick={handleInsertToChart}
							data-testid="btn-insert-ceph-protocol"
							className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-teal-400/50"
							title="Перенести расчеты цефалометрии в дневник приёма"
						>
							<FileText size={16} />
							<span>В карту 043/у</span>
						</button>

						<button
							type="button"
							onClick={handleSaveConsultationWithoutCeph}
							data-testid="save-consultation-without-ceph-btn"
							className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-amber-500/50"
							title="Сохранить консультацию ортодонта в карту без полного расчерчивания ТРГ"
						>
							<Save size={16} />
							<span className="hidden sm:inline">Сохранить консультацию без ТРГ</span>
							<span className="sm:hidden">Без ТРГ</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							data-testid="ceph-modal-close-btn"
							aria-label="Закрыть окно цефалометрического анализа"
							className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
							style={{ backgroundColor: "var(--paper-subtle, #1e293b)", color: "var(--ink, #f8fafc)", borderColor: "var(--line, #334155)" }}
						>
							<X size={20} />
						</button>
					</div>
				</header>

				<CephalometricMobileNav
					mobileView={mobileView}
					onSelectView={(v) => {
						setMobileView(v);
						if (v !== "canvas") setActiveTab(v);
					}}
					placedCount={analysis.placedCount}
					isImageLoaded={isImageLoaded}
					isComplete={analysis.isComplete}
				/>

				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto lg:overflow-hidden min-h-0">
					{/* ── Left Column: Lateral Cephalogram Viewer & Unified HUD Strip (7 Cols) ── */}
					<div
						className={`lg:col-span-7 flex-col p-2.5 sm:p-3 bg-slate-950 border-r border-slate-800 shrink-0 lg:overflow-hidden ${mobileView === "canvas" ? "flex flex-1 min-h-[360px]" : "hidden lg:flex"}`}
						style={{ backgroundColor: "var(--paper, #020617)", color: "var(--ink, #f8fafc)" }}
					>
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
									if (Object.keys(landmarks).length === 0) setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
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

						<CephalometricMobileAccordion
							analysis={analysis}
							landmarks={landmarks}
							activeTargetKey={activeTargetKey}
							onSelectTargetKey={(key) => {
								setActiveTargetKey(key);
								showToast(`Укажите точку «${CEPHALOMETRIC_LANDMARKS.find((l) => l.key === key)?.nameRu}» на снимке`, "info");
							}}
						/>
					</div>

					{/* ── Right Column: Interactive Sidebar (5 Cols) ── */}
					<div
						className={`lg:col-span-5 flex-col bg-slate-950 border-l border-slate-800 text-slate-100 overflow-hidden ${mobileView !== "canvas" ? "flex flex-1" : "hidden lg:flex"}`}
						style={{ backgroundColor: "var(--paper, #020617)", color: "var(--ink, #f8fafc)" }}
					>
						<div className="grid grid-cols-3 border-b border-slate-800 bg-slate-900 px-2 pt-1.5 shrink-0 gap-1 w-full">
							<button
								type="button"
								onClick={() => { setActiveTab("landmarks"); setMobileView("landmarks"); }}
								className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === "landmarks" ? "border-teal-400 text-teal-300 bg-slate-800 rounded-t-lg shadow-xs" : "border-transparent text-slate-400 hover:text-slate-100 bg-transparent"}`}
								title="Ориентиры ТРГ"
							>
								<span className="hidden sm:inline whitespace-nowrap">1. Ориентиры (Точки: {isImageLoaded ? analysis.placedCount : 0})</span>
								<span className="sm:hidden whitespace-nowrap">1. Точки ({isImageLoaded ? analysis.placedCount : 0})</span>
							</button>

							<button
								type="button"
								onClick={() => {
									if (isImageLoaded) { setActiveTab("metrics"); setMobileView("metrics"); }
									else { showToast("Сначала загрузите снимок ТРГ", "warning"); }
								}}
								className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === "metrics" ? "border-teal-400 text-teal-300 bg-slate-800 rounded-t-lg shadow-xs" : "border-transparent text-slate-400 hover:text-slate-100 bg-transparent"} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
								title="Расчет углов (Steiner, Tweed, Downs, McNamara)"
							>
								<span className="hidden sm:inline whitespace-nowrap">2. Расчет углов (Анализ)</span>
								<span className="sm:hidden whitespace-nowrap">2. Анализ</span>
								{isImageLoaded && analysis.isComplete && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
							</button>

							<button
								type="button"
								onClick={() => { setActiveTab("report"); setMobileView("report"); }}
								className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === "report" ? "border-teal-400 text-teal-300 bg-slate-800 rounded-t-lg shadow-xs" : "border-transparent text-slate-400 hover:text-slate-100 bg-transparent"}`}
								title="Ортодонтический протокол ТРГ для карты"
							>
								<FileText size={14} className="shrink-0" />
								<span className="hidden sm:inline whitespace-nowrap">3. Медицинская карта</span>
								<span className="sm:hidden whitespace-nowrap">3. Карта</span>
							</button>
						</div>

						{/* Tab 1: Landmarks List & Placement Guidance */}
						{activeTab === "landmarks" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden">
								<CephalometricPresetsBar variant="tab1" onApplyPreset={handleApplyPreset} onResetLandmarks={handleResetLandmarks} />

								<div className="mb-3.5 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 shrink-0" style={{ backgroundColor: "var(--paper-panel, #0f172a)", borderColor: "var(--line, #334155)" }}>
									<div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
										<span className="text-slate-200" style={{ color: "var(--ink, #f8fafc)" }}>Прогресс разметки ТРГ</span>
										<span className="text-teal-400 font-extrabold">{placedPercent}%</span>
									</div>
									<div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
										<div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${placedPercent}%` }} />
									</div>
									<p className="text-xs text-slate-400 m-0 mt-2 min-w-0 break-words">
										{isImageLoaded ? "Кликните ориентир ниже, затем укажите его положение на снимке ТРГ слева." : "Загрузите боковую ТРГ пациента или выберите эталонный снимок для начала анализа."}
									</p>
								</div>

								{isImageLoaded && activeLm && !isAllPlaced && (
									<div data-testid="banner-active-landmark-guidance" className="mb-3 p-3 rounded-xl border border-teal-500/50 bg-teal-950/40 shadow-sm space-y-1.5 shrink-0">
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2 min-w-0">
												<span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm" style={{ backgroundColor: activeLm.color }}>
													{activeLm.code}
												</span>
												<span className="text-xs font-black text-teal-300 uppercase tracking-wide truncate">
													Цель: {activeLm.nameRu} ({activeLm.latinName})
												</span>
											</div>
											<button
												type="button"
												data-testid="btn-skip-next-landmark"
												onClick={() => {
													const count = CEPHALOMETRIC_LANDMARKS.length;
													const curIdx = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === activeLm.key);
													const next = Array.from({ length: count }, (_, offset) => {
														const idx = (curIdx + 1 + offset) % count;
														return CEPHALOMETRIC_LANDMARKS[idx]!;
													}).find((l) => l.key !== activeLm.key && !landmarks[l.key]);
													if (next) setActiveTargetKey(next.key);
												}}
												className="text-[11px] font-bold text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
												title="Перейти к следующему незаданному ориентиру"
											>
												След. точка →
											</button>
										</div>
										<p className="text-xs text-slate-200 leading-snug m-0">
											<span className="font-semibold text-teal-400">Анатомия: </span>
											{LANDMARK_CLINICAL_ROLES[activeLm.key]?.clinicalTip || activeLm.anatomicalDescription}
										</p>
										<p className="text-[11px] text-slate-400 leading-tight m-0">
											<span className="font-medium text-slate-300">Влияет на: </span>
											{LANDMARK_CLINICAL_ROLES[activeLm.key]?.depends || "Углы и плоскости черепа"}
										</p>
									</div>
								)}

								{isImageLoaded && isAllPlaced && (
									<div data-testid="banner-all-landmarks-placed" className="mb-3 p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-xs text-emerald-200 flex items-center justify-between gap-2 shrink-0">
										<div className="flex items-center gap-2">
											<Check size={16} className="text-emerald-400 shrink-0" />
											<span className="font-bold">Все 16 анатомических ориентиров расставлены!</span>
										</div>
										<button
											type="button"
											onClick={() => { setActiveTab("metrics"); setMobileView("metrics"); }}
											className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
										>
											Смотреть углы →
										</button>
									</div>
								)}

								<CephalometricLandmarksList
									landmarks={landmarks}
									isImageLoaded={isImageLoaded}
									activeTargetKey={activeTargetKey}
									onSelectLandmark={(key) => {
										if (!isImageLoaded) { showToast("Сначала загрузите снимок ТРГ", "warning"); return; }
										setActiveTargetKey(key);
										setMobileView("canvas");
										showToast(`Укажите точку «${CEPHALOMETRIC_LANDMARKS.find((l) => l.key === key)?.nameRu}» на снимке`, "info");
									}}
								/>

								<div className="mt-3 pt-3 border-t border-slate-800 shrink-0 flex flex-col gap-2">
									<button
										type="button"
										onClick={handleSaveConsultationWithoutCeph}
										data-testid="tab1-save-consultation-without-ceph-btn"
										className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
										title="Сохранить предварительную консультацию ортодонта в карту без ожидания расстановки всех 16 точек"
									>
										<Save size={16} />
										<span>Сохранить консультацию без полного ТРГ-расчета</span>
									</button>
									<button
										type="button"
										onClick={() => { setActiveTab("metrics"); setMobileView("metrics"); }}
										className="w-full min-h-[44px] py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all bg-[var(--teal)] hover:opacity-90 text-white cursor-pointer"
										data-testid="tab1-to-metrics-btn"
									>
										<span>Перейти к расчету углов (Steiner, Tweed, Downs, McNamara)</span>
										<ArrowRight size={16} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 2: Cephalometric Measurements Table & Cards */}
						{activeTab === "metrics" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-slate-950">
								<CephalometricPresetsBar variant="tab2" onApplyPreset={handleApplyPreset} onResetLandmarks={handleResetLandmarks} />

								<div className="mb-4 p-4 rounded-xl bg-teal-950/70 border border-teal-500/40 shadow-sm">
									<div className="text-xs font-black text-teal-400 uppercase tracking-wider">Клиническое резюме анализа</div>
									<div className="text-base font-black text-white mt-1 min-w-0 break-words">{analysis.diagnosis.skeletalClassRu}</div>
									<div className="text-sm text-slate-300 mt-1.5 leading-relaxed min-w-0 break-words">{analysis.diagnosis.summaryRu}</div>
								</div>

								{/* Core Cephalometric Angles Hero Showcase */}
								<div className="mb-4 space-y-2">
									<div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
										<span>Ключевые углы Штайнера (Steiner Core)</span>
										<span className="text-[10px] text-teal-400 font-normal">Мандат 8e / Ортодонтия</span>
									</div>
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
										{renderHeroCard("SNA", "SNA (ВЧ)", "82° ± 2°")}
										{renderHeroCard("SNB", "SNB (НЧ)", "80° ± 2°")}
										{renderHeroCard("ANB", "ANB (Класс)", "2° ± 2°")}
										{renderHeroCard("1-NA", "1 to NA", "22°±2° / 4±1")}
										{renderHeroCard("1-NB", "1 to NB", "25°±2° / 4±1")}
									</div>
								</div>

								<CephalometricMeasurementsCategories analysis={analysis} landmarks={landmarks} />

								<div className="mt-3 pt-3 border-t border-slate-800">
									<button
										type="button"
										onClick={() => { setActiveTab("report"); setMobileView("report"); }}
										className="w-full min-h-[48px] py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
									>
										<span>Сформировать протокол для карты</span>
										<ArrowRight size={16} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 3: Structured Protocol for Form 043/y */}
						{activeTab === "report" && (
							<CephalometricReportTab
								currentEffectiveProtocolText={currentEffectiveProtocolText}
								onInsertToChart={handleInsertToChart}
								onSaveConsultationWithoutCeph={handleSaveConsultationWithoutCeph}
								onCopyText={handleCopyText}
								copied={copied}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
