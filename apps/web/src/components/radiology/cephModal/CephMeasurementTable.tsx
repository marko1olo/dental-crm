import { ArrowRight } from "lucide-react";
import React from "react";
import type {
	LandmarkMap,
	CephalometricAnalysisResult,
} from "../cephalometricMath";
import { getRequiredLandmarksForMeasurement } from "../cephalometricMath";
import {
	CephalometricPresetsBar,
	CephalometricMeasurementsCategories,
} from "../CephalometricReportTab";
import type { HeroCardId } from "./types";

export interface CephMeasurementTableProps {
	readonly analysis: CephalometricAnalysisResult;
	readonly landmarks: LandmarkMap;
	readonly onApplyPreset: (preset: LandmarkMap, label: string) => void;
	readonly onResetLandmarks: () => void;
	readonly onNavigateToReport: () => void;
}

export function CephMeasurementTable({
	analysis,
	landmarks,
	onApplyPreset,
	onResetLandmarks,
	onNavigateToReport,
}: CephMeasurementTableProps) {
	const renderHeroCard = (id: HeroCardId, label: string, norm: string) => {
		const measId = id === "1-NA" ? "1-NA-Angle" : id === "1-NB" ? "1-NB-Angle" : id;
		const meas = analysis.measurements.find((m) => m.id === measId);
		const distMeas = id === "1-NA" ? analysis.measurements.find((m) => m.id === "1-NA-Dist") : id === "1-NB" ? analysis.measurements.find((m) => m.id === "1-NB-Dist") : undefined;
		const isValValid = meas?.value !== null && meas?.value !== undefined && Number.isFinite(meas.value);
		const isDistValid = distMeas?.value !== null && distMeas?.value !== undefined && Number.isFinite(distMeas.value);
		const missing = getRequiredLandmarksForMeasurement(measId).filter((k) => !landmarks[k]);
		const cardClassName = "p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between min-h-[76px]";
		const cardBody = (
			<>
				<div className="flex items-center justify-between gap-1">
					<span className="text-[11px] font-bold text-slate-300 truncate">{label}</span>
					<span className="text-[9px] text-slate-400 font-mono">{norm}</span>
				</div>
				<div className="my-1 flex items-baseline gap-1">
					{isValValid ? (
						<span className={`text-base font-black font-mono leading-none ${meas.status === "normal" ? "text-emerald-400" : meas.status === "increased" ? "text-rose-400" : "text-cyan-400"}`}>
							{meas.value}{meas.unit || "°"}
						</span>
					) : (
						<span className="text-sm font-semibold text-slate-500 leading-none">—</span>
					)}
					{isDistValid && <span className="text-[11px] font-bold text-slate-300 font-mono leading-none">({distMeas.value}мм)</span>}
				</div>
				<div>
					{isValValid ? (
						<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${meas.status === "normal" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : meas.status === "increased" ? "bg-rose-950 text-rose-300 border border-rose-500/40" : "bg-cyan-950 text-cyan-300 border border-cyan-500/40"}`}>
							{id === "ANB" ? (meas.status === "normal" ? "Класс I" : meas.status === "increased" ? "Класс II" : "Класс III") : id === "1-NA" || id === "1-NB" ? (meas.status === "normal" ? "Норма" : meas.status === "increased" ? "Протрузия" : "Ретрузия") : (meas.status === "normal" ? "Норма" : meas.status === "increased" ? "Увеличен" : "Уменьшен")}
						</span>
					) : (
						<span className="text-[9px] font-medium text-amber-400/90 truncate block">{missing.length > 0 ? `Ждёт: ${missing.join(",")}` : "Нет данных"}</span>
					)}
				</div>
			</>
		);

		if (id === "SNA") return <div key={id} data-testid="core-hero-SNA" className={cardClassName}>{cardBody}</div>;
		if (id === "SNB") return <div key={id} data-testid="core-hero-SNB" className={cardClassName}>{cardBody}</div>;
		if (id === "ANB") return <div key={id} data-testid="core-hero-ANB" className={cardClassName}>{cardBody}</div>;
		if (id === "1-NA") return <div key={id} data-testid="core-hero-1-NA" className={cardClassName}>{cardBody}</div>;
		return <div key={id} data-testid="core-hero-1-NB" className={cardClassName}>{cardBody}</div>;
	};

	return (
		<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-slate-950">
			<CephalometricPresetsBar variant="tab2" onApplyPreset={onApplyPreset} onResetLandmarks={onResetLandmarks} />

			<div className="mb-4 p-4 rounded-xl bg-teal-950/80 border border-teal-500/50 shadow-sm" style={{ backgroundColor: "#042f2e", borderColor: "rgba(20, 184, 166, 0.5)" }}>
				<div className="text-xs font-black uppercase tracking-wider" style={{ color: "#2dd4bf" }}>Клиническое резюме анализа</div>
				<div className="text-base font-black mt-1 min-w-0 break-words" style={{ color: "#ffffff" }}>{analysis.diagnosis.skeletalClassRu}</div>
				<div className="text-sm mt-1.5 leading-relaxed min-w-0 break-words" style={{ color: "#cbd5e1" }}>{analysis.diagnosis.summaryRu}</div>
			</div>

			{/* Core Cephalometric Angles Hero Showcase */}
			<div className="mb-4 space-y-2">
				<div className="text-xs font-black uppercase tracking-wider flex items-center justify-between" style={{ color: "#cbd5e1" }}>
					<span>Ключевые углы Штайнера (Steiner Core)</span>
					<span className="text-[10px] font-normal" style={{ color: "#2dd4bf" }}>Ортодонтия</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
					{renderHeroCard("SNA", "SNA", "82° ± 2°")}
					{renderHeroCard("SNB", "SNB", "80° ± 2°")}
					{renderHeroCard("ANB", "ANB", "2° ± 2°")}
					{renderHeroCard("1-NA", "1-NA", "22° / 4мм")}
					{renderHeroCard("1-NB", "1-NB", "25° / 4мм")}
				</div>
			</div>

			<CephalometricMeasurementsCategories analysis={analysis} landmarks={landmarks} />

			<div className="mt-3 pt-3 border-t border-slate-800">
				<button
					type="button"
					onClick={onNavigateToReport}
					className="w-full h-10 py-2 rounded-lg bg-[var(--teal)] hover:brightness-105 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
				>
					<span>Сформировать протокол для карты</span>
					<ArrowRight size={16} />
				</button>
			</div>
		</div>
	);
}
