import React from "react";
import { Droplets, AlertCircle } from "lucide-react";
import {
	type PerioToothRecord,
	type PerioSiteKey,
	calculateClinicalAttachmentLevel,
	FURCATION_GRADES,
	MOBILITY_GRADES,
	isFurcationEligibleTooth,
} from "@dental/shared";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { probingDepthClasses, probingDepthTone } from "../perioHeatmap";
import { PerioToothVisual } from "./PerioToothVisual";

export interface PerioToothCardProps {
	readonly tooth: PerioToothRecord;
	readonly isUpper: boolean;
	readonly isSelected: boolean;
	readonly focusedSiteKey: PerioSiteKey | null;
	readonly readOnly: boolean;
	readonly onSelectTooth: () => void;
	readonly onFocusSite: (siteKey: PerioSiteKey) => void;
	readonly onCycleMobility?: (() => void) | undefined;
	readonly onCycleFurcation?: (() => void) | undefined;
	readonly onToggleBop: (siteKey: PerioSiteKey) => void;
	readonly onTogglePlaque: (siteKey: PerioSiteKey) => void;
	readonly onToggleSuppuration: (siteKey: PerioSiteKey) => void;
	readonly onSetProbingDepth: (siteKey: PerioSiteKey, depth: number) => void;
	readonly onSetGingivalMargin: (siteKey: PerioSiteKey, gm: number) => void;
}

