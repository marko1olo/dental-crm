import React from "react";
import { Sparkles } from "lucide-react";
import type { LandmarkKey, LandmarkMap, CephalometricAnalysisResult } from "../cephalometricMath";
import { CephalometricPresetsBar } from "./CephalometricReportTab";
import { CephLandmarkGuidanceBanners } from "./CephLandmarkGuidanceBanners";
import type { CephAiBackendPreference, CephBackendInfo } from "../cephAiInferenceService";
import type { CephAiStats } from "./types";

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
	onRunAiAutoPlacement,
	isAiInferring,
	placedPercent,
	isAllPlaced,
	onApplyPreset,
	onResetLandmarks,
	onNavigateToMetrics,
}: Omit<CephTab1GuidanceControlsProps, "onSaveConsultationWithoutCeph">) {
	return (
		<>
			<div className="lg:hidden mb-3.5">
				<CephalometricPresetsBar variant="tab1" onApplyPreset={onApplyPreset} onResetLandmarks={onResetLandmarks} />
			</div>

			<div className="mb-3.5 bg-gradient-to-r from-teal-950/80 to-slate-900/90 p-3 rounded-xl border border-teal-500/40 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 font-bold text-xs text-teal-300">
						<Sparkles size={14} className="text-amber-400 shrink-0" />
						<span className="font-extrabold">Анатомический шаблон (I класс)</span>
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-200 border border-teal-400/40 font-mono">
							[{aiBackendBadge}]
						</span>
					</div>
					<p className="text-[11px] text-slate-300 m-0 mt-1 truncate">
						{aiStats ? `✓ Калибровано: ${aiStats.placedCount} ориентиров за ${aiStats.latencyMs} мс` : "Быстрая разметка 16 ориентиров для последующей ручной коррекции"}
					</p>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<select
						value={aiBackendPref}
						onChange={(e) => setAiBackendPref(e.target.value as CephAiBackendPreference)}
						className="h-8 px-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] cursor-pointer"
						title="Режим разметки"
						data-testid="ai-backend-select"
					>
						<option value="auto">Анатомический шаблон</option>
						<option value="wasm">Калибровка по линейке</option>
						<option value="webgpu">Dolphin / Romexis (внешний)</option>
						<option value="webgl">OnyxCeph / Ez3D (внешний)</option>
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
						title="Применить калиброванный анатомический шаблон"
					>
						<Sparkles size={13} className={isAiInferring ? "animate-spin text-amber-300" : "text-amber-300 shrink-0"} />
						<span style={{ color: "#ffffff" }}>{isAiInferring ? "Калибровка..." : "Анатомический шаблон"}</span>
					</button>
				</div>
			</div>

			<div className="mb-3.5 bg-[var(--paper-soft)] p-3.5 rounded-xl border border-[var(--line)] shrink-0" style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)" }}>
				<div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
					<span className="text-[var(--ink)]" style={{ color: "var(--ink)" }}>Прогресс разметки ТРГ</span>
					<span className="text-teal-400 font-extrabold">{placedPercent}%</span>
				</div>
				<div className="h-2.5 w-full bg-[var(--line)] rounded-full overflow-hidden">
					<div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${placedPercent}%` }} />
				</div>
				<p className="text-xs text-[var(--muted)] m-0 mt-2 min-w-0 break-words">
					{isImageLoaded ? "Кликните ориентир ниже, затем укажите его положение на снимке ТРГ слева." : "Загрузите боковую ТРГ пациента или выберите эталонный снимок для начала анализа."}
				</p>
			</div>

			<CephLandmarkGuidanceBanners
				isImageLoaded={isImageLoaded}
				activeTargetKey={activeTargetKey}
				setActiveTargetKey={setActiveTargetKey}
				landmarks={landmarks}
				isAllPlaced={isAllPlaced}
				onNavigateToMetrics={onNavigateToMetrics}
			/>
		</>
	);
}
