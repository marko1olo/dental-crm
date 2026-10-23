/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC ANESTHESIA CHAIRSIDE SELECTOR (CANONICAL SSOT FACADE)
 * Fast 1-Click Pediatric Anesthesia Dosage & Safety Control
 * Integrated with apps/web/src/components/anesthesia SSOT Catalog
 * Mandate 8e: Doctor Autonomy (Zero Disabled Blocks)
 * Mandate 8ap: Typed Allergy Check without Regex Parsing
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ShieldCheck, ShieldAlert, Sparkles, Syringe } from "lucide-react";
import { estimatePediatricWeightKg } from "@dental/shared";
import type { SomaticRiskProfile } from "../visit/anesthesiaCalculatorEngine";
import { DENTAL_ANESTHETICS } from "../anesthesia/anesthesiaCatalog";
import { calculateAnesthesiaSafety } from "../anesthesia/engine/anesthesiaDoseCalculator";
import { showToast } from "../GlobalToast";

export type PediatricAnestheticDrugId = "articaine_4" | "mepivacaine_3";

export interface PediatricAnestheticSpec {
	readonly id: PediatricAnestheticDrugId;
	readonly ssotDrugId: string;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly tradeNamesRu: string;
	readonly concentrationPercent: number;
	readonly mgPerMl: number;
	readonly standardCarpuleVolumeMl: number;
	readonly mgPerCarpule: number;
	readonly maxDoseMgPerKg: number;
	readonly absoluteMaxDoseMg: number;
	readonly vasoconstrictorRu: string;
	readonly minAgeYears: number;
	readonly descriptionRu: string;
}

