import React from "react";
import { CEPHALOMETRIC_LANDMARKS } from "../cephalometricMath";
import type { CephalometricAnalysisResult, TorqueSelectionAdvice } from "../cephalometric/types";

export interface CephStudioDiagnosticChipsProps {
	readonly theme: "light" | "dark";
	readonly analysis: CephalometricAnalysisResult;
	readonly torqueRecommendation: TorqueSelectionAdvice | null;
}

export const CephStudioDiagnosticChips: React.FC<CephStudioDiagnosticChipsProps> = ({
	theme,
	analysis,
	torqueRecommendation,
}) => {
	const isLight = theme === "light";
	return (
		<div className="hidden lg:flex items-center gap-2">
			<div
				className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-2 ${
					isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"
				}`}
			>
				<span className="text-slate-400 text-[11px]">Ориентиры:</span>
				<span className="font-mono font-bold text-teal-600 dark:text-teal-300">
					{analysis.placedCount}/{CEPHALOMETRIC_LANDMARKS.length}
				</span>
			</div>

			<div
				className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-2 ${
					isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"
				}`}
			>
				<span className="text-slate-400 text-[11px]">Скелетный класс:</span>
				<span
					className={`font-bold ${
						analysis.diagnosis.skeletalClass === "Class I"
							? "text-emerald-500"
							: analysis.diagnosis.skeletalClass === "Class II"
								? "text-amber-500"
								: "text-indigo-500"
					}`}
				>
					{analysis.diagnosis.skeletalClassRu}
				</span>
			</div>

			<div
				className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-2 ${
					isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"
				}`}
			>
				<span className="text-slate-400 text-[11px]">Рост:</span>
				<span className={`font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
					{analysis.diagnosis.growthPatternRu}
				</span>
			</div>

			{torqueRecommendation && (
				<div
					className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-1.5 ${
						isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700 text-slate-300"
					}`}
					title={torqueRecommendation.reason}
				>
					<span className="text-slate-400 text-[11px]">Торк Damon:</span>
					<span className="font-bold text-teal-600 dark:text-cyan-300">
						{torqueRecommendation.type.split(" ")[0]}
					</span>
				</div>
			)}
		</div>
	);
};
