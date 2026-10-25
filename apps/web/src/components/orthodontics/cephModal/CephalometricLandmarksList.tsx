import { Check } from "lucide-react";
import React from "react";
import {
	CEPHALOMETRIC_LANDMARKS,
	type LandmarkKey,
	type LandmarkMap,
} from "../cephalometricMath";

export interface CephalometricLandmarksListProps {
	readonly landmarks: LandmarkMap;
	readonly isImageLoaded: boolean;
	readonly activeTargetKey: LandmarkKey | null;
	readonly onSelectLandmark: (key: LandmarkKey) => void;
}

export function CephalometricLandmarksList({
	landmarks,
	isImageLoaded,
	activeTargetKey,
	onSelectLandmark,
}: CephalometricLandmarksListProps) {
	return (
		<div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-4">
			{CEPHALOMETRIC_LANDMARKS.map((lm) => {
				const isPlaced = isImageLoaded && landmarks[lm.key] !== undefined;
				const isTarget = isImageLoaded && activeTargetKey === lm.key;

				return (
					<button
						key={lm.key}
						type="button"
						onClick={() => onSelectLandmark(lm.key)}
						className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[52px] ${
							isTarget
								? "bg-teal-950/80 border-teal-400 shadow-md ring-1 ring-teal-500/40"
								: isPlaced
									? "bg-[var(--paper-soft,#0f172a)]/90 border-[var(--line,#334155)] hover:border-teal-400"
									: "bg-[var(--paper-soft,#0f172a)]/90 border-[var(--line,#334155)] opacity-90 hover:opacity-100"
						}`}
					>
						<div className="flex items-center gap-3 min-w-0">
							<div
								className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 text-white shadow-sm"
								style={{ backgroundColor: isImageLoaded ? lm.color : "#475569" }}
							>
								{lm.code}
							</div>
							<div className="min-w-0">
								<div className="text-sm font-bold text-[var(--ink,#ffffff)] min-w-0 break-words">
									{lm.nameRu}
								</div>
								<div className="text-xs font-medium text-[var(--muted,#cbd5e1)] min-w-0 break-words leading-snug">
									{lm.anatomicalDescription}
								</div>
							</div>
						</div>

						<div className="shrink-0 flex items-center gap-1.5">
							{isPlaced ? (
								<span className="text-xs font-bold text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-500/40 flex items-center gap-1">
									<Check size={13} /> Задана
								</span>
							) : (
								<span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
									Не задана
								</span>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
}
