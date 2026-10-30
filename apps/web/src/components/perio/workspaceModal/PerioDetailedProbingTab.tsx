/**
 * PerioDetailedProbingTab.tsx — Вкладка углубленной пародонтограммы (32 зуба, клавиши 1–9)
 * 6 точек зондирования на зуб, подвижность, BOP и цифровая клавиатура 1–9 мм.
 */

import React from "react";
import type { PerioToothRecord } from "@dental/shared";
import { PERIO_SITE_KEYS } from "@dental/shared";
import {
	LOWER_TEETH,
	PERIO_TREATMENT_PRESETS,
	SITES,
	type SiteKey,
	UPPER_TEETH,
} from "../perioCatalogData";
import { showToast } from "../../GlobalToast";

export interface PerioDetailedProbingTabProps {
	readonly teeth: readonly PerioToothRecord[];
	readonly selectedToothNum: number;
	readonly selectedSiteKey: SiteKey;
	readonly onSelectTooth: (num: number) => void;
	readonly onSelectSite: (key: SiteKey) => void;
	readonly onUpdateDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onUpdateMobility: (mobility: 0 | 1 | 2 | 3) => void;
	readonly onApplyPreset: (presetId: string) => void;
}

export const PerioDetailedProbingTab: React.FC<PerioDetailedProbingTabProps> = React.memo(({
	teeth,
	selectedToothNum,
	selectedSiteKey,
	onSelectTooth,
	onSelectSite,
	onUpdateDepth,
	onToggleBop,
	onUpdateMobility,
	onApplyPreset,
}) => {
	const currentTooth = teeth.find((t) => t.toothNumber === selectedToothNum) || teeth[0]!;

	return (
		<div className="flex flex-col gap-3">
			{/* ВЫБОР ЗУБА: ВЧ И НЧ */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 overflow-x-auto">
				{[UPPER_TEETH, LOWER_TEETH].map((row, rIdx) => (
					<div key={rIdx} className="flex items-center gap-1 min-w-max pb-1">
						<span className="text-[11px] font-bold text-[var(--muted)] w-8">
							{rIdx === 0 ? "ВЧ:" : "НЧ:"}
						</span>
						{row.map((num) => {
							const t = teeth.find((item) => item.toothNumber === num);
							const isSelected = selectedToothNum === num;
							const hasBop = PERIO_SITE_KEYS.some((k) => t?.[k]?.bleedingOnProbing);
							const maxD = Math.max(...PERIO_SITE_KEYS.map((k) => t?.[k]?.probingDepthMm || 2));
							return (
								<button
									key={num}
									type="button"
									onClick={() => onSelectTooth(num)}
									disabled={false}
									data-testid={`perio-tooth-btn-${num}`}
									className={`min-h-[44px] min-w-[44px] w-9 h-11 rounded-lg text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${
										isSelected
											? "bg-[#0d9488] text-white border-[#0f766e] ring-2 ring-[#0d9488]/40"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
								>
									<span>{num}</span>
									<span
										className={`text-[10px] ${
											maxD >= 4
												? isSelected
													? "text-amber-200"
													: "text-amber-600 dark:text-amber-400"
												: "opacity-70"
										}`}
									>
										{maxD}мм{hasBop ? "•" : ""}
									</span>
								</button>
							);
						})}
					</div>
				))}
			</div>

			{/* ДЕТАЛИЗАЦИЯ 6 ТОЧЕК ЗУБА И ЦИФРОВОЙ БЛОК */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="font-bold text-sm text-[var(--ink)]">
							Зуб #{selectedToothNum} — 6 точек зондирования
						</span>
						<div className="flex items-center gap-1">
							<span className="text-xs text-[var(--muted)]">Подвижность:</span>
							{([0, 1, 2, 3] as const).map((lvl) => (
								<button
									key={lvl}
									type="button"
									onClick={() => onUpdateMobility(lvl)}
									disabled={false}
									className={`min-h-[44px] min-w-[44px] h-7 px-2 rounded text-xs font-bold border ${
										currentTooth?.mobility === lvl
											? "bg-[#0d9488] text-white border-[#0f766e]"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
								>
									{lvl}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{SITES.map((site) => {
							const isCurrentSite = selectedSiteKey === site.key;
							const data = currentTooth?.[site.key] || { probingDepthMm: 2, bleedingOnProbing: false };
							return (
								<button
									key={site.key}
									type="button"
									onClick={() => onSelectSite(site.key)}
									disabled={false}
									className={`min-h-[44px] p-2.5 rounded-xl flex flex-col items-start gap-1 text-left border cursor-pointer transition-all ${
										isCurrentSite
											? "bg-[#0d9488]/15 border-[#0d9488] text-[var(--ink)]"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
									}`}
								>
									<div className="flex items-center justify-between w-full">
										<span className="text-xs font-bold">
											{site.short} ({site.label})
										</span>
										{data.bleedingOnProbing && (
											<span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
										)}
									</div>
									<div className="text-sm font-bold text-[#0d9488]">
										{data.probingDepthMm || 2} мм
									</div>
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--muted)]">
							Ввод глубины:{" "}
							<span className="text-[#0d9488]">
								{SITES.find((s) => s.key === selectedSiteKey)?.label}
							</span>
						</span>
						<button
							type="button"
							onClick={onToggleBop}
							disabled={false}
							className={`min-h-[44px] min-w-[44px] px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 border cursor-pointer transition-all ${
								currentTooth?.[selectedSiteKey]?.bleedingOnProbing
									? "bg-rose-500 text-white border-rose-600"
									: "bg-[var(--paper)] text-rose-600 dark:text-rose-400 border-[var(--line)]"
							}`}
						>
							BOP (Кровоточивость)
						</button>
					</div>

					<div className="grid grid-cols-3 gap-1.5">
						{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
							<button
								key={val}
								type="button"
								onClick={() => onUpdateDepth(val)}
								disabled={false}
								className={`min-h-[44px] min-w-[44px] h-12 rounded-xl text-base font-bold flex items-center justify-center cursor-pointer transition-all border ${
									val >= 6
										? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
										: val >= 4
											? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
											: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
								}`}
							>
								{val} мм
							</button>
						))}
					</div>
				</div>
			</div>

			{/* ПАРОДОНТОЛОГИЧЕСКАЯ ОБРАБОТКА */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center gap-2">
				<span className="text-xs font-bold text-[var(--ink)] mr-1">
					Пародонтологическая обработка:
				</span>
				{PERIO_TREATMENT_PRESETS.filter((p) => p.category === "perio" || p.category === "surgery").map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => {
							if (preset.id === "gracey_curettage") {
								onApplyPreset("periodontitis_moderate_express");
							} else {
								showToast(`Назначена процедура: ${preset.titleRu}`, "success");
							}
						}}
						disabled={false}
						className="min-h-[44px] px-3 py-1.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] hover:border-[#0d9488] font-semibold text-xs border border-[var(--line)] cursor-pointer transition-all"
					>
						{preset.titleRu}
					</button>
				))}
			</div>
		</div>
	);
});

PerioDetailedProbingTab.displayName = "PerioDetailedProbingTab";