export const PEDIATRIC_ANESTHETIC_SPECS: Readonly<Record<PediatricAnestheticDrugId, PediatricAnestheticSpec>> = {
	articaine_4: {
		id: "articaine_4",
		ssotDrugId: "articaine_1_200k",
		nameRu: "Артикаин 4% с эпинефрином 1:200 000",
		shortLabelRu: "Артикаин 4% (макс 5 мг/кг)",
		tradeNamesRu: "Ультракаин Д-С / Септанест / Убистезин",
		concentrationPercent: 4.0,
		mgPerMl: 40.0,
		standardCarpuleVolumeMl: 1.7,
		mgPerCarpule: 68.0,
		maxDoseMgPerKg: 5.0,
		absoluteMaxDoseMg: 500.0,
		vasoconstrictorRu: "Эпинефрин 1:200 000 (0.0085 мг/карп)",
		minAgeYears: 4,
		descriptionRu: "Препарат выбора для детской инфильтрационной и проводниковой анестезии от 4 лет.",
	},
	mepivacaine_3: {
		id: "mepivacaine_3",
		ssotDrugId: "mepivacaine_plain",
		nameRu: "Мепивакаин 3% без вазоконстриктора",
		shortLabelRu: "Мепивакаин 3% (макс 4.4 мг/кг)",
		tradeNamesRu: "Скандонест 3% / Мепивастезин",
		concentrationPercent: 3.0,
		mgPerMl: 30.0,
		standardCarpuleVolumeMl: 1.7,
		mgPerCarpule: 51.0,
		maxDoseMgPerKg: 4.4,
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
	readonly isContraindicated: boolean;
	readonly contraindicationReasonRu?: string | undefined;
	readonly alertMessageRu?: string | undefined;
	readonly formattedClinicalNote: string;
	readonly formattedText043: string;
}

export interface PediatricAnesthesiaCalculatorProps {
	readonly initialWeightKg?: number | undefined;
	readonly initialCarpules?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly allergies?: string | undefined;
	readonly onCalculationChange?: ((result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	readonly onApplyToProtocol?: ((formattedText: string, result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * Нормализованная проверка противопоказаний к анестетикам (Мандат 8ap: искоренение regex-парсинга)
 */
export function checkPediatricAnesthesiaContraindications(
	somaticProfile?: SomaticRiskProfile | undefined,
	allergies?: string | undefined,
): { isArticaineContraindicated: boolean; isMepivacaineContraindicated: boolean; contraindicationReasonRu?: string } {
	let articaineBlocked = Boolean(
		somaticProfile?.hasArticaineAllergy ||
		somaticProfile?.hasSulfiteAllergy ||
		somaticProfile?.hasBronchialAsthma ||
		somaticProfile?.hasThyrotoxicosis,
	);

	let mepivacaineBlocked = Boolean(somaticProfile?.hasMepivacaineAllergy);

	if (typeof allergies === "string" && allergies.trim()) {
		const lower = allergies.toLowerCase();
		const articaineTokens = ["артикаин", "ультракаин", "септанест", "убистезин", "сульфит", "метабисульфит", "астма"];
		const mepivacaineTokens = ["мепивакаин", "скандонест", "мепивастезин"];

		if (articaineTokens.some((tok) => lower.includes(tok))) {
			articaineBlocked = true;
		}
		if (mepivacaineTokens.some((tok) => lower.includes(tok))) {
			mepivacaineBlocked = true;
		}
	}

	let contraindicationReasonRu: string | undefined;
	if (articaineBlocked) {
		contraindicationReasonRu = "ПРОТИВОПОКАЗАНИЕ: В анамнезе указана аллергия на артикаин/сульфиты или астма/тиреотоксикоз! Рекомендуется Мепивакаин 3% без вазоконстриктора.";
	} else if (mepivacaineBlocked) {
		contraindicationReasonRu = "ПРОТИВОПОКАЗАНИЕ: В анамнезе указана аллергия на мепивакаин (скандонест)!";
	}

	return {
		isArticaineContraindicated: articaineBlocked,
		isMepivacaineContraindicated: mepivacaineBlocked,
		contraindicationReasonRu,
	};
}

export function calculatePediatricAnesthesia(params: {
	readonly drug: PediatricAnestheticSpec;
	readonly selectedDrugId: PediatricAnestheticDrugId;
	readonly weightKg: number;
	readonly carpules: number;
	readonly patientAgeYears: number;
	readonly articaineContraindicated: boolean;
	readonly mepivacaineContraindicated: boolean;
}): PediatricAnesthesiaCalculationResult {
	const {
		drug,
		selectedDrugId,
		weightKg,
		carpules,
		patientAgeYears,
		articaineContraindicated,
		mepivacaineContraindicated,
	} = params;

	const safeWeight = Math.max(5, Math.min(120, weightKg));
	const mrdPerKg = drug.maxDoseMgPerKg;
	const maxAllowedTotalDoseMg = Number(Math.min(drug.absoluteMaxDoseMg, safeWeight * mrdPerKg).toFixed(1));

	const singleCarpuleDoseMg = drug.mgPerCarpule;
	const totalVolumeMl = Number((carpules * drug.standardCarpuleVolumeMl).toFixed(2));
	const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));

	const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / singleCarpuleDoseMg).toFixed(2));
	const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));

	const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;
	const isUnderAge = patientAgeYears < drug.minAgeYears;

	const isContraindicated =
		(selectedDrugId === "articaine_4" && articaineContraindicated) ||
		(selectedDrugId === "mepivacaine_3" && mepivacaineContraindicated);

	const contraindicationReasonRu =
		selectedDrugId === "articaine_4" && articaineContraindicated
			? "ПРОТИВОПОКАЗАНИЕ: В анамнезе указана аллергия на артикаин/сульфиты или астма/тиреотоксикоз! Рекомендуется Мепивакаин 3% без вазоконстриктора."
			: selectedDrugId === "mepivacaine_3" && mepivacaineContraindicated
				? "ПРОТИВОПОКАЗАНИЕ: В анамнезе указана аллергия на мепивакаин (скандонест)!"
				: undefined;

	let alertMessageRu: string | undefined;
	if (isContraindicated) {
		alertMessageRu = contraindicationReasonRu;
	} else if (isOverdose) {
		alertMessageRu = `ВНИМАНИЕ: Превышение расчетной дозы (${totalDoseAdministeredMg} мг > МРД ${maxAllowedTotalDoseMg} мг на ${safeWeight} кг). Введено под личную ответственность врача.`;
	} else if (isUnderAge) {
		alertMessageRu = `Препарат с осторожностью детям до ${drug.minAgeYears} лет.`;
	}

	const safetyWarningLine = isContraindicated
		? `\n• ВНИМАНИЕ: Противопоказание по соматическому анамнезу (${contraindicationReasonRu}). Введено по решению лечащего врача под личную ответственность.`
		: isOverdose
			? `\n• ВНИМАНИЕ: Превышение расчетной дозы (${totalDoseAdministeredMg} мг > МРД ${maxAllowedTotalDoseMg} мг на ${safeWeight} кг). Введено по клиническим показаниям под личную ответственность врача.`
			: "";

	const formattedClinicalNote = [
		`Анестезиологическое пособие: ${drug.nameRu}.`,
		`• Введено: ${carpules} карп. (${totalVolumeMl} мл / ${totalDoseAdministeredMg} мг активного вещества).`,
		`• Вес ребенка: ${safeWeight} кг. Предельно допустимая доза (MRD): ${maxAllowedTotalDoseMg} мг (${mrdPerKg} мг/кг).`,
		`• Расход дозы: ${doseUtilizationPercent}% (макс. ${maxSafeCarpulesCount} карп.) ${isOverdose ? "— ПРЕВЫШЕНИЕ МРД" : "— ДОЗА БЕЗОПАСНА"}.`,
		`• Вазоконстриктор: ${drug.vasoconstrictorRu}.${safetyWarningLine}`,
	].join("\n");

	return {
		drug,
		patientWeightKg: safeWeight,
		carpulesAdministered: carpules,
		totalVolumeMl,
		maxAllowedTotalDoseMg,
		totalDoseAdministeredMg,
		maxSafeCarpulesCount,
		doseUtilizationPercent,
		isSafe: !isOverdose && !isUnderAge && !isContraindicated,
		isOverdose,
		isUnderAge,
		isContraindicated,
		contraindicationReasonRu,
		alertMessageRu,
		formattedClinicalNote,
		formattedText043: formattedClinicalNote,
	};
}

