/**
 * HygieneExpressPresetsStrip.tsx — Экспресс-пресеты клинических статусов гигиены полости рта (OHI-S, SBI)
 * и Chairside-процедуры по Номенклатуре услуг (Мандаты 8e, 8i, 8k, 8n, 8am, 8ap).
 *
 * Эргономика (Мандат 8p, Закон Хика & Закон Миллера):
 * - Вверху СТРОГО 1 компактный ряд 34-36px с 4 главными статусами OHI-S.
 * - Вторичные диагнозы МКБ-10 и клинические протоколы убраны в раскрывающиеся субпанели.
 * - Чистый клинический русский язык без коммерческих брендов (Мандат 8ap).
 * - Спокойная нейтральная палитра var(--paper), var(--line), без 11-цветного конфетти (Мандат 8am).
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

	// Протоколы гигиены
	readonly onPresetProHygieneDone: () => void;
	readonly onPresetDeepFluoridation: () => void;
	readonly onPresetToothMousse?: () => void;
	readonly onPresetRemineralization?: () => void;
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
	onPresetRemineralization,
	onPresetPerioAntiseptic,
}) => {
	const [activeSubPanel, setActiveSubPanel] = useState<"none" | "diagnoses" | "procedures">("none");
	const handleRemin = onPresetRemineralization ?? onPresetToothMousse;

	const toggleSubPanel = (panel: "diagnoses" | "procedures") => {
		setActiveSubPanel((prev) => (prev === panel ? "none" : panel));
	};

	return (
		<div className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			{/* ─── ГЛАВНАЯ СТРОКА: 1 КОМПАКТНЫЙ РЯД (36px) ПО МАНДАТУ 8p И 8am ─── */}
			<div className="flex items-center justify-between gap-1.5 flex-wrap min-h-[36px]">
				<div className="flex items-center gap-1.5 shrink-0">
					<Sparkles size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-semibold text-[var(--foreground)] truncate">
						Экспресс-статус OHI-S:
					</span>
				</div>

				{/* 4 компактных экспресс-пресета (OHI-S) */}
				<div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar py-0.5">
					{/* 1. Норма / Идеальная (OHI-S = 0.0) */}
					<button
						type="button"
						onClick={onPresetHygieneNorm || onPresetPeriodontalNorm}
						className="primary-button h-9 min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-hover,var(--paper))] text-[var(--foreground)] border border-[var(--teal,#0d9488)]/40 text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Идеальная гигиена: OHI-S = 0.0, десна интактная, налёта и камня нет"
						data-testid="hygiene-preset-ideal-norm"
					>
						<div className="flex items-center gap-1">
							<ShieldCheck size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Норма</span>
						</div>
						<span className="text-[11px] font-mono font-bold text-[var(--teal,#0d9488)] shrink-0">0.0</span>
					</button>

					{/* 2. Хорошая (OHI-S = 0.8) */}
					<button
						type="button"
						onClick={onPresetHygieneFair}
						className="secondary-button h-9 min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-hover,var(--paper))] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Хорошая гигиена: OHI-S = 0.8, мягкий зубной налёт до 1/3 коронки"
						data-testid="hygiene-preset-fair"
					>
						<div className="flex items-center gap-1">
							<Activity size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Хорошая</span>
						</div>
						<span className="text-[11px] font-mono text-[var(--muted)] shrink-0">0.8</span>
					</button>

					{/* 3. Удовлетворительная (OHI-S = 1.8) */}
					<button
						type="button"
						onClick={onPresetHygienePoor}
						className="secondary-button h-9 min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-hover,var(--paper))] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Удовлетворительная гигиена: OHI-S = 1.8, наддесневой зубной камень"
						data-testid="hygiene-preset-poor"
					>
						<div className="flex items-center gap-1">
							<AlertTriangle size={14} className="text-amber-500 shrink-0" />
							<span>Удовл.</span>
						</div>
						<span className="text-[11px] font-mono text-[var(--muted)] shrink-0">1.8</span>
					</button>

					{/* 4. Неудовлетворительная (OHI-S = 3.2) */}
					<button
						type="button"
						onClick={onPresetHygieneSevere}
						className="secondary-button h-9 min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-hover,var(--paper))] text-[var(--foreground)] border border-[var(--danger,#ef4444)]/40 text-xs font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Неудовлетворительная гигиена: OHI-S = 3.2, массивные отложения, BOP+"
						data-testid="hygiene-preset-severe"
					>
						<div className="flex items-center gap-1">
							<ShieldAlert size={14} className="text-[var(--danger,#ef4444)] shrink-0" />
							<span>Неудовл.</span>
						</div>
						<span className="text-[11px] font-mono font-bold text-[var(--danger,#ef4444)] shrink-0">3.2</span>
					</button>
				</div>

				{/* Кнопки вызова вторичных меню (Диагнозы пародонта & Протоколы гигиены) */}
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={() => toggleSubPanel("diagnoses")}
						className={`secondary-button h-9 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
							activeSubPanel === "diagnoses"
								? "bg-[var(--paper-strong,var(--paper))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] shadow-2xs"
								: "bg-[var(--paper)] text-[var(--foreground)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
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
						className={`secondary-button h-9 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
							activeSubPanel === "procedures"
								? "bg-[var(--paper-strong,var(--paper))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] shadow-2xs"
								: "bg-[var(--paper)] text-[var(--foreground)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						title="Комплексная гигиена и клинические протоколы со списанием со склада"
					>
						<UltrasonicScaler size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="hidden md:inline">Протоколы гигиены</span>
						<span className="md:hidden">Протоколы</span>
						{activeSubPanel === "procedures" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
					</button>
				</div>
			</div>

			{/* ─── ВТОРИЧНАЯ ПАНЕЛЬ: ДИАГНОЗЫ ПАРОДОНТА (ПО ТРЕБОВАНИЮ) ─── */}
			<div className={activeSubPanel === "diagnoses" ? "flex flex-col gap-1.5 pt-2 border-t border-[var(--line)] animate-in fade-in duration-150" : "hidden"}>
				<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
					<Zap size={14} className="text-amber-500 shrink-0" />
					<span>Клинические диагнозы пародонта:</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
					<button
						type="button"
						onClick={onPresetPeriodontalNorm}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-norm"
					>
						<div className="flex items-center gap-1 truncate font-semibold">
							<ShieldCheck size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="truncate">Норма пародонта</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">бороздка ≤ 2 мм, BOP 0%</span>
					</button>

					<button
						type="button"
						onClick={onPresetCatarrhalGingivitis}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-gingivitis"
					>
						<div className="flex items-center gap-1 truncate font-semibold">
							<Activity size={13} className="text-amber-500 shrink-0" />
							<span className="truncate">Катаральный гингивит</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">отек сосочков, BOP+</span>
					</button>

					<button
						type="button"
						onClick={onPresetMildPeriodontitis}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-mild-periodontitis"
					>
						<div className="flex items-center gap-1 truncate font-semibold">
							<AlertTriangle size={13} className="text-amber-500 shrink-0" />
							<span className="truncate">Пародонтит легкий</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">карманы 3–4 мм, BOP+</span>
					</button>

					<button
						type="button"
						onClick={onPresetModeratePeriodontitis}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-periodontitis"
					>
						<div className="flex items-center gap-1 truncate font-semibold">
							<ShieldAlert size={13} className="text-[var(--danger,#ef4444)] shrink-0" />
							<span className="truncate">Пародонтит средний</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">карманы 4–5 мм, рецессия</span>
					</button>

					<button
						type="button"
						onClick={onPresetSeverePeriodontitis}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-severe-periodontitis"
					>
						<div className="flex items-center gap-1 truncate font-semibold">
							<ShieldAlert size={13} className="text-[var(--danger,#ef4444)] shrink-0" />
							<span className="truncate">Пародонтит тяжелый</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">карманы ≥ 6 мм, подвижность</span>
					</button>
				</div>
			</div>

			{/* ─── ВТОРИЧНАЯ ПАНЕЛЬ: ПРОТОКОЛЫ ГИГИЕНЫ + СКЛАД (ПО ТРЕБОВАНИЮ) ─────── */}
			<div className={activeSubPanel === "procedures" ? "flex flex-col gap-1.5 pt-2 border-t border-[var(--line)] animate-in fade-in duration-150" : "hidden"}>
				<div className="flex items-center justify-between text-xs font-semibold text-[var(--foreground)]">
					<div className="flex items-center gap-1.5">
						<UltrasonicScaler size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>Протоколы гигиены (начисление в смету и автосписание со склада):</span>
					</div>
					<span className="text-[10px] text-[var(--muted)] font-normal">Склад: мягкий овердрафт</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
					<button
						type="button"
						onClick={onPresetProHygieneDone}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-pro-hygiene"
					>
						<div className="flex items-center justify-between gap-1 font-semibold">
							<span className="truncate">Комплекс гигиены (УЗ + воздушно-абразивная обработка)</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A16.07.051 • Снятие отложений и порошковая полировка</span>
					</button>

					<button
						type="button"
						onClick={onPresetDeepFluoridation}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-deep-fluoridation"
					>
						<div className="flex items-center justify-between gap-1 font-semibold">
							<span className="truncate">Глубокое фторирование эмали</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A11.07.012 • Защитное фторирование эмали</span>
					</button>

					<button
						type="button"
						onClick={handleRemin}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-tooth-mousse"
					>
						<div className="flex items-center justify-between gap-1 font-semibold">
							<span className="truncate">Реминерализующая терапия каппой</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A11.07.010 • Препараты CPP-ACP / минералы</span>
					</button>

					<button
						type="button"
						onClick={onPresetPerioAntiseptic}
						className="secondary-button min-h-[44px] sm:min-h-[40px] p-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--foreground)] border border-[var(--line)] text-xs font-medium flex flex-col justify-center text-left transition-all cursor-pointer"
						data-testid="hygiene-preset-perio-antiseptic"
					>
						<div className="flex items-center justify-between gap-1 font-semibold">
							<span className="truncate">Антисептическая обработка карманов</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] truncate">A16.07.027 • Медикаментозная обработка</span>
					</button>
				</div>
			</div>
		</div>
	);
});

HygieneExpressPresetsStrip.displayName = "HygieneExpressPresetsStrip";
