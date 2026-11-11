/**
 * PerioDetailedProbeSection.tsx — Раскрываемая секция углубленного зондирования пародонтограммы.
 * Вынесено из PerioStudioModal в рамках декомпозиции по Мандату 8b (Sweet Spot 200–300 строк).
 */

import React from "react";
import type { PerioToothRecord } from "@dental/shared";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SITES, type SiteKey } from "./perioCatalogData";

export interface PerioDetailedProbeSectionProps {
	readonly isDetailedExpanded: boolean;
	readonly onToggleDetailedExpanded: () => void;
	readonly teeth: readonly PerioToothRecord[];
	readonly selectedToothNum: number;
	readonly onSelectToothNum: (toothNumber: number) => void;
	readonly selectedSiteKey: SiteKey;
	readonly onSelectSiteKey: (siteKey: SiteKey) => void;
	readonly onUpdateMobility: (mobility: 0 | 1 | 2 | 3) => void;
	readonly onUpdateDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
}

export const PerioDetailedProbeSection: React.FC<PerioDetailedProbeSectionProps> = React.memo(({
	isDetailedExpanded,
	onToggleDetailedExpanded,
	teeth,
	selectedToothNum,
	onSelectToothNum,
	selectedSiteKey,
	onSelectSiteKey,
	onUpdateMobility,
	onUpdateDepth,
	onToggleBop,
	onTogglePlaque,
}) => {
	const activeTooth = teeth.find((t) => t.toothNumber === selectedToothNum);

	return (
		<div className="border-t border-[var(--line)] pt-2">
			<button
				type="button"
				onClick={onToggleDetailedExpanded}
				className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] hover:text-[#0d9488] cursor-pointer transition-colors"
			>
				<span>Углубленная карта зондирования (по требованию врача)</span>
				{isDetailedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
			</button>

			{isDetailedExpanded && (
				<div className="mt-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-1">
						{teeth.map((t) => (
							<button
								key={t.toothNumber}
								type="button"
								onClick={() => onSelectToothNum(t.toothNumber)}
								data-testid={`perio-tooth-btn-${t.toothNumber}`}
								className={`min-h-[32px] min-w-[32px] px-1.5 py-1 rounded text-xs font-bold cursor-pointer transition-all border ${selectedToothNum === t.toothNumber ? "bg-[#0d9488] text-white border-[#0f766e]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[#0d9488]"}`}
							>
								{t.toothNumber}
							</button>
						))}
					</div>

					<div className="flex flex-col gap-2 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span className="font-bold text-[var(--ink)]">Зуб #{selectedToothNum}</span>
								<span className="text-[11px] text-[var(--muted)]">(1–9: ввод глубины, Пробел: BOP)</span>
							</div>
							<div className="flex items-center gap-1">
								<span className="text-[11px] text-[var(--muted)] font-medium">Подвижность:</span>
								{([0, 1, 2, 3] as const).map((m) => {
									const activeMob = (activeTooth?.mobility ?? 0) === m;
									return (
										<button
											key={m}
											type="button"
											onClick={() => onUpdateMobility(m)}
											className={`min-h-[26px] min-w-[26px] px-1.5 rounded text-[11px] font-bold cursor-pointer transition-colors border ${activeMob ? "bg-amber-500 text-white border-amber-600" : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"}`}
										>
											{m === 0 ? "0" : m === 1 ? "I" : m === 2 ? "II" : "III"}
										</button>
									);
								})}
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-1.5 pt-1">
							{SITES.map((site) => {
								const siteData = activeTooth?.[site.key];
								const depth = siteData?.probingDepthMm ?? 2;
								const isBop = Boolean(siteData?.bleedingOnProbing);
								const isPlaque = Boolean(siteData?.plaque);
								return (
									<button
										key={site.key}
										type="button"
										onClick={() => onSelectSiteKey(site.key)}
										title={site.label}
										className={`px-2 py-1 rounded text-xs cursor-pointer border flex items-center gap-1 ${selectedSiteKey === site.key ? "bg-[#0d9488]/15 text-[#0d9488] font-bold border-[#0d9488]" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}
									>
										<span>{site.short}</span>
										<span className={`font-bold ${depth >= 4 ? "text-rose-500" : "text-[var(--ink)]"}`}>{depth}</span>
										{isBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
										{isPlaque && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
									</button>
								);
							})}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
							<div className="flex items-center gap-1">
								{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
									<button
										key={d}
										type="button"
										onClick={() => onUpdateDepth(d)}
										className="w-7 h-7 rounded text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[#0d9488] cursor-pointer"
									>
										{d}
									</button>
								))}
							</div>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={onToggleBop}
									className="px-2.5 h-7 rounded text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 cursor-pointer"
								>
									BOP+
								</button>
								<button
									type="button"
									onClick={onTogglePlaque}
									className="px-2.5 h-7 rounded text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 cursor-pointer"
								>
									Налёт+
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

PerioDetailedProbeSection.displayName = "PerioDetailedProbeSection";
