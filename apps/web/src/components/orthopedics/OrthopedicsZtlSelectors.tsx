/**
 * OrthopedicsZtlSelectors.tsx — Стандарты ЗТЛ, типы уступов и 5 этапов изготовления.
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 * Mandate 8e: Практичный выбор врача без блокирующих диалогов, тач-таргеты min-h-[48px].
 */

import React from "react";
import { Zap, Layers, Clock, ShieldCheck } from "lucide-react";
import {
	type StandardZtlPreset,
	STANDARD_ZTL_ORDER_PRESETS,
	PREPARATION_MARGIN_PRESETS,
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
}

export function OrthopedicsZtlSelectors({
	activeZtlPresetId,
	onSelectZtlPreset,
	preparationMargin,
	onSelectPreparationMargin,
	selectedStageId,
	onSelectStage,
}: OrthopedicsZtlSelectorsProps) {
	return (
		<>
			{/* 1-КЛИК ПРЕСЕТЫ СТАНДАРТНЫХ НАРАДОВ ЗТЛ */}
			<div className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
				<div className="flex items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-1.5">
						<Zap size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Стандарты ЗТЛ и гарантия (1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400">
						Автоматический расчет гарантийных сроков и спецификации конструкций
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
					{STANDARD_ZTL_ORDER_PRESETS.map((preset) => {
						const isSelected = activeZtlPresetId === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectZtlPreset(preset)}
								className={`min-h-[48px] px-3 py-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`ztl-preset-${preset.id}`}
								title={`${preset.description} · Гарантия: ${preset.warrantyLabelRu}`}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="truncate">{preset.name}</span>
									<span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
										{preset.badge}
									</span>
								</div>
								<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
									{preset.material}
								</span>
								<div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
									<ShieldCheck size={11} className="shrink-0" />
									<span className="truncate">{preset.warrantyLabelRu}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 1-КЛИК ПАРАМЕТРЫ ПРЕПАРИРОВАНИЯ КРАЯ */}
			<div
				className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
				data-testid="prep-margin-section"
			>
				<div className="flex items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-1.5">
						<Layers size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Граница препарирования (1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400">
						Тип уступа для прецизионного краевого прилегания ЗТЛ
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{PREPARATION_MARGIN_PRESETS.map((margin) => {
						const isSelected = preparationMargin === margin.id;
						return (
							<button
								key={margin.id}
								type="button"
								onClick={() => onSelectPreparationMargin(margin.id, margin.labelRu)}
								className={`min-h-[48px] px-3 py-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`prep-margin-${margin.id}`}
								title={margin.description}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="truncate">{margin.labelRu}</span>
								</div>
								<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
									{margin.shortBadge}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ТРЕКЕР ЭТАПОВ ИЗГОТОВЛЕНИЯ ЗТЛ */}
			<div className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
				<div className="flex items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-1.5">
						<Clock size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Этапы изготовления ЗТЛ (1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400">
						Слепок/Скан → Каркас/Примерка → Нанесение керамики → Готовая работа → Фиксация
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
								className={`min-h-[48px] px-2.5 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer border flex flex-col justify-between items-center ${
									isSelected
										? "bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-500/40"
										: isPassed
										? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-700"
										: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`chairside-stage-${stg.id}`}
								title={stg.descRu}
							>
								<span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
									Этап {stg.step}
								</span>
								<span className="truncate w-full text-center text-xs font-bold mt-0.5">
									{stg.shortLabelRu}
								</span>
								<span className="text-[10px] opacity-80 mt-0.5">
									{isSelected ? "Текущий" : isPassed ? "Пройден" : "Ожидание"}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}
