/**
 * apps/web/src/components/settings/doctor/DoctorAnesthesiaToxicityCalculator.tsx
 *
 * Калькулятор токсичности местных анестетиков и предельного числа карпул
 * артикаина 1:100 000 и 1:200 000 с учетом массы тела пациента и соматического статуса.
 *
 * Клинические стандарты РФ и СтАР:
 * - Артикаин 4%: 7.0 мг/кг (абсолютный потолок 500 мг).
 * - Объем карпулы: 1.7 мл (68 мг артикаина на карпулу).
 * - Эпинефрин 1:100 000: 0.017 мг на карпулу (потолок для соматически здоровых 0.2 мг, для кардиориска — 0.04 мг).
 * - Эпинефрин 1:200 000: 0.0085 мг на карпулу.
 * - Мепивакаин 3%: 4.4 мг/кг (абсолютный потолок 300 мг, карпула 1.7 мл = 51 мг).
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (1-клик расчёт и копирование в 043/у).
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Check,
	Copy,
	HeartPulse,
	Info,
	Scale,
	ShieldAlert,
	ShieldCheck,
	Syringe,
} from "lucide-react";
import { showToast } from "../../GlobalToast";

export type AnestheticCalcDrug =
	| "articaine_100k"
	| "articaine_200k"
	| "scandonest_3"
	| "lidocaine_2";

export interface AnestheticDrugSpec {
	readonly key: AnestheticCalcDrug;
	readonly name: string;
	readonly commercialTradeNames: string;
	readonly concentrationPct: number;
	readonly mgPerMl: number;
	readonly maxDoseMgPerKg: number;
	readonly absoluteMaxDoseMg: number;
	readonly epinephrineRatio: string;
	readonly epinephrineMgPerMl: number;
	readonly defaultCarpuleVolumeMl: number;
	readonly isAdrenalineFree: boolean;
	readonly recommendedSpecialty: string;
}

export const ANESTHETIC_SPECS: Record<AnestheticCalcDrug, AnestheticDrugSpec> = {
	articaine_100k: {
		key: "articaine_100k",
		name: "Артикаин 4% + Эпинефрин 1:100 000",
		commercialTradeNames: "Ультракаин Д-С форте, Септанест, Убистезин форте",
		concentrationPct: 4,
		mgPerMl: 40,
		maxDoseMgPerKg: 7.0,
		absoluteMaxDoseMg: 500,
		epinephrineRatio: "1:100 000",
		epinephrineMgPerMl: 0.01,
		defaultCarpuleVolumeMl: 1.7,
		isAdrenalineFree: false,
		recommendedSpecialty: "Хирургия, удаление, острый пульпит",
	},
	articaine_200k: {
		key: "articaine_200k",
		name: "Артикаин 4% + Эпинефрин 1:200 000",
		commercialTradeNames: "Ультракаин Д-С, Убистезин 1:200k",
		concentrationPct: 4,
		mgPerMl: 40,
		maxDoseMgPerKg: 7.0,
		absoluteMaxDoseMg: 500,
		epinephrineRatio: "1:200 000",
		epinephrineMgPerMl: 0.005,
		defaultCarpuleVolumeMl: 1.7,
		isAdrenalineFree: false,
		recommendedSpecialty: "Терапия, эстетическая реставрация, пародонтология",
	},
	scandonest_3: {
		key: "scandonest_3",
		name: "Мепивакаин 3% (без вазоконстриктора)",
		commercialTradeNames: "Скандонест 3%, Мепивастезин",
		concentrationPct: 3,
		mgPerMl: 30,
		maxDoseMgPerKg: 4.4,
		absoluteMaxDoseMg: 300,
		epinephrineRatio: "отсутствует",
		epinephrineMgPerMl: 0,
		defaultCarpuleVolumeMl: 1.7,
		isAdrenalineFree: true,
		recommendedSpecialty: "Кардиориск, гипертония, глаукома, беременность",
	},
	lidocaine_2: {
		key: "lidocaine_2",
		name: "Лидокаин 2% (с эпинефрином 1:100 000)",
		commercialTradeNames: "Ксилонор 2%, Лидокаин 2%",
		concentrationPct: 2,
		mgPerMl: 20,
		maxDoseMgPerKg: 4.4,
		absoluteMaxDoseMg: 300,
		epinephrineRatio: "1:100 000",
		epinephrineMgPerMl: 0.01,
		defaultCarpuleVolumeMl: 1.7,
		isAdrenalineFree: false,
		recommendedSpecialty: "Проводниковая анестезия, инфильтрация",
	},
};

export const HEALTHY_MAX_EPINEPHRINE_MG = 0.2; // 200 мкг
export const CARDIO_MAX_EPINEPHRINE_MG = 0.04; // 40 мкг (ограничение кардиоваскулярного риска)

export interface AnestheticCalculationResult {
	readonly drug: AnestheticDrugSpec;
	readonly patientWeightKg: number;
	readonly carpulesCount: number;
	readonly carpuleVolumeMl: number;
	readonly totalVolumeMl: number;
	readonly totalDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeCarpules: number;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly maxSafeCarpulesByEpinephrine: number | null;
	readonly limitingFactor: "active_substance" | "epinephrine";
	readonly safetyPercentage: number;
	readonly safetyLevel: "safe" | "caution" | "warning" | "danger";
	readonly warningMessage: string | null;
}

export function computeAnestheticToxicity(params: {
	drugKey: AnestheticCalcDrug;
	patientWeightKg: number;
	carpulesCount: number;
	hasCardiovascularRisk: boolean;
	carpuleVolumeMl?: number;
}): AnestheticCalculationResult {
	const spec = ANESTHETIC_SPECS[params.drugKey] || ANESTHETIC_SPECS.articaine_100k;
	const carpuleVol = params.carpuleVolumeMl || spec.defaultCarpuleVolumeMl;
	const weight = Math.max(5, Math.min(200, params.patientWeightKg));
	const carpules = Math.max(0, params.carpulesCount);

	// 1. Расчет по действующему веществу
	const weightBasedMaxMg = weight * spec.maxDoseMgPerKg;
	const maxSafeDoseMg = Math.min(weightBasedMaxMg, spec.absoluteMaxDoseMg);
	const mgPerCarpule = spec.mgPerMl * carpuleVol;
	const maxCarpulesBySubstance = Number((maxSafeDoseMg / mgPerCarpule).toFixed(1));

	const totalVolumeMl = Number((carpules * carpuleVol).toFixed(2));
	const totalDoseMg = Number((totalVolumeMl * spec.mgPerMl).toFixed(1));

	// 2. Расчет по эпинефрину (вазоконстриктору)
	const maxEpiMg = params.hasCardiovascularRisk
		? CARDIO_MAX_EPINEPHRINE_MG
		: HEALTHY_MAX_EPINEPHRINE_MG;
	const epiPerCarpule = spec.epinephrineMgPerMl * carpuleVol;
	const totalEpinephrineMg = Number((carpules * epiPerCarpule).toFixed(4));

	let maxCarpulesByEpi: number | null = null;
	if (!spec.isAdrenalineFree && epiPerCarpule > 0) {
		maxCarpulesByEpi = Number((maxEpiMg / epiPerCarpule).toFixed(1));
	}

	// 3. Лимитирующий фактор (наименьшее число карпул)
	let limitingFactor: "active_substance" | "epinephrine" = "active_substance";
	let finalMaxSafeCarpules = maxCarpulesBySubstance;

	if (maxCarpulesByEpi !== null && maxCarpulesByEpi < maxCarpulesBySubstance) {
		limitingFactor = "epinephrine";
		finalMaxSafeCarpules = maxCarpulesByEpi;
	}

	// 4. Процент безопасности и уровень опасности
	const substancePct = maxSafeDoseMg > 0 ? (totalDoseMg / maxSafeDoseMg) * 100 : 0;
	const epiPct = maxEpiMg > 0 && !spec.isAdrenalineFree ? (totalEpinephrineMg / maxEpiMg) * 100 : 0;
	const safetyPercentage = Math.round(Math.max(substancePct, epiPct));

	let safetyLevel: "safe" | "caution" | "warning" | "danger" = "safe";
	let warningMessage: string | null = null;

	if (safetyPercentage > 100) {
		safetyLevel = "danger";
		if (limitingFactor === "epinephrine" && epiPct > 100) {
			warningMessage = `Внимание! Превышен порог эпинефрина (${totalEpinephrineMg} мг из макс. ${maxEpiMg} мг). Риск гипертонического криза и тахикардии!`;
		} else {
			warningMessage = `Опасность! Превышена токсическая доза ${spec.name} (${totalDoseMg} мг из макс. ${maxSafeDoseMg} мг). Риск судорог и LAST-синдрома!`;
		}
	} else if (safetyPercentage >= 85) {
		safetyLevel = "warning";
		warningMessage = `Внимание: доза близка к предельной (${safetyPercentage}% от лимита). Рекомендуется контроль пульса и АД.`;
	} else if (safetyPercentage >= 60) {
		safetyLevel = "caution";
		warningMessage = `Умеренная нагрузка (${safetyPercentage}% от максимума).`;
	}

	return {
		drug: spec,
		patientWeightKg: weight,
		carpulesCount: carpules,
		carpuleVolumeMl: carpuleVol,
		totalVolumeMl,
		totalDoseMg,
		maxSafeDoseMg,
		maxSafeCarpules: finalMaxSafeCarpules,
		totalEpinephrineMg,
		maxSafeEpinephrineMg: maxEpiMg,
		maxSafeCarpulesByEpinephrine: maxCarpulesByEpi,
		limitingFactor,
		safetyPercentage,
		safetyLevel,
		warningMessage,
	};
}

export function DoctorAnesthesiaToxicityCalculator() {
	const [drugKey, setDrugKey] = useState<AnestheticCalcDrug>("articaine_100k");
	const [patientWeightKg, setPatientWeightKg] = useState<number>(70);
	const [carpulesCount, setCarpulesCount] = useState<number>(1);
	const [hasCardiovascularRisk, setHasCardiovascularRisk] = useState<boolean>(false);

	const result = useMemo(() => {
		return computeAnestheticToxicity({
			drugKey,
			patientWeightKg,
			carpulesCount,
			hasCardiovascularRisk,
		});
	}, [drugKey, patientWeightKg, carpulesCount, hasCardiovascularRisk]);

	const handleCopyClinicalNote = () => {
		const epiText = result.drug.isAdrenalineFree
			? "без вазоконстриктора"
			: `эпинефрин ${result.drug.epinephrineRatio} (${result.totalEpinephrineMg} мг)`;
		const note = `Местная анестезия: ${result.drug.name} — ${result.carpulesCount} карп. (${result.totalVolumeMl} мл, ${result.totalDoseMg} мг артикаина, ${epiText}). Вес пациента: ${result.patientWeightKg} кг. Лимит безопасности: ${result.safetyPercentage}% от макс. допустимой дозы (макс. ${result.maxSafeCarpules} карп.). Аспирационная проба (-). Осложнений нет.`;
		navigator.clipboard.writeText(note);
		showToast("Клиническая запись об анестезии скопирована в буфер", "success");
	};

	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4" data-testid="anesthesia-toxicity-calculator">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
						<Syringe size={18} />
					</div>
					<div>
						<h4 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0">
							Анестезиологический лимит токсичности (Артикаин 1:100k / 1:200k)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Расчёт предельного числа карпул по массе тела (кг) и соматическому статусу пациента
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopyClinicalNote}
						className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] flex items-center gap-1.5 cursor-pointer min-h-[36px]"
						title="Скопировать готовую протокольную запись для 043/у"
					>
						<Copy size={13} className="text-teal-600" />
						<span>Копировать в 043/у</span>
					</button>
				</div>
			</div>

			{/* Interactive Inputs Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				{/* 1. Препарат */}
				<div className="space-y-1">
					<label className="text-xs font-bold text-[var(--ink)] block">
						Анестетик:
					</label>
					<select
						value={drugKey}
						onChange={(e) => setDrugKey(e.target.value as AnestheticCalcDrug)}
						className="w-full px-2.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
					>
						<option value="articaine_100k">Артикаин 1:100 000 (Форте)</option>
						<option value="articaine_200k">Артикаин 1:200 000 (Щадящий)</option>
						<option value="scandonest_3">Мепивакаин 3% (без адреналина)</option>
						<option value="lidocaine_2">Лидокаин 2% + 1:100k</option>
					</select>
					<span className="text-[10px] text-[var(--muted)] block truncate">
						{result.drug.commercialTradeNames}
					</span>
				</div>

				{/* 2. Масса тела */}
				<div className="space-y-1">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
							<Scale size={13} className="text-teal-600" />
							<span>Вес пациента:</span>
						</label>
						<span className="text-xs font-mono font-bold text-[var(--ink)]">
							{patientWeightKg} кг
						</span>
					</div>
					<input
						type="range"
						min={10}
						max={130}
						step={1}
						value={patientWeightKg}
						onChange={(e) => setPatientWeightKg(Number(e.target.value))}
						className="w-full accent-teal-600 cursor-pointer"
					/>
					<div className="flex items-center gap-1">
						{[20, 50, 70, 90].map((w) => (
							<button
								key={w}
								type="button"
								onClick={() => setPatientWeightKg(w)}
								className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
									patientWeightKg === w
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
								}`}
							>
								{w} кг
							</button>
						))}
					</div>
				</div>

				{/* 3. Количество карпул */}
				<div className="space-y-1">
					<label className="text-xs font-bold text-[var(--ink)] block">
						Введено карпул (1.7 мл):
					</label>
					<div className="flex items-center gap-1.5">
						{[1, 2, 3, 4, 5].map((cnt) => (
							<button
								key={cnt}
								type="button"
								onClick={() => setCarpulesCount(cnt)}
								className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer min-h-[34px] ${
									carpulesCount === cnt
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
								}`}
							>
								{cnt}
							</button>
						))}
					</div>
					<span className="text-[10px] text-[var(--muted)] block">
						Объём: {result.totalVolumeMl} мл • Доза: {result.totalDoseMg} мг
					</span>
				</div>

				{/* 4. Кардиоваскулярный риск */}
				<div className="space-y-1">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
						<HeartPulse size={13} className="text-rose-500" />
						<span>Соматический статус:</span>
					</label>
					<button
						type="button"
						onClick={() => setHasCardiovascularRisk(!hasCardiovascularRisk)}
						className={`w-full p-2 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer min-h-[44px] sm:min-h-[36px] flex items-center justify-between ${
							hasCardiovascularRisk
								? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
						}`}
					>
						<span>
							{hasCardiovascularRisk
								? "Кардиориск (макс 0.04 мг адреналина)"
								: "Здоров (макс 0.2 мг адреналина)"}
						</span>
						<span
							className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
								hasCardiovascularRisk ? "bg-rose-600 border-rose-600" : "border-[var(--line)]"
							}`}
						/>
					</button>
					<span className="text-[10px] text-[var(--muted)] block">
						Гипертония, ИБС, аритмия, глаукома
					</span>
				</div>
			</div>

			{/* Gauge and Safety Visual Output */}
			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						{result.safetyLevel === "safe" && (
							<ShieldCheck size={20} className="text-emerald-500 shrink-0" />
						)}
						{result.safetyLevel === "caution" && (
							<Info size={20} className="text-amber-500 shrink-0" />
						)}
						{result.safetyLevel === "warning" && (
							<AlertTriangle size={20} className="text-orange-500 shrink-0" />
						)}
						{result.safetyLevel === "danger" && (
							<ShieldAlert size={20} className="text-rose-600 shrink-0" />
						)}
						<div>
							<span className="text-xs font-bold text-[var(--ink)] block">
								Предельно допустимое число карпул: <strong className="text-teal-600 text-sm font-mono">{result.maxSafeCarpules} шт.</strong> ({result.maxSafeDoseMg} мг)
							</span>
							<span className="text-[11px] text-[var(--muted)]">
								Лимитирующий фактор: {result.limitingFactor === "epinephrine" ? "доза адреналина" : "доза действующего вещества"}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
							Использовано: {result.safetyPercentage}%
						</span>
					</div>
				</div>

				{/* Progress Track */}
				<div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
					<div
						className={`h-full transition-all duration-300 ${
							result.safetyPercentage > 100
								? "bg-rose-600"
								: result.safetyPercentage >= 85
									? "bg-orange-500"
									: result.safetyPercentage >= 60
										? "bg-amber-500"
										: "bg-emerald-500"
						}`}
						style={{ width: `${Math.min(100, result.safetyPercentage)}%` }}
					/>
				</div>

				{/* Alert Messages */}
				{result.warningMessage && (
					<div
						className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
							result.safetyLevel === "danger"
								? "bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200"
								: "bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200"
						}`}
					>
						<AlertTriangle size={15} className="shrink-0" />
						<span>{result.warningMessage}</span>
					</div>
				)}
			</div>
		</div>
	);
}
