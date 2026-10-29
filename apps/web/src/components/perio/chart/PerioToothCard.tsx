/**
 * PerioToothCard.tsx — Карточка зуба с 6 точками зондирования, BOP/PLQ маркерами и SVG-схемой.
 * Архитектурный слой: SSOT-компонент (Мандат 8b: Sweet Spot ~220 строк против микро-шредера).
 */

import React from "react";
import {
	FURCATION_GRADES,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	calculateClinicalAttachmentLevel,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import { probingDepthClinicalClasses } from "../perioHeatmap";
import { PerioToothVisual } from "./PerioToothVisual";

export const SITE_SHORT_RU: Record<PerioSiteKey, string> = {
	distoBuccal: "ДВ",
	midBuccal: "В",
	mesioBuccal: "МВ",
	distoLingual: "ДО",
	midLingual: "О",
	mesioLingual: "МО",
};

export interface PerioToothCardHeaderProps {
	readonly tooth: PerioToothRecord;
	readonly isSelected: boolean;
	readonly isMissing: boolean;
	readonly isImplant: boolean;
	readonly readOnly: boolean;
	readonly onCycleMobility?: (() => void) | undefined;
	readonly onCycleFurcation?: (() => void) | undefined;
}

export const PerioToothCardHeader: React.FC<PerioToothCardHeaderProps> = React.memo(({
	tooth,
	isSelected,
	isMissing,
	isImplant,
	readOnly,
	onCycleMobility,
	onCycleFurcation,
}) => {
	return (
		<div className="w-full flex items-center justify-between text-[10px] font-bold px-0.5 mb-0.5 min-w-0">
			<span className={`truncate ${isSelected ? "text-teal-300 font-black scale-105" : "text-[var(--ink)]"}`}>
				{tooth.toothNumber}
			</span>
			<div className="flex items-center gap-0.5 shrink-0">
				{isImplant && (
					<span className="text-[8px] font-bold text-amber-400 font-mono px-0.5 rounded bg-amber-500/10 border border-amber-500/30" title="Дентальный имплантат">
						ИМП
					</span>
				)}
				{!isMissing && onCycleMobility && (
					<button
						type="button"
						aria-disabled={readOnly}
						onClick={(e) => { e.stopPropagation(); if (!readOnly) onCycleMobility(); }}
						className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
							tooth.mobility === 0
								? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-amber-500/20 hover:text-amber-300"
								: tooth.mobility === 1
									? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
									: tooth.mobility === 2
										? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
										: "bg-rose-500/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black animate-pulse"
						}`}
						title={`Подвижность Miller: ${MOBILITY_GRADES[tooth.mobility]?.nameRu ?? "0"}`}
						data-testid={`tooth-${tooth.toothNumber}-mobility`}
					>
						M{tooth.mobility}
					</button>
				)}
				{!isMissing && isFurcationEligibleTooth(tooth.toothNumber) && onCycleFurcation && (
					<button
						type="button"
						aria-disabled={readOnly}
						onClick={(e) => { e.stopPropagation(); if (!readOnly) onCycleFurcation(); }}
						className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
							tooth.furcation === 0
								? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-rose-500/20 hover:text-rose-300"
								: tooth.furcation === 1
									? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
									: tooth.furcation === 2
										? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
										: "bg-rose-600/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black"
						}`}
						title={`Фуркация Hamp: ${FURCATION_GRADES[tooth.furcation]?.nameRu ?? "0"}`}
						data-testid={`tooth-${tooth.toothNumber}-furcation`}
					>
						F{tooth.furcation}
					</button>
				)}
			</div>
		</div>
	);
});
PerioToothCardHeader.displayName = "PerioToothCardHeader";

export interface PerioToothCardSitesRowProps {
	readonly tooth: PerioToothRecord;
	readonly siteKeys: readonly PerioSiteKey[];
	readonly focusedSiteKey: PerioSiteKey | null;
	readonly readOnly: boolean;
	readonly onFocusSite: (siteKey: PerioSiteKey) => void;
	readonly onToggleBop: (siteKey: PerioSiteKey) => void;
	readonly onTogglePlaque: (siteKey: PerioSiteKey) => void;
}