const PerioToothCard: React.FC<PerioToothCardProps> = ({
	tooth,
	isUpper,
	isSelected,
	focusedSiteKey,
	readOnly,
	onSelectTooth,
	onFocusSite,
	onCycleMobility,
	onCycleFurcation,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
}) => {
	const isMissing = tooth.isMissing;
	const isImplant = tooth.isImplant;

	// Buccal sites: Disto-Buccal, Mid-Buccal, Mesio-Buccal
	// Standard FDI Quadrant orientation:
	// Q1 (18..11) & Q4 (48..41): right side -> DB is outer, MB is inner
	// Q2 (21..28) & Q3 (31..38): left side -> MB is inner, DB is outer
	const isRightQuadrant =
		(tooth.toothNumber >= 11 && tooth.toothNumber <= 18) ||
		(tooth.toothNumber >= 41 && tooth.toothNumber <= 48);

	const buccalSiteKeys: PerioSiteKey[] = isRightQuadrant
		? ["distoBuccal", "midBuccal", "mesioBuccal"]
		: ["mesioBuccal", "midBuccal", "distoBuccal"];

	const lingualSiteKeys: PerioSiteKey[] = isRightQuadrant
		? ["distoLingual", "midLingual", "mesioLingual"]
		: ["mesioLingual", "midLingual", "distoLingual"];

	return (
		<div
			onClick={onSelectTooth}
			className={`flex flex-col items-center p-1 rounded-lg border transition-all cursor-pointer min-h-[140px] sm:min-h-[150px] ${
				isMissing
					? "opacity-40 bg-[var(--paper-soft)] border-[var(--line)]"
					: isSelected
						? "bg-teal-500/10 border-teal-500 shadow-md ring-1 ring-teal-500/40"
						: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)]"
			}`}
		>
			{/* Tooth Number Header & 1-Click Mobility / Furcation Chips */}
			<div className="w-full flex items-center justify-between text-[10px] font-bold px-0.5 mb-0.5 min-w-0">
				<span
					className={`truncate ${
						isSelected
							? "text-teal-300 font-black scale-105"
							: "text-[var(--ink)]"
					}`}
				>
					{tooth.toothNumber}
				</span>
				<div className="flex items-center gap-0.5 shrink-0">
					{isImplant && (
						<span
							className="text-[8px] font-bold text-amber-400 font-mono px-0.5 rounded bg-amber-500/10 border border-amber-500/30"
							title="Дентальный имплантат"
						>
							ИМП
						</span>
					)}

					{/* 1-Click Mobility Chip (по шкале Энтина 0..III) */}
					{!isMissing && onCycleMobility && (
						<button
							type="button"
							disabled={readOnly}
							onClick={(e) => {
								e.stopPropagation();
								onCycleMobility();
							}}
							className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
								tooth.mobility === 0
									? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-amber-500/20 hover:text-amber-300"
									: tooth.mobility === 1
										? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
										: tooth.mobility === 2
											? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
											: "bg-rose-500/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black animate-pulse"
							}`}
							title={`Подвижность по Энтину: ${MOBILITY_GRADES[tooth.mobility]?.nameRu ?? "0"} (клик для смены 0 -> I -> II -> III)`}
							aria-label={`Подвижность зуба ${tooth.toothNumber}: ${tooth.mobility}`}
						>
							M{tooth.mobility}
						</button>
					)}

					{/* 1-Click Furcation Chip for Multi-Rooted Teeth (0..IV) */}
					{!isMissing &&
						isFurcationEligibleTooth(tooth.toothNumber) &&
						onCycleFurcation && (
							<button
								type="button"
								disabled={readOnly}
								onClick={(e) => {
									e.stopPropagation();
									onCycleFurcation();
								}}
								className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
									tooth.furcation === 0
										? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-rose-500/20 hover:text-rose-300"
										: tooth.furcation === 1
											? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
											: tooth.furcation === 2
												? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
												: "bg-rose-600/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black"
								}`}
								title={`Вовлечение фуркации: ${FURCATION_GRADES[tooth.furcation]?.nameRu ?? "0"} (клик для смены 0 -> I -> II -> III -> IV)`}
								aria-label={`Фуркация зуба ${tooth.toothNumber}: ${tooth.furcation}`}
							>
								F{tooth.furcation}
							</button>
						)}
				</div>
			</div>

			{/* Vestibular / Buccal 3 Sites Row */}
			<div className="grid grid-cols-3 gap-0.5 w-full">
				{buccalSiteKeys.map((sKey) => {
					const site = tooth[sKey] ?? {
						probingDepthMm: 2,
						gingivalMarginMm: 0,
						bleedingOnProbing: false,
						suppuration: false,
						plaque: false,
						calculus: false,
					};
					const isFocused = focusedSiteKey === sKey;
					const pd = site.probingDepthMm ?? 0;

					return (
						<div
							key={sKey}
							onClick={(e) => {
								e.stopPropagation();
								onFocusSite(sKey);
							}}
							className={`flex flex-col items-center justify-center py-1 px-0.5 rounded border transition-all ${
								isFocused
									? "ring-2 ring-teal-400 bg-teal-500/25 border-teal-400 shadow-xs"
									: probingDepthClasses(pd)
							}`}
						>
							<span className="font-mono text-[10px] font-black leading-none">
								{pd}
							</span>

							{/* 1-Click BOP & Plaque Interactive Toggles */}
							<div className="flex items-center gap-1 mt-0.5">
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onToggleBop(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.bleedingOnProbing
											? "bg-rose-500 border-rose-300 text-white shadow-xs ring-1 ring-rose-300"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-rose-500/50 hover:border-rose-400"
									}`}
									title={
										site.bleedingOnProbing
											? "BOP: Кровоточивость есть (клик для снятия)"
											: "BOP: Кровоточивости нет (клик для отметки)"
									}
									aria-label="BOP"
								>
									{site.bleedingOnProbing && (
										<span className="w-1.5 h-1.5 rounded-full bg-white block" />
									)}
								</button>
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onTogglePlaque(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.plaque
											? "bg-amber-400 border-amber-200 text-slate-950 shadow-xs ring-1 ring-amber-200"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-amber-400/50 hover:border-amber-300"
									}`}
									title={
										site.plaque
											? "PLQ: Зубной налет есть (клик для снятия)"
											: "PLQ: Зубного налета нет (клик для отметки)"
									}
									aria-label="PLQ"
								>
									{site.plaque && (
										<span className="w-1.5 h-1.5 rounded-full bg-amber-950 block" />
									)}
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Tooth Root & Crown Visual Depth Gauge */}
			<div className="w-full my-1 flex items-center justify-center">
				<PerioToothVisual
					toothNumber={tooth.toothNumber}
					isUpper={isUpper}
					isMissing={isMissing}
					isImplant={isImplant}
					buccalPd={tooth.midBuccal?.probingDepthMm ?? 2}
					lingualPd={tooth.midLingual?.probingDepthMm ?? 2}
				/>
			</div>

			{/* Oral / Lingual / Palatal 3 Sites Row */}
			<div className="grid grid-cols-3 gap-0.5 w-full">
				{lingualSiteKeys.map((sKey) => {
					const site = tooth[sKey] ?? {
						probingDepthMm: 2,
						gingivalMarginMm: 0,
						bleedingOnProbing: false,
						suppuration: false,
						plaque: false,
						calculus: false,
					};
					const isFocused = focusedSiteKey === sKey;
					const pd = site.probingDepthMm ?? 0;

					return (
						<div
							key={sKey}
							onClick={(e) => {
								e.stopPropagation();
								onFocusSite(sKey);
							}}
							className={`flex flex-col items-center justify-center py-1 px-0.5 rounded border transition-all ${
								isFocused
									? "ring-2 ring-teal-400 bg-teal-500/25 border-teal-400 shadow-xs"
									: probingDepthClasses(pd)
							}`}
						>
							<span className="font-mono text-[10px] font-black leading-none">
								{pd}
							</span>

							{/* 1-Click BOP & Plaque Interactive Toggles */}
							<div className="flex items-center gap-1 mt-0.5">
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onToggleBop(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.bleedingOnProbing
											? "bg-rose-500 border-rose-300 text-white shadow-xs ring-1 ring-rose-300"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-rose-500/50 hover:border-rose-400"
									}`}
									title={
										site.bleedingOnProbing
											? "BOP: Кровоточивость есть (клик для снятия)"
											: "BOP: Кровоточивости нет (клик для отметки)"
									}
									aria-label="BOP"
								>
									{site.bleedingOnProbing && (
										<span className="w-1.5 h-1.5 rounded-full bg-white block" />
									)}
								</button>
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onTogglePlaque(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.plaque
											? "bg-amber-400 border-amber-200 text-slate-950 shadow-xs ring-1 ring-amber-200"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-amber-400/50 hover:border-amber-300"
									}`}
									title={
										site.plaque
											? "PLQ: Зубной налет есть (клик для снятия)"
											: "PLQ: Зубного налета нет (клик для отметки)"
									}
									aria-label="PLQ"
								>
									{site.plaque && (
										<span className="w-1.5 h-1.5 rounded-full bg-amber-950 block" />
									)}
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: PERIO TOOTH VISUAL DIAGRAM
// ═════════════════════════════════════════════════════════════════════════════



export { PerioToothCard };
export type { PerioToothCardProps };
