/**
 * @dental/web/components/anesthesia/AnesthesiaQuickBar.tsx
 * DENTE Chairside Anesthesia QuickBar SSOT (Mandates 8b, 8e, 8n, 8y, 8am, Apple HIG 8ze)
 * Unified monolithic component: fast 1-click presets, doctor autonomy, zero-bureaucracy.
 */

import { AlertTriangle, CheckCircle2, Share2, ShieldAlert, SlidersHorizontal, Syringe, X } from "lucide-react";
import React, { useId, useState } from "react";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import {
	CLINICAL_FAST_PRESETS,
	PRIMARY_ANESTHETIC_DRUGS,
	WEIGHT_PRESETS,
	WEIGHT_QUICK_PRESETS,
	type AnestheticDrugId,
	type ClinicalFastPresetItem,
	type InjectionTechniqueId,
	type PrimaryAnestheticDrug,
} from "./anesthesiaCatalog";
import {
	calculateAnesthesiaSafety,
	formatAnesthesiaPatientMemo,
	persistAnesthesiaLog,
	postQuickCarpuleWriteoff,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationResult,
	type AnesthesiaPatientMemoParams,
} from "./anesthesiaEngine";

if (typeof document !== "undefined") import("./anesthesia.css");

export { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../lib/clinicalProtocolsReception";
export type { AnesthesiaCalculationResult, AnesthesiaPatientMemoParams };
export { formatAnesthesiaPatientMemo, resolveClinicalDefaultWeightKg };
export {
	CLINICAL_FAST_PRESETS,
	PRIMARY_ANESTHETIC_DRUGS,
	WEIGHT_PRESETS,
	WEIGHT_QUICK_PRESETS,
	type ClinicalFastPresetItem,
	type PrimaryAnestheticDrug,
};

const CARPULE_PRESETS = [
	{ count: 0.5, label: "0.5", id: "anesthesia-dose-05carp" },
	{ count: 1.0, label: "1.0", id: "anesthesia-dose-1carp" },
	{ count: 2.0, label: "2.0", id: "anesthesia-dose-2carp" },
	{ count: 3.0, label: "3.0", id: "anesthesia-dose-3carp" },
];

export interface AnesthesiaQuickBarProps {
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly hasCardiovascularRisk?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasCardiacArrhythmia?: boolean | undefined;
	readonly hasIschemicHeartDisease?: boolean | undefined;
	readonly hasMyocardialInfarctionHistory?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isPregnantOrLactating?: boolean | undefined;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	readonly onDisposalCarpules?: ((carpulesCount: number, drugId?: AnestheticDrugId | undefined) => void) | undefined;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly servicePriceRub?: number | undefined;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const hasAllergy = Boolean(
		props.hasLidocaineAllergy ||
		props.hasArticaineAllergy ||
		props.hasSulfiteAllergy ||
		props.hasBronchialAsthma ||
		props.hasPenicillinAllergy ||
		props.hasLatexAllergy,
	);
	const isCardioRisk = Boolean(
		props.hasCardiovascularRisk ||
		props.hasHypertension ||
		props.hasCardiacArrhythmia ||
		props.hasIschemicHeartDisease ||
		props.hasMyocardialInfarctionHistory ||
		props.takesBetaBlockers,
	);

	const initialDrugId: AnestheticDrugId = hasAllergy || isCardioRisk ? "mepivacaine_plain" : "articaine_1_100k";
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId | "none">(initialDrugId);
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>("infiltration");
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [isAspirationNegative, setIsAspirationNegative] = useState<boolean>(true);
	const [lastAppliedText, setLastAppliedText] = useState<string | null>(null);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
	const memoCopyButtonId = useId();

	const isPediatric =
		(typeof props.patientAgeYears === "number" && props.patientAgeYears < 18) ||
		(typeof props.patientWeightKg === "number" && props.patientWeightKg > 0 && props.patientWeightKg < 40);
	const weight = resolveClinicalDefaultWeightKg(props.patientWeightKg, props.patientAgeYears, isPediatric);
	const effDrug: AnestheticDrugId = selectedDrugId === "none" ? "articaine_1_100k" : selectedDrugId;
	const currentSafety = calculateAnesthesiaSafety({
		drugId: effDrug,
		carpulesCount,
		patientWeightKg: weight,
		patientAgeYears: props.patientAgeYears ?? 35,
		asaStatus: isCardioRisk ? "asa_3" : "asa_1",
		hasCardiovascularRisk: isCardioRisk,
		hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(props.hasBronchialAsthma),
		isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
		techniqueId,
		targetToothNumberFdi: props.targetToothNumberFdi,
		needleType: techniqueId.includes("mandibular") ? "g27_long_35mm" : "g30_short_21mm",
		aspirationNegativeConfirmed: isAspirationNegative,
	});

	const isOverdoseWarning =
		selectedDrugId !== "none" &&
		(currentSafety.isOverdose || currentSafety.isEpinephrineOverdose || carpulesCount > currentSafety.maxSafeCarpulesCount);

	const showToast = (msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3000);
	};

	const stepCarpules = (delta: number) =>
		setCarpulesCount((prev) => Math.min(10.0, Math.max(0.5, Math.round((prev + delta) * 10) / 10)));

	const applyAnesthesiaDirect = (drugId: AnestheticDrugId | "none", count: number, tech: InjectionTechniqueId = techniqueId) => {
		setSelectedDrugId(drugId);
		setCarpulesCount(count);
		setTechniqueId(tech);

		const activeEffDrug: AnestheticDrugId = drugId === "none" ? "articaine_1_100k" : drugId;
		const result = calculateAnesthesiaSafety({
			drugId: activeEffDrug,
			carpulesCount: count,
			patientWeightKg: weight,
			patientAgeYears: props.patientAgeYears ?? 35,
			asaStatus: isCardioRisk ? "asa_3" : "asa_1",
			hasCardiovascularRisk: isCardioRisk,
			hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
			hasBronchialAsthma: Boolean(props.hasBronchialAsthma),
			isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
			techniqueId: tech,
			targetToothNumberFdi: props.targetToothNumberFdi,
			needleType: tech.includes("mandibular") ? "g27_long_35mm" : "g30_short_21mm",
			aspirationNegativeConfirmed: isAspirationNegative,
		});

		const techNameRu = tech.includes("mandibular") ? "проводниковая" : "инфильтрационная";
		const standardLatinFormula =
			drugId === "mepivacaine_plain"
				? "sol. Mepivacaini 3% (sine Epinephrino)"
				: drugId === "articaine_1_200k"
					? "sol. Articaini 4% cum Epinephrino 1:200000"
					: "sol. Articaini 4% cum Epinephrino 1:100000";

		const volumeText = `${(count * 1.8).toFixed(1)} мл`;
		const aspirationText = isAspirationNegative ? "Аспирационная проба отрицательная. " : "";

		const diaryText =
			drugId === "none"
				? "Анестезия не проводилась. Лечение проведено без анестезии по согласию пациента."
				: `Проведена ${techNameRu} анестезия ${standardLatinFormula} — ${volumeText}. ${aspirationText}Анестезия наступила через 3 мин, глубина достаточная, осложнений нет.`;

		setLastAppliedText(
			drugId === "none"
				? "Лечение без анестезии"
				: `${drugId === "mepivacaine_plain" ? "Мепивакаин 3%" : drugId === "articaine_1_200k" ? "Артикаин 1:200 000" : "Артикаин 1:100 000"} — ${count} карп.`,
		);

		props.onApplyAnesthesia?.(diaryText, result);

		if (drugId !== "none" && count > 0) {
			props.onDisposalCarpules?.(count, activeEffDrug);
			const needleName = tech.includes("mandibular") ? "Игла карпульная 27G длинная 35мм" : "Игла карпульная 30G короткая 21мм";
			postQuickCarpuleWriteoff({
				visitId: props.visitId,
				patientId: props.patientId,
				count,
				drugId: activeEffDrug,
				needleName,
				needlesCount: 1,
			});
			persistAnesthesiaLog({
				patientId: props.patientId,
				visitId: props.visitId,
				drugId: activeEffDrug,
				techniqueId: tech,
				carpulesCount: count,
				patientWeightKg: weight,
				patientAgeYears: props.patientAgeYears ?? 35,
				isCardioRisk,
				targetToothNumberFdi: props.targetToothNumberFdi,
				diaryEntry: diaryText,
			});
		}

		showToast(drugId === "none" ? "Отметка «Без анестезии» внесена в карту" : `Анестезия (${count} карп.) внесена в протокол приёма`);
	};

	const copyPatientMemo = async () => {
		const drugName =
			selectedDrugId === "mepivacaine_plain"
				? "Мепивакаин 3% (Скандонест)"
				: selectedDrugId === "articaine_1_200k"
					? "Артикаин 1:200 000 (Ультракаин Д-С)"
					: selectedDrugId === "septanest_1_100k"
						? "Септанест 1:100 000"
						: selectedDrugId === "none"
							? "Без анестезии"
							: "Артикаин 1:100 000 (Ультракаин Д-С Форте)";

		const memo = formatAnesthesiaPatientMemo({
			clinicName: "Стоматологическая клиника DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			patientName: "Пациент",
			doctorName: "Лечащий врач",
			drugTradeName: drugName,
			carpulesCount,
			targetArea: props.targetToothNumberFdi ? `зуб ${props.targetToothNumberFdi}` : "область вмешательства",
		});

		try {
			await navigator.clipboard.writeText(memo);
			showToast("Памятка пациенту скопирована в буфер");
		} catch {
			showToast("Памятка сформирована");
		}
	};

	const openEmergency = () => {
		if (props.onOpenEmergencyProtocol) {
			props.onOpenEmergencyProtocol();
		} else {
			useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
		}
	};

	const hasAnyAlert =
		props.hasLidocaineAllergy ||
		props.hasArticaineAllergy ||
		props.hasSulfiteAllergy ||
		props.hasBronchialAsthma ||
		props.hasPenicillinAllergy ||
		props.hasLatexAllergy ||
		isCardioRisk ||
		isOverdoseWarning;

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			{/* Top Header & Context Row */}
			<div className="flex items-center justify-between gap-2 flex-wrap min-w-0" data-testid="anesthesia-top-header-row">
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					<span className="flex items-center gap-1 font-bold text-xs text-[var(--ink)] shrink-0">
						<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
						<span>Обезболивание</span>
					</span>

					<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-passive-alerts-strip">
						{props.targetToothNumberFdi && (
							<span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
								Зуб {props.targetToothNumberFdi}
							</span>
						)}
						<span
							className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0"
							title="Вес пациента из карты"
						>
							{`Вес пациента: ${weight} кг`}
						</span>

						{!hasAnyAlert && (
							<span className="sr-only" data-testid="somatic-norm-passive-badge" title="Соматический статус: норма">
								<CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Соматически здоров / Норма</span>
							</span>
						)}

						{props.hasLidocaineAllergy && (
							<span
								className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
								data-testid="allergy-passive-badge"
							>
								<AlertTriangle size={12} className="text-rose-600 shrink-0" />
								<span>У пациента аллергия на лидокаин (Аллергия в анамнезе: Лидокаин, рекомендован Скандонест 3%)</span>
								<span className="sr-only">Аллергия: Лидокаин</span>
							</span>
						)}

						{props.hasArticaineAllergy && (
							<span
								className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
								data-testid="allergy-passive-badge-articaine"
							>
								<AlertTriangle size={12} className="text-rose-600 shrink-0" />
								<span>У пациента аллергия на артикаин (Аллергия в анамнезе: Артикаин, рекомендован Скандонест 3%)</span>
								<span className="sr-only">Аллергия: Артикаин</span>
							</span>
						)}

						{(props.hasPenicillinAllergy || props.hasLatexAllergy) && (
							<span
								className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
								data-testid="allergy-passive-badge-general"
							>
								<AlertTriangle size={12} className="text-rose-600 shrink-0" />
								<span>{`У пациента аллергия на ${[props.hasPenicillinAllergy && "пенициллин", props.hasLatexAllergy && "латекс"].filter(Boolean).join(" / ")}`}</span>
							</span>
						)}

						{(props.hasSulfiteAllergy || props.hasBronchialAsthma) && (
							<span
								className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0"
								data-testid="anesthesia-passive-allergy-alert"
							>
								<AlertTriangle size={12} className="text-amber-600 shrink-0" />
								<span>У пациента аллергия на сульфиты / бронхиальная астма (Аллергия в анамнезе: рекомендуется Скандонест 3% без вазоконстриктора)</span>
							</span>
						)}

						{isCardioRisk && (
							<span
								className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0"
								data-testid="anesthesia-passive-cardio-alert"
							>
								<AlertTriangle size={12} className="text-amber-600 shrink-0" />
								<span>Рекомендуется препарат без вазоконстриктора (Скандонест 3%) (Кардио-контроль)</span>
							</span>
						)}

						{isOverdoseWarning && (
							<span
								className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0"
								data-testid="anesthesia-passive-overdose-alert"
							>
								<AlertTriangle size={12} className="text-amber-600 shrink-0" />
								<span>{`Превышение стандартной нормы для ${weight} кг (макс. ${currentSafety.maxSafeCarpulesCount} карп.)`}</span>
							</span>
						)}
					</div>
				</div>

				<button
					type="button"
					onClick={openEmergency}
					className="px-2.5 py-1 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-auto"
					title="Экстренная аптечка «Антишок»"
					data-testid="btn-anesthesia-quick-emergency"
				>
					<ShieldAlert size={14} className="shrink-0" />
					<span>Аптечка</span>
				</button>
			</div>

			{/* Presets, Stepper and CTA Row */}
			<div className="flex items-center justify-between gap-2 flex-wrap min-w-0 pt-0.5">
				{/* Injection Techniques & Drug Chips */}
				<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-chips-group">
					<div
						className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 max-w-full flex-wrap sm:flex-nowrap"
						role="group"
						aria-label="Метод обезболивания"
					>
						<button
							type="button"
							onClick={() => setTechniqueId("infiltration")}
							className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
								techniqueId === "infiltration"
									? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Инфильтрационная анестезия"
							data-testid="technique-btn-infiltration"
						>
							Инфильтрационная
						</button>
						<button
							type="button"
							onClick={() => setTechniqueId("mandibular_torus")}
							className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
								techniqueId === "mandibular_torus"
									? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Проводниковая (мандибулярная) анестезия"
							data-testid="technique-btn-mandibular"
						>
							Проводниковая
						</button>
						<button
							type="button"
							onClick={() => setTechniqueId("intraligamentary_sta")}
							className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
								techniqueId === "intraligamentary_sta"
									? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Интралигаментарная анестезия"
							data-testid="technique-btn-intraligamentary"
						>
							Интралигаментарная
						</button>
					</div>

					{CLINICAL_FAST_PRESETS.map((preset: ClinicalFastPresetItem) => {
						const isSelected = selectedDrugId === preset.drugId;
						const isCardio = preset.isCardioRecommended;
						const borderClass = isSelected
							? isCardio
								? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] dark:text-amber-200 font-bold ring-1 ring-amber-600/30"
								: "border-2 border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--ink)] dark:text-teal-200 font-bold ring-1 ring-[var(--teal,#0d9488)]/30"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft)]";

						return (
							<button
								key={preset.testId}
								type="button"
								onClick={() =>
									applyAnesthesiaDirect(
										preset.drugId,
										preset.drugId === "none" ? 0 : carpulesCount > 0 ? carpulesCount : preset.count,
										preset.defaultTechnique ?? techniqueId,
									)
								}
								className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${borderClass}`}
								title={`${preset.fullLabelRu} • ${preset.clinicalScopeRu}`}
								data-testid={preset.testId}
							>
								{preset.drugId === "none" ? (
									<CheckCircle2 size={14} className="text-slate-500 shrink-0" />
								) : (
									<Syringe size={14} className={isCardio ? "text-amber-600 shrink-0" : "text-teal-600 shrink-0"} />
								)}
								<span>{preset.shortLabelRu}</span>
								<span className="sr-only">{preset.srOnlyText}</span>
							</button>
						);
					})}
				</div>

				{/* Stepper, Aspiration & Dominant Primary CTA */}
				<div className="flex items-center gap-1.5 flex-wrap min-w-0 ml-auto" data-testid="anesthesia-stepper-cta-group">
					<fieldset className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 m-0" aria-label="Быстрый выбор карпул">
						{CARPULE_PRESETS.map((p) => (
							<button
								key={p.count}
								type="button"
								onClick={() => setCarpulesCount(p.count)}
								data-testid={p.id}
								className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${
									carpulesCount === p.count
										? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)] shadow-2xs"
										: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								title={`${p.label} карп. (${(p.count * 1.8).toFixed(1)} мл)`}
							>
								{p.label}
							</button>
						))}
					</fieldset>

					<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" aria-label="Счётчик карпул">
						<button
							type="button"
							disabled={carpulesCount <= 0.5}
							onClick={() => stepCarpules(-0.5)}
							className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
							title="Уменьшить на 0.5 карпулы"
							data-testid="btn-decrease-carpules"
						>
							−
						</button>
						<span
							className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap"
							data-testid="selected-carpules-display"
							title={`${carpulesCount} карп. (${(carpulesCount * 1.8).toFixed(1)} мл)`}
						>
							{carpulesCount} карп. ({(carpulesCount * 1.8).toFixed(1)} мл)
						</span>
						<button
							type="button"
							disabled={carpulesCount >= 10.0}
							onClick={() => stepCarpules(0.5)}
							className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
							title="Увеличить на 0.5 карпулы"
							data-testid="btn-increase-carpules"
						>
							+
						</button>
					</div>

					<label
						data-testid="label-aspiration-negative-norm"
						className="inline-flex items-center gap-1 px-2 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors select-none shrink-0"
					>
						<input
							type="checkbox"
							checked={isAspirationNegative}
							onChange={() => setIsAspirationNegative((v) => !v)}
							data-testid="checkbox-aspiration-negative-norm"
							className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
						<span className="text-[11px] text-[var(--muted)]">Аспирация (−)</span>
					</label>

					<button
						id={memoCopyButtonId}
						type="button"
						onClick={copyPatientMemo}
						className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer shrink-0"
						title="Скопировать памятку пациенту для мессенджера"
					>
						<Share2 size={12} className="text-teal-600 shrink-0" />
						<span className="hidden xl:inline">Памятка</span>
					</button>

					<button
						type="button"
						onClick={() => setIsMobileDrawerOpen(true)}
						className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] shrink-0"
						title="Открыть мобильную шторку анестезии"
						data-testid="btn-open-anesthesia-mobile-sheet"
					>
						<SlidersHorizontal size={13} />
						<span>Шторка</span>
					</button>

					{/* SINGLE DOMINANT PRIMARY CTA — MANDATE 8am & 8e (NEVER DISABLED) */}
					<button
						type="button"
						onClick={() => applyAnesthesiaDirect(selectedDrugId, carpulesCount)}
						className="primary-button inline-flex items-center gap-1.5 px-4 min-h-[44px] h-11 rounded-xl border border-[#0f766e] bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ml-auto"
						title={`Применить анестезию (${carpulesCount} карп.) в протокол приёма`}
						data-testid="btn-apply-anesthesia-to-card"
					>
						<CheckCircle2 size={14} className="shrink-0" />
						<span>Внести в карту приёма</span>
						<span className="sr-only">Применить анестезию В карту В дневник</span>
					</button>
				</div>
			</div>

			{/* Status Protocol Feedback */}
			{lastAppliedText && (
				<div className="flex items-center gap-1.5 pt-0.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
					<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
					<span>{`Внесено в протокол: ${lastAppliedText}`}</span>
				</div>
			)}

			{/* Toast */}
			{toastMessage && (
				<div className="anesthesia-quick-toast" role="status" aria-live="polite">
					<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
					<span>{toastMessage}</span>
				</div>
			)}

			{/* Native Apple HIG Mobile Bottom Sheet Drawer */}
			{isMobileDrawerOpen && (
				<div
					className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity lg:hidden anesthesia-mobile-sheet"
					data-testid="anesthesia-mobile-sheet"
					onClick={() => setIsMobileDrawerOpen(false)}
				>
					<div
						className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] p-4 shadow-2xl border-t border-[var(--line)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto max-w-full overflow-x-clip"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-[36px] h-[5px] bg-[var(--line-strong)] rounded-full mx-auto shrink-0 mb-1" />
						<div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
							<div className="flex items-center gap-2">
								<Syringe className="w-5 h-5 text-teal-600 shrink-0" />
								<h3 className="text-sm font-bold text-[var(--ink)]">Обезболивание у кресла</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsMobileDrawerOpen(false)}
								aria-label="Закрыть"
								className="anesthesia-sheet-close-btn p-2 min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
							>
								<X size={20} />
							</button>
						</div>

						<div className="flex rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5" role="group">
							<button
								type="button"
								onClick={() => setTechniqueId("infiltration")}
								className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
									techniqueId === "infiltration"
										? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border border-[var(--teal)]"
										: "anesthesia-tab-unselected"
								}`}
							>
								Инфильтрационная
							</button>
							<button
								type="button"
								onClick={() => setTechniqueId("mandibular_torus")}
								className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
									techniqueId === "mandibular_torus"
										? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border border-[var(--teal)]"
										: "anesthesia-tab-unselected"
								}`}
							>
								Проводниковая
							</button>
							<button
								type="button"
								onClick={() => setTechniqueId("intraligamentary_sta")}
								className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
									techniqueId === "intraligamentary_sta"
										? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border border-[var(--teal)]"
										: "anesthesia-tab-unselected"
								}`}
							>
								Интралигаментарная
							</button>
						</div>

						<div className="flex flex-col gap-2 pt-1">
							{CLINICAL_FAST_PRESETS.map((p: ClinicalFastPresetItem) => {
								const isSelected = selectedDrugId === p.drugId;
								const activeCls = isSelected
									? p.isCardioRecommended
										? "border-amber-600 bg-amber-500/10 text-[var(--ink)] ring-1 ring-amber-600/30"
										: "border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--ink)] ring-1 ring-[var(--teal,#0d9488)]/30"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]";

								return (
									<button
										key={p.testId}
										type="button"
										onClick={() => applyAnesthesiaDirect(p.drugId, p.count, p.defaultTechnique ?? techniqueId)}
										className={`w-full min-h-[48px] px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${activeCls}`}
									>
										<div>
											<div className="text-xs font-bold text-[var(--ink)]">{p.shortLabelRu}</div>
											<div className="text-[11px] text-[var(--muted)]">{p.clinicalScopeRu}</div>
										</div>
										<span className="text-xs font-bold text-[var(--teal,#0d9488)] shrink-0">
											{p.volumeMl > 0 ? `${p.volumeMl} мл` : "0 мл"}
										</span>
									</button>
								);
							})}
						</div>

						{isOverdoseWarning && currentSafety.maxSafeCarpulesCount && carpulesCount > currentSafety.maxSafeCarpulesCount && (
							<div
								className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5"
								data-testid="mobile-anesthesia-passive-warning"
							>
								<AlertTriangle size={13} className="text-amber-600 shrink-0" />
								<span>Доза выше стандартной нормы (макс. {currentSafety.maxSafeCarpulesCount} карп.)</span>
							</div>
						)}

						<div className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="flex items-center justify-between gap-2">
								<span className="text-xs font-bold text-[var(--ink)]">
									Дозировка: {carpulesCount} карп. ({(carpulesCount * 1.8).toFixed(1)} мл)
								</span>
								<div className="flex items-center gap-1">
									<button
										type="button"
										disabled={carpulesCount <= 0.5}
										onClick={() => setCarpulesCount(Math.max(0.5, carpulesCount - 0.5))}
										className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-30"
										data-testid="btn-decrease-carpules-mobile"
									>
										−
									</button>
									<button
										type="button"
										disabled={carpulesCount >= 10.0}
										onClick={() => setCarpulesCount(Math.min(10.0, carpulesCount + 0.5))}
										className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-30"
										data-testid="btn-increase-carpules-mobile"
									>
										+
									</button>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-2 pt-1">
								<button
									type="button"
									onClick={() => setCarpulesCount(1.0)}
									className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
										carpulesCount === 1.0
											? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border-[var(--teal)] shadow-2xs"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
									}`}
									data-testid="btn-dose-1carp-mobile"
								>
									1 карпула (1.8 мл)
								</button>
								<button
									type="button"
									onClick={() => setCarpulesCount(2.0)}
									className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
										carpulesCount === 2.0
											? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border-[var(--teal)] shadow-2xs"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
									}`}
									data-testid="btn-dose-2carp-mobile"
								>
									2 карпулы (3.6 мл)
								</button>
							</div>
						</div>

						<div className="pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
							<button
								type="button"
								onClick={() => {
									applyAnesthesiaDirect(selectedDrugId, carpulesCount, techniqueId);
									setIsMobileDrawerOpen(false);
								}}
								className="primary-button w-full min-h-[48px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
								data-testid="btn-apply-anesthesia-mobile-to-card"
							>
								<CheckCircle2 size={16} />
								<span>Внести в карту приёма</span>
							</button>
						</div>
					</div>
				</div>
			)}
			<span className="sr-only" data-testid="anesthesia-dose-norm-preset">Норма: Артикаин 1:100k Убистезин форте</span>
		</div>
	);
}
