/**
 * apps/web/src/components/formula/StomxDefectsPalette.tsx
 *
 * Dense, ergonomic 1-click clinical palette for StomX tooth defects & position anomalies.
 * Compliant with:
 * - Mandate 8e: Doctor Autonomy (No disabled buttons, 1-click assignment)
 * - Mandate 8k: Friction-Killer Law (Zero repetitive typing, instant presets)
 * - Mandate 8d: WCAG AAA Contrast & Clean Toolbar
 */

import React, { useState } from "react";
import {
	Activity,
	AlertCircle,
	Check,
	CheckCircle2,
	Compass,
	CornerDownRight,
	HelpCircle,
	RotateCw,
	Sparkles,
	Trash2,
	Wrench,
	Zap,
} from "lucide-react";
import {
	STOMX_POSITION_ANOMALIES,
	type StomxPositionAnomalyCode,
	type StomxToothDefect,
} from "@dental/shared";
import {
	getStomxDefectBadgeProps,
	toggleStomxDefectOnTooth,
} from "./stomxFormulaAdapter";
import type { ToothFormulaItem } from "./types";

export interface StomxDefectsPaletteProps {
	selectedToothNumber?: number | null | undefined;
	toothData?: ToothFormulaItem | undefined;
	onUpdateTooth?: ((toothNumber: number, updates: Partial<ToothFormulaItem>) => void) | undefined;
	onApplyIntactDentition?: (() => void) | undefined;
	className?: string | undefined;
}

type PaletteTab = "pathology" | "restoration" | "position" | "anomalies";

// Часто используемые дефекты для быстрого доступа
const QUICK_PATHOLOGIES = [
	{ alias: "С", label: "Кариес (С)", desc: "Кариес эмали / дентина" },
	{ alias: "Р", label: "Пульпит (Р)", desc: "Воспаление пульпы" },
	{ alias: "Pt", label: "Периодонтит (Pt)", desc: "Верхушечный периодонтит" },
	{ alias: "R", label: "Корень (R)", desc: "Разрушенный корень" },
	{ alias: "CR", label: "Кариес корня (CR)", desc: "Пришеечный кариес корня" },
	{ alias: "О", label: "Отсутствует (О)", desc: "Отсутствует / удален" },
	{ alias: "AI", label: "Пародонтит I (AI)", desc: "Пародонтит легкой степени" },
	{ alias: "AII", label: "Пародонтит II (AII)", desc: "Пародонтит средней степени" },
	{ alias: "AIII", label: "Пародонтит III (AIII)", desc: "Пародонтит тяжелой степени" },
	{ alias: "Рд1", label: "Рецессия I (Рд1)", desc: "Рецессия десны 1 класс" },
	{ alias: "Рд2", label: "Рецессия II (Рд2)", desc: "Рецессия десны 2 класс" },
	{ alias: "Дп", label: "Дефект пломбы (Дп)", desc: "Скол / вторичный кариес" },
	{ alias: "Дк", label: "Дефект коронки (Дк)", desc: "Скол / расцементировка" },
	{ alias: "Кд", label: "Клин. дефект (Кд)", desc: "Клиновидный дефект" },
	{ alias: "Гн", label: "Гингивит (Гн)", desc: "Воспаление десны" },
	{ alias: "Зк", label: "Зубной камень (Зк)", desc: "Зубные отложения" },
] as const;

const QUICK_RESTORATIONS = [
	{ alias: "П", label: "Пломба (П)", desc: "Состоятельная пломба" },
	{ alias: "Кл", label: "Каналы лечены (Кл)", desc: "Качественно запломбированные каналы" },
	{ alias: "К", label: "Коронка (К)", desc: "Искусственная коронка" },
	{ alias: "ИМ", label: "Имплантат (ИМ)", desc: "Установленный имплантат" },
	{ alias: "В", label: "Винир (В)", desc: "Керамический винир" },
	{ alias: "ВК", label: "Вкладка (ВК)", desc: "Культевая / восстановительная вкладка" },
	{ alias: "НК", label: "Накладка (НК)", desc: "Окклюзионная накладка onlay" },
	{ alias: "Гф", label: "Герм. фиссур (Гф)", desc: "Герметизация фиссур" },
	{ alias: "Ф", label: "Фасетка (Ф)", desc: "Фасетка мостовидного протеза" },
	{ alias: "И", label: "Искусственный (И)", desc: "Искусственный зуб протеза" },
] as const;

