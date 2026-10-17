/**
 * HygieneExpressPresetsStrip.tsx — Экспресс-пресеты клинических статусов гигиены полости рта (OHI-S, SBI)
 * и Chairside-процедуры по Номенклатуре 804н (Мандаты 8e, 8i, 8k, 8n).
 *
 * Эргономика (Мандат 8p, Закон Хика & Закон Миллера):
 * - Вверху СТРОГО 1 компактный ряд 34-36px с 4 главными статусами OHI-S & SBI.
 * - Вторичные диагнозы МКБ-10 и процедуры 804н со списанием убраны в раскрывающиеся субпанели.
 * - Чистый клинический русский язык без коммерческих брендов.
 */

import React, { memo, useState } from "react";
import {
	Activity,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
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
	const [activeSubPanel, setActiveSubPanel] = useState<"none" | "diagnoses" | "procedures">("none");

	const toggleSubPanel = (panel: "diagnoses" | "procedures") => {
		setActiveSubPanel((prev) => (prev === panel ? "none" : panel));
	};

	return (
		<div className="flex flex-col gap-2 p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30">
			{/* ─── ГЛАВНАЯ СТРОКА: 1 КОМПАКТНЫЙ РЯД (34–36px) ПО МАНДАТУ 8p ─── */}
			<div className="flex items-center justify-between gap-1.5 flex-wrap min-h-[36px]">
				<div className="flex items-center gap-1.5 shrink-0">
					<Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-black text-teal-900 dark:text-teal-300 truncate">
						Экспресс-статус OHI-S:
					</span>
				</div>

				{/* 4 компактных экспресс-пресета (OHI-S & SBI) */}
				<div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar py-0.5">
					{/* 1. Норма / Идеальная (OHI-S = 0.0) */}
					<button
						type="button"
						onClick={onPresetHygieneNorm || onPresetPeriodontalNorm}
						className="primary-button min-h-[48px] h-9 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Идеальная гигиена: OHI-S = 0.0, десна плотная, налёта и камня нет"
						data-testid="hygiene-preset-ideal-norm"
					>
						<div className="flex items-center gap-1">
							<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>✓ Норма</span>
						</div>
						<span className="text-[11px] font-mono font-bold shrink-0">OHI-S 0.0</span>
					</button>

					{/* 2. Удовлетворительная (OHI-S = 0.8) */}
					<button
						type="button"
						onClick={onPresetHygieneFair}
						className="secondary-button min-h-[48px] h-9 px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/35 text-teal-900 dark:text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Удовлетворительная гигиена: OHI-S = 0.8, мягкий зубной налёт до 1/3 коронки"
						data-testid="hygiene-preset-fair"
					>
						<div className="flex items-center gap-1">
							<Activity size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Удовл.</span>
						</div>
						<span className="text-[11px] font-mono font-bold shrink-0">OHI-S 0.8</span>
					</button>

					{/* 3. Неудовлетворительная (OHI-S = 1.8) */}
					<button
						type="button"
						onClick={onPresetHygienePoor}
						className="secondary-button min-h-[48px] h-9 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Неудовлетворительная гигиена: OHI-S = 1.8, наддесневой зубной камень"
						data-testid="hygiene-preset-poor"
					>
						<div className="flex items-center gap-1">
							<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>Неудовл.</span>
						</div>
						<span className="text-[11px] font-mono font-bold shrink-0">OHI-S 1.8</span>
					</button>

					{/* 4. Тяжелая (OHI-S = 2.6) */}
					<button
						type="button"
						onClick={onPresetHygieneSevere}
						className="secondary-button min-h-[48px] h-9 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 text-rose-900 dark:text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Тяжелая гигиена: OHI-S = 2.6, генерализованный поддесневой камень, BOP+"
						data-testid="hygiene-preset-severe"
					>
						<div className="flex items-center gap-1">
							<ShieldAlert size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span>Тяжелая</span>
						</div>
						<span className="text-[11px] font-mono font-bold shrink-0">OHI-S 2.6</span>
					</button>
				</div>

				{/* Кнопки вызова вторичных меню (Диагнозы пародонта & Протоколы гигиены) */}
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={() => toggleSubPanel("diagnoses")}
						className={`secondary-button h-9 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
							activeSubPanel === "diagnoses"
								? "bg-teal-700 text-white border-teal-800 shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						title="Клинические диагнозы пародонта"
					>
						<Zap size={13} className="text-amber-500 shrink-0" />
						<span className="hidden md:inline">Диагнозы пародонта</span>
						<span className="md:hidden">Диагнозы</span>
						{activeSubPanel === "diagnoses" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
					</button>

					<button
						type="button"
						onClick={() => toggleSubPanel("procedures")}
						className={`secondary-button h-9 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
							activeSubPanel === "procedures"
								? "bg-teal-700 text-white border-teal-800 shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						title="Комплексная гигиена и клинические протоколы со списанием со склада"
					>
						<UltrasonicScaler size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden md:inline">Протоколы гигиены</span>
						<span className="md:hidden">Протоколы</span>
						{activeSubPanel === "procedures" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
					</button>
				</div>
			</div>

			{/* ─── ВТОРИЧНАЯ ПАНЕЛЬ: ДИАГНОЗЫ ПАРОДОНТА (ПО ТРЕБОВАНИЮ) ─── */}
			<div className={activeSubPanel === "diagnoses" ? "flex flex-col gap-1.5 pt-2 border-t border-teal-500/20 animate-in fade-in duration-150" : "hidden"}>
				<div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-300">
					<Zap size={14} className="text-amber-500 shrink-0" />
					<span>Клинические диагнозы пародонта:</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
					<button
						type="button"
						onClick={onPresetPeriodontalNorm}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-300 border border-emerald-500/35 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-norm"
					>
						<div className="flex items-center gap-1 truncate font-bold">
							<ShieldCheck size={13} className="text-emerald-500 shrink-0" />
							<span className="truncate">Норма пародонта</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">бороздка ≤ 2 мм, BOP 0%</span>
					</button>

					<button
						type="button"
						onClick={onPresetCatarrhalGingivitis}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/35 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-gingivitis"
					>
						<div className="flex items-center gap-1 truncate font-bold">
							<Activity size={13} className="text-amber-500 shrink-0" />
							<span className="truncate">Катаральный гингивит</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">отек сосочков, BOP+</span>
					</button>

					<button
						type="button"
						onClick={onPresetMildPeriodontitis}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-rose-600/15 hover:bg-rose-600/30 text-rose-900 dark:text-rose-200 border border-rose-500/35 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-mild-periodontitis"
					>
						<div className="flex items-center gap-1 truncate font-bold">
							<AlertTriangle size={13} className="text-rose-500 shrink-0" />
							<span className="truncate">Пародонтит легкий</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">карманы 3–4 мм, BOP+</span>
					</button>

					<button
						type="button"
						onClick={onPresetModeratePeriodontitis}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/35 text-orange-900 dark:text-orange-200 border border-orange-500/40 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-periodontitis"
					>
						<div className="flex items-center gap-1 truncate font-bold">
							<ShieldAlert size={13} className="text-orange-500 shrink-0" />
							<span className="truncate">Пародонтит средний</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">карманы 4–5 мм, рецессия</span>
					</button>

					<button
						type="button"
						onClick={onPresetSeverePeriodontitis}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-red-700/20 hover:bg-red-700/35 text-red-900 dark:text-red-200 border border-red-600/40 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-severe-periodontitis"
					>
						<div className="flex items-center gap-1 truncate font-bold">
							<ShieldAlert size={13} className="text-red-500 shrink-0" />
							<span className="truncate">Пародонтит тяжелый</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">карманы ≥ 6 мм, подвижность</span>
					</button>
				</div>
			</div>

			{/* ─── ВТОРИЧНАЯ ПАНЕЛЬ: ПРОТОКОЛЫ ГИГИЕНЫ + СКЛАД (ПО ТРЕБОВАНИЮ) ─────── */}
			<div className={activeSubPanel === "procedures" ? "flex flex-col gap-1.5 pt-2 border-t border-teal-500/20 animate-in fade-in duration-150" : "hidden"}>
				<div className="flex items-center justify-between text-xs font-bold text-cyan-900 dark:text-cyan-300">
					<div className="flex items-center gap-1.5">
						<UltrasonicScaler size={14} className="text-cyan-500 shrink-0" />
						<span>Протоколы гигиены (начисление в смету и автосписание со склада):</span>
					</div>
					<span className="text-[10px] text-teal-800 dark:text-teal-300 font-normal">Склад: мягкий овердрафт</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
					<button
						type="button"
						onClick={onPresetProHygieneDone}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-900 dark:text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-pro-hygiene"
					>
						<div className="flex items-center justify-between gap-1 font-bold">
							<span className="truncate">УЗ-снятие + полировка</span>
							<span className="font-mono text-cyan-900 dark:text-cyan-300">5 500 ₽</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A16.07.051 • Снятие отложений и Air-Flow</span>
					</button>

					<button
						type="button"
						onClick={onPresetDeepFluoridation}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/35 text-sky-900 dark:text-sky-300 border border-sky-500/40 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-deep-fluoridation"
					>
						<div className="flex items-center justify-between gap-1 font-bold">
							<span className="truncate">Глубокое фторирование эмали</span>
							<span className="font-mono text-sky-900 dark:text-sky-300">1 800 ₽</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A11.07.012 • Защитное фторирование эмали</span>
					</button>

					<button
						type="button"
						onClick={onPresetToothMousse}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-violet-900 dark:text-violet-300 border border-violet-500/40 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-tooth-mousse"
					>
						<div className="flex items-center justify-between gap-1 font-bold">
							<span className="truncate">Реминерализующая терапия каппой</span>
							<span className="font-mono text-violet-900 dark:text-violet-300">1 500 ₽</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A11.07.010 • Аппликационная терапия минералами</span>
					</button>

					<button
						type="button"
						onClick={onPresetPerioAntiseptic}
						className="secondary-button min-h-[48px] p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-perio-antiseptic"
					>
						<div className="flex items-center justify-between gap-1 font-bold">
							<span className="truncate">Антисептическая обработка карманов</span>
							<span className="font-mono text-emerald-900 dark:text-emerald-300">1 200 ₽</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A16.07.053 • Медикаментозная обработка</span>
					</button>
				</div>
			</div>
		</div>
	);
});

HygieneExpressPresetsStrip.displayName = "HygieneExpressPresetsStrip";
