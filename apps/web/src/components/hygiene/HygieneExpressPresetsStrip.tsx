/**
 * HygieneExpressPresetsStrip.tsx — Экспресс-пресеты клинических статусов пародонта
 * и Chairside-протоколов лечения/профилактики по Номенклатуре 804н (Мандаты 8e, 8i, 8k, 8n).
 */

import React, { memo } from "react";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Droplets,
	ShieldAlert,
	ShieldCheck,
	Zap,
} from "lucide-react";
import { UltrasonicScaler } from "../icons/DentalIcons";

export interface HygieneExpressPresetsStripProps {
	readonly onPresetPeriodontalNorm: () => void;
	readonly onPresetCatarrhalGingivitis: () => void;
	readonly onPresetMildPeriodontitis: () => void;
	readonly onPresetModeratePeriodontitis: () => void;
	readonly onPresetSeverePeriodontitis: () => void;
	readonly onPresetProHygieneDone: () => void;
	readonly onPresetDeepFluoridation: () => void;
	readonly onPresetToothMousse: () => void;
	readonly onPresetPerioAntiseptic: () => void;
}

export const HygieneExpressPresetsStrip: React.FC<HygieneExpressPresetsStripProps> = memo(({
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
			{/* Секция 1: Клинические статусы пародонта */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<Zap size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-black text-teal-900 dark:text-teal-300 truncate">
						Экспресс-статусы пародонта (без ручного ввода 192 точек):
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
					{/* Норма */}
					<button
						type="button"
						onClick={onPresetPeriodontalNorm}
						className="min-h-[48px] p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-300 border border-emerald-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Норма пародонта: зубодесневая бороздка <= 2 мм, десна плотная, BOP 0%"
						data-testid="hygiene-preset-norm"
					>
						<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
							<ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="truncate">Норма пародонта</span>
						</div>
						<span className="text-[10px] text-emerald-800 dark:text-emerald-200/80 leading-tight mt-0.5 line-clamp-2">
							бороздка &le; 2 мм, десна плотная, BOP 0%, карманов нет, подвижность 0
						</span>
					</button>

					{/* Гингивит */}
					<button
						type="button"
						onClick={onPresetCatarrhalGingivitis}
						className="min-h-[48px] p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Катаральный гингивит: отек сосочков, BOP+, наддесневой камень"
						data-testid="hygiene-preset-gingivitis"
					>
						<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
							<Activity size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span className="truncate">Катаральный гингивит</span>
						</div>
						<span className="text-[10px] text-amber-800 dark:text-amber-200/80 leading-tight mt-0.5 line-clamp-2">
							отек сосочков, кровоточивость (BOP+), карманов нет, наддесневой камень
						</span>
					</button>

					{/* Пародонтит легкий */}
					<button
						type="button"
						onClick={onPresetMildPeriodontitis}
						className="min-h-[48px] p-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-900 dark:text-rose-200 border border-rose-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Пародонтит легкой степени: карманы 3-4 мм, над/поддесневой камень, BOP+"
						data-testid="hygiene-preset-mild-periodontitis"
					>
						<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
							<AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span className="truncate">Пародонтит легкий (3-4 мм)</span>
						</div>
						<span className="text-[10px] text-rose-800 dark:text-rose-200/80 leading-tight mt-0.5 line-clamp-2">
							карманы 3–4 мм, над/поддесневой камень, кровоточивость, подвижность 0
						</span>
					</button>

					{/* Пародонтит средний */}
					<button
						type="button"
						onClick={onPresetModeratePeriodontitis}
						className="min-h-[48px] p-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/35 text-orange-900 dark:text-orange-200 border border-orange-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Пародонтит средней степени: карманы 4-5 мм, рецессия 1-2 мм, зубной камень"
						data-testid="hygiene-preset-periodontitis"
					>
						<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
							<ShieldAlert size={15} className="text-orange-600 dark:text-orange-400 shrink-0" />
							<span className="truncate">Пародонтит средний (4-5 мм)</span>
						</div>
						<span className="text-[10px] text-orange-800 dark:text-orange-200/80 leading-tight mt-0.5 line-clamp-2">
							карманы 4–5 мм, рецессия 1–2 мм, зубной камень, подвижность I ст.
						</span>
					</button>

					{/* Пародонтит тяжелый */}
					<button
						type="button"
						onClick={onPresetSeverePeriodontitis}
						className="min-h-[48px] p-2.5 rounded-xl bg-red-700/20 hover:bg-red-700/35 text-red-900 dark:text-red-200 border border-red-600/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Пародонтит тяжёлой степени: карманы >= 6 мм, гноетечение, подвижность II-III ст."
						data-testid="hygiene-preset-severe-periodontitis"
					>
						<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
							<ShieldAlert size={15} className="text-red-600 dark:text-red-400 shrink-0" />
							<span className="truncate">Пародонтит тяжелый (&ge;6 мм)</span>
						</div>
						<span className="text-[10px] text-red-800 dark:text-red-200/80 leading-tight mt-0.5 line-clamp-2">
							карманы &ge;6 мм, гноетечение, рецессия, подвижность II-III ст.
						</span>
					</button>
				</div>
			</div>

			{/* Секция 2: Протоколы 804н */}
			<div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20">
				<div className="flex items-center justify-between flex-wrap gap-1">
					<div className="flex items-center gap-2 min-w-0">
						<UltrasonicScaler size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
						<span className="text-xs font-black text-cyan-900 dark:text-cyan-300 truncate">
							Chairside-протоколы лечения и профилактики (начисление в счёт + дневник приёма):
						</span>
					</div>
					<span className="text-[10px] text-teal-800 dark:text-teal-300/70 shrink-0">
						Автоначисление в счёт визита
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{/* Профгигиена */}
					<button
						type="button"
						onClick={onPresetProHygieneDone}
						className="min-h-[48px] p-2.5 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-900 dark:text-cyan-200 border border-cyan-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Комплексная профгигиена (A16.07.051, 5500 ₽): УЗ Piezon + Air-Flow"
						data-testid="hygiene-preset-pro-hygiene"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<UltrasonicScaler size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
								<span className="truncate">Профгигиена</span>
							</div>
							<span className="text-[11px] font-mono text-cyan-900 dark:text-cyan-300 font-black shrink-0">
								5 500 ₽
							</span>
						</div>
						<span className="text-[10px] text-cyan-800 dark:text-cyan-200/80 leading-tight mt-0.5 line-clamp-2">
							A16.07.051 • УЗ Piezon + AirFlow + Cleanic + Fluocal
						</span>
					</button>

					{/* Глубокое фторирование */}
					<button
						type="button"
						onClick={onPresetDeepFluoridation}
						className="min-h-[48px] p-2.5 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 text-sky-900 dark:text-sky-200 border border-sky-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
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
						<span className="text-[10px] text-sky-800 dark:text-sky-200/80 leading-tight mt-0.5 line-clamp-2">
							A11.07.012 • Tiefenfluorid / Сафорайд, СаF2 в порах
						</span>
					</button>

					{/* Tooth Mousse */}
					<button
						type="button"
						onClick={onPresetToothMousse}
						className="min-h-[48px] p-2.5 rounded-xl bg-violet-600/25 hover:bg-violet-600/40 text-violet-900 dark:text-violet-200 border border-violet-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
						title="Ремтерапия каппой (A11.07.010, 1500 ₽): GC Tooth Mousse"
						data-testid="hygiene-preset-tooth-mousse"
					>
						<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
							<div className="flex items-center gap-1.5 truncate min-w-0">
								<ShieldCheck size={15} className="text-violet-600 dark:text-violet-400 shrink-0" />
								<span className="truncate">Ремтерапия Tooth Mousse</span>
							</div>
							<span className="text-[11px] font-mono text-violet-900 dark:text-violet-300 font-black shrink-0">
								1 500 ₽
							</span>
						</div>
						<span className="text-[10px] text-violet-800 dark:text-violet-200/80 leading-tight mt-0.5 line-clamp-2">
							A11.07.010 • GC Tooth Mousse на каппе, 5 мин
						</span>
					</button>

					{/* Обработка карманов */}
					<button
						type="button"
						onClick={onPresetPerioAntiseptic}
						className="min-h-[48px] p-2.5 rounded-xl bg-teal-600/25 hover:bg-teal-600/40 text-teal-900 dark:text-teal-200 border border-teal-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
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
						<span className="text-[10px] text-teal-800 dark:text-teal-200/80 leading-tight mt-0.5 line-clamp-2">
							A16.07.053 • Хлоргексидин 0.05% + Метрогил Дента
						</span>
					</button>
				</div>
			</div>
		</div>
	);
});

HygieneExpressPresetsStrip.displayName = "HygieneExpressPresetsStrip";