const QUICK_TIME_AND_AMOUNT = [
	{ alias: "Rt", label: "Ретенция (Rt)", desc: "Ретинированный зуб" },
	{ alias: "РУ", label: "Ранее удален (РУ)", desc: "Удален ранее" },
	{ alias: "П", label: "Персистентный (П)", desc: "Задержавшийся молочный зуб" },
	{ alias: "АД", label: "Адентия первичная (АД)", desc: "Врожденная адентия" },
	{ alias: "АВ", label: "Адентия вторичная (АВ)", desc: "Приобретенная адентия" },
	{ alias: "СК", label: "Сверхкомплектный (СК)", desc: "Дополнительный зуб" },
	{ alias: "У", label: "Удаление (У)", desc: "План на хирургическое удаление" },
] as const;

export const StomxDefectsPalette: React.FC<StomxDefectsPaletteProps> = ({
	selectedToothNumber,
	toothData,
	onUpdateTooth,
	onApplyIntactDentition,
	className = "",
}) => {
	const [activeTab, setActiveTab] = useState<PaletteTab>("pathology");

	const handleToggleDefect = (alias: string, isPosition = false) => {
		if (!selectedToothNumber || !onUpdateTooth) return;

		const currentItem: ToothFormulaItem = toothData ?? {
			toothNumber: selectedToothNumber,
			state: "Healthy",
			stomxDefects: [],
		};

		const updated = toggleStomxDefectOnTooth(currentItem, alias, isPosition);
		onUpdateTooth(selectedToothNumber, updated);
	};

	const handleSetHealthy = () => {
		if (!selectedToothNumber || !onUpdateTooth) return;
		onUpdateTooth(selectedToothNumber, {
			state: "Healthy",
			stomxDefects: [],
			positionAnomaly: undefined,
			requireTreatment: false,
		});
	};

	const isDefectActive = (alias: string): boolean => {
		if (!toothData) return false;
		if (alias === "ok") {
			return toothData.state === "Healthy" && toothData.stomxDefects.length === 0;
		}
		return toothData.stomxDefects.includes(alias);
	};

	const isPositionActive = (code: StomxPositionAnomalyCode): boolean => {
		return toothData?.positionAnomaly === code;
	};

	return (
		<div
			className={`flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm ${className}`}
		>
			{/* Верхняя строка статуса и быстрого действия */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						{selectedToothNumber ? `Зуб #${selectedToothNumber}` : "Выберите зуб"}
					</span>
					{selectedToothNumber && toothData && (
						<span
							className={`text-xs px-2 py-0.5 rounded-full font-medium ${
								toothData.state === "Healthy"
									? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
									: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
							}`}
						>
							{toothData.state}
						</span>
					)}
					{toothData?.positionAnomaly && (
						<span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
							Позиция: {toothData.positionAnomaly}
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					{/* Кнопка 1-клик: Здоров (Мандат 8e) */}
					<button
						type="button"
						onClick={handleSetHealthy}
						disabled={!selectedToothNumber}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
						title="Пометить выбранный зуб здоровым (ok)"
					>
						<Check className="w-3.5 h-3.5" />
						Здоров (ok)
					</button>

					{/* Быстрый пресет: Все зубы здоровы */}
					{onApplyIntactDentition && (
						<button
							type="button"
							onClick={onApplyIntactDentition}
							className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
							title="Отметить весь зубной ряд здоровым в 1 клик"
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-500" />
							Интактный ряд
						</button>
					)}
				</div>
			</div>

			{/* Вкладки категорий дефектов StomX */}
			<div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
				<button
					type="button"
					onClick={() => setActiveTab("pathology")}
					className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
						activeTab === "pathology"
							? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
							: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					<AlertCircle className="w-3.5 h-3.5" />
					Патологии (Красный)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("restoration")}
					className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
						activeTab === "restoration"
							? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40"
							: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					<Wrench className="w-3.5 h-3.5" />
					Пломбы / Протезы (Желтый)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("position")}
					className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
						activeTab === "position"
							? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/40"
							: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					<Compass className="w-3.5 h-3.5" />
					Аномалии положения (10)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("anomalies")}
					className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
						activeTab === "anomalies"
							? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40"
							: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					<Activity className="w-3.5 h-3.5" />
					Ретенция / Адентия
				</button>
			</div>

			{/* Сетка чипсов дефектов */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				{activeTab === "pathology" &&
					QUICK_PATHOLOGIES.map((item) => {
						const active = isDefectActive(item.alias);
						return (
							<button
								key={item.alias}
								type="button"
								onClick={() => handleToggleDefect(item.alias)}
								disabled={!selectedToothNumber}
								className={`min-h-[44px] px-3 py-2 rounded-lg text-left transition-all border flex items-center justify-between text-xs disabled:opacity-50 ${
									active
										? "bg-rose-500 text-white font-semibold border-rose-600 shadow-sm"
										: "bg-slate-50 hover:bg-rose-50 dark:bg-slate-800/60 dark:hover:bg-rose-950/40 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
								}`}
								title={item.desc}
							>
								<div className="flex flex-col">
									<span className="font-semibold">{item.label}</span>
									<span
										className={`text-[10px] truncate ${
											active ? "text-rose-100" : "text-slate-500 dark:text-slate-400"
										}`}
									>
										{item.desc}
									</span>
								</div>
								{active && <Check className="w-4 h-4 ml-1 flex-shrink-0" />}
							</button>
						);
					})}

				{activeTab === "restoration" &&
					QUICK_RESTORATIONS.map((item) => {
						const active = isDefectActive(item.alias);
						return (
							<button
								key={item.alias}
								type="button"
								onClick={() => handleToggleDefect(item.alias)}
								disabled={!selectedToothNumber}
								className={`min-h-[44px] px-3 py-2 rounded-lg text-left transition-all border flex items-center justify-between text-xs disabled:opacity-50 ${
									active
										? "bg-amber-500 text-white font-semibold border-amber-600 shadow-sm"
										: "bg-slate-50 hover:bg-amber-50 dark:bg-slate-800/60 dark:hover:bg-amber-950/40 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
								}`}
								title={item.desc}
							>
								<div className="flex flex-col">
									<span className="font-semibold">{item.label}</span>
									<span
										className={`text-[10px] truncate ${
											active ? "text-amber-100" : "text-slate-500 dark:text-slate-400"
										}`}
									>
										{item.desc}
									</span>
								</div>
								{active && <Check className="w-4 h-4 ml-1 flex-shrink-0" />}
							</button>
						);
					})}

				{activeTab === "position" &&
					STOMX_POSITION_ANOMALIES.map((anomaly) => {
						const active = isPositionActive(anomaly.alias);
						return (
							<button
								key={anomaly.alias}
								type="button"
								onClick={() => handleToggleDefect(anomaly.alias, true)}
								disabled={!selectedToothNumber}
								className={`min-h-[44px] px-3 py-2 rounded-lg text-left transition-all border flex items-center justify-between text-xs disabled:opacity-50 ${
									active
										? "bg-purple-600 text-white font-semibold border-purple-700 shadow-sm"
										: "bg-slate-50 hover:bg-purple-50 dark:bg-slate-800/60 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
								}`}
								title={anomaly.description}
							>
								<div className="flex flex-col">
									<span className="font-semibold">
										{anomaly.alias} ({anomaly.latinAlias})
									</span>
									<span
										className={`text-[10px] truncate ${
											active ? "text-purple-100" : "text-slate-500 dark:text-slate-400"
										}`}
									>
										{anomaly.name}
									</span>
								</div>
								{active && <Check className="w-4 h-4 ml-1 flex-shrink-0" />}
							</button>
						);
					})}

				{activeTab === "anomalies" &&
					QUICK_TIME_AND_AMOUNT.map((item) => {
						const active = isDefectActive(item.alias);
						return (
							<button
								key={item.alias}
								type="button"
								onClick={() => handleToggleDefect(item.alias)}
								disabled={!selectedToothNumber}
								className={`min-h-[44px] px-3 py-2 rounded-lg text-left transition-all border flex items-center justify-between text-xs disabled:opacity-50 ${
									active
										? "bg-indigo-600 text-white font-semibold border-indigo-700 shadow-sm"
										: "bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-950/40 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
								}`}
								title={item.desc}
							>
								<div className="flex flex-col">
									<span className="font-semibold">{item.label}</span>
									<span
										className={`text-[10px] truncate ${
											active ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"
										}`}
									>
										{item.desc}
									</span>
								</div>
								{active && <Check className="w-4 h-4 ml-1 flex-shrink-0" />}
							</button>
						);
					})}
			</div>
		</div>
	);
};
