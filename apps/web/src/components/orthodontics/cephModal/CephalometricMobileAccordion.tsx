import { Activity, Check } from "lucide-react";
import React from "react";
import { CEPHALOMETRIC_LANDMARKS, type CephalometricAnalysisResult, type LandmarkKey, type LandmarkMap, getRequiredLandmarksForMeasurement } from "../cephalometricMath";

export interface CephalometricMobileAccordionProps {
	readonly analysis: CephalometricAnalysisResult;
	readonly landmarks: LandmarkMap;
	readonly activeTargetKey: LandmarkKey | null;
	readonly onSelectTargetKey: (key: LandmarkKey) => void;
}

export function CephalometricMobileAccordion({ analysis, landmarks, activeTargetKey, onSelectTargetKey }: CephalometricMobileAccordionProps) {
	return (
		<details className="lg:hidden mt-2.5 rounded-xl border border-[var(--line,#334155)] bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] overflow-hidden group shrink-0">
			<summary className="px-3.5 py-2.5 bg-[var(--paper,#1e293b)] font-bold text-xs flex items-center justify-between cursor-pointer select-none text-slate-200 hover:text-white transition-colors">
				<div className="flex items-center gap-2"><Activity size={14} className="text-teal-400" /><span>Таблица расчетов углов (Steiner, Tweed, Downs) & 16 точек</span></div>
				<span className="text-[11px] font-mono font-bold text-teal-400 group-open:rotate-180 transition-transform duration-200">▼</span>
			</summary>
			<div className="p-3 space-y-3 max-h-[320px] overflow-y-auto">
				<div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-500/30 text-xs">
					<div className="font-bold text-teal-300">{analysis.diagnosis.skeletalClassRu}</div>
					<div className="text-[11px] text-slate-300 mt-0.5">{analysis.diagnosis.summaryRu}</div>
				</div>
				<div className="space-y-1.5">
					<div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Основные углы и параметры</div>
					<div className="grid grid-cols-1 gap-1.5">
						{analysis.measurements.map((m) => {
							const isValValid = m.value !== null && Number.isFinite(m.value);
							const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
							return (
								<div key={m.id} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
									<div className="min-w-0 pr-2">
										<div className="font-bold text-white truncate">{m.name}</div>
										<div className="text-[10px] text-slate-400 truncate">{m.clinicalInterpretation} · Норма: {m.normText}</div>
									</div>
									<div className="text-right shrink-0 flex items-center gap-1.5">
										<span className="font-mono font-black text-xs text-white">{isValValid ? `${m.value}${m.unit}` : "—"}</span>
										<span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isValValid ? (m.status === "normal" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : m.status === "increased" ? "bg-rose-950 text-rose-300 border border-rose-500/40" : m.status === "decreased" ? "bg-sky-950 text-sky-300 border border-sky-500/40" : "bg-slate-800 text-slate-400") : "bg-slate-800 text-amber-300 border border-amber-500/30"}`}>
											{isValValid ? (m.status === "normal" ? "Норма" : m.status === "increased" ? "Увелич." : m.status === "decreased" ? "Уменьш." : "—") : (missingKeys.length > 0 ? `Ждёт: ${missingKeys.join(",")}` : "—")}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
				<div className="space-y-1.5 pt-1 border-t border-slate-800">
					<div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
						<span>16 анатомических ориентиров</span><span className="text-teal-400 font-mono font-black">{analysis.placedCount}/16</span>
					</div>
					<div className="grid grid-cols-2 gap-1">
						{CEPHALOMETRIC_LANDMARKS.map((lm) => {
							const isPlaced = landmarks[lm.key] !== undefined;
							const isTarget = activeTargetKey === lm.key;
							return (
								<button key={lm.key} type="button" onClick={() => onSelectTargetKey(lm.key)} className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all text-[11px] min-h-[36px] ${isTarget ? "bg-teal-900/50 border-teal-400 text-teal-200 ring-1 ring-teal-400" : isPlaced ? "bg-slate-800/80 border-slate-700 text-slate-200" : "bg-slate-900/40 border-dashed border-slate-700 text-slate-400"}`}>
									<span className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] shrink-0 text-white" style={{ backgroundColor: lm.color }}>{lm.code}</span>
									<span className="truncate flex-1 font-semibold">{lm.nameRu}</span>
									{isPlaced && <Check size={11} className="text-emerald-400 shrink-0" />}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</details>
	);
}
