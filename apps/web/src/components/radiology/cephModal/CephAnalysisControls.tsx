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
} from "../../orthodontics/cephalometricMath";
import {
	CEPHALOMETRIC_LANDMARKS,
	LANDMARK_CLINICAL_ROLES,
} from "../../orthodontics/cephalometricMath";
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
		<div className="hidden lg:flex items-center justify-between px-4 py-2 bg-[var(--paper-strong)] border-b border-[var(--line)] shrink-0">
			<div className="flex items-center gap-2">
				<CephalometricPresetsBar variant="header" onApplyPreset={onApplyPreset} onResetLandmarks={onResetLandmarks} />
				<div className="h-5 w-[1px] bg-[var(--line)] mx-1" />
				<button
					type="button"
					onClick={onRunAiAutoPlacement}
					disabled={isAiInferring}
					data-testid="header-ai-autoplacement-btn"
					className={`h-9 px-3.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all cursor-pointer border border-[var(--line)] whitespace-nowrap shadow-xs bg-[var(--primary)] text-white hover:brightness-105 ${
						isAiInferring ? "animate-pulse" : ""
					}`}
					title="Применить анатомический шаблон нормы I класса"
				>
					<Zap size={14} className={isAiInferring ? "animate-spin text-amber-300" : "text-amber-300 fill-amber-300 shrink-0"} />
					<span>{isAiInferring ? "Применение..." : "Применить анатомический шаблон нормы"}</span>
				</button>
			</div>
			<div className="text-xs text-[var(--ink-muted)] font-medium hidden md:flex items-center gap-2 shrink-0 ml-4">
				<span className="text-[var(--primary)] font-bold hidden xl:inline">16 анатомических ориентиров</span>
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

			{/* Анатомический шаблон (норма I класса) / Калибровка точек */}
			<div className="mb-3.5 bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
						<Zap size={14} className="text-amber-400 fill-amber-400 shrink-0" />
						<span className="font-extrabold">Анатомический шаблон (норма I класса)</span>
					</div>
					<p className="text-[11px] text-[var(--ink-muted)] m-0 mt-1 truncate">
						{aiStats ? `✓ Калибровка: ${aiStats.placedCount} ориентиров расставлено` : "Калиброванная расстановка 16 анатомических точек для боковой ТРГ"}
					</p>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={onRunAiAutoPlacement}
						disabled={isAiInferring}
						data-testid="tab1-ai-autoplacement-btn"
						className={`h-9 px-3.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xs transition-all cursor-pointer border border-[var(--line)] whitespace-nowrap bg-[var(--primary)] text-white hover:brightness-105 ${
							isAiInferring ? "animate-pulse cursor-wait" : ""
						}`}
						title="Применить анатомический шаблон нормы I класса"
					>
						<Zap size={14} className={isAiInferring ? "animate-spin text-amber-300" : "text-amber-300 fill-amber-300 shrink-0"} />
						<span>{isAiInferring ? "Применение..." : "Применить анатомический шаблон нормы"}</span>
					</button>
				</div>
			</div>

			<div className="mb-3.5 bg-[var(--paper-soft)] p-3.5 rounded-xl border border-[var(--line)] shrink-0">
				<div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
					<span className="text-[var(--ink)]">Прогресс разметки ТРГ</span>
					<span className="text-[var(--primary)] font-extrabold">{placedPercent}%</span>
				</div>
				<div className="h-2.5 w-full bg-[var(--paper)] rounded-full overflow-hidden border border-[var(--line)]">
					<div className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" style={{ width: `${placedPercent}%` }} />
				</div>
				<p className="text-xs text-[var(--ink-muted)] m-0 mt-2 min-w-0 break-words">
					{isImageLoaded ? "Кликните ориентир ниже, затем укажите его положение на снимке ТРГ слева." : "Загрузите боковую ТРГ пациента или выберите эталонный снимок для начала анализа."}
				</p>
			</div>

			{isImageLoaded && activeLm && !isAllPlaced && (
				<div data-testid="banner-active-landmark-guidance" className="mb-3 p-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 shadow-xs space-y-1.5 shrink-0">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm" style={{ backgroundColor: activeLm.color }}>
								{activeLm.code}
							</span>
							<span className="text-xs font-bold text-[var(--ink)] truncate">
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
							className="text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--paper)] px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper-soft)] transition-colors shrink-0 cursor-pointer"
							title="Перейти к следующему незаданному ориентиру"
						>
							След. точка →
						</button>
					</div>
					<p className="text-xs text-[var(--ink)] leading-snug m-0">
						<span className="font-semibold text-[var(--primary)]">Анатомия: </span>
						{LANDMARK_CLINICAL_ROLES[activeLm.key]?.clinicalTip || activeLm.anatomicalDescription}
					</p>
					<p className="text-[11px] text-[var(--ink-muted)] leading-tight m-0">
						<span className="font-medium text-[var(--ink)]">Влияет на: </span>
						{LANDMARK_CLINICAL_ROLES[activeLm.key]?.depends || "Углы и плоскости черепа"}
					</p>
				</div>
			)}

			{isImageLoaded && isAllPlaced && (
				<div data-testid="banner-all-landmarks-placed" className="mb-3 p-3 rounded-xl border border-[var(--success-line)] bg-[var(--success-soft)] text-xs text-[var(--success-ink)] flex items-center justify-between gap-2 shrink-0">
					<div className="flex items-center gap-2">
						<Check size={16} className="text-[var(--success-ink)] shrink-0" />
						<span className="font-bold">Все 16 анатомических ориентиров расставлены!</span>
					</div>
					<button
						type="button"
						onClick={onNavigateToMetrics}
						className="px-2.5 py-1 rounded bg-[var(--primary)] hover:brightness-105 text-white font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
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
		<div className="mt-3 pt-3 border-t border-[var(--line)] shrink-0 flex flex-col gap-2">
			<button
				type="button"
				onClick={onSaveConsultationWithoutCeph}
				data-testid="tab1-save-consultation-without-ceph-btn"
				className="w-full h-9 py-1.5 px-3 rounded-lg bg-[var(--warning-soft)] hover:brightness-105 text-[var(--warning-ink)] border border-[var(--warning-line)] font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
				title="Сохранить предварительную консультацию ортодонта в карту без ожидания расстановки всех 16 точек"
			>
				<Save size={15} />
				<span>Сохранить консультацию без полного ТРГ-расчета</span>
			</button>
			<button
				type="button"
				onClick={onNavigateToMetrics}
				className="w-full h-10 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all bg-[var(--primary)] hover:brightness-105 text-white cursor-pointer"
				data-testid="tab1-to-metrics-btn"
			>
				<span>Перейти к расчету углов (Steiner, Tweed, Downs, McNamara)</span>
				<ArrowRight size={16} />
			</button>
		</div>
	);
}