export const PediatricAnesthesiaCalculator: React.FC<PediatricAnesthesiaCalculatorProps> = ({
	initialWeightKg,
	initialCarpules = 1.5,
	patientAgeYears = 6,
	somaticProfile,
	allergies,
	onCalculationChange,
	onApplyToProtocol,
	className = "",
}) => {
	const resolvedInitialWeight = useMemo(() => {
		if (typeof initialWeightKg === "number" && initialWeightKg > 0) return initialWeightKg;
		return estimatePediatricWeightKg(patientAgeYears);
	}, [initialWeightKg, patientAgeYears]);

	const {
		isArticaineContraindicated,
		isMepivacaineContraindicated,
		contraindicationReasonRu,
	} = useMemo(
		() => checkPediatricAnesthesiaContraindications(somaticProfile, allergies),
		[somaticProfile, allergies],
	);

	const [selectedDrugId, setSelectedDrugId] = useState<PediatricAnestheticDrugId>(() => {
		return isArticaineContraindicated && !isMepivacaineContraindicated ? "mepivacaine_3" : "articaine_4";
	});

	useEffect(() => {
		if (isArticaineContraindicated && !isMepivacaineContraindicated && selectedDrugId === "articaine_4") {
			setSelectedDrugId("mepivacaine_3");
		}
	}, [isArticaineContraindicated, isMepivacaineContraindicated, selectedDrugId]);

	const [weightKg, setWeightKg] = useState<number>(resolvedInitialWeight);
	useEffect(() => setWeightKg(resolvedInitialWeight), [resolvedInitialWeight]);

	const [carpules, setCarpules] = useState<number>(initialCarpules);
	const drug = PEDIATRIC_ANESTHETIC_SPECS[selectedDrugId];

	const calculation = useMemo(() => {
		return calculatePediatricAnesthesia({
			drug,
			selectedDrugId,
			weightKg,
			carpules,
			patientAgeYears,
			articaineContraindicated: isArticaineContraindicated,
			mepivacaineContraindicated: isMepivacaineContraindicated,
		});
	}, [drug, selectedDrugId, weightKg, carpules, patientAgeYears, isArticaineContraindicated, isMepivacaineContraindicated]);

	useEffect(() => {
		onCalculationChange?.(calculation);
	}, [calculation, onCalculationChange]);

	const handleApplyAnesthesia = useCallback(() => {
		onApplyToProtocol?.(calculation.formattedClinicalNote, calculation);
		if (calculation.isContraindicated) {
			showToast(`Внимание: ${calculation.contraindicationReasonRu} (зафиксировано в карте)`, "warning", 4000);
		} else if (calculation.isOverdose) {
			showToast(
				`Внимание: превышение расчетной дозы МРД (${calculation.totalDoseAdministeredMg} мг > ${calculation.maxAllowedTotalDoseMg} мг). Зафиксировано в карте.`,
				"warning",
				4000,
			);
		} else {
			showToast(`Анестезия ${drug.nameRu} (${calculation.carpulesAdministered} карп.) внесена в карту`, "success", 2500);
		}
	}, [calculation, drug.nameRu, onApplyToProtocol]);

	const handleSetMaxSafeDose = useCallback(() => {
		const safeCarpules = Math.floor(calculation.maxSafeCarpulesCount * 4) / 4;
		const nextCarpules = Math.max(0.25, safeCarpules);
		setCarpules(nextCarpules);
		showToast(`Установлена безопасная доза: ${nextCarpules} карп.`, "info", 2000);
	}, [calculation.maxSafeCarpulesCount]);

	return (
		<div
			className={`pediatric-anesthesia-calc rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-4 shadow-xs space-y-3 ${className}`.trim()}
			data-testid="pediatric-anesthesia-calculator"
		>
			{/* Верхняя строка: Заголовок и вес ребенка */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 shrink-0">
						<Syringe className="h-4 w-4" />
					</div>
					<div>
						<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink,#0f172a)]">
							Местная анестезия в детском приёме
						</h4>
						<p className="text-[11px] text-[var(--muted,#64748b)] font-medium">
							Расчет по массе тела: <span className="font-bold text-[var(--ink,#0f172a)]">{weightKg} кг</span> ({patientAgeYears} лет)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<label htmlFor="pediatric-weight-input" className="text-xs text-[var(--muted,#64748b)]">Вес:</label>
					<input
						id="pediatric-weight-input"
						type="number"
						min={5}
						max={100}
						value={weightKg}
						onChange={(e) => {
							const val = Number.parseFloat(e.target.value);
							if (!Number.isNaN(val) && val > 0) setWeightKg(val);
						}}
						className="h-7 w-16 px-2 text-xs font-bold text-center rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						title="Масса тела ребенка в кг"
					/>
					<span className="text-xs font-medium text-[var(--muted,#64748b)]">кг</span>
				</div>
			</div>

			{/* Выбор препарата: 2 быстрых пресета из SSOT каталога */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<button
					type="button"
					onClick={() => setSelectedDrugId("articaine_4")}
					className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-[0.98] ${
						selectedDrugId === "articaine_4"
							? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 ring-1 ring-teal-500/40"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)]"
					}`}
					title={PEDIATRIC_ANESTHETIC_SPECS.articaine_4.descriptionRu}
					data-testid="pediatric-drug-articaine"
				>
					<div className="min-w-0 pr-2">
						<div className="text-xs font-extrabold truncate">
							Артикаин 4% (1:200 000)
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)] truncate">
							Ультракаин Д-С / Септанест • макс. 5 мг/кг
						</div>
					</div>
					{isArticaineContraindicated ? (
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 shrink-0 flex items-center gap-1">
							<AlertTriangle className="h-3 w-3" />
							<span>Аллергия</span>
						</span>
					) : selectedDrugId === "articaine_4" ? (
						<Check className="h-4 w-4 text-teal-600 shrink-0" />
					) : null}
				</button>

				<button
					type="button"
					onClick={() => setSelectedDrugId("mepivacaine_3")}
					className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-[0.98] ${
						selectedDrugId === "mepivacaine_3"
							? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 ring-1 ring-teal-500/40"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)]"
					}`}
					title={PEDIATRIC_ANESTHETIC_SPECS.mepivacaine_3.descriptionRu}
					data-testid="pediatric-drug-mepivacaine"
				>
					<div className="min-w-0 pr-2">
						<div className="text-xs font-extrabold truncate">
							Мепивакаин 3% (без адреналина)
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)] truncate">
							Скандонест 3% • макс. 4.4 мг/кг
						</div>
					</div>
					{isMepivacaineContraindicated ? (
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 shrink-0 flex items-center gap-1">
							<AlertTriangle className="h-3 w-3" />
							<span>Аллергия</span>
						</span>
					) : selectedDrugId === "mepivacaine_3" ? (
						<Check className="h-4 w-4 text-teal-600 shrink-0" />
					) : null}
				</button>
			</div>

			{/* Экспресс-дозировка в 1 клик */}
			<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-bold text-[var(--muted,#64748b)] mr-1">Доза:</span>
					{[0.25, 0.5, 1.0, 1.5].map((d) => (
						<button
							key={d}
							type="button"
							onClick={() => setCarpules(d)}
							className={`h-7 px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer active:scale-95 ${
								carpules === d
									? "border-teal-500 bg-teal-600 text-white shadow-2xs"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)]"
							}`}
							title={`${d} карпулы (${(d * 1.7).toFixed(2)} мл)`}
							data-testid={`btn-pediatric-carpules-${d}`}
						>
							{d} карп. ({Math.round(d * drug.mgPerCarpule)} мг)
						</button>
					))}
				</div>

				<div className="text-xs font-semibold text-[var(--muted,#64748b)]">
					МРД: <span className="font-bold text-[var(--ink,#0f172a)]">{calculation.maxAllowedTotalDoseMg} мг</span> (макс. {calculation.maxSafeCarpulesCount} карп.)
				</div>
			</div>

			{/* Статус безопасности и действия */}
			<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2 min-w-0">
					{calculation.isOverdose ? (
						<div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800/60">
							<AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
							<span>Превышение МРД ({calculation.totalDoseAdministeredMg} мг &gt; {calculation.maxAllowedTotalDoseMg} мг)</span>
						</div>
					) : calculation.isContraindicated ? (
						<div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800/60">
							<ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
							<span>Противопоказание по анамнезу</span>
						</div>
					) : (
						<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800/60">
							<ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
							<span>Доза безопасна: {calculation.totalDoseAdministeredMg} мг ({calculation.doseUtilizationPercent}% МРД)</span>
						</div>
					)}

					{calculation.isOverdose && (
						<button
							type="button"
							onClick={handleSetMaxSafeDose}
							className="h-7 px-2 rounded-lg border border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
							data-testid="btn-reduce-to-safe-dose"
							title="Снизить до безопасной нормы"
						>
							<Sparkles className="h-3.5 w-3.5 text-teal-600" />
							<span>Снизить до нормы</span>
						</button>
					)}
				</div>

				{/* Кнопка внесения анестезии: НИКОГДА не disabled (Мандат 8e) */}
				<button
					type="button"
					onClick={handleApplyAnesthesia}
					className="h-8 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
					data-testid="btn-apply-anesthesia-protocol"
					title="Внести параметры анестезии в дневник визита"
				>
					<Check className="h-3.5 w-3.5 text-teal-600" />
					<span>Внести анестезию в протокол</span>
				</button>
			</div>
		</div>
	);
};

export default PediatricAnesthesiaCalculator;
