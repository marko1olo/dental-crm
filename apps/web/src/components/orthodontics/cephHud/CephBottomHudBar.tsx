import React from "react";
import { Crosshair, X } from "lucide-react";
import { CEPHALOMETRIC_LANDMARKS, type LandmarkKey, type LandmarkMap } from "../cephalometricMath";
import type { CephAiBackendPreference } from "../cephAiInferenceService";
import { CephHudActionButtons } from "./CephHudActionButtons";

export interface CephBottomHudBarProps {
	readonly imageUrl: string | null;
	readonly isAllLandmarksPlaced: boolean;
	readonly activeTargetKey: LandmarkKey | null;
	readonly landmarks: LandmarkMap;
	readonly onSelectTargetKey: (key: LandmarkKey | null) => void;
	readonly onFileProcess: (file: File) => void;
	readonly onLoadPreset?: (() => void) | undefined;
	readonly onResetLandmarks?: (() => void) | undefined;
	readonly onRunAiAutoPlacement?: (() => void) | undefined;
	readonly isAiInferring?: boolean | undefined;
	readonly aiBackendBadge?: string | undefined;
	readonly aiBackendLabel?: string | undefined;
	readonly aiBackendPref?: CephAiBackendPreference | undefined;
	readonly onChangeAiBackendPref?: ((pref: CephAiBackendPreference) => void) | undefined;
}

export const CephBottomHudBar: React.FC<CephBottomHudBarProps> = (props) => {
	const { imageUrl, isAllLandmarksPlaced, activeTargetKey, landmarks, onSelectTargetKey } = props;

	return (
		<div
			data-testid="ceph-bottom-hud-strip"
			className="absolute bottom-2 sm:bottom-2.5 left-2 sm:left-3 right-2 sm:right-3 z-30 flex items-center justify-between gap-1 sm:gap-2 bg-[var(--paper)]/95 border border-[var(--line)] rounded-xl p-1 shadow-2xl backdrop-blur-md min-h-[36px] h-9 select-none flex-nowrap whitespace-nowrap pointer-events-auto text-[var(--ink)]"
		>
			<div className="flex items-center gap-1.5 bg-[var(--paper-soft)] px-2.5 py-1 rounded-lg border border-[var(--line)] text-[12.5px] font-medium text-[var(--ink)] shrink-0 min-w-0 max-w-[280px]">
				<Crosshair size={14} className="text-[var(--primary)] animate-pulse shrink-0" />
				<div className="text-[12px] font-medium text-[var(--ink)] min-w-0 truncate">
					{!imageUrl ? (
						<span className="text-[var(--muted)]">Ожидание загрузки ТРГ</span>
					) : isAllLandmarksPlaced ? (
						<span className="text-emerald-500 font-bold">Все 16 точек заданы. Расчет углов готов</span>
					) : activeTargetKey ? (
						<span className="flex items-center gap-1">
							<span className="text-[var(--muted)] font-normal mr-1">
								{landmarks[activeTargetKey] ? "Точка задана:" : "Установите точку:"}
							</span>
							<span className="text-[var(--primary)] font-bold uppercase">
								{CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey)?.nameRu}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSelectTargetKey(null);
								}}
								className="p-0.5 rounded hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer ml-1"
								title="Отменить выбор ориентира (Esc)"
								aria-label="Отменить выбор ориентира"
							>
								<X size={12} />
							</button>
						</span>
					) : (
						<span className="text-[var(--muted)]">16 ориентиров ТРГ</span>
					)}
				</div>
			</div>

			<div className="w-[1px] h-5 bg-[var(--line)] shrink-0 mx-0.5" />

			<CephHudActionButtons {...props} />
		</div>
	);
};
