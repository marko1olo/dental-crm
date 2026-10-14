/**
 * OrthopedicsZtlSelectors.tsx — Стандарты ЗТЛ, типы уступов и 5 этапов изготовления.
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 * Mandate 8e: Практичный выбор врача без блокирующих диалогов, тач-таргеты min-h-[48px].
 */

import React from "react";
import { Zap, Clock, ShieldCheck, DollarSign, Calendar, Palette } from "lucide-react";
import { DentalCrown } from "../icons/DentalIcons.js";
import {
	type StandardZtlPreset,
	STANDARD_ZTL_ORDER_PRESETS,
	PREPARATION_MARGIN_PRESETS,
	STUMP_SHADE_PRESETS,
} from "./orthopedicsPresets.js";
import {
	CANONICAL_MANUFACTURING_5_STAGES,
	type CanonicalManufacturing5StageItem,
} from "../lab/labMath.js";

export interface OrthopedicsZtlSelectorsProps {
	readonly activeZtlPresetId: string;
	readonly onSelectZtlPreset: (preset: StandardZtlPreset) => void;
	readonly preparationMargin: string;
	readonly onSelectPreparationMargin: (marginId: string, marginLabel: string) => void;
	readonly selectedStageId: string;
	readonly onSelectStage: (stage: CanonicalManufacturing5StageItem) => void;
	readonly stumpShade?: string | undefined;
	readonly onSelectStumpShade?: ((shade: string) => void) | undefined;
	readonly grossPriceRub?: number | undefined;
	readonly ztlCostRub?: number | undefined;
	readonly materialsCostRub?: number | undefined;
	readonly netMarginRub?: number | undefined;
	readonly marginPercent?: number | undefined;
	readonly dueDate?: string | undefined;
	readonly onChangeDueDate?: ((date: string) => void) | undefined;
}

