import React from "react";
import { type CephalometricAnalysisResult, type LandmarkMap, getRequiredLandmarksForMeasurement } from "../cephalometricMath";

export interface CephalometricMeasurementsCategoriesProps {
	readonly analysis: CephalometricAnalysisResult;
	readonly landmarks: LandmarkMap;
}

export function CephalometricMeasurementsCategories({
	analysis,
	landmarks,
}: CephalometricMeasurementsCategoriesProps) {
	const renderCategorySection = (title: string, category: "sagittal" | "vertical" | "dental") => {
		const items = analysis.measurements.filter((m) => m.category === category);
		return (
			<div>
				<div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
					{title}
				</div>
				<div className="space-y-2">
					{items.map((m) => {
						const isValValid = m.value !== null && Number.isFinite(m.value);
						const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
						return (
							<div
								key={m.id}
								className="p-3 rounded-xl bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#1e293b)] flex items-center justify-between gap-3 min-h-[52px]"
							>
								<div className="min-w-0">
									<div className="text-sm font-bold text-[var(--ink,#ffffff)] min-w-0 break-words">
										{m.name}
									</div>
									<div className="text-xs text-[var(--muted,#94a3b8)] mt-0.5 min-w-0 break-words">
										{m.clinicalInterpretation} · Норма: <span className="font-bold text-[var(--ink,#f1f5f9)]">{m.normText}</span>
									</div>
								</div>
								<div className="text-right shrink-0 flex flex-col items-end gap-1">
									<div
										className={`text-base font-black ${
											isValValid
												? m.status === "normal"
													? "text-emerald-400"
													: m.status === "increased"
														? "text-rose-400"
														: m.status === "decreased"
															? "text-cyan-400"
															: "text-slate-400"
												: "text-slate-500"
										}`}
									>
										{isValValid ? `${m.value}${m.unit}` : "—"}
									</div>
									<span
										className={`text-xs uppercase font-black px-2.5 py-1 rounded-lg border ${
											isValValid
												? m.status === "normal"
													? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
													: m.status === "increased"
														? "bg-rose-950/80 text-rose-300 border-rose-500/40"
														: m.status === "decreased"
															? "bg-cyan-950/80 text-cyan-300 border-cyan-500/40"
															: "bg-slate-800 text-slate-400 border-slate-700"
												: "bg-slate-800 text-amber-300 border border-amber-500/30"
										}`}
									>
										{isValValid
											? m.status === "normal"
												? "Норма"
												: m.status === "increased"
													? "Увеличен"
													: m.status === "decreased"
														? "Уменьшен"
														: "Нет данных"
											: missingKeys.length > 0
												? `Ожидает: ${missingKeys.join(", ")}`
												: "Нет данных"}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-4 flex-1 overflow-y-auto pr-1">
			{renderCategorySection("1. Сагиттальные параметры (Steiner, Downs, Jacobson, McNamara)", "sagittal")}
			{renderCategorySection("2. Вертикальные параметры и тип роста (Tweed, Steiner, Downs, Ricketts)", "vertical")}
			{renderCategorySection("3. Дентальные параметры резцов (Steiner, Tweed)", "dental")}
		</div>
	);
}
