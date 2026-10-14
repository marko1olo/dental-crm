/**
 * HygieneExpressPresetsStrip.tsx — Экспресс-пресеты клинических статусов гигиены полости рта
 * (OHI-S, SBI, BOP), статусов пародонта и Chairside-протоколов по Номенклатуре 804н (Мандаты 8e, 8i, 8k, 8n).
 */

import React, { memo } from "react";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Droplets,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import { UltrasonicScaler } from "../icons/DentalIcons";

export interface HygieneExpressPresetsStripProps {
	// 4 экспресс-статуса гигиены (OHI-S, SBI, BOP)
	readonly onPresetHygieneNorm?: () => void;
	readonly onPresetHygieneFair?: () => void;
	readonly onPresetHygienePoor?: () => void;
	readonly onPresetHygieneSevere?: () => void;

	// Статусы пародонта
	readonly onPresetPeriodontalNorm: () => void;
	readonly onPresetCatarrhalGingivitis: () => void;
	readonly onPresetMildPeriodontitis: () => void;
	readonly onPresetModeratePeriodontitis: () => void;
	readonly onPresetSeverePeriodontitis: () => void;

	// Протоколы 804н
	readonly onPresetProHygieneDone: () => void;
	readonly onPresetDeepFluoridation: () => void;
	readonly onPresetToothMousse: () => void;
	readonly onPresetPerioAntiseptic: () => void;
}

