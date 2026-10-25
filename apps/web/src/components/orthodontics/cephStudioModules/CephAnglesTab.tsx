import React from "react";
import type { CephalometricAnalysisResult } from "../cephalometricMath";

export interface CephAnglesTabProps {
	readonly theme: "light" | "dark";
	readonly analysis: CephalometricAnalysisResult;
}

export const CephAnglesTab: React.FC<CephAnglesTabProps> = ({ theme, analysis }) => {
	const isLight = theme === "light";
	return (
		<div className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-3 ${isLight ? "bg-white" : ""}`}>
			<div className={`flex items-center justify-between text-xs mb-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
				<span>17 клинических параметров ТРГ:</span>
				<span className={`font-mono font-bold ${isLight ? "text-teal-700" : "text-teal-400"}`}>
					{analysis.measurements.filter((m) => m.value !== null).length} / 17
				</span>
			</div>

			<div className="space-y-2">
				{analysis.measurements.map((m) => (
					<div
						key={m.id}
						className={`p-3 rounded-xl border text-xs space-y-1.5 ${
							isLight ? "bg-slate-50 border-slate-200" : "bg-slate-800/80 border-slate-700"
						}`}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className={`font-mono font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
									{m.id}
								</span>
								<span className={`text-[11px] truncate max-w-[140px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
									{m.name}
								</span>
							</div>

							<div className="flex items-center gap-1.5">
								<span className={`font-mono font-bold text-sm ${isLight ? "text-teal-700" : "text-teal-300"}`}>
									{m.value !== null ? `${m.value}${m.unit}` : "—"}
								</span>
								<span
									className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
										m.status === "normal"
											? isLight
												? "bg-emerald-100 border border-emerald-300 text-emerald-800"
												: "bg-emerald-950 border border-emerald-800 text-emerald-300"
											: m.status === "increased"
												? isLight
													? "bg-amber-100 border border-amber-300 text-amber-800"
													: "bg-amber-950 border border-amber-800 text-amber-300"
												: m.status === "decreased"
													? isLight
														? "bg-indigo-100 border border-indigo-300 text-indigo-800"
														: "bg-indigo-950 border border-indigo-800 text-indigo-300"
													: isLight
														? "bg-slate-100 border border-slate-200 text-slate-500"
														: "bg-slate-900 border border-slate-800 text-slate-500"
									}`}
								>
									{m.status === "normal"
										? "Норма"
										: m.status === "increased"
											? "Выше"
											: m.status === "decreased"
												? "Ниже"
												: "Ожидание"}
								</span>
							</div>
						</div>

						<div className={`flex items-center justify-between text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
							<span>Норматив: {m.normText}</span>
							<span className="font-mono">{m.method}</span>
						</div>

						{m.clinicalInterpretation && (
							<p
								className={`text-[11px] leading-snug m-0 pt-1 border-t ${
									isLight ? "text-slate-700 border-slate-200" : "text-slate-300 border-slate-700/60"
								}`}
							>
								{m.clinicalInterpretation}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
};
