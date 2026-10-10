import {
	ArrowRight,
	Check,
	Save,
	Zap,
} from "lucide-react";
import React from "react";
import type {
	LandmarkKey,
	LandmarkMap,
	CephalometricAnalysisResult,
} from "../cephalometricMath";
import {
	CEPHALOMETRIC_LANDMARKS,
	LANDMARK_CLINICAL_ROLES,
} from "../cephalometricMath";
import { CephalometricPresetsBar } from "../CephalometricReportTab";
import type { CephAiBackendPreference, CephBackendInfo } from "../../orthodontics/cephAiInferenceService";
import type { CephAiStats } from "./types";

export interface CephDesktopControlsStripProps {
	readonly onApplyPreset: (preset: LandmarkMap, label: string) => void;
	readonly onResetLandmarks: () => void;
	readonly onRunAiAutoPlacement: () => void;
	readonly isAiInferring: boolean;
	readonly aiBackendLabel: string;
	readonly aiBackendBadge: string;
}

export function CephDesktopControlsStrip({
	onApplyPreset,
	onResetLandmarks,
	onRunAiAutoPlacement,
	isAiInferring,
	aiBackendLabel,
	aiBackendBadge,
}: CephDesktopControlsStripProps) {
	return (
		<div className="hidden lg:flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0" style={{ backgroundColor: "#0b1220", borderColor: "#1e293b" }}>
			<div className="flex items-center gap-2">
				<CephalometricPresetsBar variant="header" onApplyPreset={onApplyPreset} onResetLandmarks={onResetLandmarks} />
				<div className="h-5 w-[1px] bg-slate-800 mx-1" />
				<button
					type="button"
					onClick={onRunAiAutoPlacement}
					disabled={isAiInferring}
					data-testid="header-ai-autoplacement-btn"
					className={`h-7 px-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap shadow-xs ${
						isAiInferring ? "animate-pulse" : "hover:brightness-110"
					}`}
					style={{
						backgroundColor: isAiInferring ? "#134e4a" : "#0d9488",
						color: "#ffffff",
						borderColor: "rgba(45, 212, 191, 0.6)",
					}}
					title={`Локальная нейросеть CephaloHRNet-W32 (${aiBackendLabel})`}
				>
					<Zap size={13} className={isAiInferring ? "animate-spin text-amber-300" : "text-amber-300 fill-amber-300 shrink-0"} />
					<span style={{ color: "#ffffff" }}>{isAiInferring ? "AI расчёт..." : "AI Авторазметка"}</span>
					<span className="text-[10px] px-1 rounded bg-black/50 font-mono text-teal-200 border border-teal-400/40">
						[{aiBackendBadge}]
					</span>
				</button>
			</div>
			<div className="text-xs text-slate-400 font-medium hidden md:flex items-center gap-2 shrink-0 ml-4">
				<span className="text-teal-400 font-bold hidden xl:inline">16 анатомических ориентиров</span>
				<span className="hidden xl:inline">·</span>
				<span>Steiner (SNA, SNB, ANB)</span>
				<span>·</span>
				<span>Tweed / Downs</span>
			</div>
		</div>
	);
}

export interface CephTab1GuidanceControlsProps {
	readonly landmarks: LandmarkMap;
	readonly analysis: CephalometricAnalysisResult;
	readonly isImageLoaded: boolean;
	readonly activeTargetKey: LandmarkKey | null;
	readonly setActiveTargetKey: (key: LandmarkKey | null) => void;
	readonly aiBackendBadge: string;
	readonly aiStats: CephAiStats | null;
	readonly aiBackendPref: CephAiBackendPreference;
	readonly setAiBackendPref: (pref: CephAiBackendPreference) => void;
	readonly detectedBackend: CephBackendInfo | null;
	readonly onRunAiAutoPlacement: () => void;
	readonly isAiInferring: boolean;
	readonly placedPercent: number;
	readonly isAllPlaced: boolean;
	readonly onApplyPreset: (preset: LandmarkMap, label: string) => void;
	readonly onResetLandmarks: () => void;
	readonly onSaveConsultationWithoutCeph: () => void;
	readonly onNavigateToMetrics: () => void;
}

