/**
 * PerioDetailedProbeSection.tsx — Раскрываемая секция углубленного зондирования пародонтограммы.
 * Анатомическая карта челюстей (Full Mouth Charting: ВЧ 18–28 / НЧ 48–38).
 * Подключение шкалы глубин perioHeatmap, дизайн-токены Мандата 8am, Apple HIG.
 * Норматив размера: 200–350 строк (Sweet Spot, Мандат 8b).
 */

import React, { useMemo } from "react";
import type { PerioToothRecord } from "@dental/shared";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
	UPPER_TEETH,
	LOWER_TEETH,
	SITES,
	type SiteKey,
	probingDepthTone,
	type HeatmapTone,
} from "./perioCatalogData";

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

function getToothSummary(tooth: PerioToothRecord | undefined) {
	if (!tooth || tooth.isMissing) {
		return { maxDepth: 0, hasBop: false, hasPlaque: false, mobility: 0, tone: "neutral" as HeatmapTone };
	}
	let maxDepth = 0;
	let hasBop = false;
	let hasPlaque = false;

	for (const s of SITES) {
		const siteData = tooth[s.key];
		const d = siteData?.probingDepthMm ?? 0;
		if (d > maxDepth) maxDepth = d;
		if (siteData?.bleedingOnProbing) hasBop = true;
		if (siteData?.plaque) hasPlaque = true;
	}

	const tone = probingDepthTone(maxDepth, "clinical");
	return { maxDepth, hasBop, hasPlaque, mobility: tooth.mobility ?? 0, tone };
}