export const HygieneExpressPresetsStrip: React.FC<HygieneExpressPresetsStripProps> = memo(({
	onPresetHygieneNorm,
	onPresetHygieneFair,
	onPresetHygienePoor,
	onPresetHygieneSevere,
	onPresetPeriodontalNorm,
	onPresetCatarrhalGingivitis,
	onPresetMildPeriodontitis,
	onPresetModeratePeriodontitis,
	onPresetSeverePeriodontitis,
	onPresetProHygieneDone,
	onPresetDeepFluoridation,
	onPresetToothMousse,
	onPresetPerioAntiseptic,
}) => {
	return (
		<div className="flex flex-col gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
			{/* Секция 1: 4 экспресс-пресета индексов гигиены (OHI-S, SBI, BOP) */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between flex-wrap gap-1">
					<div className="flex items-center gap-2">
						<Sparkles size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-black text-teal-900 dark:text-teal-200 truncate">
							Экспресс-индексы гигиены OHI-S &amp; SBI (1-клик калькуляция без ручного прокликивания):
						</span>
					</div>
					<span className="text-[10px] text-teal-800 dark:text-teal-300/70 shrink-0">
						Авторасчет формул
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{/* 1. Норма / Идеальная */}
					<button
						type="button"
						onClick={onPresetHygieneNorm || onPresetPeriodontalNorm}
						className="min-h-[48px] p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-950 dark:text-emerald-200 border border-emerald-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Идеальная гигиена: OHI-S = 0.0, SBI = 0, BOP = 0%"
						data-testid="hygiene-preset-ideal-norm"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span className="truncate">✓ Идеальная гигиена</span>
							</div>
							<span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-black shrink-0">
								OHI-S 0.0
							</span>
						</div>
						<span className="text-[10px] text-emerald-800 dark:text-emerald-200/80 leading-tight mt-0.5 line-clamp-2">
							Налёта нет, камня нет, десна плотная, SBI = 0, BOP = 0%
						</span>
					</button>

					{/* 2. Удовлетворительная (мягкий налет) */}
					<button
						type="button"
						onClick={onPresetHygieneFair}
						className="min-h-[48px] p-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/35 text-teal-950 dark:text-teal-200 border border-teal-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Удовлетворительная гигиена: OHI-S = 0.8, мягкий зубной налет"
						data-testid="hygiene-preset-fair"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<Activity size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate">Удовлетворительная</span>
							</div>
							<span className="text-[11px] font-mono text-teal-800 dark:text-teal-300 font-black shrink-0">
								OHI-S 0.8
							</span>
						</div>
						<span className="text-[10px] text-teal-800 dark:text-teal-200/80 leading-tight mt-0.5 line-clamp-2">
							Мягкий налёт до 1/3 коронки, камня нет, кровоточивости нет
						</span>
					</button>

					{/* 3. Неудовлетворительная (наддесневой камень) */}
					<button
						type="button"
						onClick={onPresetHygienePoor}
						className="min-h-[48px] p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-950 dark:text-amber-200 border border-amber-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Неудовлетворительная гигиена: OHI-S = 1.8, наддесневой камень"
						data-testid="hygiene-preset-poor"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span className="truncate">Неудовлетворительная</span>
							</div>
							<span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 font-black shrink-0">
								OHI-S 1.8
							</span>
						</div>
						<span className="text-[10px] text-amber-800 dark:text-amber-200/80 leading-tight mt-0.5 line-clamp-2">
							Наддесневой зубной камень, налёт &gt; 1/3, гиперемия сосочков
						</span>
					</button>

					{/* 4. Тяжелая (поддесневой камень + BOP) */}
					<button
						type="button"
						onClick={onPresetHygieneSevere}
						className="min-h-[48px] p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-950 dark:text-rose-200 border border-rose-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Тяжелая гигиена: OHI-S = 2.6, генерализованный поддесневой камень + BOP"
						data-testid="hygiene-preset-severe"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<ShieldAlert size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
								<span className="truncate">Тяжелая гигиена</span>
							</div>
							<span className="text-[11px] font-mono text-rose-800 dark:text-rose-300 font-black shrink-0">
								OHI-S 2.6
							</span>
						</div>
						<span className="text-[10px] text-rose-800 dark:text-rose-200/80 leading-tight mt-0.5 line-clamp-2">
							Генерализованный поддесневой камень, кровоточивость (BOP+)
						</span>
					</button>
				</div>
			</div>

			{/* Секция 2: Клинические статусы пародонта */}
			<div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20">
				<div className="flex items-center gap-2">
					<Zap size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-black text-teal-900 dark:text-teal-300 truncate">
						Клинические диагнозы пародонта (МКБ-10 / Форма 043/у):
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
					{/* Норма пародонта */}
					<button
						type="button"
						onClick={onPresetPeriodontalNorm}
						className="min-h-[44px] p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-300 border border-emerald-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Норма пародонта: зубодесневая бороздка <= 2 мм, десна плотная, BOP 0%"
						data-testid="hygiene-preset-norm"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs min-w-0">
							<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="truncate">Норма пародонта</span>
						</div>
						<span className="text-[10px] text-emerald-800 dark:text-emerald-200/80 leading-tight mt-0.5 truncate">
							бороздка &le; 2 мм, BOP 0%
						</span>
					</button>

					{/* Гингивит */}
					<button
						type="button"
						onClick={onPresetCatarrhalGingivitis}
						className="min-h-[44px] p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Катаральный гингивит: отек сосочков, BOP+, наддесневой камень"
						data-testid="hygiene-preset-gingivitis"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs min-w-0">
							<Activity size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span className="truncate">Катаральный гингивит</span>
						</div>
						<span className="text-[10px] text-amber-800 dark:text-amber-200/80 leading-tight mt-0.5 truncate">
							отек сосочков, BOP+
						</span>
					</button>

					{/* Пародонтит легкий */}
					<button
						type="button"
						onClick={onPresetMildPeriodontitis}
						className="min-h-[44px] p-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-900 dark:text-rose-200 border border-rose-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Пародонтит легкой степени: карманы 3-4 мм, над/поддесневой камень, BOP+"
						data-testid="hygiene-preset-mild-periodontitis"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs min-w-0">
							<AlertTriangle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span className="truncate">Пародонтит легкий</span>
						</div>
						<span className="text-[10px] text-rose-800 dark:text-rose-200/80 leading-tight mt-0.5 truncate">
							карманы 3–4 мм, BOP+
						</span>
					</button>

					{/* Пародонтит средний */}
					<button
						type="button"
						onClick={onPresetModeratePeriodontitis}
						className="min-h-[44px] p-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/35 text-orange-900 dark:text-orange-200 border border-orange-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Пародонтит средней степени: карманы 4-5 мм, рецессия 1-2 мм, зубной камень"
						data-testid="hygiene-preset-periodontitis"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs min-w-0">
							<ShieldAlert size={14} className="text-orange-600 dark:text-orange-400 shrink-0" />
							<span className="truncate">Пародонтит средний</span>
						</div>
						<span className="text-[10px] text-orange-800 dark:text-orange-200/80 leading-tight mt-0.5 truncate">
							карманы 4–5 мм, рецессия
						</span>
					</button>

					{/* Пародонтит тяжелый */}
					<button
						type="button"
						onClick={onPresetSeverePeriodontitis}
						className="min-h-[44px] p-2 rounded-xl bg-red-700/20 hover:bg-red-700/35 text-red-900 dark:text-red-200 border border-red-600/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Пародонтит тяжёлой степени: карманы >= 6 мм, гноетечение, подвижность II-III ст."
						data-testid="hygiene-preset-severe-periodontitis"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs min-w-0">
							<ShieldAlert size={14} className="text-red-600 dark:text-red-400 shrink-0" />
							<span className="truncate">Пародонтит тяжелый</span>
						</div>
						<span className="text-[10px] text-red-800 dark:text-red-200/80 leading-tight mt-0.5 truncate">
							карманы &ge;6 мм, подвижность
						</span>
					</button>
				</div>
			</div>

			{/* Секция 3: Номенклатура 804н + Списание со склада + Начисление в смету */}
			<div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20">
				<div className="flex items-center justify-between flex-wrap gap-1">
					<div className="flex items-center gap-2 min-w-0">
						<UltrasonicScaler size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
						<span className="text-xs font-black text-cyan-900 dark:text-cyan-300 truncate">
							Комплексная гигиена и процедуры 804н (смета + автосписание со склада):
						</span>
					</div>
					<span className="text-[10px] font-bold text-teal-800 dark:text-teal-300/80 shrink-0">
						1-клик в смету + склад
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{/* Профгигиена комплексная */}
					<button
						type="button"
						onClick={onPresetProHygieneDone}
						className="min-h-[50px] p-2.5 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-950 dark:text-cyan-100 border border-cyan-500/45 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0 ring-1 ring-cyan-500/30"
						title="Комплексная гигиена (A16.07.051, 5500 ₽): УЗ + Air-Flow + списание порошка, пасты Cleanic и фтор-лака со склада"
						data-testid="hygiene-preset-pro-hygiene"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<UltrasonicScaler size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
								<span className="truncate">Комплексная гигиена</span>
							</div>
							<span className="text-[11px] font-mono text-cyan-900 dark:text-cyan-300 font-black shrink-0">
								5 500 ₽
							</span>
						</div>
						<span className="text-[10px] text-cyan-900 dark:text-cyan-200/90 leading-tight mt-0.5 line-clamp-2">
							A16.07.051 • УЗ Piezon + AirFlow + Cleanic + Фтор-лак
						</span>
					</button>

					{/* Глубокое фторирование */}
					<button
						type="button"
						onClick={onPresetDeepFluoridation}
						className="min-h-[50px] p-2.5 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 text-sky-950 dark:text-sky-100 border border-sky-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Глубокое фторирование эмали (A11.07.012, 1800 ₽): Tiefenfluorid"
						data-testid="hygiene-preset-deep-fluoridation"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<Droplets size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
								<span className="truncate">Глубокое фторирование</span>
							</div>
							<span className="text-[11px] font-mono text-sky-900 dark:text-sky-300 font-black shrink-0">
								1 800 ₽
							</span>
						</div>
						<span className="text-[10px] text-sky-900 dark:text-sky-200/80 leading-tight mt-0.5 line-clamp-2">
							A11.07.012 • Tiefenfluorid / Сафорайд, СаF2 в порах
						</span>
					</button>

					{/* Tooth Mousse */}
					<button
						type="button"
						onClick={onPresetToothMousse}
						className="min-h-[50px] p-2.5 rounded-xl bg-violet-600/25 hover:bg-violet-600/40 text-violet-950 dark:text-violet-100 border border-violet-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Ремтерапия каппой (A11.07.010, 1500 ₽): GC Tooth Mousse"
						data-testid="hygiene-preset-tooth-mousse"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<ShieldCheck size={15} className="text-violet-600 dark:text-violet-400 shrink-0" />
								<span className="truncate">Tooth Mousse каппа</span>
							</div>
							<span className="text-[11px] font-mono text-violet-900 dark:text-violet-300 font-black shrink-0">
								1 500 ₽
							</span>
						</div>
						<span className="text-[10px] text-violet-900 dark:text-violet-200/80 leading-tight mt-0.5 line-clamp-2">
							A11.07.010 • GC Tooth Mousse на каппе, 5 мин
						</span>
					</button>

					{/* Обработка карманов */}
					<button
						type="button"
						onClick={onPresetPerioAntiseptic}
						className="min-h-[50px] p-2.5 rounded-xl bg-teal-600/25 hover:bg-teal-600/40 text-teal-950 dark:text-teal-100 border border-teal-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Медикаментозная обработка карманов (A16.07.053, 1200 ₽): хлоргексидин + Метрогил"
						data-testid="hygiene-preset-perio-antiseptic"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate">Обработка карманов</span>
							</div>
							<span className="text-[11px] font-mono text-teal-900 dark:text-teal-300 font-black shrink-0">
								1 200 ₽
							</span>
						</div>
						<span className="text-[10px] text-teal-900 dark:text-teal-200/80 leading-tight mt-0.5 line-clamp-2">
							A16.07.053 • Хлоргексидин 0.05% + Метрогил Дента
						</span>
					</button>
				</div>
			</div>
		</div>
	);
});

HygieneExpressPresetsStrip.displayName = "HygieneExpressPresetsStrip";
