import {
	Activity,
	CheckCircle2,
	ExternalLink,
	FileText,
	Mic,
	MicOff,
	Save,
	X,
} from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { showToast } from "../../GlobalToast";
import { CEPHALOMETRIC_LANDMARKS } from "../cephalometricMath";
import {
	CephalometricReportTab,
	CephalometricLandmarksList,
	CephalometricMobileNav,
} from "../CephalometricReportTab";
import { useCephLandmarks } from "./useCephLandmarks";
import { CephLandmarkCanvas } from "./CephLandmarkCanvas";
import { CephMeasurementTable } from "./CephMeasurementTable";
import {
	CephDesktopControlsStrip,
	CephTab1TopControls,
	CephTab1BottomActions,
} from "./CephAnalysisControls";
import type { CephalometricAnalysisModalProps } from "./types";

if (typeof document !== "undefined") {
	import("../../orthodontics/CephalometricAnalysisModal.css");
}

export function CephalometricAnalysisModal(props: CephalometricAnalysisModalProps) {
	const {
		isOpen,
		onClose,
		patientName,
		patientId,
	} = props;

	const {
		activeTab,
		setActiveTab,
		mobileView,
		setMobileView,
		imageUrl,
		setImageUrl,
		landmarks,
		setLandmarks,
		activeTargetKey,
		setActiveTargetKey,
		isImageLoaded,
		filterMode,
		setFilterMode,
		brightness,
		contrast,
		showPolygon,
		setShowPolygon,
		showPlanes,
		setShowPlanes,
		showLabels,
		setShowLabels,
		scaleMmPerPixel,
		setScaleMmPerPixel,
		isVoiceListening,
		voiceInterimText,
		copied,
		aiBackendPref,
		setAiBackendPref,
		isAiInferring,
		aiStats,
		detectedBackend,
		aiBackendBadge,
		aiBackendLabel,
		analysis,
		isAllPlaced,
		placedPercent,
		handleRunAiAutoPlacement,
		handleLandmarkChange,
		handleRemoveLandmark,
		handleApplyPreset,
		handleResetLandmarks,
		handleLoadPreset,
		currentEffectiveProtocolText,
		handleSaveToEmrOnly,
		handleInsertToChart,
		handleSaveConsultationWithoutCeph,
		handleOpenPopoutStudio,
		handleCopyText,
		toggleVoiceListening,
	} = useCephLandmarks(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden" role="dialog" aria-modal="true" aria-label="Ортодонтический цефалометрический анализ ТРГ" data-testid="cephalometric-analysis-modal">
			<div className="ceph-workstation-root relative w-full max-w-[1410px] h-[92vh] max-h-[92vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100" data-theme="dark" style={{ backgroundColor: "#020617", color: "#f8fafc", borderColor: "#1e293b" }}>
				<header className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-slate-800 bg-slate-900/95 shrink-0" style={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}>
					<div className="flex items-center gap-2.5 sm:gap-3 shrink-0 mr-4">
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-950/80 border border-teal-500/50 flex items-center justify-center text-teal-400 shadow-sm shrink-0">
							<Activity size={20} className="sm:w-5 sm:h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-sm sm:text-base font-black tracking-tight text-white m-0 whitespace-nowrap" style={{ color: "#ffffff", margin: 0 }} aria-label="Цефалометрический трекер ТРГ">
									Цефалометрический анализ ТРГ
									<span className="sr-only">Цефалометрический трекер ТРГ</span>
								</h2>
								<span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold bg-teal-950/80 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-lg shrink-0 whitespace-nowrap">
									Steiner / Tweed / Downs / Ricketts / McNamara
								</span>
							</div>
							<p className="text-xs text-slate-400 m-0 mt-0.5 whitespace-nowrap" style={{ color: "#94a3b8", margin: 0 }}>
								{patientName ? `Пациент: ${patientName}` : "Ортодонтический модуль"} {patientId ? `• ID: ${patientId}` : ""} · Медицинская карта
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{isVoiceListening && (
							<div className="ceph-voice-bar hidden md:inline-flex" title="Идет голосовая диктовка ориентиров">
								<Mic size={14} className="animate-pulse text-teal-400" />
								<span className="max-w-[180px] truncate">{voiceInterimText || "Слушаю («точка Назион», «точка А»)..."}</span>
							</div>
						)}
						<button
							type="button"
							onClick={toggleVoiceListening}
							className={`secondary-button shrink-0 ${isVoiceListening ? "!bg-teal-600/30 !border-teal-500 !text-teal-200 animate-pulse" : ""}`}
							title="Голосовая диктовка ориентиров цефалометрии"
							data-testid="ceph-voice-toggle-btn"
						>
							{isVoiceListening ? <MicOff size={14} /> : <Mic size={14} />}
							<span className="hidden sm:inline">{isVoiceListening ? "Стоп голос" : "Голос"}</span>
						</button>

						<button
							type="button"
							onClick={handleSaveToEmrOnly}
							data-testid="save-ceph-to-emr-btn"
							className="secondary-button shrink-0"
							title="Зафиксировать исследование и координаты в ЭМК пациента"
						>
							<Save size={14} />
							<span className="hidden xl:inline whitespace-nowrap">Сохранить в ЭМК</span>
							<span className="xl:hidden whitespace-nowrap">В ЭМК</span>
						</button>

						<button
							type="button"
							onClick={handleInsertToChart}
							data-testid="btn-insert-ceph-protocol"
							className="primary-button shrink-0"
							title="Перенести расчеты цефалометрии в дневник приёма"
						>
							<FileText size={14} />
							<span className="whitespace-nowrap">В медицинскую карту</span>
						</button>

						<button
							type="button"
							onClick={handleOpenPopoutStudio}
							data-testid="btn-ceph-popout-window"
							className="secondary-button !border-teal-500/60 !bg-teal-950/60 hover:!bg-teal-900/80 !text-teal-300 font-bold shrink-0 flex items-center gap-1.5"
							title="Открыть полноэкранную студию цефалометрии на втором мониторе для демонстрации пациенту"
						>
							<ExternalLink size={14} />
							<span className="whitespace-nowrap">2-й монитор</span>
						</button>

						<button
							type="button"
							onClick={handleSaveConsultationWithoutCeph}
							data-testid="save-consultation-without-ceph-btn"
							className="secondary-button shrink-0"
							title="Сохранить консультацию ортодонта в карту без полного расчерчивания ТРГ"
						>
							<Save size={14} />
							<span className="hidden xl:inline whitespace-nowrap">Консультация без ТРГ</span>
							<span className="xl:hidden whitespace-nowrap">Без ТРГ</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							data-testid="ceph-modal-close-btn"
							aria-label="Закрыть окно цефалометрического анализа"
							className="secondary-button !w-8 !h-8 !p-0 shrink-0"
						>
							<X size={16} />
						</button>
					</div>
				</header>

				{/* Dedicated Desktop Presets & Diagnostics Strip */}
				<CephDesktopControlsStrip
					onApplyPreset={handleApplyPreset}
					onResetLandmarks={handleResetLandmarks}
					onRunAiAutoPlacement={handleRunAiAutoPlacement}
					isAiInferring={isAiInferring}
					aiBackendLabel={aiBackendLabel}
					aiBackendBadge={aiBackendBadge}
				/>

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
					<CephLandmarkCanvas
						landmarks={landmarks}
						setLandmarks={setLandmarks}
						onLandmarkChange={handleLandmarkChange}
						onRemoveLandmark={handleRemoveLandmark}
						activeTargetKey={activeTargetKey}
						setActiveTargetKey={setActiveTargetKey}
						imageUrl={imageUrl}
						setImageUrl={setImageUrl}
						filterMode={filterMode}
						setFilterMode={setFilterMode}
						brightness={brightness}
						contrast={contrast}
						showPolygon={showPolygon}
						setShowPolygon={setShowPolygon}
						showPlanes={showPlanes}
						setShowPlanes={setShowPlanes}
						showLabels={showLabels}
						setShowLabels={setShowLabels}
						scaleMmPerPixel={scaleMmPerPixel}
						setScaleMmPerPixel={setScaleMmPerPixel}
						onLoadPreset={handleLoadPreset}
						onResetLandmarks={handleResetLandmarks}
						onRunAiAutoPlacement={handleRunAiAutoPlacement}
						isAiInferring={isAiInferring}
						aiBackendBadge={aiBackendBadge}
						aiBackendLabel={aiBackendLabel}
						aiBackendPref={aiBackendPref}
						setAiBackendPref={setAiBackendPref}
						aiStats={aiStats}
						analysis={analysis}
						mobileView={mobileView}
					/>

					{/* ── Right Column: Interactive Sidebar (5 Cols) ── */}
					<div
						className={`lg:col-span-5 flex-col bg-slate-950 border-l border-slate-800 text-slate-100 overflow-hidden ${mobileView !== "canvas" ? "flex flex-1" : "hidden lg:flex"}`}
						style={{ backgroundColor: "#020617", color: "#f8fafc" }}
					>
						<div className="grid grid-cols-3 border-b border-slate-800 bg-slate-900 px-2 pt-1.5 shrink-0 gap-1 w-full">
							<button
								type="button"
								onClick={() => { setActiveTab("landmarks"); setMobileView("landmarks"); }}
								className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === "landmarks" ? "border-teal-400 text-teal-300 bg-slate-800 rounded-t-lg shadow-xs" : "border-transparent text-slate-400 hover:text-slate-100 bg-transparent"}`}
								title="Ориентиры ТРГ"
							>
								<span className="hidden sm:inline whitespace-nowrap">1. Ориентиры ({isImageLoaded ? analysis.placedCount : 0}/16)</span>
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
								<span className="hidden sm:inline whitespace-nowrap">2. Расчет углов</span>
								<span className="sm:hidden whitespace-nowrap">2. Углы</span>
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
								<CephTab1TopControls
									landmarks={landmarks}
									analysis={analysis}
									isImageLoaded={isImageLoaded}
									activeTargetKey={activeTargetKey}
									setActiveTargetKey={setActiveTargetKey}
									aiBackendBadge={aiBackendBadge}
									aiStats={aiStats}
									aiBackendPref={aiBackendPref}
									setAiBackendPref={setAiBackendPref}
									detectedBackend={detectedBackend}
									onRunAiAutoPlacement={handleRunAiAutoPlacement}
									isAiInferring={isAiInferring}
									placedPercent={placedPercent}
									isAllPlaced={isAllPlaced}
									onApplyPreset={handleApplyPreset}
									onResetLandmarks={handleResetLandmarks}
									onNavigateToMetrics={() => { setActiveTab("metrics"); setMobileView("metrics"); }}
								/>

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

								<CephTab1BottomActions
									onSaveConsultationWithoutCeph={handleSaveConsultationWithoutCeph}
									onNavigateToMetrics={() => { setActiveTab("metrics"); setMobileView("metrics"); }}
								/>
							</div>
						)}

						{/* Tab 2: Cephalometric Measurements Table & Cards */}
						{activeTab === "metrics" && (
							<CephMeasurementTable
								analysis={analysis}
								landmarks={landmarks}
								onApplyPreset={handleApplyPreset}
								onResetLandmarks={handleResetLandmarks}
								onNavigateToReport={() => { setActiveTab("report"); setMobileView("report"); }}
							/>
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

export default CephalometricAnalysisModal;