function getToneBadgeClass(tone: HeatmapTone, depth: number): string {
	if (depth === 0) return "bg-[var(--paper-soft)] text-[var(--muted)]";
	if (tone === "success") return "bg-[var(--success-soft,rgba(16,185,129,0.15))] text-[var(--success,#10b981)] font-semibold";
	if (tone === "warning-low") return "bg-[var(--warning-soft,rgba(245,158,11,0.15))] text-[var(--warning,#f59e0b)] font-bold";
	if (tone === "warning-high") return "bg-[var(--warning-soft,rgba(245,158,11,0.2))] text-[var(--warning,#d97706)] font-bold";
	return "bg-[var(--danger-soft,rgba(225,29,72,0.15))] text-[var(--danger,#e11d48)] font-black";
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
	const teethByNumber = useMemo(() => {
		const map = new Map<number, PerioToothRecord>();
		for (const t of teeth) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [teeth]);

	const activeTooth = teethByNumber.get(selectedToothNum);
	const activeSite = activeTooth?.[selectedSiteKey];
	const activeSiteBop = Boolean(activeSite?.bleedingOnProbing);
	const activeSitePlaque = Boolean(activeSite?.plaque);

	const renderArchRow = (label: string, toothNumbers: readonly number[], testPrefix: string) => (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)] px-0.5">
				<span>{label}</span>
				<span className="text-[10px] font-normal text-[var(--ink-muted)]">Глубина / BOP</span>
			</div>
			<div className="grid grid-cols-8 sm:grid-cols-16 gap-1 overflow-x-auto pb-0.5">
				{toothNumbers.map((num) => {
					const t = teethByNumber.get(num);
					const isSelected = selectedToothNum === num;
					const { maxDepth, hasBop, hasPlaque, mobility, tone } = getToothSummary(t);
					const toneBadge = getToneBadgeClass(tone, maxDepth);

					return (
						<button
							key={num}
							type="button"
							onClick={() => onSelectToothNum(num)}
							data-testid={`perio-tooth-btn-${num}`}
							title={`Зуб #${num}: макс. карман ${maxDepth || 2} мм${hasBop ? ", кровоточивость BOP+" : ""}${mobility ? `, подвижность ${mobility}` : ""}`}
							className={`touch-manipulation min-h-[44px] min-w-[36px] sm:min-h-[40px] px-1 py-1 rounded-xl text-center flex flex-col items-center justify-between cursor-pointer transition-all border ${
								isSelected
									? "bg-[var(--primary,#0d9488)]/15 border-[var(--primary,#0d9488)] ring-1 ring-[var(--primary,#0d9488)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary,#0d9488)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className={`text-[11px] font-bold ${isSelected ? "text-[var(--primary,#0d9488)]" : "text-[var(--ink)]"}`}>
								{num}
							</span>
							<div className="flex items-center gap-0.5 mt-0.5">
								<span className={`text-[10px] px-1 py-0.2 rounded ${toneBadge}`}>
									{maxDepth || 2}
								</span>
								{hasBop && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#e11d48)] shrink-0" title="BOP+" />}
								{hasPlaque && !hasBop && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning,#f59e0b)] shrink-0" title="Налёт" />}
							</div>
							{mobility > 0 && (
								<span className="text-[9px] font-extrabold text-[var(--danger,#e11d48)] leading-none mt-0.5">
									M:{mobility === 1 ? "I" : mobility === 2 ? "II" : "III"}
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="border-t border-[var(--line)] pt-2">
			<button
				type="button"
				onClick={onToggleDetailedExpanded}
				data-testid="psr-toggle-detailed-btn"
				className="w-full min-h-[44px] sm:min-h-[36px] flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--paper-soft)] text-left text-xs font-bold text-[var(--ink)] hover:text-[var(--primary,#0d9488)] cursor-pointer transition-colors"
			>
				<span>Анатомическая карта зондирования (Full Mouth Charting: ВЧ 18–28 / НЧ 48–38)</span>
				{isDetailedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
			</button>

			{isDetailedExpanded && (
				<div className="mt-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
					{/* Анатомическая дуга челюстей: ВЧ и НЧ */}
					<div className="flex flex-col gap-2.5 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
						{renderArchRow("Верхняя челюсть (ВЧ 18–28)", UPPER_TEETH, "upper")}
						<div className="border-t border-[var(--line-subtle,var(--line))] my-0.5" />
						{renderArchRow("Нижняя челюсть (НЧ 48–38)", LOWER_TEETH, "lower")}
					</div>

					{/* Детальный пульт зондирования активного зуба */}
					<div className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span className="font-bold text-[var(--ink)] text-sm">Зуб #{selectedToothNum}</span>
								<span className="text-[11px] text-[var(--muted)]">
									(1–15: глубина, Пробел: BOP, Стрелки: переход, Tab: след. точка)
								</span>
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
											className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border flex items-center justify-center ${
												activeMob
													? "bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] border-[var(--primary,#0d9488)] ring-1 ring-[var(--primary,#0d9488)]"
													: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
											}`}
										>
											{m === 0 ? "0" : m === 1 ? "I" : m === 2 ? "II" : "III"}
										</button>
									);
								})}
							</div>
						</div>

						{/* 6 точек зуба */}
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 pt-1">
							{SITES.map((site) => {
								const siteData = activeTooth?.[site.key];
								const depth = siteData?.probingDepthMm ?? 2;
								const isBop = Boolean(siteData?.bleedingOnProbing);
								const isPlaque = Boolean(siteData?.plaque);
								const isSelectedSite = selectedSiteKey === site.key;
								const tone = probingDepthTone(depth, "clinical");
								const toneBadge = getToneBadgeClass(tone, depth);

								return (
									<button
										key={site.key}
										type="button"
										onClick={() => onSelectSiteKey(site.key)}
										title={site.label}
										className={`touch-manipulation min-h-[44px] sm:min-h-[38px] px-2 py-1.5 rounded-xl text-xs cursor-pointer border flex items-center justify-between gap-1 transition-all ${
											isSelectedSite
												? "bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] font-bold border-[var(--primary,#0d9488)] ring-1 ring-[var(--primary,#0d9488)]"
												: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
										}`}
									>
										<span className="font-semibold text-[11px] truncate">{site.short}</span>
										<div className="flex items-center gap-1 shrink-0">
											<span className={`text-[11px] px-1 py-0.2 rounded ${toneBadge}`}>{depth}</span>
											{isBop && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#e11d48)] shrink-0" />}
											{isPlaque && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning,#f59e0b)] shrink-0" />}
										</div>
									</button>
								);
							})}
						</div>

						{/* Цифровой ввод глубин (1..15 мм) и маркеры патологии */}
						<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
							<div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
								<span className="text-[11px] text-[var(--muted)] font-medium mr-1">Глубина:</span>
								{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((d) => (
									<button
										key={d}
										type="button"
										onClick={() => onUpdateDepth(d)}
										className={`touch-manipulation min-h-[44px] min-w-[36px] sm:min-h-[36px] sm:min-w-[32px] px-1 rounded-lg text-xs font-bold border cursor-pointer flex items-center justify-center transition-all ${
											(activeSite?.probingDepthMm ?? 2) === d
												? "bg-[var(--primary,#0d9488)] text-white border-[var(--primary,#0d9488)]"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary,#0d9488)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{d}
									</button>
								))}
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<button
									type="button"
									onClick={onToggleBop}
									aria-pressed={activeSiteBop}
									className={`touch-manipulation min-h-[44px] sm:min-h-[36px] px-3 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center border transition-colors ${
										activeSiteBop
											? "bg-[var(--danger-soft,rgba(225,29,72,0.15))] text-[var(--danger,#e11d48)] border-[var(--danger,#e11d48)] ring-1 ring-[var(--danger,#e11d48)]"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary,#0d9488)]"
									}`}
								>
									{activeSiteBop ? "✓ Кровоточивость (BOP+)" : "BOP+"}
								</button>
								<button
									type="button"
									onClick={onTogglePlaque}
									aria-pressed={activeSitePlaque}
									className={`touch-manipulation min-h-[44px] sm:min-h-[36px] px-3 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center border transition-colors ${
										activeSitePlaque
											? "bg-[var(--warning-soft,rgba(245,158,11,0.15))] text-[var(--warning,#f59e0b)] border-[var(--warning,#f59e0b)] ring-1 ring-[var(--warning,#f59e0b)]"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary,#0d9488)]"
									}`}
								>
									{activeSitePlaque ? "✓ Налёт+" : "Налёт+"}
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
export default PerioDetailedProbeSection;
