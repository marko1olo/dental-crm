import React from "react";
import { Check } from "lucide-react";
import { CEPHALOMETRIC_LANDMARKS, LANDMARK_CLINICAL_ROLES, type LandmarkKey, type LandmarkMap } from "../cephalometricMath";

export interface CephLandmarkGuidanceBannersProps {
	readonly isImageLoaded: boolean;
	readonly activeTargetKey: LandmarkKey | null;
	readonly setActiveTargetKey: (key: LandmarkKey | null) => void;
	readonly landmarks: LandmarkMap;
	readonly isAllPlaced: boolean;
	readonly onNavigateToMetrics: () => void;
}

export const CephLandmarkGuidanceBanners: React.FC<CephLandmarkGuidanceBannersProps> = ({
	isImageLoaded,
	activeTargetKey,
	setActiveTargetKey,
	landmarks,
	isAllPlaced,
	onNavigateToMetrics,
}) => {
	const activeLm = activeTargetKey ? CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey) ?? null : null;

	return (
		<>
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
};
