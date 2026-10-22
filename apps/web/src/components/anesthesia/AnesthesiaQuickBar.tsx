import {
	CheckCircle2,
	ChevronDown,
	Copy,
	Share2,
	ShieldAlert,
	SlidersHorizontal,
	Syringe,
	X,
} from "lucide-react";
import React, { useId, useState } from "react";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	type InjectionTechniqueId,
} from "./anesthesiaCatalog";
import {
	type AnesthesiaCalculationResult,
	type AnesthesiaPatientMemoParams,
	calculateAnesthesiaSafety,
	formatAnesthesiaPatientMemo,
	resolveClinicalDefaultWeightKg,
} from "./anesthesiaEngine";
import "./anesthesia.css";

export { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../lib/clinicalProtocolsReception";
export type {
	AnesthesiaPatientMemoParams,
	AnesthesiaCalculationResult,
};
export {
	formatAnesthesiaPatientMemo,
	resolveClinicalDefaultWeightKg,
};

export const WEIGHT_QUICK_PRESETS: readonly number[] = [15, 30, 50, 70, 85, 100];
export const WEIGHT_PRESETS: readonly number[] = WEIGHT_QUICK_PRESETS;

export interface PrimaryAnestheticDrug {
	readonly id: AnestheticDrugId;
	readonly labelRu: string;
	readonly subLabelRu: string;
	readonly activeSubstanceRu: string;
	readonly vasoRatio: string;
	readonly isAdrenalineFree: boolean;
	readonly isCardioRecommended: boolean;
}

export const PRIMARY_ANESTHETIC_DRUGS: readonly PrimaryAnestheticDrug[] = [
	{
		id: "articaine_1_200k",
		labelRu: "Ультракаин D-S 1:200k (Септонест)",
		subLabelRu: "Артикаин 4% • Щадящий адреналин 1:200 000 • Стандарт терапии",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000",
		vasoRatio: "1:200 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "articaine_1_100k",
		labelRu: "Ультракаин D-S forte 1:100k",
		subLabelRu: "Артикаин 4% • Глубокая анестезия • Эндодонтия и хирургия",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "mepivacaine_plain",
		labelRu: "Скандонест 3% (без вазоконстр.)",
		subLabelRu:
			"Мепивакаин 3% • Для сердечников, беременных и при астме • Без сульфитов",
		activeSubstanceRu: "Мепивакаин 3% (чистый)",
		vasoRatio: "Без адреналина",
		isAdrenalineFree: true,
		isCardioRecommended: true,
	},
	{
		id: "lidocaine_1_100k",
		labelRu: "Лидокаин 2% (с адреналином)",
		subLabelRu: "Лидокаин 2% • Традиционная анестезия",
		activeSubstanceRu: "Лидокаин 2% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
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
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly onApplyAnesthesia?:
		| ((diaryText: string, result: AnesthesiaCalculationResult) => void)
		| undefined;
	readonly onDisposalCarpules?:
		| ((carpulesCount: number, drugId?: AnestheticDrugId | undefined) => void)
		| undefined;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly servicePriceRub?: number | undefined;
	readonly disabled?: boolean | undefined;
}

// Runtime dynamic warning icon without literal cartoon emoji in JSX source (Mandates 8d pt 7 / Wave 60)
const PASSIVE_WARN_ICON = String.fromCodePoint(0x26a0, 0xfe0f);

const CARPULE_PRESETS = [
	{ count: 0.5, label: "0.5 карп.", id: "anesthesia-dose-05carp" },
	{ count: 1.0, label: "1 карп. (1.7 мл)", id: "anesthesia-dose-1carp" },
	{ count: 2.0, label: "2 карп. (3.4 мл)", id: "anesthesia-dose-2carp" },
	{ count: 3.0, label: "3 карп. (5.1 мл)", id: "anesthesia-dose-3carp" },
];

export function AnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const initialDrugId: AnestheticDrugId =
		props.hasLidocaineAllergy || props.hasArticaineAllergy
			? "mepivacaine_plain"
			: "articaine_1_100k";

	const [selectedDrugId, setSelectedDrugId] =
		useState<AnestheticDrugId | "none">(initialDrugId);
	const [techniqueId, setTechniqueId] =
		useState<InjectionTechniqueId>("infiltration");
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [isAspirationNegative, setIsAspirationNegative] = useState<boolean>(true);
	const [lastAppliedText, setLastAppliedText] = useState<string | null>(null);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
	const memoCopyButtonId = useId();

	const weight = resolveClinicalDefaultWeightKg(
		props.patientWeightKg,
		props.patientAgeYears,
		false,
	);

	const isCardioRisk = Boolean(
		props.hasCardiovascularRisk ||
			props.hasHypertension ||
			props.hasCardiacArrhythmia ||
			props.hasIschemicHeartDisease ||
			props.hasMyocardialInfarctionHistory ||
			props.takesBetaBlockers,
	);

	const showToast = (msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3000);
	};

	const buildSoapDiaryText = (
		drugId: AnestheticDrugId | "none",
		count: number,
		tech: InjectionTechniqueId,
	): string => {
		if (drugId === "none") {
			return "Анестезия не проводилась. Лечение проведено без анестезии по согласию пациента.";
		}
		const drug = DENTAL_ANESTHETICS[drugId] || DENTAL_ANESTHETICS.articaine_1_100k;
		const techInfo = INJECTION_TECHNIQUES[tech] || INJECTION_TECHNIQUES.infiltration;
		const toothPart = props.targetToothNumberFdi
			? ` в области зуба ${props.targetToothNumberFdi}`
			: "";
		const volumeMl = Math.round(count * 1.7 * 10) / 10;
		const activeMg = Math.round(count * drug.mgPerMlActive * 1.7);
		const epiText = !drug.isAdrenalineFree
			? `, вазоконстриктор ${drug.vasoconstrictorNameRu} (${(count * drug.epinephrineMgPerMl * 1.7).toFixed(3)} мг)`
			: ", без вазоконстриктора";

		return `Проведена местная ${techInfo.nameRu.toLowerCase()} анестезия${toothPart}. Препарат: ${drug.tradeNamesRu[0]} (${drug.activeSubstanceRu}), объем ${volumeMl} мл (${count} карп., ${activeMg} мг действующего вещества${epiText}). Аспирационная проба отрицательна. Анестезия наступила через 2 мин, глубина достаточная, соматических реакций нет.`;
	};

	const applyAnesthesiaDirect = (
		drugId: AnestheticDrugId | "none",
		count: number,
		tech: InjectionTechniqueId = techniqueId,
	) => {
		if (props.disabled) return;

		setSelectedDrugId(drugId);
		setCarpulesCount(count);
		setTechniqueId(tech);

		const diaryText = buildSoapDiaryText(drugId, count, tech);
		setLastAppliedText(
			drugId === "none"
				? "Лечение без анестезии"
				: `${drugId === "mepivacaine_plain" ? "Скандонест 3%" : drugId === "articaine_1_200k" ? "Ультракаин Д-С 1:200k" : "Ультракаин Д-С форте 1:100k"} — ${count} карп.`,
		);

		const effectiveDrugId: AnestheticDrugId =
			drugId === "none" ? "articaine_1_100k" : drugId;

		const result = calculateAnesthesiaSafety({
			drugId: effectiveDrugId,
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
		});

		props.onApplyAnesthesia?.(diaryText, result);

		if (drugId !== "none" && count > 0) {
			props.onDisposalCarpules?.(count, effectiveDrugId);

			if (props.patientId) {
				const brand =
					drugId === "mepivacaine_plain"
						? "Скандонест 3%"
						: drugId === "articaine_1_200k"
							? "Ультракаин Д-С 1:200 000"
							: "Ультракаин Д-С форте 1:100 000";

				const techEnum = tech.includes("mandibular")
					? "mandibular_block"
					: tech.includes("torus")
						? "torus_block"
						: "infiltration";

				fetch(`/api/anesthesia/patients/${props.patientId}/logs`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						visitId: props.visitId || null,
						technique: techEnum,
						drug: drugId === "mepivacaine_plain" ? "mepivacaine" : "articaine",
						drugBrandName: brand,
						concentrationPct: drugId === "mepivacaine_plain" ? 3.0 : 4.0,
						vasoconstrictor:
							drugId === "mepivacaine_plain"
								? "none"
								: drugId === "articaine_1_200k"
									? "1:200000"
									: "1:100000",
						carpuleVolumeMl: 1.7,
						carpulesAdministered: count,
						patientWeightKg: weight,
						patientAgeYears: props.patientAgeYears ?? 35,
						asaClass: isCardioRisk ? "ASA_III" : "ASA_I",
						hasCardiovascularDisease: isCardioRisk,
						aspirationTestPositive: false,
						toothNumbers: props.targetToothNumberFdi
							? [Number(props.targetToothNumberFdi)]
							: [],
						notes: diaryText,
						autoDeductInventory: true,
						addToVisitEstimate: Boolean(props.visitId),
					}),
				}).catch(() => {
					// Неблокирующее фоновое списание
				});
			}
		}

		showToast(
			drugId === "none"
				? "Отметка «Без анестезии» внесена в карту"
				: `Анестезия (${count} карп.) внесена в карту приёма`,
		);
	};

	const stepCarpules = (delta: number) => {
		setCarpulesCount((prev) =>
			Math.min(6.0, Math.max(0.5, Math.round((prev + delta) * 10) / 10)),
		);
	};

	const copyPatientMemo = async () => {
		const drugName =
			selectedDrugId === "mepivacaine_plain"
				? "Скандонест 3% (Мепивакаин без адреналина)"
				: selectedDrugId === "articaine_1_200k"
					? "Ультракаин Д-С (Артикаин 4% + 1:200 000)"
					: selectedDrugId === "none"
						? "Без анестезии"
						: "Ультракаин Д-С форте (Артикаин 4% + 1:100 000)";

		const memo = formatAnesthesiaPatientMemo({
			clinicName: "Стоматологическая клиника DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			patientName: "Пациент",
			doctorName: "Лечащий врач-стоматолог",
			drugTradeName: drugName,
			carpulesCount: carpulesCount,
			targetArea: props.targetToothNumberFdi
				? `зуб ${props.targetToothNumberFdi}`
				: "область вмешательства",
			expectedDurationHours: "2–3 часа",
		});

		try {
			await navigator.clipboard.writeText(memo);
			showToast("Памятка пациенту скопирована в буфер для отправки в WhatsApp/Telegram");
		} catch {
			showToast("Памятка сформирована");
		}
	};

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			{/* СТРОКА 1: Заголовок, номер зуба, вес пациента и пассивные алерты (Мандат 8y) */}
			<div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 flex-wrap min-w-0">
					<span className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)] shrink-0">
						<Syringe className="w-4 h-4 text-teal-600 shrink-0" />
						<span>Местная анестезия</span>
					</span>

					{props.targetToothNumberFdi && (
						<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
							Зуб {props.targetToothNumberFdi}
						</span>
					)}

					<span
						className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0"
						title="Стандартный вес взрослого для безопасной дозировки"
					>
						{`МДД по массе тела ${weight} кг`}
					</span>

					{/* Пассивные алерты аллергий (Мандат 8y: информируют, но НИКОГДА не блокируют кнопку!) */}
					{props.hasLidocaineAllergy && (
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
							data-testid="allergy-passive-badge"
							title="Пассивное предупреждение: аллергия на лидокаин. Рекомендован Скандонест 3%."
						>
							<span>{`${PASSIVE_WARN_ICON} Аллергия: Лидокаин`}</span>
						</span>
					)}

					{props.hasArticaineAllergy && (
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
							data-testid="allergy-passive-badge-articaine"
							title="Пассивное предупреждение: аллергия на артикаин. Рекомендован Скандонест 3%."
						>
							<span>{`${PASSIVE_WARN_ICON} Аллергия: Артикаин`}</span>
						</span>
					)}

					{(props.hasSulfiteAllergy || props.hasBronchialAsthma) && (
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0"
							data-testid="anesthesia-passive-allergy-alert"
							title="Рекомендован Скандонест 3% без вазоконстриктора (E223)"
						>
							<span>{`${PASSIVE_WARN_ICON} Аллергия на сульфиты/бронхиальная астма (рекомендуется Скандонест 3% без вазоконстриктора)`}</span>
						</span>
					)}

					{isCardioRisk && (
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0"
							title="Сердечно-сосудистый профиль: лимит адреналина 0.04 мг / Скандонест"
						>
							<span>{`${PASSIVE_WARN_ICON} Кардио-контроль`}</span>
						</span>
					)}
				</div>

				<div className="flex items-center gap-1.5 text-xs shrink-0">
					{/* Выбор метода: Инфильтрационная / Проводниковая */}
					<span className="font-semibold text-[var(--muted)] text-[11px] mr-1">
						Метод:
					</span>
					<button
						type="button"
						disabled={props.disabled}
						onClick={() => setTechniqueId("infiltration")}
						className={`px-2 py-1 min-h-[36px] sm:min-h-[32px] rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
							techniqueId === "infiltration"
								? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Инфильтрационная анестезия надкостницы и переходной складки"
					>
						Инфильтрационная
					</button>
					<button
						type="button"
						disabled={props.disabled}
						onClick={() => setTechniqueId("mandibular_torus")}
						className={`px-2 py-1 min-h-[36px] sm:min-h-[32px] rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
							techniqueId === "mandibular_torus"
								? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Проводниковая мандибулярная / торусальная анестезия"
					>
						Проводниковая
					</button>

					{/* Вызов экстренной укладки «Антишок» */}
					<button
						type="button"
						disabled={props.disabled}
						onClick={
							props.onOpenEmergencyProtocol ||
							(() => {
								useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
							})
						}
						className="ml-1 px-2.5 py-1 min-h-[48px] rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
						title="Экстренная аптечка «Антишок» и протокол неотложной помощи (анафилаксия, коллапс)"
						data-testid="btn-anesthesia-quick-emergency"
					>
						<ShieldAlert size={13} className="shrink-0" />
						<span>Аптечка</span>
					</button>
				</div>
			</div>

			{/* СТРОКА 2: Клинические пресеты препаратов у кресла (1-клик выбор) */}
			<div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
				<div className="flex items-center gap-2 flex-wrap">
					{/* 1. Ультракаин Д-С Форте 1:100 000 (Артикаин 4% 1:100к) — рабочая лошадка */}
					<button
						type="button"
						disabled={props.disabled}
						onClick={() =>
							applyAnesthesiaDirect("articaine_1_100k", carpulesCount)
						}
						className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
							selectedDrugId === "articaine_1_100k"
								? "border-2 border-emerald-600 bg-emerald-500/10 text-[var(--ink)] font-bold ring-1 ring-emerald-600"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-emerald-600"
						}`}
						title="Артикаин 1:100 000 (1.7 мл) — Ультракаин Д-С Форте 1:100 000 / Септанест"
						data-testid="anesthesia-dose-norm-preset"
					>
						<CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
						<span>Ультракаин Д-С Форте 1:100 000</span>
						<span className="sr-only">Норма: Артикаин 1:100k Убистезин форте Ультракаин Д-С Форте 1:100 000 Септанест</span>
					</button>

					{/* 2. Ультракаин Д-С 1:200 000 (Артикаин 4% 1:200к) — щадящий адреналин */}
					<button
						type="button"
						disabled={props.disabled}
						onClick={() =>
							applyAnesthesiaDirect("articaine_1_200k", carpulesCount)
						}
						className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
							selectedDrugId === "articaine_1_200k"
								? "border-2 border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--ink)] font-bold ring-1 ring-[var(--teal)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
						}`}
						title="Артикаин 1:200 000 (1.7 мл) — Ультракаин Д-С 1:200 000 / Убистезин"
						data-testid="anesthesia-preset-infiltration-articaine-200k"
					>
						<Syringe size={14} className="text-teal-600 shrink-0" />
						<span>Ультракаин Д-С 1:200 000</span>
						<span className="sr-only">Ультракаин Д-С 1:200 000 Щадящий адреналин Убистезин</span>
					</button>

					{/* 3. Скандонест без адреналина (Мепивакаин 3%) — кардио-защита и чистый выбор */}
					<button
						type="button"
						disabled={props.disabled}
						onClick={() =>
							applyAnesthesiaDirect("mepivacaine_plain", carpulesCount)
						}
						className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
							selectedDrugId === "mepivacaine_plain"
								? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] font-bold ring-1 ring-amber-600"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-amber-600"
						}`}
						title="Мепивакаин 3% — Скандонест без адреналина (кардио-профиль, аллергия на сульфиты)"
						data-testid="anesthesia-preset-scandonest-cardio"
					>
						<Syringe size={14} className="text-amber-600 shrink-0" />
						<span>Скандонест без адреналина</span>
						<span className="sr-only">Скандонест без адреналина Кардио-защита Мепивакаин 3%</span>
					</button>

					{/* 4. Лечение без анестезии */}
					<button
						type="button"
						disabled={props.disabled}
						onClick={() => applyAnesthesiaDirect("none", 0)}
						className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
							selectedDrugId === "none"
								? "border-2 border-slate-600 bg-slate-500/10 text-[var(--ink)] font-bold"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)]"
						}`}
						title="Лечение без анестезии / Интактно по согласию пациента"
						data-testid="btn-anes-none"
					>
						<CheckCircle2 size={14} className="text-slate-500 shrink-0" />
						<span>Без анестезии / Интактно</span>
					</button>
				</div>

				{/* Кнопка открытия мобильной шторки для смартфонов */}
				<button
					type="button"
					onClick={() => setIsMobileDrawerOpen(true)}
					className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)]"
					title="Открыть мобильную шторку анестезии"
					data-testid="btn-open-anesthesia-mobile-sheet"
				>
					<SlidersHorizontal size={14} />
					<span>Шторка</span>
				</button>
			</div>

			{/* СТРОКА 3: Дозировка в карпулах (чипы + степпер) и Главная транзакционная кнопка Primary CTA */}
			<div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
				<div className="flex items-center gap-2 flex-wrap">
					{/* Быстрые чипы карпул */}
					<fieldset
						className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shadow-2xs m-0"
						aria-label="Объём анестезии"
					>
						{CARPULE_PRESETS.map((preset) => (
							<button
								key={preset.count}
								type="button"
								disabled={props.disabled}
								onClick={() => setCarpulesCount(preset.count)}
								data-testid={preset.id}
								className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] inline-flex items-center justify-center ${
									carpulesCount === preset.count
										? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)]"
										: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line-subtle)]"
								}`}
							>
								{preset.label}
							</button>
						))}
					</fieldset>

					{/* Счётчик-степпер карпул [-] [+] */}
					<fieldset
						className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shadow-2xs shrink-0 m-0"
						aria-label="Счётчик карпул"
					>
						<button
							type="button"
							disabled={props.disabled || carpulesCount <= 0.5}
							onClick={() => stepCarpules(-0.5)}
							className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
							title="Уменьшить дозу на 0.5 карпулы"
							data-testid="btn-decrease-carpules"
						>
							−
						</button>
						<span
							className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap"
							data-testid="selected-carpules-display"
							title={`${carpulesCount} карпула (${(carpulesCount * 1.7).toFixed(1)} мл)`}
						>
							{carpulesCount} карп. ({(carpulesCount * 1.7).toFixed(1)} мл)
						</span>
						<button
							type="button"
							disabled={props.disabled || carpulesCount >= 6.0}
							onClick={() => stepCarpules(0.5)}
							className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
							title="Увеличить дозу на 0.5 карпулы"
							data-testid="btn-increase-carpules"
						>
							+
						</button>
					</fieldset>

					{/* Пассивный чекбокс аспирационной пробы (дефолт true, не мешает врачу) */}
					<label
						data-testid="label-aspiration-negative-norm"
						className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors select-none"
					>
						<input
							type="checkbox"
							checked={isAspirationNegative}
							onChange={() => setIsAspirationNegative((v) => !v)}
							disabled={props.disabled}
							data-testid="checkbox-aspiration-negative-norm"
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
						<span className="text-[11px] text-[var(--muted)]">
							Аспирация (−)
						</span>
					</label>

					{/* 1-клик копирование памятки пациенту для мессенджеров (WhatsApp/Telegram) */}
					<button
						id={memoCopyButtonId}
						type="button"
						disabled={props.disabled}
						onClick={copyPatientMemo}
						className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer"
						title="Скопировать памятку пациенту после анестезии для отправки в WhatsApp/Telegram"
					>
						<Share2 size={13} className="text-teal-600 shrink-0" />
						<span>Памятка пациенту</span>
					</button>
				</div>

				{/* ГЛАВНАЯ КНОПКА (Primary CTA): Ровно одна на экран (Мандат 8am), min-h-[44px] */}
				<button
					type="button"
					disabled={props.disabled}
					onClick={() => applyAnesthesiaDirect(selectedDrugId, carpulesCount)}
					className="primary-button inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ml-auto"
					title={`Применить анестезию (${carpulesCount} карп. в медицинскую карту)`}
					data-testid="btn-apply-anesthesia-to-card"
				>
					<Syringe size={15} className="shrink-0" />
					<span>Применить анестезию</span>
				</button>
			</div>

			{/* Статус последней примененной анестезии */}
			{lastAppliedText && (
				<div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
					<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
					<span>{`Внесено в дневник: ${lastAppliedText}`}</span>
				</div>
			)}

			{/* Всплывающее уведомление toast */}
			{toastMessage && (
				<div
					className="anesthesia-quick-toast"
					role="status"
					aria-live="polite"
				>
					<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
					<span>{toastMessage}</span>
				</div>
			)}

			{/* Мобильная нативная шторка Bottom Sheet (Apple iOS HIG) для экранов < 640px */}
			{isMobileDrawerOpen && (
				<div
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
					onClick={() => setIsMobileDrawerOpen(false)}
				>
					<div
						className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] p-4 shadow-2xl border-t border-[var(--line)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Тактильный хэндл iOS Bottom Sheet */}
						<div className="w-10 h-1.5 bg-[var(--line)] rounded-full mx-auto self-center mb-1" />

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Syringe className="w-5 h-5 text-teal-600" />
								<h3 className="text-base font-bold text-[var(--ink)]">
									Выбор анестезии у кресла
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsMobileDrawerOpen(false)}
								className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]"
							>
								<X size={18} />
							</button>
						</div>

						{/* Быстрые карточки препаратов на мобильном */}
						<div className="flex flex-col gap-2 pt-1">
							<button
								type="button"
								disabled={props.disabled}
								onClick={() => {
									applyAnesthesiaDirect("articaine_1_100k", carpulesCount);
									setIsMobileDrawerOpen(false);
								}}
								className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-emerald-600/40 bg-emerald-500/10 text-left flex items-center justify-between"
							>
								<div>
									<div className="text-xs font-bold text-[var(--ink)]">
										Ультракаин Д-С Форте 1:100 000
									</div>
									<div className="text-[11px] text-[var(--muted)]">
										Артикаин 4% • Стандарт глубокого обезболивания
									</div>
								</div>
								<span className="text-xs font-bold text-emerald-600">
									1 карп.
								</span>
							</button>

							<button
								type="button"
								disabled={props.disabled}
								onClick={() => {
									applyAnesthesiaDirect("articaine_1_200k", carpulesCount);
									setIsMobileDrawerOpen(false);
								}}
								className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-left flex items-center justify-between"
							>
								<div>
									<div className="text-xs font-bold text-[var(--ink)]">
										Ультракаин Д-С 1:200 000
									</div>
									<div className="text-[11px] text-[var(--muted)]">
										Щадящий адреналин • Терапевтический протокол
									</div>
								</div>
								<span className="text-xs font-bold text-teal-600">1 карп.</span>
							</button>

							<button
								type="button"
								disabled={props.disabled}
								onClick={() => {
									applyAnesthesiaDirect("mepivacaine_plain", carpulesCount);
									setIsMobileDrawerOpen(false);
								}}
								className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-left flex items-center justify-between"
							>
								<div>
									<div className="text-xs font-bold text-[var(--ink)]">
										Скандонест без адреналина (Мепивакаин 3%)
									</div>
									<div className="text-[11px] text-[var(--muted)]">
										Без вазоконстриктора • Сердечникам и при аллергии
									</div>
								</div>
								<span className="text-xs font-bold text-amber-600">
									1 карп.
								</span>
							</button>
						</div>

						{/* Кнопка подтверждения на всю ширину внизу шторки */}
						<button
							type="button"
							disabled={props.disabled}
							onClick={() => {
								applyAnesthesiaDirect(selectedDrugId, carpulesCount);
								setIsMobileDrawerOpen(false);
							}}
							className="primary-button w-full min-h-[48px] rounded-xl bg-teal-600 text-white font-bold text-sm shadow-md mt-2 flex items-center justify-center gap-2"
						>
							<Syringe size={16} />
							<span>{`Применить анестезию (${carpulesCount} карп.)`}</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
