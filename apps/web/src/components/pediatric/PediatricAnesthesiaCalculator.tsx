/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC ANESTHESIA SAFETY CALCULATOR (КАЛЬКУЛЯТОР БЕЗОПАСНОСТИ АНЕСТЕЗИИ)
 * Chairside Toxic Overdose Prevention by Child Body Weight (kg)
 * Articaine 4%: max 5.0 mg/kg | Mepivacaine 3%: max 4.4 mg/kg
 * Instant Red Alert & Overdose Blocking | Mandates 8e, 8k, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from "react";
import {
	AlertOctagon,
	AlertTriangle,
	Check,
	Droplets,
	ShieldAlert,
	ShieldCheck,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";

export type PediatricAnestheticDrugId = "articaine_4" | "mepivacaine_3";

export interface PediatricAnestheticSpec {
	readonly id: PediatricAnestheticDrugId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly tradeNamesRu: string;
	readonly concentrationPercent: number;
	readonly mgPerMl: number;
	readonly standardCarpuleVolumeMl: number;
	readonly mgPerCarpule: number;
	readonly maxDoseMgPerKg: number; // 5.0 for Articaine, 4.4 for Mepivacaine
	readonly absoluteMaxDoseMg: number;
	readonly vasoconstrictorRu: string;
	readonly minAgeYears: number;
	readonly descriptionRu: string;
}

export const PEDIATRIC_ANESTHETIC_SPECS: Readonly<Record<PediatricAnestheticDrugId, PediatricAnestheticSpec>> = {
	articaine_4: {
		id: "articaine_4",
		nameRu: "Артикаин 4% с эпинефрином 1:200 000",
		shortLabelRu: "Артикаин 4% (макс 5 мг/кг)",
		tradeNamesRu: "Ультракаин Д-С / Септанест / Убистезин",
		concentrationPercent: 4.0,
		mgPerMl: 40.0,
		standardCarpuleVolumeMl: 1.7,
		mgPerCarpule: 68.0, // 40 mg/ml * 1.7 ml = 68 mg
		maxDoseMgPerKg: 5.0, // Clinical standard: 5.0 mg/kg for pediatric
		absoluteMaxDoseMg: 500.0,
		vasoconstrictorRu: "Эпинефрин 1:200 000 (0.0085 мг/карп)",
		minAgeYears: 4,
		descriptionRu: "Препарат выбора для детской инфильтрационной и проводниковой анестезии от 4 лет.",
	},
	mepivacaine_3: {
		id: "mepivacaine_3",
		nameRu: "Мепивакаин 3% без вазоконстриктора",
		shortLabelRu: "Мепивакаин 3% (макс 4.4 мг/кг)",
		tradeNamesRu: "Скандонест 3% / Мепивастезин",
		concentrationPercent: 3.0,
		mgPerMl: 30.0,
		standardCarpuleVolumeMl: 1.7,
		mgPerCarpule: 51.0, // 30 mg/ml * 1.7 ml = 51 mg
		maxDoseMgPerKg: 4.4, // Clinical standard: 4.4 mg/kg for pediatric
		absoluteMaxDoseMg: 300.0,
		vasoconstrictorRu: "Без вазоконстриктора (Адреналин-free)",
		minAgeYears: 4,
		descriptionRu: "Для детей с аллергией на сульфиты, бронхиальной астмой, кардиопатологией и тиреотоксикозом.",
	},
};

export interface PediatricAnesthesiaCalculationResult {
	readonly drug: PediatricAnestheticSpec;
	readonly patientWeightKg: number;
	readonly carpulesAdministered: number;
	readonly totalVolumeMl: number;
	readonly maxAllowedTotalDoseMg: number;
	readonly totalDoseAdministeredMg: number;
	readonly maxSafeCarpulesCount: number;
	readonly doseUtilizationPercent: number;
	readonly isSafe: boolean;
	readonly isOverdose: boolean;
	readonly isUnderAge: boolean;
	readonly alertMessageRu?: string;
	readonly formattedText043: string;
}

export interface PediatricAnesthesiaCalculatorProps {
	/** Начальный вес ребенка (кг) */
	readonly initialWeightKg?: number | undefined;
	/** Возраст ребенка (лет) */
	readonly patientAgeYears?: number | undefined;
	/** Обработчик изменения расчета */
	readonly onCalculationChange?: ((result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	/** Обработчик вставки текста анестезии в протокол 043/у */
	readonly onApplyToProtocol?: ((formattedText: string, result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	/** Дополнительный CSS класс */
	readonly className?: string | undefined;
}

export const PediatricAnesthesiaCalculator: React.FC<PediatricAnesthesiaCalculatorProps> = ({
	initialWeightKg = 20,
	patientAgeYears = 6,
	onCalculationChange,
	onApplyToProtocol,
	className = "",
}) => {
	const [selectedDrugId, setSelectedDrugId] = useState<PediatricAnestheticDrugId>("articaine_4");
	const [weightKg, setWeightKg] = useState<number>(initialWeightKg > 0 ? initialWeightKg : 20);
	const [carpules, setCarpules] = useState<number>(0.5);

	const drug = PEDIATRIC_ANESTHETIC_SPECS[selectedDrugId];

	// ─────────────────────────────────────────────────────────────────────────
	// ЖЕЛЕЗНЫЙ МАТЕМАТИЧЕСКИЙ РАСЧЕТ БЕЗОПАСНОСТИ (AAPD / МИНЗДРАВ РФ)
	// ─────────────────────────────────────────────────────────────────────────
	const calculation = useMemo<PediatricAnesthesiaCalculationResult>(() => {
		const safeWeight = Math.max(5, Math.min(100, weightKg));
		const mrdPerKg = drug.maxDoseMgPerKg;
		const maxAllowedTotalDoseMg = Number(Math.min(drug.absoluteMaxDoseMg, safeWeight * mrdPerKg).toFixed(1));

		const singleCarpuleDoseMg = drug.mgPerCarpule;
		const totalVolumeMl = Number((carpules * drug.standardCarpuleVolumeMl).toFixed(2));
		const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));

		const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / singleCarpuleDoseMg).toFixed(2));
		const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));

		const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;
		const isUnderAge = patientAgeYears < drug.minAgeYears;

		let alertMessageRu: string | undefined;
		if (isOverdose) {
			alertMessageRu = `⛔ ВНИМАНИЕ: ТОКСИЧЕСКАЯ ДОЗА! Введено ${totalDoseAdministeredMg} мг при допустимом максимуме ${maxAllowedTotalDoseMg} мг на вес ${safeWeight} кг. Риск системной интоксикации! Превышение заблокировано!`;
		} else if (isUnderAge) {
			alertMessageRu = `⚠️ Препарат противопоказан детям в возрасте до ${drug.minAgeYears} лет.`;
		}

		const formattedText043 = isOverdose
			? `[БЛОКИРОВКА АНЕСТЕЗИИ: Превышение токсической дозы ${totalDoseAdministeredMg} мг > ${maxAllowedTotalDoseMg} мг на вес ${safeWeight} кг]`
			: [
					`Анестезиологическое пособие: ${drug.nameRu}.`,
					`• Введено: ${carpules} карп. (${totalVolumeMl} мл / ${totalDoseAdministeredMg} мг активного вещества).`,
					`• Вес ребенка: ${safeWeight} кг. Предельно допустимая доза (MRD): ${maxAllowedTotalDoseMg} мг (${mrdPerKg} мг/кг).`,
					`• Расход дозы: ${doseUtilizationPercent}% (макс. ${maxSafeCarpulesCount} карп.) — ДОЗА БЕЗОПАСНА.`,
					`• Вазоконстриктор: ${drug.vasoconstrictorRu}.`,
				].join("\n");

		const result: PediatricAnesthesiaCalculationResult = {
			drug,
			patientWeightKg: safeWeight,
			carpulesAdministered: carpules,
			totalVolumeMl,
			maxAllowedTotalDoseMg,
			totalDoseAdministeredMg,
			maxSafeCarpulesCount,
			doseUtilizationPercent,
			isSafe: !isOverdose && !isUnderAge,
			isOverdose,
			isUnderAge,
			...(alertMessageRu ? { alertMessageRu } : {}),
			formattedText043,
		};

		return result;
	}, [carpules, drug, patientAgeYears, weightKg]);

	// Уведомление родительского компонента при изменении расчета
	React.useEffect(() => {
		onCalculationChange?.(calculation);
	}, [calculation, onCalculationChange]);

	const handleApplyAnesthesia = useCallback(() => {
		if (calculation.isOverdose) {
			showToast("⛔ БЛОКИРОВКА: Нельзя внести токсическую дозу анестетика в карту 043/у! Уменьшите количество карпул.", "error", 4500);
			return;
		}
		onApplyToProtocol?.(calculation.formattedText043, calculation);
		showToast(`Анестезия ${drug.shortLabelRu} (${calculation.carpulesAdministered} карп.) внесена в протокол`, "success", 2500);
	}, [calculation, drug.shortLabelRu, onApplyToProtocol]);

	const handleSetMaxSafeDose = useCallback(() => {
		// Округление до безопасного шага 0.25 карпулы в меньшую сторону
		const safeCarpules = Math.floor((calculation.maxSafeCarpulesCount) * 4) / 4;
		const nextCarpules = Math.max(0.25, safeCarpules);
		setCarpules(nextCarpules);
		showToast(`Установлена предельная безопасная доза: ${nextCarpules} карп.`, "info", 2000);
	}, [calculation.maxSafeCarpulesCount]);

	return (
		<div
			className={`pediatric-anesthesia-calc rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-4 shadow-xs ${className}`.trim()}
			data-testid="pediatric-anesthesia-calculator"
		>
			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ШАПКА: НАЗВАНИЕ + ИНДИКАТОР БЕЗОПАСНОСТИ */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
						<Droplets className="h-4 w-4" />
					</div>
					<div>
						<h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--ink,#0f172a)]">
							Калькулятор безопасности анестетика по весу ребенка
						</h3>
						<p className="text-[11px] text-[var(--muted,#64748b)] font-medium">
							Артикаин 4% (макс 5 мг/кг) &bull; Мепивакаин 3% (макс 4.4 мг/кг) &bull; Защита от передозировки
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{calculation.isOverdose ? (
						<div
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs animate-pulse shadow-sm"
							data-testid="anesthesia-overdose-badge"
						>
							<AlertOctagon className="h-4 w-4" />
							<span>⛔ ТОКСИЧЕСКАЯ ДОЗА</span>
						</div>
					) : (
						<div
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/30 font-extrabold text-xs"
							data-testid="anesthesia-safe-badge"
						>
							<ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
							<span>Безопасная доза ({calculation.doseUtilizationPercent}%)</span>
						</div>
					)}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ВЫБОР ПРЕПАРАТА (АРТИКАИН 4% VS МЕПИВАКАИН 3%) */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="mb-3">
				<label className="block text-[11px] font-bold text-[var(--muted,#64748b)] uppercase mb-1.5">
					Препарат местного анестетика:
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="anesthesia-drug-selector">
					{(["articaine_4", "mepivacaine_3"] as const).map((drugId) => {
						const d = PEDIATRIC_ANESTHETIC_SPECS[drugId];
						const isSelected = selectedDrugId === drugId;
						return (
							<button
								key={drugId}
								type="button"
								onClick={() => setSelectedDrugId(drugId)}
								className={`min-h-[44px] sm:min-h-[38px] p-2.5 rounded-xl border text-left transition cursor-pointer select-none active:scale-[0.99] ${
									isSelected
										? "border-teal-600 bg-teal-50/90 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-2 ring-teal-500/30 shadow-xs"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`anesthesia-drug-btn-${drugId}`}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="font-extrabold text-xs">{d.nameRu}</span>
									{isSelected && <Check className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />}
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5 flex items-center justify-between">
									<span>{d.tradeNamesRu}</span>
									<span className="font-bold font-mono text-teal-700 dark:text-teal-400">
										макс {d.maxDoseMgPerKg} мг/кг
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ВЕС РЕБЕНКА (КГ) И КОЛИЧЕСТВО ВВЕДЕННЫХ КАРПУЛ */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
				{/* Вес ребенка */}
				<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-2.5">
					<div className="flex items-center justify-between mb-1.5">
						<label htmlFor="pediatric-weight-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Вес ребенка:
						</label>
						<span className="text-xs font-mono font-black text-teal-700 dark:text-teal-400">
							{weightKg} кг
						</span>
					</div>
					<div className="flex items-center gap-1.5 mb-2">
						<input
							id="pediatric-weight-input"
							type="number"
							min={5}
							max={80}
							step={1}
							value={weightKg}
							onChange={(e) => setWeightKg(Math.max(5, Math.min(80, Number(e.target.value) || 20)))}
							className="h-8 w-20 px-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-mono font-extrabold text-[var(--ink,#0f172a)] text-center focus:border-teal-500 focus:outline-hidden"
							data-testid="input-patient-weight-kg"
						/>
						<span className="text-xs text-[var(--muted,#64748b)]">кг</span>
					</div>

					{/* Быстрые кнопки веса */}
					<div className="flex flex-wrap gap-1">
						{[12, 16, 20, 25, 30, 40].map((w) => (
							<button
								key={w}
								type="button"
								onClick={() => setWeightKg(w)}
								className={`h-6 px-1.5 rounded text-[11px] font-mono font-bold border transition cursor-pointer ${
									weightKg === w
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
								}`}
								data-testid={`quick-weight-${w}`}
							>
								{w} кг
							</button>
						))}
					</div>
				</div>

				{/* Доза в карпулах */}
				<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-2.5">
					<div className="flex items-center justify-between mb-1.5">
						<label htmlFor="pediatric-carpules-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Введено анестетика:
						</label>
						<span className="text-xs font-mono font-black text-teal-700 dark:text-teal-400">
							{carpules} карп. ({calculation.totalDoseAdministeredMg} мг)
						</span>
					</div>

					<div className="flex items-center gap-1.5 mb-2">
						<input
							id="pediatric-carpules-input"
							type="number"
							min={0.1}
							max={4.0}
							step={0.1}
							value={carpules}
							onChange={(e) => setCarpules(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
							className="h-8 w-20 px-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-mono font-extrabold text-[var(--ink,#0f172a)] text-center focus:border-teal-500 focus:outline-hidden"
							data-testid="input-anesthesia-carpules"
						/>
						<span className="text-xs text-[var(--muted,#64748b)]">карп. ({calculation.totalVolumeMl} мл)</span>
					</div>

					{/* Быстрые кнопки карпул */}
					<div className="flex flex-wrap gap-1">
						{[0.25, 0.5, 1.0, 1.5, 2.0].map((c) => (
							<button
								key={c}
								type="button"
								onClick={() => setCarpules(c)}
								className={`h-6 px-1.5 rounded text-[11px] font-mono font-bold border transition cursor-pointer ${
									carpules === c
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
								}`}
								data-testid={`quick-carpule-${c}`}
							>
								{c} карп
							</button>
						))}
						<button
							type="button"
							onClick={handleSetMaxSafeDose}
							className="h-6 px-1.5 rounded text-[10px] font-bold border border-teal-500/40 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition cursor-pointer"
							title={`Установить максимальную безопасную дозу: ${calculation.maxSafeCarpulesCount} карп.`}
							data-testid="btn-set-max-safe-dose"
						>
							Макс: {calculation.maxSafeCarpulesCount} к.
						</button>
					</div>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* МГНОВЕННЫЙ КРАСНЫЙ АЛЕРТ И БЛОКИРОВКА ТОКСИЧЕСКОЙ ДОЗЫ */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			{calculation.isOverdose && (
				<div
					className="mb-3 rounded-xl border-2 border-rose-600 bg-rose-50 dark:bg-rose-950/60 p-3 text-rose-950 dark:text-rose-100 shadow-md animate-in fade-in duration-200"
					data-testid="anesthesia-toxic-overdose-alert"
				>
					<div className="flex items-start gap-2.5">
						<AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" />
						<div className="space-y-1 min-w-0">
							<div className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">
								⛔ ПРЕВЫШЕНИЕ ТОКСИЧЕСКОЙ ДОЗЫ АНЕСТЕТИКА! БЛОКИРОВКА!
							</div>
							<p className="text-xs leading-relaxed font-semibold">
								Введено <span className="underline font-mono">{calculation.totalDoseAdministeredMg} мг</span> ({calculation.carpulesAdministered} карп.) при максимально допустимой дозе <span className="font-mono">{calculation.maxAllowedTotalDoseMg} мг</span> (лимит {drug.maxDoseMgPerKg} мг/кг на вес {weightKg} кг).
							</p>
							<div className="text-[11px] font-bold bg-rose-200/60 dark:bg-rose-900/60 px-2 py-1 rounded inline-block">
								Безопасный максимум для этого ребенка: не более {calculation.maxSafeCarpulesCount} карпул(ы)!
							</div>
						</div>
					</div>
				</div>
			)}

			{calculation.isUnderAge && !calculation.isOverdose && (
				<div
					className="mb-3 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2"
					data-testid="anesthesia-underage-alert"
				>
					<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span>
						Внимание: препарат противопоказан детям в возрасте до {drug.minAgeYears} лет (текущий возраст: {patientAgeYears} лет).
					</span>
				</div>
			)}

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ПРОГРЕСС-БАР РАСХОДА ДОЗЫ И ПАНЕЛЬ ДЕЙСТВИЙ */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="mb-3">
				<div className="flex items-center justify-between text-xs mb-1">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)]">Расход допустимой дозы (MRD):</span>
					<span className="font-mono font-extrabold text-xs">
						{calculation.totalDoseAdministeredMg} / {calculation.maxAllowedTotalDoseMg} мг ({calculation.doseUtilizationPercent}%)
					</span>
				</div>
				<div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
					<div
						className={`h-full transition-all duration-300 ${
							calculation.isOverdose
								? "bg-rose-600"
								: calculation.doseUtilizationPercent > 80
									? "bg-amber-500"
									: "bg-emerald-500"
						}`}
						style={{ width: `${Math.min(100, calculation.doseUtilizationPercent)}%` }}
						data-testid="anesthesia-utilization-bar"
					/>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* КНОПКА ПРИМЕНЕНИЯ В ПРОТОКОЛ (С БЛОКИРОВКОЙ ПРИ ОВЕРДОЗЕ) */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
				<div className="text-[11px] text-[var(--muted,#64748b)] min-w-0">
					MRD {drug.shortLabelRu}: макс. {calculation.maxSafeCarpulesCount} карп. ({calculation.maxAllowedTotalDoseMg} мг)
				</div>

				<button
					type="button"
					onClick={handleApplyAnesthesia}
					disabled={calculation.isOverdose}
					className={`min-h-[36px] sm:h-8 px-3 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer select-none shadow-xs active:scale-95 ${
						calculation.isOverdose
							? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-60"
							: "bg-teal-600 hover:bg-teal-700 text-white"
					}`}
					title={calculation.isOverdose ? "Блокировка: превышена токсическая доза!" : "Внести расчет дозы анестезии в дневник 043/у"}
					data-testid="btn-apply-anesthesia-protocol"
				>
					{calculation.isOverdose ? (
						<>
							<ShieldAlert className="h-3.5 w-3.5" />
							<span>Блокировка овердоза</span>
						</>
					) : (
						<>
							<Zap className="h-3.5 w-3.5" />
							<span>Внести анестезию в 043/у</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};

export default PediatricAnesthesiaCalculator;