export function CephTab1TopControls({
	landmarks,
	isImageLoaded,
	activeTargetKey,
	setActiveTargetKey,
	aiBackendBadge,
	aiStats,
	aiBackendPref,
	setAiBackendPref,
	detectedBackend,
	onRunAiAutoPlacement,
	isAiInferring,
	placedPercent,
	isAllPlaced,
	onApplyPreset,
	onResetLandmarks,
	onNavigateToMetrics,
}: Omit<CephTab1GuidanceControlsProps, "onSaveConsultationWithoutCeph">) {
	const activeLm = activeTargetKey ? CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey) ?? null : null;

	return (
		<>
			<div className="lg:hidden mb-3.5">
				<CephalometricPresetsBar variant="tab1" onApplyPreset={onApplyPreset} onResetLandmarks={onResetLandmarks} />
			</div>

			{/* AI Auto-Placement Card in Tab 1 */}
			<div className="mb-3.5 bg-gradient-to-r from-teal-950/80 to-slate-900/90 p-3 rounded-xl border border-teal-500/40 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 font-bold text-xs text-teal-300">
						<Zap size={14} className="text-amber-400 fill-amber-400 shrink-0" />
						<span className="font-extrabold">CephaloHRNet-W32 (2D ТРГ)</span>
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-200 border border-teal-400/40 font-mono">
							[{aiBackendBadge}]
						</span>
					</div>
					<p className="text-[11px] text-slate-300 m-0 mt-1 truncate">
						{aiStats ? `✓ Расчёт: ${aiStats.placedCount} точек за ${aiStats.latencyMs} мс` : "100% локально в браузере (0 байт в сеть, 152-ФЗ)"}
					</p>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<select
						value={aiBackendPref}
						onChange={(e) => setAiBackendPref(e.target.value as CephAiBackendPreference)}
						className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer"
						title="Выбор аппаратного бэкенда инференса"
						data-testid="ai-backend-select"
					>
						<option value="auto">Auto ({detectedBackend?.badge || "GPU"})</option>
						<option value="webgpu">WebGPU (Дискретная)</option>
						<option value="webgl">WebGL (Встройка)</option>
						<option value="wasm">CPU (Процессор)</option>
					</select>
					<button
						type="button"
						onClick={onRunAiAutoPlacement}
						disabled={isAiInferring}
						data-testid="tab1-ai-autoplacement-btn"
						className={`h-8 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border whitespace-nowrap ${
							isAiInferring ? "animate-pulse cursor-wait" : "hover:brightness-110"
						}`}
						style={{
							backgroundColor: isAiInferring ? "#134e4a" : "#0d9488",
							color: "#ffffff",
							borderColor: "rgba(45, 212, 191, 0.6)",
						}}
						title="Автоматическая расстановка 16 точек с помощью локальной нейросети"
					>
						<Zap size={13} className={isAiInferring ? "animate-spin text-amber-300" : "text-amber-300 fill-amber-300 shrink-0"} />
						<span style={{ color: "#ffffff" }}>{isAiInferring ? "Расчёт..." : "AI Разметка"}</span>
					</button>
				</div>
			</div>

			<div className="mb-3.5 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 shrink-0" style={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}>
				<div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
					<span className="text-slate-200" style={{ color: "#f8fafc" }}>Прогресс разметки ТРГ</span>
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
						onClick={onNavigateToMetrics}
						className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
					>
						Смотреть углы →
					</button>
				</div>
			)}
		</>
	);
}

export interface CephTab1BottomActionsProps {
	readonly onSaveConsultationWithoutCeph: () => void;
	readonly onNavigateToMetrics: () => void;
}

export function CephTab1BottomActions({
	onSaveConsultationWithoutCeph,
	onNavigateToMetrics,
}: CephTab1BottomActionsProps) {
	return (
		<div className="mt-3 pt-3 border-t border-slate-800 shrink-0 flex flex-col gap-2">
			<button
				type="button"
				onClick={onSaveConsultationWithoutCeph}
				data-testid="tab1-save-consultation-without-ceph-btn"
				className="w-full h-9 py-1.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
				title="Сохранить предварительную консультацию ортодонта в карту без ожидания расстановки всех 16 точек"
			>
				<Save size={15} />
				<span>Сохранить консультацию без полного ТРГ-расчета</span>
			</button>
			<button
				type="button"
				onClick={onNavigateToMetrics}
				className="w-full h-10 py-2 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all bg-[var(--teal)] hover:brightness-105 text-white cursor-pointer"
				data-testid="tab1-to-metrics-btn"
			>
				<span>Перейти к расчету углов (Steiner, Tweed, Downs, McNamara)</span>
				<ArrowRight size={16} />
			</button>
		</div>
	);
}
