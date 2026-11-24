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
	readonly onUpdateFurcation?: ((furcation: 0 | 1 | 2 | 3) => void) | undefined;
	readonly onUpdateDepth: (depth: number) => void;
	readonly onUpdateGingivalMargin?: ((gm: number) => void) | undefined;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration?: (() => void) | undefined;
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
	onUpdateFurcation,
	onUpdateDepth,
	onUpdateGingivalMargin,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
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
	const activeSiteSuppuration = Boolean(activeSite?.suppuration);
	const activeSiteGm = activeSite?.gingivalMarginMm ?? 0;
	const activeSiteDepth = activeSite?.probingDepthMm ?? 2;
	const activeSiteCal = activeSite?.calMm ?? Math.max(0, activeSiteDepth + activeSiteGm);
	const isMolar = [18, 17, 16, 26, 27, 28, 38, 37, 36, 46, 47, 48].includes(selectedToothNum);

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
					const isMissing = Boolean(t?.isMissing);
					const { maxDepth, hasBop, hasPlaque, mobility, tone } = getToothSummary(t);
					const toneBadge = getToneBadgeClass(tone, maxDepth);

					return (
						<button
							key={num}
							type="button"
							onClick={() => onSelectToothNum(num)}
							data-testid={`perio-tooth-btn-${num}`}
							title={isMissing ? `Зуб #${num} удален. Зондирование заблокировано` : `Зуб #${num}: макс. карман ${maxDepth || 2} мм${hasBop ? ", кровоточивость BOP+" : ""}${mobility ? `, подвижность ${mobility}` : ""}`}
							className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[38px] px-1 py-1 rounded-xl text-center flex flex-col items-center justify-between cursor-pointer transition-all border ${
								isMissing
									? "opacity-50 bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)]"
									: isSelected
										? "bg-[var(--primary)]/15 border-[var(--primary)] ring-1 ring-[var(--primary)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className={`text-[11px] font-bold ${isMissing ? "text-[var(--muted)] line-through" : isSelected ? "text-[var(--primary)]" : "text-[var(--ink)]"}`}>
								{num}
							</span>
							<div className="flex items-center gap-0.5 mt-0.5">
								{isMissing ? (
									<span className="text-[10px] text-[var(--muted)]">уд.</span>
								) : (
									<>
										<span className={`text-[10px] px-1 py-0.5 rounded ${toneBadge}`}>
											{maxDepth || 2}
										</span>
										{hasBop && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#e11d48)] shrink-0" title="BOP+" />}
										{hasPlaque && !hasBop && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning,#f59e0b)] shrink-0" title="Налёт" />}
									</>
								)}
							</div>
							{!isMissing && mobility > 0 && (
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
				className="w-full min-h-[44px] sm:min-h-[36px] flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--paper-soft)] text-left text-xs font-bold text-[var(--ink)] hover:text-[var(--primary)] cursor-pointer transition-colors"
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
											disabled={Boolean(activeTooth?.isMissing)}
											onClick={() => onUpdateMobility(m)}
											className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
												activeMob
													? "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)] ring-1 ring-[var(--primary)]"
													: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
											}`}
										>
											{m === 0 ? "0" : m === 1 ? "I" : m === 2 ? "II" : "III"}
										</button>
									);
								})}
								{isMolar && (
									<div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--line)]">
										<span className="text-[11px] text-[var(--muted)] font-medium">Фуркация:</span>
										{([0, 1, 2, 3] as const).map((f) => {
											const activeFurc = (activeTooth?.furcation ?? 0) === f;
											return (
												<button
													key={f}
													type="button"
													disabled={Boolean(activeTooth?.isMissing)}
													onClick={() => onUpdateFurcation?.(f)}
													className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
														activeFurc
															? "bg-[var(--danger,#e11d48)]/15 text-[var(--danger,#e11d48)] border-[var(--danger,#e11d48)] ring-1 ring-[var(--danger,#e11d48)]"
															: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
													}`}
												>
													{f === 0 ? "0" : f === 1 ? "I" : f === 2 ? "II" : "III"}
												</button>
											);
										})}
									</div>
								)}
							</div>
						</div>

						{activeTooth?.isMissing && (
							<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] flex items-center justify-between">
								<span className="font-medium">Зуб #{selectedToothNum} удален. Зондирование заблокировано.</span>
								<span className="text-[10px] font-bold text-[var(--muted)]">Отсутствует</span>
							</div>
						)}

						{/* 6 точек зуба */}
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 pt-1">
							{SITES.map((site) => {
								const siteData = activeTooth?.[site.key];
								const depth = siteData?.probingDepthMm ?? 2;
								const isBop = Boolean(siteData?.bleedingOnProbing);
								const isPlaque = Boolean(siteData?.plaque);
								const isSupp = Boolean(siteData?.suppuration);
								const gm = siteData?.gingivalMarginMm ?? 0;
								const cal = siteData?.calMm ?? Math.max(0, depth + gm);
								const isSelectedSite = selectedSiteKey === site.key;
								const tone = probingDepthTone(depth, "clinical");
								const toneBadge = getToneBadgeClass(tone, depth);

								return (
									<button
										key={site.key}
										type="button"
										disabled={Boolean(activeTooth?.isMissing)}
										onClick={() => onSelectSiteKey(site.key)}
										title={activeTooth?.isMissing ? `Зуб #${selectedToothNum} удален` : `${site.label}: глубина ${depth} мм, рецессия ${gm} мм, CAL ${cal} мм${isBop ? ", BOP+" : ""}${isSupp ? ", нагноение" : ""}`}
										className={`touch-manipulation min-h-[44px] sm:min-h-[38px] px-2 py-1.5 rounded-xl text-xs cursor-pointer border flex items-center justify-between gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
											isSelectedSite
												? "bg-[var(--primary)]/15 text-[var(--primary)] font-bold border-[var(--primary)] ring-1 ring-[var(--primary)]"
												: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
										}`}
									>
										<span className="font-semibold text-[11px] truncate">{site.short}</span>
										<div className="flex items-center gap-1 shrink-0">
											<span className={`text-[11px] px-1 py-0.5 rounded ${toneBadge}`}>{depth}</span>
											{isBop && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#e11d48)] shrink-0" title="BOP+" />}
											{isSupp && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning,#f59e0b)] shrink-0" title="Гной+" />}
											{isPlaque && !isBop && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning,#f59e0b)] shrink-0" title="Налёт" />}
										</div>
									</button>
								);
							})}
						</div>

						{/* Цифровой ввод глубин (0..15 мм) и маркеры патологии */}
						<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
							<div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
								<span className="text-[11px] text-[var(--muted)] font-medium mr-1">Глубина (PD):</span>
								{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((d) => (
									<button
										key={d}
										type="button"
										disabled={Boolean(activeTooth?.isMissing)}
										onClick={() => onUpdateDepth(d)}
										className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[32px] px-1 rounded-lg text-xs font-bold border cursor-pointer flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
											(activeSite?.probingDepthMm ?? 2) === d
												? "bg-[var(--primary)] text-white border-[var(--primary)]"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{d}
									</button>
								))}
							</div>
							<div className="flex flex-wrap items-center gap-1.5 shrink-0">
								<button
									type="button"
									disabled={Boolean(activeTooth?.isMissing)}
									onClick={onToggleBop}
									aria-pressed={activeSiteBop}
									className={`touch-manipulation min-h-[44px] sm:min-h-[36px] px-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
										activeSiteBop
											? "bg-[var(--danger-soft,rgba(225,29,72,0.15))] text-[var(--danger,#e11d48)] border-[var(--danger,#e11d48)] ring-1 ring-[var(--danger,#e11d48)]"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"
									}`}
								>
									{activeSiteBop ? "✓ Кровоточивость (BOP+)" : "BOP+"}
								</button>
								<button
									type="button"
									disabled={Boolean(activeTooth?.isMissing)}
									onClick={onTogglePlaque}
									aria-pressed={activeSitePlaque}
									className={`touch-manipulation min-h-[44px] sm:min-h-[36px] px-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
										activeSitePlaque
											? "bg-[var(--warning-soft,rgba(245,158,11,0.15))] text-[var(--warning,#f59e0b)] border-[var(--warning,#f59e0b)] ring-1 ring-[var(--warning,#f59e0b)]"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"
									}`}
								>
									{activeSitePlaque ? "✓ Налёт+" : "Налёт+"}
								</button>
								<button
									type="button"
									disabled={Boolean(activeTooth?.isMissing)}
									onClick={onToggleSuppuration}
									aria-pressed={activeSiteSuppuration}
									className={`touch-manipulation min-h-[44px] sm:min-h-[36px] px-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
										activeSiteSuppuration
											? "bg-[var(--danger-soft,rgba(225,29,72,0.15))] text-[var(--danger,#e11d48)] border-[var(--danger,#e11d48)] ring-1 ring-[var(--danger,#e11d48)]"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--danger,#e11d48)]"
									}`}
								>
									{activeSiteSuppuration ? "✓ Гной+" : "Гной+"}
								</button>
							</div>
						</div>

						{/* Ввод рецессии десны (GM: -3..+8 мм) и расчет CAL = PD + GM */}
						<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
							<div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
								<span className="text-[11px] text-[var(--muted)] font-medium mr-1">Рецессия (GM):</span>
								{[-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((gm) => (
									<button
										key={gm}
										type="button"
										disabled={Boolean(activeTooth?.isMissing)}
										onClick={() => onUpdateGingivalMargin?.(gm)}
										className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[32px] px-1 rounded-lg text-xs font-bold border cursor-pointer flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
											activeSiteGm === gm
												? "bg-[var(--warning,#f59e0b)] text-white border-[var(--warning,#f59e0b)]"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--warning,#f59e0b)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{gm > 0 ? `+${gm}` : gm}
									</button>
								))}
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<span className="text-[11px] font-semibold text-[var(--muted)]">CAL (PD+GM):</span>
								<span className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold ${activeSiteCal >= 5 ? "bg-[var(--danger-soft,rgba(225,29,72,0.15))] text-[var(--danger,#e11d48)] border border-[var(--danger,#e11d48)]/30" : "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"}`}>
									{activeSiteCal} мм
								</span>
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
