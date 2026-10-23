/**
 * PerioToolbarPresets.tsx — Клинические пресеты тулбара (1-клик норма, гигиена, гингивит).
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { Droplets, RotateCcw, ShieldCheck } from "lucide-react";
import React from "react";
import { UltrasonicScaler } from "../../icons/DentalIcons";
import type { PerioExpressPresetId } from "../perioMath";

export interface PerioToolbarPresetsProps {
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onSetAllIntact: () => void;
	readonly onMarkBopOnDeepPockets: () => void;
	readonly onClearPlaque: () => void;
}

export const PerioToolbarPresets: React.FC<PerioToolbarPresetsProps> = React.memo(({
	onApplyExpressPreset,
	onSetAllIntact,
	onMarkBopOnDeepPockets,
	onClearPlaque,
}) => {
	return (
		<>
			{/* 1-клик Физиологическая норма */}
			<button
				type="button"
				onClick={() => onApplyExpressPreset("perio_norm_express")}
				className="secondary-button shrink-0 font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 !h-9 !min-h-[44px] !min-w-[44px]"
				title="Вся десна здорова (Норма) • Пародонт интактен (глубина 1–2 мм, кровоточивость 0%)"
				data-testid="perio-toolbar-norm-1click-btn"
			>
				<ShieldCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
				<span>1-клик: Здоровый пародонт (Норма)</span>
			</button>

			{/* Профгигиена */}
			<button
				type="button"
				onClick={() => onApplyExpressPreset("pro_hygiene_express")}
				className="secondary-button shrink-0 !h-9 !min-h-[36px]"
				title="Профессиональная гигиена полости рта"
				data-testid="perio-toolbar-prophy-1click-btn"
			>
				<UltrasonicScaler size={15} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
				<span>Профгигиена</span>
			</button>

			{/* Гингивит */}
			<button
				type="button"
				onClick={() => onApplyExpressPreset("gingivitis_express")}
				className="secondary-button shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 !h-9 !min-h-[36px]"
				data-testid="perio-toolbar-gingivitis-btn"
			>
				<span>Гингивит (BOP+)</span>
			</button>

			{/* Тяжелый пародонтит */}
			<button
				type="button"
				onClick={() => onApplyExpressPreset("periodontitis_severe_express")}
				className="secondary-button shrink-0 border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 !h-9 !min-h-[36px]"
				data-testid="perio-preset-severe-btn"
			>
				<span>Пародонтит тяжелый (6-8 мм)</span>
			</button>

			{/* Интактно */}
			<button
				type="button"
				onClick={onSetAllIntact}
				className="secondary-button shrink-0 !h-9 !min-h-[36px]"
				data-testid="perio-healthy-norm-btn"
			>
				<span>Интактно</span>
			</button>

			{/* Рецессия */}
			<button
				type="button"
				onClick={() => onApplyExpressPreset("recession_express")}
				className="secondary-button shrink-0 !h-9 !min-h-[36px]"
				data-testid="perio-preset-recession-toolbar-btn"
			>
				<span>Рецессия</span>
			</button>

			{/* BOP на карманах >= 4мм */}
			<button
				type="button"
				onClick={onMarkBopOnDeepPockets}
				className="secondary-button hidden md:inline-flex shrink-0 !h-9 !min-h-[36px]"
				title="Отметить кровоточивость (BOP+) на всех карманах ≥ 4 мм"
				data-testid="perio-preset-bop-pockets"
			>
				<Droplets size={14} className="text-rose-500 shrink-0" />
				<span>BOP на &ge;4 мм</span>
			</button>

			{/* Очистить налет */}
			<button
				type="button"
				onClick={onClearPlaque}
				className="secondary-button hidden md:inline-flex shrink-0 !h-9 !min-h-[36px]"
				title="Очистить зубной налет со всех поверхностей (гигиена 100%)"
				data-testid="perio-preset-clear-plaque"
			>
				<RotateCcw size={13} className="shrink-0" />
				<span>Очистить налёт</span>
			</button>
		</>
	);
});

PerioToolbarPresets.displayName = "PerioToolbarPresets";
