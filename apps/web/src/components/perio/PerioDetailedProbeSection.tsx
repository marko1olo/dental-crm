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
	const activeSite = activeTooth?.[selectedSiteKey];
	const activeSiteBop = Boolean(activeSite?.bleedingOnProbing);
	const activeSitePlaque = Boolean(activeSite?.plaque);

	return (
		<div className="border-t border-[var(--line)] pt-2">
			<button
				type="button"
				onClick={onToggleDetailedExpanded}
				data-testid="psr-toggle-detailed-btn"
				className="w-full min-h-[44px] sm:min-h-[36px] flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--paper-soft)] text-left text-xs font-bold text-[var(--ink)] hover:text-[var(--teal,#0d9488)] cursor-pointer transition-colors"
			>
				<span>Углубленная карта зондирования (по требованию врача)</span>
				{isDetailedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
			</button>

			{isDetailedExpanded && (
				<div className="mt-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-2 sm:gap-1.5 overflow-x-auto pb-1">
						{teeth.map((t) => (
							<button
								key={t.toothNumber}
								type="button"
								onClick={() => onSelectToothNum(t.toothNumber)}
								data-testid={`perio-tooth-btn-${t.toothNumber}`}
								className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-1.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border ${selectedToothNum === t.toothNumber ? "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] ring-1 ring-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"}`}
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
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-[11px] text-[var(--muted)] font-medium">Подвижность:</span>
								{([0, 1, 2, 3] as const).map((m) => {
									const activeMob = (activeTooth?.mobility ?? 0) === m;
									return (
										<button
											key={m}
											type="button"
											onClick={() => onUpdateMobility(m)}
											className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border flex items-center justify-center ${activeMob ? "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] ring-1 ring-[var(--teal,#0d9488)]" : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"}`}
										>
											{m === 0 ? "0" : m === 1 ? "I" : m === 2 ? "II" : "III"}
										</button>
									);
								})}
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2 pt-1">
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
										className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1 rounded-lg text-xs cursor-pointer border flex items-center justify-center gap-1 ${selectedSiteKey === site.key ? "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}
									>
										<span>{site.short}</span>
										<span className={`font-bold ${depth >= 4 ? "text-rose-600 dark:text-rose-400" : "text-[var(--ink)]"}`}>{depth}</span>
										{isBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
										{isPlaque && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
									</button>
								);
							})}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
							<div className="flex flex-wrap items-center gap-2 sm:gap-1.5">
								{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
									<button
										key={d}
										type="button"
										onClick={() => onUpdateDepth(d)}
										className="touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)] cursor-pointer flex items-center justify-center"
									>
										{d}
									</button>
								))}
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={onToggleBop}
									aria-pressed={activeSiteBop}
									className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center border transition-colors ${activeSiteBop ? "bg-rose-500/25 text-rose-700 dark:text-rose-200 border-rose-500 ring-1 ring-rose-500" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"}`}
								>
									BOP+
								</button>
								<button
									type="button"
									onClick={onTogglePlaque}
									aria-pressed={activeSitePlaque}
									className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center border transition-colors ${activeSitePlaque ? "bg-amber-500/25 text-amber-800 dark:text-amber-200 border-amber-500 ring-1 ring-amber-500" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"}`}
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
