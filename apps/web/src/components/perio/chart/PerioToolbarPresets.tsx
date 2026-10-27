/**
 * PerioToolbarPresets.tsx — Клинические пресеты тулбара (1-клик норма PSR 0, экспресс-скрининг PSR).
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
	onApplyExpressPreset, onSetAllIntact, onMarkBopOnDeepPockets, onClearPlaque,
}) => {
	return (
		<>
			{/* Доминирующий 1-клик сценарий нормы (Мандат 8e, 8am) */}
			<button
				type="button" onClick={() => onApplyExpressPreset("perio_norm_express")}
				className="btn btn--secondary shrink-0 font-bold border-emerald-500/50 text-emerald-800 dark:text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 !h-9 !min-h-[44px] min-h-[44px] shadow-xs cursor-pointer flex items-center gap-1.5"
				title="✓ Пародонт в норме (PSR 0) / Соматически здоров • Вся десна здорова (глубина 1–2 мм, кровоточивость 0%, PSR 0)"
				data-testid="perio-toolbar-norm-1click-btn"
			>
				<ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
				<span>✓ Пародонт в норме (PSR 0) / Соматически здоров</span>
			</button>

			{/* Экспресс-скрининг PSR в 1 тап (коды 0..4*) */}
			<div className="flex items-center gap-1 shrink-0 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)]" title="Экспресс-скрининг PSR: 1 тап на код">
				<span className="text-[11px] font-bold text-[var(--muted)] px-1">PSR:</span>
				<button
					type="button" onClick={() => onApplyExpressPreset("perio_norm_express")}
					className="h-7 px-2 rounded text-xs font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
					title="PSR 0: Здоровый пародонт во всех секстантах" data-testid="perio-quick-psr-0"
				>0</button>
				<button
					type="button" onClick={() => onApplyExpressPreset("gingivitis_express")}
					className="h-7 px-2 rounded text-xs font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
					title="PSR 1-2: Гингивит / зубной камень" data-testid="perio-quick-psr-1"
				>1-2</button>
				<button
					type="button" onClick={() => onApplyExpressPreset("periodontitis_moderate_express")}
					className="h-7 px-2 rounded text-xs font-bold bg-orange-500/20 text-orange-800 dark:text-orange-300 hover:bg-orange-500/30 transition-colors cursor-pointer"
					title="PSR 3: Пародонтит средней степени (4-5 мм)" data-testid="perio-quick-psr-3"
				>3</button>
				<button
					type="button" onClick={() => onApplyExpressPreset("periodontitis_severe_express")}
					className="h-7 px-2 rounded text-xs font-bold bg-rose-500/20 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
					title="PSR 4*: Тяжелый пародонтит (>=6 мм, подвижность)" data-testid="perio-quick-psr-4"
				>4*</button>
			</div>

			{/* Комплексная профгигиена в 1 клик (Мандаты 8e, 8n) */}
			<button
				type="button" onClick={() => onApplyExpressPreset("pro_hygiene_express")}
				className="btn btn--secondary shrink-0 font-semibold !h-9 !min-h-[44px] min-h-[44px] flex items-center gap-1.5"
				title="Комплексная гигиена (УЗ + Air-Flow + Полировка + Фторлак)" data-testid="perio-toolbar-prophy-1click-btn"
			>
				<UltrasonicScaler size={15} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
				<span>Комплексная гигиена (УЗ + Air-Flow + Полировка + Фторлак)</span>
			</button>

			<button
				type="button" onClick={() => onApplyExpressPreset("gingivitis_express")}
				className="btn btn--secondary shrink-0 border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 !h-9 !min-h-[36px]"
				data-testid="perio-toolbar-gingivitis-btn"
			><span>Гингивит (BOP+)</span></button>

			<button
				type="button" onClick={() => onApplyExpressPreset("periodontitis_severe_express")}
				className="btn btn--secondary shrink-0 border-rose-500/40 text-rose-800 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 !h-9 !min-h-[36px]"
				data-testid="perio-preset-severe-btn"
			><span>Пародонтит 6-8 мм</span></button>

			<button
				type="button" onClick={onSetAllIntact}
				className="btn btn--secondary shrink-0 !h-9 !min-h-[36px]"
				data-testid="perio-healthy-norm-btn"
			><span>Интактно</span></button>

			<button
				type="button" onClick={() => onApplyExpressPreset("recession_express")}
				className="btn btn--secondary shrink-0 !h-9 !min-h-[36px]"
				data-testid="perio-preset-recession-toolbar-btn"
			><span>Рецессия</span></button>

			<button
				type="button" onClick={onMarkBopOnDeepPockets}
				className="btn btn--secondary hidden md:inline-flex shrink-0 !h-9 !min-h-[36px]"
				title="Отметить кровоточивость (BOP+) на всех карманах ≥ 4 мм" data-testid="perio-preset-bop-pockets"
			>
				<Droplets size={14} className="text-rose-500 shrink-0" />
				<span>BOP на &ge;4 мм</span>
			</button>

			<button
				type="button" onClick={onClearPlaque}
				className="btn btn--secondary hidden md:inline-flex shrink-0 !h-9 !min-h-[36px]"
				title="Очистить зубной налет со всех поверхностей (гигиена 100%)" data-testid="perio-preset-clear-plaque"
			>
				<RotateCcw size={13} className="shrink-0" />
				<span>Очистить налёт</span>
			</button>
		</>
	);
});

PerioToolbarPresets.displayName = "PerioToolbarPresets";
