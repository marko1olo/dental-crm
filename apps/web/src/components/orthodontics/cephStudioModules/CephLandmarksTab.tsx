import React from "react";
import { CEPHALOMETRIC_LANDMARKS, type LandmarkKey, type LandmarkMap, type CephalometricAnalysisResult } from "../cephalometricMath";

export interface CephLandmarksTabProps {
	readonly theme: "light" | "dark";
	readonly analysis: CephalometricAnalysisResult;
	readonly landmarks: LandmarkMap;
	readonly activeTargetKey: LandmarkKey | null;
	readonly onSelectTargetKey: (key: LandmarkKey | null) => void;
}

export const CephLandmarksTab: React.FC<CephLandmarksTabProps> = ({
	theme,
	analysis,
	landmarks,
	activeTargetKey,
	onSelectTargetKey,
}) => {
	const isLight = theme === "light";
	return (
		<div className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-3 ${isLight ? "bg-white" : ""}`}>
			<div className={`flex items-center justify-between text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
				<span>Анатомические точки (по Штайнеру и Твиду):</span>
				<span className={`font-mono font-bold ${isLight ? "text-teal-700" : "text-teal-400"}`}>
					{analysis.placedCount} / {CEPHALOMETRIC_LANDMARKS.length}
				</span>
			</div>

			<div className="space-y-1.5">
				{CEPHALOMETRIC_LANDMARKS.map((lm) => {
					const isPlaced = Boolean(landmarks[lm.key]);
					const isTargeted = activeTargetKey === lm.key;

					return (
						<div
							key={lm.key}
							onClick={() => onSelectTargetKey(isTargeted ? null : lm.key)}
							className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
								isTargeted
									? isLight
										? "bg-teal-50 border-teal-500 text-teal-900 shadow-md"
										: "bg-teal-950/80 border-teal-500 text-white shadow-md"
									: isPlaced
										? isLight
											? "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
											: "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800"
										: isLight
											? "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
											: "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40"
							}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lm.color }} />
								<div className="min-w-0">
									<div className={`font-bold truncate ${isLight ? "text-slate-900" : "text-slate-100"}`}>
										{lm.nameRu}
									</div>
									<div className={`text-[10px] truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>
										{lm.anatomicalDescription}
									</div>
								</div>
							</div>

							<div className="flex items-center gap-2 shrink-0">
								{isPlaced ? (
									<span
										className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
											isLight
												? "bg-teal-100 border border-teal-300 text-teal-800"
												: "bg-teal-950 border border-teal-800 text-teal-300"
										}`}
									>
										✓ Размечена
									</span>
								) : (
									<span
										className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
											isLight
												? "bg-slate-100 border border-slate-200 text-slate-500"
												: "bg-slate-800 border border-slate-700 text-slate-400"
										}`}
									>
										Ожидает
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