export const PerioToothCardSitesRow: React.FC<PerioToothCardSitesRowProps> = React.memo(({
	tooth,
	siteKeys,
	focusedSiteKey,
	readOnly,
	onFocusSite,
	onToggleBop,
	onTogglePlaque,
}) => {
	return (
		<div className="grid grid-cols-3 gap-0.5 w-full">
			{siteKeys.map((sKey) => {
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
						onClick={(e) => { e.stopPropagation(); onFocusSite(sKey); }}
						className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded border transition-all ${
							isFocused ? "ring-2 ring-teal-400 bg-teal-500/25 border-teal-400 shadow-xs" : probingDepthClinicalClasses(pd)
						}`}
						title={`${SITE_SHORT_RU[sKey]}: карман ${pd} мм, CAL ${calculateClinicalAttachmentLevel(pd, site.gingivalMarginMm ?? 0)} мм`}
					>
						<span className="text-[7px] font-mono text-[var(--muted)] font-semibold leading-none select-none">{SITE_SHORT_RU[sKey]}</span>
						<span className="font-mono text-[10px] font-black leading-none mt-0.5">{pd}</span>
						<div className="flex items-center gap-1 mt-0.5">
							<button
								type="button"
								aria-disabled={readOnly}
								onClick={(e) => { e.stopPropagation(); if (!readOnly) onToggleBop(sKey); }}
								className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
									site.bleedingOnProbing
										? "bg-rose-500 border-rose-300 text-white shadow-xs ring-1 ring-rose-300"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-rose-500/50 hover:border-rose-400"
								}`}
								title="BOP"
								aria-label="BOP"
							>
								{site.bleedingOnProbing && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
							</button>
							<button
								type="button"
								aria-disabled={readOnly}
								onClick={(e) => { e.stopPropagation(); if (!readOnly) onTogglePlaque(sKey); }}
								className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
									site.plaque
										? "bg-amber-400 border-amber-200 text-slate-950 shadow-xs ring-1 ring-amber-200"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-amber-400/50 hover:border-amber-300"
								}`}
								title="PLQ"
								aria-label="PLQ"
							>
								{site.plaque && <span className="w-1.5 h-1.5 rounded-full bg-amber-950 block" />}
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
});
PerioToothCardSitesRow.displayName = "PerioToothCardSitesRow";

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

const BUCCAL_KEYS: readonly PerioSiteKey[] = ["mesioBuccal", "midBuccal", "distoBuccal"];
const LINGUAL_KEYS: readonly PerioSiteKey[] = ["mesioLingual", "midLingual", "distoLingual"];

export const PerioToothCard: React.FC<PerioToothCardProps> = React.memo(({
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
}) => {
	const isMissing = Boolean(tooth.isMissing);
	const isImplant = Boolean(tooth.isImplant);
	const toothName = getToothFolkAndAnatomicalNameRu(tooth.toothNumber);

	return (
		<div
			onClick={onSelectTooth}
			className={`flex flex-col items-center p-1 rounded-xl transition-all select-none border cursor-pointer relative group ${
				isSelected
					? "bg-teal-500/15 border-teal-400 ring-2 ring-teal-400/40 shadow-sm"
					: isMissing
						? "bg-[var(--paper-soft)]/30 border-[var(--line)] opacity-40 hover:opacity-75"
						: isImplant
							? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/50 hover:bg-[var(--paper-soft)]"
			}`}
			title={`Зуб ${tooth.toothNumber} (${toothName})`}
			data-testid={`perio-tooth-card-${tooth.toothNumber}`}
		>
			<PerioToothCardHeader
				tooth={tooth}
				isSelected={isSelected}
				isMissing={isMissing}
				isImplant={isImplant}
				readOnly={readOnly}
				onCycleMobility={onCycleMobility}
				onCycleFurcation={onCycleFurcation}
			/>

			<PerioToothCardSitesRow
				tooth={tooth}
				siteKeys={BUCCAL_KEYS}
				focusedSiteKey={focusedSiteKey}
				readOnly={readOnly}
				onFocusSite={onFocusSite}
				onToggleBop={onToggleBop}
				onTogglePlaque={onTogglePlaque}
			/>

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

			<PerioToothCardSitesRow
				tooth={tooth}
				siteKeys={LINGUAL_KEYS}
				focusedSiteKey={focusedSiteKey}
				readOnly={readOnly}
				onFocusSite={onFocusSite}
				onToggleBop={onToggleBop}
				onTogglePlaque={onTogglePlaque}
			/>
		</div>
	);
});

PerioToothCard.displayName = "PerioToothCard";