export function OrthopedicsZtlSelectors({
	activeZtlPresetId,
	onSelectZtlPreset,
	preparationMargin,
	onSelectPreparationMargin,
	selectedStageId,
	onSelectStage,
	stumpShade = "ND2",
	onSelectStumpShade,
	grossPriceRub = 24000,
	ztlCostRub = 7500,
	materialsCostRub = 1200,
	netMarginRub = 15300,
	marginPercent = 64,
	dueDate,
	onChangeDueDate,
}: OrthopedicsZtlSelectorsProps) {
	return (
		<>
			{/* 1-КЛИК ПРЕСЕТЫ СТАНДАРТНЫХ НАРАДОВ ЗТЛ */}
			<div className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden">
				<div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<Zap size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
							Стандарты ЗТЛ и гарантия (1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
						Авторасчет сроков и спецификации
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
					{STANDARD_ZTL_ORDER_PRESETS.map((preset) => {
						const isSelected = activeZtlPresetId === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectZtlPreset(preset)}
								className={`min-h-[48px] px-3 py-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 overflow-hidden ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`ztl-preset-${preset.id}`}
								title={`${preset.description} · Гарантия: ${preset.warrantyLabelRu}`}
							>
								<div className="flex items-center justify-between gap-1 min-w-0 w-full">
									<span className="truncate min-w-0">{preset.name}</span>
									<span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
										{preset.badge}
									</span>
								</div>
								<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0 w-full mt-0.5">
									{preset.material}
								</span>
								<div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium min-w-0 w-full">
									<ShieldCheck size={11} className="shrink-0" />
									<span className="truncate min-w-0">{preset.warrantyLabelRu}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 1-КЛИК ПАРАМЕТРЫ ПРЕПАРИРОВАНИЯ КРАЯ */}
			<div
				className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden"
				data-testid="prep-margin-section"
			>
				<div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<DentalCrown size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
							Граница препарирования (1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
						Тип уступа для прецизионного прилегания
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{PREPARATION_MARGIN_PRESETS.map((margin) => {
						const isSelected = preparationMargin === margin.id;
						return (
							<button
								key={margin.id}
								type="button"
								onClick={() => onSelectPreparationMargin(margin.id, margin.labelRu)}
								className={`min-h-[48px] px-3 py-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 overflow-hidden ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`prep-margin-${margin.id}`}
								title={margin.description}
							>
								<div className="flex items-center justify-between gap-1 min-w-0 w-full">
									<span className="truncate min-w-0">{margin.labelRu}</span>
								</div>
								<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0 w-full mt-0.5 font-mono">
									{margin.shortBadge}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ТРЕКЕР ЭТАПОВ ИЗГОТОВЛЕНИЯ ЗТЛ */}
			<div className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden">
				<div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<Clock size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
							Этапы изготовления ЗТЛ (1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
						Слепок/Скан → Каркас → Керамика → Готовая работа → Фиксация
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
					{CANONICAL_MANUFACTURING_5_STAGES.map((stg) => {
						const isSelected = selectedStageId === stg.id;
						const currentStageIndex = CANONICAL_MANUFACTURING_5_STAGES.findIndex((s) => s.id === selectedStageId);
						const isPassed = currentStageIndex >= stg.step - 1;

						return (
							<button
								key={stg.id}
								type="button"
								onClick={() => onSelectStage(stg)}
								className={`min-h-[48px] px-2.5 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer border flex flex-col justify-between items-center min-w-0 overflow-hidden ${
									stg.step === 5 ? "col-span-2 sm:col-span-1" : ""
								} ${
									isSelected
										? "bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-500/40"
										: isPassed
										? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-700"
										: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`chairside-stage-${stg.id}`}
								title={stg.descRu}
							>
								<span className="text-[10px] uppercase font-bold tracking-wider opacity-85 truncate min-w-0 w-full">
									Этап {stg.step}
								</span>
								<span className="truncate min-w-0 w-full text-center text-xs font-bold mt-0.5">
									{stg.shortLabelRu}
								</span>
								<span className="text-[10px] opacity-80 mt-0.5 truncate min-w-0 w-full">
									{isSelected ? "Текущий" : isPassed ? "Пройден" : "Ожидание"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 1-КЛИК ВЫБОР ЦВЕТА КУЛЬТИ (NATURAL DIE ND1..ND9) ДЛЯ БЕЗМЕТАЛЛОВОЙ КЕРАМИКИ */}
			<div
				className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden"
				data-testid="stump-shade-section"
			>
				<div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<Palette size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
							Цвет культи зуба (Natural Die ND1–ND9, 1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
						Ориентир для ЗТЛ под E.max / ZrO2
					</span>
				</div>
				<div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
					{STUMP_SHADE_PRESETS.map((stump) => {
						const isSelected = stumpShade === stump.code;
						return (
							<button
								key={stump.code}
								type="button"
								onClick={() => onSelectStumpShade?.(stump.code)}
								className={`min-h-[48px] px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex flex-col justify-between items-center min-w-0 overflow-hidden ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-100 ring-2 ring-teal-500 shadow-xs"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`stump-shade-${stump.code}`}
								title={stump.labelRu}
							>
								<span
									className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-slate-500 shadow-2xs shrink-0"
									style={{ backgroundColor: stump.colorHex }}
									aria-hidden="true"
								/>
								<span className="text-[11px] font-mono font-bold mt-1 truncate min-w-0">{stump.code}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ЭКОНОМИКА СОЛО-ВРАЧА И СРОКИ ГОТОВНОСТИ (МАНДАТ 8n) */}
			<div
				className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden"
				data-testid="solo-economics-section"
			>
				<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<DollarSign size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
							Экономика наряда и маржинальность (Мандат 8n):
						</span>
					</div>
					{dueDate && (
						<div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
							<Calendar size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Готовность ЗТЛ: <strong className="font-mono text-slate-900 dark:text-slate-100">{dueDate}</strong></span>
						</div>
					)}
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					<div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[48px] min-w-0 overflow-hidden">
						<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">Пациент (выручка)</span>
						<span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate min-w-0">
							{grossPriceRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[48px] min-w-0 overflow-hidden">
						<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">Лаборатория (ЗТЛ)</span>
						<span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono truncate min-w-0">
							- {ztlCostRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[48px] min-w-0 overflow-hidden">
						<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">Расходные материалы</span>
						<span className="text-xs font-bold text-rose-700 dark:text-rose-400 font-mono truncate min-w-0">
							- {materialsCostRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between min-h-[48px] min-w-0 overflow-hidden">
						<div className="flex items-center justify-between min-w-0">
							<span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 truncate min-w-0">Чистая маржа</span>
							<span className="text-[10px] font-bold font-mono px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 shrink-0">
								{marginPercent}%
							</span>
						</div>
						<span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 font-mono truncate min-w-0">
							+{netMarginRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>
			</div>
		</>
	);
}
