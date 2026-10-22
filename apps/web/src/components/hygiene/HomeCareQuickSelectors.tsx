/**
 * HomeCareQuickSelectors.tsx — 1-кликовый подбор зубных щеток Curaprox и ершиков CPS.
 */

import React from "react";
import { showToast } from "../GlobalToast";
import type { HygieneHomeCareRecommendations } from "./homeCarePresets";

export interface HomeCareQuickSelectorsProps {
	readonly activePreset: "standard" | "ortho" | "perio";
	readonly onSelectPreset: (preset: "standard" | "ortho" | "perio") => void;
	readonly onUpdateCare: (
		updater: (
			prev: HygieneHomeCareRecommendations,
		) => HygieneHomeCareRecommendations,
	) => void;
}

export const HomeCareQuickSelectors: React.FC<HomeCareQuickSelectorsProps> = ({
	activePreset,
	onSelectPreset,
	onUpdateCare,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">
					Пресеты под диагноз:
				</span>
				<button
					type="button"
					onClick={() => onSelectPreset("standard")}
					className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation truncate ${
						activePreset === "standard"
							? "primary-button bg-teal-600 text-white font-bold shadow-2xs"
							: "secondary-button bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]/50"
					}`}
					data-testid="homecare-preset-standard-btn"
				>
					✓ Стандарт (Curaprox 5460 + ершики)
				</button>

				<button
					type="button"
					onClick={() => onSelectPreset("ortho")}
					className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation truncate ${
						activePreset === "ortho"
							? "primary-button bg-teal-600 text-white font-bold shadow-2xs"
							: "secondary-button bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]/50"
					}`}
					data-testid="homecare-preset-ortho-btn"
				>
					Брекеты / Ретейнеры / Скученность
				</button>

				<button
					type="button"
					onClick={() => onSelectPreset("perio")}
					className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation truncate ${
						activePreset === "perio"
							? "primary-button bg-teal-600 text-white font-bold shadow-2xs"
							: "secondary-button bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]/50"
					}`}
					data-testid="homecare-preset-perio-btn"
				>
					Пародонтит / Кровоточивость (Velvet + Perio)
				</button>
			</div>

			{/* 1-клик быстрый подбор щетки Curaprox и ершиков */}
			<div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--line)]/50 text-[11px]">
				<span className="font-bold text-[var(--muted)] shrink-0">Щетка:</span>
				<button
					type="button"
					onClick={() => {
						onUpdateCare((prev) => ({
							...prev,
							toothbrush:
								"Зубная щетка Curaprox Soft 1560 (1560 щетинок Curen толщиной 0.15 мм для адаптации после жестких щеток)",
						}));
						showToast("Выбрана щетка Curaprox Soft 1560", "info", 1500);
					}}
					className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
				>
					1560 Soft
				</button>
				<button
					type="button"
					onClick={() => {
						onUpdateCare((prev) => ({
							...prev,
							toothbrush:
								"Зубная щетка Curaprox Ultra Soft 5460 (5460 ультратонких щетинок Curen 0.1 мм, бережная атравматичная чистка)",
						}));
						showToast("Выбрана щетка Curaprox Ultra Soft 5460", "info", 1500);
					}}
					className="secondary-button px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 hover:bg-teal-500/30 text-teal-800 dark:text-teal-300 border border-teal-500/30 cursor-pointer"
				>
					★ 5460 Ultra Soft
				</button>
				<button
					type="button"
					onClick={() => {
						onUpdateCare((prev) => ({
							...prev,
							toothbrush:
								"Зубная щетка Curaprox Velvet 12460 (12460 бархатных щетинок Curen 0.08 мм, максимум нежности при гиперчувствительности)",
						}));
						showToast("Выбрана щетка Curaprox Velvet 12460", "info", 1500);
					}}
					className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
				>
					12460 Velvet
				</button>

				<span className="font-bold text-[var(--muted)] shrink-0 ml-2">Ёршики:</span>
				<button
					type="button"
					onClick={() => {
						onUpdateCare((prev) => ({
							...prev,
							interdentalBrushes:
								"Межзубные ёршики Curaprox CPS 06 Prime (стержень 0.6 мм, щетина 2.2 мм — узкие межзубные промежутки фронта)",
						}));
						showToast("Выбран калибр Curaprox CPS 06", "info", 1500);
					}}
					className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
				>
					CPS 06 (0.6 мм)
				</button>
				<button
					type="button"
					onClick={() => {
						onUpdateCare((prev) => ({
							...prev,
							interdentalBrushes:
								"Межзубные ёршики Curaprox CPS 07 Prime (стержень 0.7 мм, щетина 2.5 мм — стандартные промежутки премоляров)",
						}));
						showToast("Выбран калибр Curaprox CPS 07", "info", 1500);
					}}
					className="secondary-button px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 hover:bg-teal-500/30 text-teal-800 dark:text-teal-300 border border-teal-500/30 cursor-pointer"
				>
					★ CPS 07 (0.7 мм)
				</button>
				<button
					type="button"
					onClick={() => {
						onUpdateCare((prev) => ({
							...prev,
							interdentalBrushes:
								"Межзубные ёршики Curaprox CPS 08 Prime (стержень 0.8 мм, щетина 3.2 мм — широкие промежутки моляров)",
						}));
						showToast("Выбран калибр Curaprox CPS 08", "info", 1500);
					}}
					className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
				>
					CPS 08 (0.8 мм)
				</button>
			</div>
		</div>
	);
};
