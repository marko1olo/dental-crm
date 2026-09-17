/**
 * HygieneIndicesPanel.tsx — Экспресс-расчет клинических индексов гигиены полости рта (OHI-S, PMA, КПИ Леуса, Silness-Löe, Федорова-Володкиной, PHP).
 *
 * (DOMAIN: CLINICAL HYGIENE INDICES & PERIODONTAL ASSESSMENT)
 *
 * Возможности:
 * 1. OHI-S (Грин-Вермиллион): расчет налета DI-S и зубного камня CI-S по 6 индексным зубам (16, 11, 26, 36, 31, 46).
 * 2. Silness-Löe (Сиднесс-Лоэ): оценка зубного налета в придесневой области (0..3).
 * 3. Федорова-Володкиной: гигиенический индекс окрашивания Шиллера-Писарева (1..5, норма 1.0).
 * 4. PHP (Подошадлей-Хейли): индекс эффективности гигиены по 5 зонам коронки (0..5).
 * 5. PMA (Парма): оценка степени воспаления десны (сосочек P=1, маргинальная M=2, альвеолярная A=3) в %.
 * 6. КПИ (Леус): комплексный периодонтальный индекс (0=здоров, 1=кровь, 2=камень, 3=карман 4-5мм, 4=карман >=6мм).
 * 7. 1-Клик «Физиологическая норма (все 0 / Федорова-В. 1.0 / Здоров)» (Мандат 8e / Раздел VII).
 * 8. 1-Клик синхронизация с данными интерактивной перио-карты Florida Probe.
 * 9. 1-Клик экспорт стандартизированного протокола в дневник приёма 043/у.
 * 10. Печать протокола клинических индексов (Закон Миллера: «В карту 043/у», «Печать протокола»).
 * 11. Не требует обязательного заполнения всех зубов — расчет работает от 1 до 6 зубов мгновенно.
 */

import {
	calculateCombinedHygieneReport,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createHealthyHygieneAssessment,
	deriveHygieneFromPerioTeeth,
	HYGIENE_INDEX_TEETH_CONFIG,
	type CombinedHygieneReport,
	type HygieneToothAssessment,
	type PerioToothRecord,
} from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	Check,
	CheckCircle2,
	Clipboard,
	Droplets,
	FileText,
	Printer,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";

export const CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU =
	"Глубокое фторирование эмали (Tiefenfluorid / Сафорайд, A11.07.012)";

export const CLINICAL_TOOTH_MOUSSE_SUMMARY_RU =
	"Реминерализирующая терапия каппой (GC Tooth Mousse, A11.07.010)";

export const CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU =
	"Медикаментозная обработка пародонтальных карманов (Хлоргексидин + Метрогил Дента, A16.07.053)";

export const HYGIENE_EXPRESS_SERVICES = {
	proHygiene: {
		code: "A16.07.051",
		name: CLINICAL_PRO_HYGIENE_SUMMARY_RU,
		price: 5500,
		category: "hygiene",
	},
	deepFluoridation: {
		code: "A11.07.012",
		name: CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
		price: 1800,
		category: "hygiene",
	},
	toothMousse: {
		code: "A11.07.010",
		name: CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
		price: 1500,
		category: "hygiene",
	},
	perioAntiseptic: {
		code: "A16.07.053",
		name: CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
		price: 1200,
		category: "hygiene",
	},
} as const;

export function createDeepFluoridationProtocolText(): string {
	return (
		"• Протокол глубокого фторирования эмали (A11.07.012):\n" +
		"• Проведена изоляция операционного поля ватными валиками, высушивание поверхностей зубов сжатым воздухом.\n" +
		"• Поэтапная аппликация эмаль-герметизирующего ликвида Tiefenfluorid: обработка эмали препаратом №1 (высокодисперсный фтористый силикат магния с ионами меди), экспозиция 1 минута, высушивание; нанесение суспензии препарата №2 (высокодисперсный гидроксид кальция) с образованием субмикроскопических кристаллов CaF2 в порах эмали.\n" +
		"• Тщательное промывание водой, окончательное высушивание. Пациенту даны рекомендации воздержаться от приема пищи и напитков в течение 1 часа."
	);
}

export function createToothMousseProtocolText(): string {
	return (
		"• Протокол реминерализирующей терапии (A11.07.010):\n" +
		"• Очищение и высушивание зубных рядов.\n" +
		"• Нанесение реминерализирующего крема GC Tooth Mousse с биодоступным кальцием и фосфатами (комплекс Recaldent CPP-ACP) на индивидуальные/стандартные силиконовые каппы.\n" +
		"• Наложение капп на верхний и нижний зубные ряды, экспозиция 5 минут. Удаление излишков крема слюноотсосом.\n" +
		"• Пациент проинструктирован не полоскать рот, не пить и не принимать пищу в течение 30 минут для максимальной фиксации минеральных компонентов."
	);
}

export function createPerioAntisepticProtocolText(): string {
	return (
		"• Протокол медикаментозной обработки пародонтальных карманов (A16.07.053):\n" +
		"• Проведена антисептическая обработка операционного поля, бережная эвакуация мягкого зубного налета и экссудата из пародонтальных карманов.\n" +
		"• Орошение зубодесневых и пародонтальных карманов 0.05% раствором хлоргексидина биглюконата с использованием закругленной атравматичной пародонтальной канюли под умеренным давлением.\n" +
		"• Аппликация противомикробного стоматологического геля Метрогил Дента (метронидазол + хлоргексидин) в область карманов и маргинальной десны.\n" +
		"• Пациенту даны рекомендации воздержаться от приема пищи и полоскания полости рта в течение 2 часов."
	);
}

export type ActiveHygieneIndexTab =
	| "ohi-s"
	| "silness-loe"
	| "fedorov-volodkina"
	| "php";

export interface ExtendedToothAssessment extends HygieneToothAssessment {
	readonly silnessScore?: number | undefined;
	readonly fedorovScore?: number | undefined;
	readonly phpScore?: number | undefined;
}

export interface SilnessLoeResult {
	readonly score: number;
	readonly ratingText: string;
	readonly evaluation: "excellent" | "good" | "moderate" | "poor";
	readonly isOptimal: boolean;
}

export interface FedorovVolodkinaResult {
	readonly score: number;
	readonly ratingText: string;
	readonly evaluation: "good" | "moderate" | "poor" | "bad" | "severe";
	readonly isOptimal: boolean;
}

export interface PhpResult {
	readonly score: number;
	readonly ratingText: string;
	readonly evaluation: "excellent" | "good" | "moderate" | "poor";
	readonly isOptimal: boolean;
}

export function calculateSilnessLoeScore(
	assessments: Record<number, ExtendedToothAssessment>,
): SilnessLoeResult {
	let total = 0;
	let count = 0;
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = assessments[cfg.toothNumber];
		const score = item?.silnessScore ?? item?.debrisScore ?? 0;
		total += Math.max(0, Math.min(3, score));
		count++;
	}
	const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
	let evaluation: "excellent" | "good" | "moderate" | "poor" = "excellent";
	let ratingText = "Silness-Löe = 0.0 (Налет отсутствует / норма)";
	if (avg === 0) {
		evaluation = "excellent";
		ratingText = "Silness-Löe = 0.0 (Налет отсутствует / норма)";
	} else if (avg <= 0.9) {
		evaluation = "good";
		ratingText = `Silness-Löe = ${avg.toFixed(1)} (Хорошая гигиена / незначительный налет)`;
	} else if (avg <= 1.9) {
		evaluation = "moderate";
		ratingText = `Silness-Löe = ${avg.toFixed(1)} (Удовлетворительная гигиена / умеренный налет)`;
	} else {
		evaluation = "poor";
		ratingText = `Silness-Löe = ${avg.toFixed(1)} (Плохая гигиена / обильный налет)`;
	}
	return { score: avg, ratingText, evaluation, isOptimal: avg === 0 };
}

export function calculateFedorovVolodkinaScore(
	assessments: Record<number, ExtendedToothAssessment>,
): FedorovVolodkinaResult {
	let total = 0;
	let count = 0;
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = assessments[cfg.toothNumber];
		const score =
			item?.fedorovScore ??
			((item?.debrisScore ?? 0) === 0 ? 1 : Math.min(5, (item?.debrisScore ?? 0) + 1));
		total += Math.max(1, Math.min(5, score));
		count++;
	}
	const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 1.0;
	let evaluation: "good" | "moderate" | "poor" | "bad" | "severe" = "good";
	let ratingText = "Федорова-Володкиной = 1.0 (Хорошая гигиена / норма)";
	if (avg <= 1.5) {
		evaluation = "good";
		ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Хорошая гигиена / норма)`;
	} else if (avg <= 2.0) {
		evaluation = "moderate";
		ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Удовлетворительная гигиена)`;
	} else if (avg <= 2.5) {
		evaluation = "poor";
		ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Неудовлетворительная гигиена)`;
	} else if (avg <= 3.4) {
		evaluation = "bad";
		ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Плохая гигиена)`;
	} else {
		evaluation = "severe";
		ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Очень плохая гигиена)`;
	}
	return { score: avg, ratingText, evaluation, isOptimal: avg <= 1.5 };
}

export function calculatePhpScore(
	assessments: Record<number, ExtendedToothAssessment>,
): PhpResult {
	let total = 0;
	let count = 0;
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = assessments[cfg.toothNumber];
		const score =
			item?.phpScore ?? Math.min(5, Math.round((item?.debrisScore ?? 0) * 1.67));
		total += Math.max(0, Math.min(5, score));
		count++;
	}
	const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0.0;
	let evaluation: "excellent" | "good" | "moderate" | "poor" = "excellent";
	let ratingText = "PHP = 0.0 (Отличная гигиена / норма)";
	if (avg === 0) {
		evaluation = "excellent";
		ratingText = "PHP = 0.0 (Отличная гигиена / норма)";
	} else if (avg <= 0.6) {
		evaluation = "good";
		ratingText = `PHP = ${avg.toFixed(1)} (Хорошая гигиена)`;
	} else if (avg <= 1.6) {
		evaluation = "moderate";
		ratingText = `PHP = ${avg.toFixed(1)} (Удовлетворительная гигиена)`;
	} else {
		evaluation = "poor";
		ratingText = `PHP = ${avg.toFixed(1)} (Неудовлетворительная гигиена)`;
	}
	return { score: avg, ratingText, evaluation, isOptimal: avg <= 0.6 };
}

export interface HygieneIndicesPanelProps {
	/** Optional existing perio dentition for 1-click auto-sync */
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	/** Callback when assessments change */
	readonly onChange?: ((report: CombinedHygieneReport) => void) | undefined;
	/** 1-click insertion into 043/u visit diary */
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
}

export const HygieneIndicesPanel: React.FC<HygieneIndicesPanelProps> = ({
	perioTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	compactMode = false,
}) => {
	// Active assessment state for 6 index teeth
	const [assessments, setAssessments] = useState<
		Record<number, ExtendedToothAssessment>
	>(() => {
		if (perioTeeth && perioTeeth.length > 0) {
			const derived = deriveHygieneFromPerioTeeth(perioTeeth);
			const enriched: Record<number, ExtendedToothAssessment> = {};
			for (const [k, v] of Object.entries(derived)) {
				const num = Number(k);
				const d = v.debrisScore ?? 0;
				enriched[num] = {
					...v,
					silnessScore: d,
					fedorovScore: d === 0 ? 1 : Math.min(5, d + 1),
					phpScore: Math.min(5, Math.round(d * 1.67)),
				};
			}
			return enriched;
		}
		const healthy = createHealthyHygieneAssessment();
		const enrichedHealthy: Record<number, ExtendedToothAssessment> = {};
		for (const [k, v] of Object.entries(healthy)) {
			const num = Number(k);
			enrichedHealthy[num] = {
				...valToExtended(v),
				silnessScore: 0,
				fedorovScore: 1,
				phpScore: 0,
			};
		}
		return enrichedHealthy;
	});

	const [activeTab, setActiveTab] = useState<ActiveHygieneIndexTab>("ohi-s");
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	// Calculate live report via @dental/shared pure engine
	const report: CombinedHygieneReport = useMemo(() => {
		return calculateCombinedHygieneReport(assessments);
	}, [assessments]);

	// Calculate secondary hygiene indices
	const silnessResult = useMemo(
		() => calculateSilnessLoeScore(assessments),
		[assessments],
	);
	const fedorovResult = useMemo(
		() => calculateFedorovVolodkinaScore(assessments),
		[assessments],
	);
	const phpResult = useMemo(() => calculatePhpScore(assessments), [assessments]);

	// Broadcast change upward
	useEffect(() => {
		if (onChange) {
			onChange(report);
		}
	}, [report, onChange]);

	// ─── Mutations ───────────────────────────────────────────────────────────
	const updateToothScore = useCallback(
		(
			toothNumber: number,
			field:
				| "debrisScore"
				| "calculusScore"
				| "pmaScore"
				| "kpiScore"
				| "silnessScore"
				| "fedorovScore"
				| "phpScore",
			value: number,
		) => {
			if (readOnly) return;
			setAssessments((prev) => {
				const current = prev[toothNumber] ?? { toothNumber };
				const updated: ExtendedToothAssessment = {
					...current,
					[field]: value,
				};
				// Automatically keep mapped scores in sync across index modes:
				if (field === "debrisScore") {
					updated.silnessScore = value;
					updated.fedorovScore = value === 0 ? 1 : Math.min(5, value + 1);
					updated.phpScore = Math.min(5, Math.round(value * 1.67));
				} else if (field === "silnessScore") {
					updated.debrisScore = value;
					updated.fedorovScore = value === 0 ? 1 : Math.min(5, value + 1);
					updated.phpScore = Math.min(5, Math.round(value * 1.67));
				} else if (field === "fedorovScore") {
					const mappedDebris = value === 1 ? 0 : Math.min(3, value - 1);
					updated.debrisScore = mappedDebris;
					updated.silnessScore = mappedDebris;
					updated.phpScore = Math.min(5, Math.round(mappedDebris * 1.67));
				} else if (field === "phpScore") {
					const mappedDebris =
						value === 0 ? 0 : value <= 2 ? 1 : value <= 4 ? 2 : 3;
					updated.debrisScore = mappedDebris;
					updated.silnessScore = mappedDebris;
					updated.fedorovScore = mappedDebris === 0 ? 1 : mappedDebris + 1;
				}
				return {
					...prev,
					[toothNumber]: updated,
				};
			});
		},
		[readOnly],
	);

	// 1. Норма пародонта (Мандаты 8e, 8i, 8k, 8n: OHI-S = 0, Silness = 0, Федорова-В. = 1.0)
	const handlePresetPeriodontalNorm = useCallback(() => {
		if (readOnly) return;
		const healthy = createHealthyHygieneAssessment();
		const enrichedHealthy: Record<number, ExtendedToothAssessment> = {};
		for (const [key, val] of Object.entries(healthy)) {
			const num = Number(key);
			enrichedHealthy[num] = {
				...val,
				silnessScore: 0,
				fedorovScore: 1,
				phpScore: 0,
			};
		}
		setAssessments(enrichedHealthy);

		const protocolText = createClinicalPerioNormProtocolText();

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			`${CLINICAL_PERIO_NORM_SUMMARY_RU}. Данные внесены в 043/у!`,
			"success",
			4000,
		);
	}, [readOnly, onInsertToProtocol]);

	// 2. Катаральный гингивит
	const handlePresetCatarrhalGingivitis = useCallback(() => {
		if (readOnly) return;
		const gingivitisAssessments: Record<number, ExtendedToothAssessment> = {
			16: {
				toothNumber: 16,
				debrisScore: 1,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
			11: {
				toothNumber: 11,
				debrisScore: 2,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			26: {
				toothNumber: 26,
				debrisScore: 1,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
			46: {
				toothNumber: 46,
				debrisScore: 1,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
			31: {
				toothNumber: 31,
				debrisScore: 2,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			36: {
				toothNumber: 36,
				debrisScore: 1,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
		};
		setAssessments(gingivitisAssessments);

		const protocolText =
			"• Экспресс-оценка гигиены и пародонта: Хронический катаральный гингивит (K05.1).\n" +
			"• Status localis: Отек десневых сосочков, гиперемия и цианоз маргинального края десны, кровоточивость при зондировании (BOP+). Патологических пародонтальных карманов нет (глубина бороздок до 3 мм за счет отека десны). Определяются наддесневые зубные отложения и мягкий зубной налет.\n" +
			"• Клинические индексы: OHI-S 1.7 (удовлетворительная), PMA 35% (воспаление сосочков и маргинальной десны), КПИ 2.0 (зубной камень, кровоточивость).\n" +
			"• Рекомендовано: Профессиональная гигиена полости рта (УЗ + AirFlow), противовоспалительная терапия, аппликации дентального геля.";

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			"Катаральный гингивит зафиксирован: отек сосочков, BOP+, наддесневые отложения. Данные внесены в 043/у!",
			"warning",
			4000,
		);
	}, [readOnly, onInsertToProtocol]);

	// 3. Пародонтит легкой степени (глубина 3-4 мм)
	const handlePresetMildPeriodontitis = useCallback(() => {
		if (readOnly) return;
		const mildPerioAssessments: Record<number, ExtendedToothAssessment> = {
			16: {
				toothNumber: 16,
				debrisScore: 1,
				calculusScore: 2,
				pmaScore: 2,
				kpiScore: 3,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
			11: {
				toothNumber: 11,
				debrisScore: 1,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
			26: {
				toothNumber: 26,
				debrisScore: 1,
				calculusScore: 2,
				pmaScore: 2,
				kpiScore: 3,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
			46: {
				toothNumber: 46,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 2,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			31: {
				toothNumber: 31,
				debrisScore: 1,
				calculusScore: 1,
				pmaScore: 2,
				kpiScore: 2,
				silnessScore: 1,
				fedorovScore: 2,
				phpScore: 2,
			},
			36: {
				toothNumber: 36,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 2,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
		};
		setAssessments(mildPerioAssessments);

		const protocolText =
			"• Экспресс-оценка гигиены и пародонта: Хронический генерализованный пародонтит легкой степени тяжести (K05.3).\n" +
			"• Status localis: Десна умеренно гиперемирована, пастозна, с цианотичным оттенком. Глубина пародонтальных карманов 3-4 мм, преимущественно в межзубных промежутках, кровоточивость при зондировании (BOP+). Рецессия десны до 1 мм, умеренное количество над- и поддесневого зубного камня, патологическая подвижность зубов отсутствует (0 ст.). На рентгенограмме/КЛКТ: деструкция кортикальной пластинки и вершин межальвеолярных перегородок до 1/3 длины корней.\n" +
			"• Клинические индексы: OHI-S 1.8 (удовлетворительная), PMA 35% (умеренное воспаление сосочков и маргинального края), КПИ 2.5 (зубной камень, карманы 3-4 мм).\n" +
			"• Рекомендовано: Профессиональная гигиена полости рта (УЗ Piezon + субгингивальный AirFlow), закрытый кюретаж карманов, антисептическая обработка десны, обучение гигиене.";

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			"Пародонтит легкой степени зафиксирован: карманы 3-4 мм, над/поддесневой камень, BOP+. Данные внесены в 043/у!",
			"warning",
			4000,
		);
	}, [readOnly, onInsertToProtocol]);

	// 4. Пародонтит средней степени
	const handlePresetModeratePeriodontitis = useCallback(() => {
		if (readOnly) return;
		const perioAssessments: Record<number, ExtendedToothAssessment> = {
			16: {
				toothNumber: 16,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 3,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			11: {
				toothNumber: 11,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 3,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			26: {
				toothNumber: 26,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 3,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			46: {
				toothNumber: 46,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 3,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			31: {
				toothNumber: 31,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 3,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			36: {
				toothNumber: 36,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 3,
				kpiScore: 3,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
		};
		setAssessments(perioAssessments);

		const protocolText =
			"• Экспресс-оценка гигиены и пародонта: Хронический генерализованный пародонтит средней степени тяжести (K05.3).\n" +
			"• Status localis: Десна застойно гиперемирована с цианотичным оттенком, сосочки деформированы. Глубина пародонтальных карманов 4-5 мм с серозным экссудатом, рецессия десны 1-2 мм, обильный под- и наддесневой зубной камень, патологическая подвижность I ст. На рентгенограмме/КЛКТ: резорбция костной ткани межальвеолярных перегородок от 1/3 до 1/2 длины корней.\n" +
			"• Клинические индексы: OHI-S 2.4 (неудовлетворительная), PMA 55% (тяжелое диффузное воспаление), КПИ 3.0 (пародонтальные карманы 4-5 мм).\n" +
			"• Рекомендовано: Комплексная пародонтальная терапия, поддесневой скейлинг SRP, Vector-терапия, антимикробная обработка карманов, шинирование по показаниям.";

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			"Пародонтит средней степени зафиксирован: карманы 4-5 мм, рецессия 1-2 мм, зубной камень, подвижность I ст. Данные внесены в 043/у!",
			"warning",
			4000,
		);
	}, [readOnly, onInsertToProtocol]);

	// 5. Пародонтит тяжёлой степени (Мандаты 8e, 8i, 8k, 8n)
	const handlePresetSeverePeriodontitis = useCallback(() => {
		if (readOnly) return;
		const perioAssessments: Record<number, ExtendedToothAssessment> = {
			16: {
				toothNumber: 16,
				debrisScore: 3,
				calculusScore: 3,
				pmaScore: 3,
				kpiScore: 4,
				silnessScore: 3,
				fedorovScore: 5,
				phpScore: 5,
			},
			11: {
				toothNumber: 11,
				debrisScore: 2,
				calculusScore: 2,
				pmaScore: 3,
				kpiScore: 4,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			26: {
				toothNumber: 26,
				debrisScore: 3,
				calculusScore: 3,
				pmaScore: 3,
				kpiScore: 4,
				silnessScore: 3,
				fedorovScore: 5,
				phpScore: 5,
			},
			46: {
				toothNumber: 46,
				debrisScore: 3,
				calculusScore: 3,
				pmaScore: 3,
				kpiScore: 4,
				silnessScore: 3,
				fedorovScore: 5,
				phpScore: 5,
			},
			31: {
				toothNumber: 31,
				debrisScore: 2,
				calculusScore: 3,
				pmaScore: 3,
				kpiScore: 4,
				silnessScore: 2,
				fedorovScore: 3,
				phpScore: 3,
			},
			36: {
				toothNumber: 36,
				debrisScore: 3,
				calculusScore: 3,
				pmaScore: 3,
				kpiScore: 4,
				silnessScore: 3,
				fedorovScore: 5,
				phpScore: 5,
			},
		};
		setAssessments(perioAssessments);

		const protocolText =
			"• Экспресс-оценка гигиены и пародонта: Хронический генерализованный пародонтит тяжёлой степени (K05.32).\n" +
			"• Status localis: Десна застойно цианотична, выраженная кровоточивость сосочков (BOP > 50%). Глубокие пародонтальные карманы от 6 до 8 мм с серозно-гнойным экссудатом, рецессия десны 2-4 мм с обнажением фуркаций корней (фуркационные дефекты II класса). Обильный над- и поддесневой зубной камень, патологическая подвижность зубов II-III ст., веерообразное расхождение резцов. На рентгенограмме/КЛКТ: диффузная деструкция костной ткани межальвеолярных перегородок более 1/2 длины корней.\n" +
			"• Клинические индексы: OHI-S 2.8 (плохая гигиена), PMA 75% (тяжелый генерализованный гингивит), КПИ 4.0 (тяжелые деструктивные изменения пародонта, карманы ≥ 6 мм, подвижность).\n" +
			"• Рекомендовано: Неотложная противовоспалительная санация пародонта, антисептическое орошение карманов хлоргексидином 0.05%, эвакуация гнойного экссудата. Временное экстракоронарное шинирование подвижных зубов (A16.07.019). Системная противовоспалительная терапия, консультация хирурга-пародонтолога (лоскутные операции / удаление безнадежных зубов).";

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			"Пародонтит тяжёлой степени зафиксирован: карманы ≥6 мм, гноетечение, подвижность II-III ст. Данные внесены в 043/у!",
			"warning",
			4500,
		);
	}, [readOnly, onInsertToProtocol]);

	// 5. Профессиональная гигиена выполнена (Мандаты 8e, 8i, 8k, 8n)
	const handlePresetProHygieneDone = useCallback(() => {
		if (readOnly) return;
		const healthy = createHealthyHygieneAssessment();
		const enrichedHealthy: Record<number, ExtendedToothAssessment> = {};
		for (const [key, val] of Object.entries(healthy)) {
			const num = Number(key);
			enrichedHealthy[num] = {
				...val,
				silnessScore: 0,
				fedorovScore: 1,
				phpScore: 0,
			};
		}
		setAssessments(enrichedHealthy);

		const protocolText = createClinicalProHygieneProtocolText();

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		const proHygieneService = {
			code: "A16.07.051",
			name: CLINICAL_PRO_HYGIENE_SUMMARY_RU,
			price: 5500,
			quantity: 1,
			category: "hygiene",
		};

		window.dispatchEvent(
			new CustomEvent("dente-add-estimate-service", {
				detail: proHygieneService,
			}),
		);

		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					...proHygieneService,
					service: proHygieneService,
					services: [proHygieneService],
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			`${CLINICAL_PRO_HYGIENE_SUMMARY_RU}. Дневник 043/у и смета обновлены!`,
			"success",
			4500,
		);
	}, [readOnly, onInsertToProtocol]);

	// 6. Глубокое фторирование эмали (Tiefenfluorid / Сафорайд, A11.07.012, 1800 ₽)
	const handlePresetDeepFluoridation = useCallback(() => {
		if (readOnly) return;
		const protocolText = createDeepFluoridationProtocolText();

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		const fluoridationService = {
			code: "A11.07.012",
			name: CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
			price: 1800,
			quantity: 1,
			category: "hygiene",
		};

		window.dispatchEvent(
			new CustomEvent("dente-add-estimate-service", {
				detail: fluoridationService,
			}),
		);

		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					...fluoridationService,
					service: fluoridationService,
					services: [fluoridationService],
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			`${CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU}. Внесено в 043/у и чек визита!`,
			"success",
			4500,
		);
	}, [readOnly, onInsertToProtocol]);

	// 7. Реминерализирующая терапия каппой (GC Tooth Mousse, A11.07.010, 1500 ₽)
	const handlePresetToothMousse = useCallback(() => {
		if (readOnly) return;
		const protocolText = createToothMousseProtocolText();

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		const toothMousseService = {
			code: "A11.07.010",
			name: CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
			price: 1500,
			quantity: 1,
			category: "hygiene",
		};

		window.dispatchEvent(
			new CustomEvent("dente-add-estimate-service", {
				detail: toothMousseService,
			}),
		);

		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					...toothMousseService,
					service: toothMousseService,
					services: [toothMousseService],
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			`${CLINICAL_TOOTH_MOUSSE_SUMMARY_RU}. Внесено в 043/у и чек визита!`,
			"success",
			4500,
		);
	}, [readOnly, onInsertToProtocol]);

	// 8. Медикаментозная обработка пародонтальных карманов (Хлоргексидин + Метрогил Дента, A16.07.053, 1200 ₽)
	const handlePresetPerioAntiseptic = useCallback(() => {
		if (readOnly) return;
		const protocolText = createPerioAntisepticProtocolText();

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		const perioAntisepticService = {
			code: "A16.07.053",
			name: CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
			price: 1200,
			quantity: 1,
			category: "hygiene",
		};

		window.dispatchEvent(
			new CustomEvent("dente-add-estimate-service", {
				detail: perioAntisepticService,
			}),
		);

		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					...perioAntisepticService,
					service: perioAntisepticService,
					services: [perioAntisepticService],
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		showToast(
			`${CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU}. Внесено в 043/у и чек визита!`,
			"success",
			4500,
		);
	}, [readOnly, onInsertToProtocol]);

	const handleSyncFromPerio = useCallback(() => {
		if (readOnly || !perioTeeth || perioTeeth.length === 0) return;
		const derived = deriveHygieneFromPerioTeeth(perioTeeth);
		const enriched: Record<number, ExtendedToothAssessment> = {};
		for (const [k, v] of Object.entries(derived)) {
			const num = Number(k);
			const d = v.debrisScore ?? 0;
			enriched[num] = {
				...v,
				silnessScore: d,
				fedorovScore: d === 0 ? 1 : Math.min(5, d + 1),
				phpScore: Math.min(5, Math.round(d * 1.67)),
			};
		}
		setAssessments(enriched);
		showToast(
			"Индексы синхронизированы с текущей пародонтограммой",
			"info",
			3500,
		);
	}, [readOnly, perioTeeth]);

	// 1-Click Insert into Visit Diary 043/u (ALWAYS ACTIVE - Zero Obstacles)
	const handleInsertTo043 = useCallback(() => {
		const lines = [
			report.summaryText043,
			"• Дополнительные клинические индексы гигиены:",
			`  - ${silnessResult.ratingText}`,
			`  - ${fedorovResult.ratingText}`,
			`  - ${phpResult.ratingText}`,
		];
		const textToInsert = lines.join("\n");

		// 1. Instantly update visit store
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${textToInsert}`
				: textToInsert,
		}));

		// 2. Dispatch SOAP custom event
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: textToInsert,
					mode: "smart_append",
				},
			}),
		);

		// 3. Invoke callback if supplied
		if (onInsertToProtocol) {
			onInsertToProtocol(textToInsert);
		}

		// 4. Also copy to clipboard for fail-safe resilience
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(textToInsert);
		}

		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2500);
		showToast(
			"Индексы гигиены успешно внесены в дневник 043/у",
			"success",
			4000,
		);
	}, [
		report.summaryText043,
		silnessResult,
		fedorovResult,
		phpResult,
		onInsertToProtocol,
	]);

	// 1-Click Print Protocol (Miller's Law: лаконичное прямое действие)
	const handlePrintProtocol = useCallback(() => {
		const printContent = [
			"═══════════════════════════════════════════════════════════════",
			"ПРОТОКОЛ КЛИНИЧЕСКИХ ИНДЕКСОВ ГИГИЕНЫ И ПАРОДОНТА (Форма 043/у)",
			"═══════════════════════════════════════════════════════════════",
			"",
			`Дата осмотра: ${new Date().toLocaleDateString("ru-RU")}`,
			"",
			`1. Индекс OHI-S (Грин-Вермиллион): ${report.ohiS.ratingText}`,
			`   - Зубной налет (DI-S): ${report.ohiS.debrisScore}`,
			`   - Зубной камень (CI-S): ${report.ohiS.calculusScore}`,
			`2. Индекс Silness-Löe (Сиднесс-Лоэ): ${silnessResult.ratingText}`,
			`3. Индекс Федорова-Володкиной: ${fedorovResult.ratingText}`,
			`4. Индекс PHP (Подошадлей-Хейли): ${phpResult.ratingText}`,
			`5. Индекс PMA (Парма / воспаление десны): ${report.pma.ratingText}`,
			`6. КПИ Леуса (состояние периодонта): ${report.kpi.ratingText}`,
			"",
			"ЗАКЛЮЧЕНИЕ:",
			report.summaryText043,
			"",
			"───────────────────────────────────────────────────────────────",
			"Врач-стоматолог / гигиенист: ____________________ / ____________",
			"───────────────────────────────────────────────────────────────",
		].join("\n");

		if (typeof window !== "undefined") {
			const printWindow = window.open("", "_blank");
			if (printWindow) {
				printWindow.document.write(`
					<!DOCTYPE html>
					<html>
					<head>
						<meta charset="utf-8">
						<title>Протокол индексов гигиены — 043/у</title>
						<style>
							body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; max-width: 700px; margin: 0 auto; }
							h2 { font-size: 15px; margin-bottom: 12px; border-bottom: 2px solid #333; padding-bottom: 6px; text-transform: uppercase; }
							pre { white-space: pre-wrap; font-size: 12px; line-height: 1.5; font-family: inherit; }
							.footer { margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; }
							@media print { body { padding: 0; } }
						</style>
					</head>
					<body>
						<h2>Протокол клинических индексов гигиены и пародонта (Форма 043/у)</h2>
						<pre>${printContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
						<div class="footer">
							<span>DENTE Dental CRM • Медицинская карта 043/у</span>
							<span>Распечатано: ${new Date().toLocaleString("ru-RU")}</span>
						</div>
						<script>
							window.onload = function() { window.print(); window.close(); }
						</script>
					</body>
					</html>
				`);
				printWindow.document.close();
			} else {
				window.print();
			}
		}
		showToast("Протокол отправлен на печать", "info", 3000);
	}, [report, silnessResult, fedorovResult, phpResult]);

	const handleCopyText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(report.summaryText043);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Протокол индексов гигиены скопирован", "success", 3000);
		}
	}, [report.summaryText043]);

	return (
		<div className="w-full flex flex-col gap-4 p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-xs">
			{/* ─── Header & Action Presets (Miller's Law: <= 2 primary buttons) ── */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 shrink-0">
						<ShieldCheck size={20} />
					</div>
					<div className="min-w-0 flex-1">
						<h4 className="text-sm font-bold text-[var(--ink)] truncate">
							Индексы гигиены полости рта (OHI-S, PMA, КПИ Леуса)
						</h4>
						<p className="text-xs text-[var(--muted)] truncate">
							Быстрый клинический замер по 6 индексным зубам без требования
							заполнять всю челюсть
						</p>
					</div>
				</div>

				{!readOnly && (
					<div className="flex items-center gap-2 flex-wrap shrink-0">
						{perioTeeth && perioTeeth.length > 0 && (
							<button
								type="button"
								onClick={handleSyncFromPerio}
								className="h-8 sm:h-9 px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] hover:bg-teal-500/15 hover:text-teal-700 dark:hover:text-teal-300 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
								title="Импортировать налет и кровоточивость из пародонтограммы"
							>
								<RotateCcw size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate">Из перио-карты</span>
							</button>
						)}

						{/* 1-Click Insert into 043/u: ALWAYS VISIBLE AND ACTIVE (Mandate 8e) */}
						<button
							type="button"
							onClick={handleInsertTo043}
							className="h-8 sm:h-9 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer touch-manipulation truncate"
							title="Вставить сводку индексов гигиены в дневник 043/у"
							data-testid="hygiene-insert-to-043-btn"
						>
							{insertStatus ? (
								<Check size={14} className="shrink-0" />
							) : (
								<FileText size={14} className="shrink-0" />
							)}
							<span className="truncate">
								{insertStatus ? "Внесено в 043/у!" : "В карту 043/у"}
							</span>
						</button>

						{/* 1-Click Print Protocol (Miller's Law) */}
						<button
							type="button"
							onClick={handlePrintProtocol}
							className="h-8 sm:h-9 px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
							title="Распечатать стандартизированный протокол клинических индексов гигиены"
							data-testid="hygiene-print-protocol-btn"
						>
							<Printer size={14} className="shrink-0" />
							<span className="truncate">Печать протокола</span>
						</button>

						<button
							type="button"
							onClick={handleCopyText}
							className="h-8 sm:h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer flex items-center justify-center touch-manipulation"
							title="Скопировать протокол в буфер обмена"
							aria-label="Скопировать протокол в буфер"
							data-testid="hygiene-copy-protocol-btn"
						>
							{copyStatus ? (
								<Check size={15} className="text-emerald-500 dark:text-emerald-400" />
							) : (
								<Clipboard size={15} />
							)}
						</button>
					</div>
				)}
			</div>

			{/* ─── 1-Click Express Presets Strip (Mandates 8e, 8i, 8k, 8n) ─── */}
			{!readOnly && (
				<div className="flex flex-col gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
					{/* Section A: Клинические статусы пародонта */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<Zap size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="text-xs font-black text-teal-900 dark:text-teal-300 truncate">
								1-Клик экспресс-статусы пародонта (без ручного ввода 192 точек):
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
							{/* Preset 1: Норма пародонта */}
							<button
								type="button"
								onClick={handlePresetPeriodontalNorm}
								className="min-h-[48px] p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-300 border border-emerald-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Норма пародонта: зубодесневая бороздка <= 2 мм, десна бледно-розовая плотная, кровоточивости нет, патологических карманов нет, подвижность 0"
								data-testid="hygiene-preset-norm"
							>
								<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
									<ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span className="truncate">Норма пародонта</span>
								</div>
								<span className="text-[10px] text-emerald-800 dark:text-emerald-200/80 leading-tight mt-0.5 line-clamp-2">
									бороздка &le; 2 мм, десна плотная, BOP 0%, карманов нет,
									подвижность 0
								</span>
							</button>

							{/* Preset 2: Катаральный гингивит */}
							<button
								type="button"
								onClick={handlePresetCatarrhalGingivitis}
								className="min-h-[48px] p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Катаральный гингивит: отек десневых сосочков, кровоточивость при зондировании, карманов нет, наддесневые зубные отложения"
								data-testid="hygiene-preset-gingivitis"
							>
								<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
									<Activity size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<span className="truncate">Катаральный гингивит</span>
								</div>
								<span className="text-[10px] text-amber-800 dark:text-amber-200/80 leading-tight mt-0.5 line-clamp-2">
									отек сосочков, кровоточивость (BOP+), карманов нет, наддесневой
									камень
								</span>
							</button>

							{/* Preset 3: Пародонтит легкий */}
							<button
								type="button"
								onClick={handlePresetMildPeriodontitis}
								className="min-h-[48px] p-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-900 dark:text-rose-200 border border-rose-500/35 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Пародонтит легкой степени: глубина карманов 3-4 мм, над/поддесневой камень, BOP+, подвижность 0"
								data-testid="hygiene-preset-mild-periodontitis"
							>
								<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
									<AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
									<span className="truncate">Пародонтит легкий (3-4 мм)</span>
								</div>
								<span className="text-[10px] text-rose-800 dark:text-rose-200/80 leading-tight mt-0.5 line-clamp-2">
									карманы 3–4 мм, над/поддесневой камень, кровоточивость, подвижность 0
								</span>
							</button>

							{/* Preset 4: Пародонтит средней степени */}
							<button
								type="button"
								onClick={handlePresetModeratePeriodontitis}
								className="min-h-[48px] p-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/35 text-orange-900 dark:text-orange-200 border border-orange-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Пародонтит средней степени: глубина карманов 4-5 мм, рецессия 1-2 мм, зубной камень, подвижность I ст."
								data-testid="hygiene-preset-periodontitis"
							>
								<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
									<ShieldAlert size={15} className="text-orange-600 dark:text-orange-400 shrink-0" />
									<span className="truncate">Пародонтит средний (4-5 мм)</span>
								</div>
								<span className="text-[10px] text-orange-800 dark:text-orange-200/80 leading-tight mt-0.5 line-clamp-2">
									карманы 4–5 мм, рецессия 1–2 мм, зубной камень, подвижность I
									ст.
								</span>
							</button>

							{/* Preset 5: Пародонтит тяжёлой степени */}
							<button
								type="button"
								onClick={handlePresetSeverePeriodontitis}
								className="min-h-[48px] p-2.5 rounded-xl bg-red-700/20 hover:bg-red-700/35 text-red-900 dark:text-red-200 border border-red-600/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Пародонтит тяжёлой степени: глубина карманов >= 6 мм, гноетечение, рецессия 2-4 мм, подвижность II-III ст."
								data-testid="hygiene-preset-severe-periodontitis"
							>
								<div className="flex items-center gap-1.5 font-black text-xs min-w-0">
									<ShieldAlert size={15} className="text-red-600 dark:text-red-400 shrink-0" />
									<span className="truncate">Пародонтит тяжелый (&ge;6 мм)</span>
								</div>
								<span className="text-[10px] text-red-800 dark:text-red-200/80 leading-tight mt-0.5 line-clamp-2">
									карманы &ge;6 мм, гноетечение, рецессия, подвижность II-III ст.
								</span>
							</button>
						</div>
					</div>

					{/* Section B: 1-Клик Chairside-протоколы и начисление услуг в чек (Номенклатура 804н) */}
					<div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20">
						<div className="flex items-center justify-between flex-wrap gap-1">
							<div className="flex items-center gap-2 min-w-0">
								<Sparkles size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
								<span className="text-xs font-black text-cyan-900 dark:text-cyan-300 truncate">
									Chairside-протоколы лечения и профилактики (начисление в чек 804н + дневник 043/у):
								</span>
							</div>
							<span className="text-[10px] text-teal-800 dark:text-teal-300/70 shrink-0">
								1-клик автоначисление в чек визита
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
							{/* Protocol 1: Профессиональная гигиена выполнена (A16.07.051) */}
							<button
								type="button"
								onClick={handlePresetProHygieneDone}
								className="min-h-[48px] p-2.5 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-900 dark:text-cyan-200 border border-cyan-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Комплексная профессиональная гигиена (A16.07.051, 5500 ₽): УЗ Piezon + Air-Flow глицином + Kerr Cleanic + Fluocal"
								data-testid="hygiene-preset-pro-hygiene"
							>
								<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
									<div className="flex items-center gap-1.5 truncate min-w-0">
										<Sparkles size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
										<span className="truncate">Профгигиена</span>
									</div>
									<span className="text-[11px] font-mono text-cyan-900 dark:text-cyan-300 font-black shrink-0">
										5 500 ₽
									</span>
								</div>
								<span className="text-[10px] text-cyan-800 dark:text-cyan-200/80 leading-tight mt-0.5 line-clamp-2">
									A16.07.051 • УЗ Piezon + AirFlow + Cleanic + Fluocal
								</span>
							</button>

							{/* Protocol 2: Глубокое фторирование (A11.07.012) */}
							<button
								type="button"
								onClick={handlePresetDeepFluoridation}
								className="min-h-[48px] p-2.5 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 text-sky-900 dark:text-sky-200 border border-sky-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Глубокое фторирование эмали (A11.07.012, 1800 ₽): аппликация эмаль-ликвида Tiefenfluorid / Сафорайд, экспозиция, сушка"
								data-testid="hygiene-preset-deep-fluoridation"
							>
								<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
									<div className="flex items-center gap-1.5 truncate min-w-0">
										<Droplets size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
										<span className="truncate">Глубокое фторирование</span>
									</div>
									<span className="text-[11px] font-mono text-sky-900 dark:text-sky-300 font-black shrink-0">
										1 800 ₽
									</span>
								</div>
								<span className="text-[10px] text-sky-800 dark:text-sky-200/80 leading-tight mt-0.5 line-clamp-2">
									A11.07.012 • Tiefenfluorid / Сафорайд, СаF2 в порах
								</span>
							</button>

							{/* Protocol 3: Ремтерапия Tooth Mousse (A11.07.010) */}
							<button
								type="button"
								onClick={handlePresetToothMousse}
								className="min-h-[48px] p-2.5 rounded-xl bg-violet-600/25 hover:bg-violet-600/40 text-violet-900 dark:text-violet-200 border border-violet-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Реминерализирующая терапия каппой (A11.07.010, 1500 ₽): крем GC Tooth Mousse (Recaldent CPP-ACP) на индивидуальной каппе, 5 мин"
								data-testid="hygiene-preset-tooth-mousse"
							>
								<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
									<div className="flex items-center gap-1.5 truncate min-w-0">
										<ShieldCheck size={15} className="text-violet-600 dark:text-violet-400 shrink-0" />
										<span className="truncate">Ремтерапия Tooth Mousse</span>
									</div>
									<span className="text-[11px] font-mono text-violet-900 dark:text-violet-300 font-black shrink-0">
										1 500 ₽
									</span>
								</div>
								<span className="text-[10px] text-violet-800 dark:text-violet-200/80 leading-tight mt-0.5 line-clamp-2">
									A11.07.010 • GC Tooth Mousse на каппе, 5 мин
								</span>
							</button>

							{/* Protocol 4: Антисептическая обработка карманов (A16.07.053) */}
							<button
								type="button"
								onClick={handlePresetPerioAntiseptic}
								className="min-h-[48px] p-2.5 rounded-xl bg-teal-600/25 hover:bg-teal-600/40 text-teal-900 dark:text-teal-200 border border-teal-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-2xs flex flex-col justify-center min-w-0"
								title="Медикаментозная обработка карманов (A16.07.053, 1200 ₽): орошение 0.05% хлоргексидином + инстилляция Метрогил Дента"
								data-testid="hygiene-preset-perio-antiseptic"
							>
								<div className="flex items-center justify-between gap-1 font-black text-xs min-w-0">
									<div className="flex items-center gap-1.5 truncate min-w-0">
										<CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span className="truncate">Обработка карманов</span>
									</div>
									<span className="text-[11px] font-mono text-teal-900 dark:text-teal-300 font-black shrink-0">
										1 200 ₽
									</span>
								</div>
								<span className="text-[10px] text-teal-800 dark:text-teal-200/80 leading-tight mt-0.5 line-clamp-2">
									A16.07.053 • Хлоргексидин 0.05% + Метрогил Дента
								</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ─── Compact Index Switcher Toolbar (Hick's Law: 32–36px height) ─── */}
			<div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--line)]">
				<div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] h-8 sm:h-9">
					{[
						{ id: "ohi-s", label: "OHI-S (Грин-Вермиллион)", shortLabel: "OHI-S" },
						{
							id: "silness-loe",
							label: "Silness-Löe (Сиднесс-Лоэ)",
							shortLabel: "Сиднесс-Лоэ",
						},
						{
							id: "fedorov-volodkina",
							label: "Федорова-Володкина",
							shortLabel: "Федорова-Володкина",
						},
						{ id: "php", label: "PHP (Подошадлей-Хейли)", shortLabel: "PHP" },
					].map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id as ActiveHygieneIndexTab)}
								className={`h-6 sm:h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer truncate ${
									isActive
										? "bg-teal-600 text-white font-bold shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/40"
								}`}
								title={tab.label}
							>
								<span className="hidden sm:inline truncate">{tab.label}</span>
								<span className="sm:hidden truncate">{tab.shortLabel}</span>
							</button>
						);
					})}
				</div>

				<div className="text-[11px] text-[var(--muted)] min-w-0 truncate hidden md:flex items-center gap-1.5">
					<span className="font-semibold text-teal-700 dark:text-teal-400">
						{activeTab === "ohi-s" && "OHI-S:"}
						{activeTab === "silness-loe" && "Silness-Löe:"}
						{activeTab === "fedorov-volodkina" && "Федорова-Володкина:"}
						{activeTab === "php" && "PHP:"}
					</span>
					<span className="truncate">
						{activeTab === "ohi-s" &&
							"Зубной налет (DI-S) + зубной камень (CI-S). Норма ≤ 0.6"}
						{activeTab === "silness-loe" &&
							"Толщина налета у края десны (0..3). Норма = 0 (налет отсутствует)"}
						{activeTab === "fedorov-volodkina" &&
							"Окрашивание раствором Шиллера-Писарева (1..5). Норма = 1.0"}
						{activeTab === "php" &&
							"Эффективность гигиены по 5 зонам коронки (0..5). Норма = 0.0"}
					</span>
				</div>
			</div>

			{/* ─── Real-Time Index Telemetry Cards (4-Indices Strip) ─────────── */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{/* 1. OHI-S / Green-Vermillion */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							Индекс OHI-S (Грин-Вермиллион)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								report.ohiS.totalScore <= 0.6
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: report.ohiS.totalScore <= 1.6
										? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
										: report.ohiS.totalScore <= 2.5
											? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
											: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{report.ohiS.clinicalEvaluation === "excellent"
								? "Отличная"
								: report.ohiS.clinicalEvaluation === "good"
									? "Хорошая"
									: report.ohiS.clinicalEvaluation === "moderate"
										? "Удовлетворит."
										: report.ohiS.clinicalEvaluation === "poor"
											? "Неудовлетворит."
											: "Плохая"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								report.ohiS.totalScore <= 0.6
									? "text-emerald-600 dark:text-emerald-400"
									: report.ohiS.totalScore <= 1.6
										? "text-teal-700 dark:text-teal-300"
										: report.ohiS.totalScore <= 2.5
											? "text-amber-600 dark:text-amber-400"
											: "text-rose-600 dark:text-rose-400"
							}`}
						>
							{report.ohiS.totalScore.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							DI-S: <strong>{report.ohiS.debrisScore}</strong> • CI-S:{" "}
							<strong>{report.ohiS.calculusScore}</strong>
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: ≤ 0.6 (отл.) / ≤ 1.6 (хор.)
					</span>
				</div>

				{/* 2. Active Secondary Index (Silness-Löe / Федорова-Володкиной / PHP) */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							{activeTab === "silness-loe"
								? "Индекс Silness-Löe"
								: activeTab === "fedorov-volodkina"
									? "Индекс Федорова-Володкиной"
									: activeTab === "php"
										? "Индекс PHP (Подошадлей)"
										: "Индекс Silness-Löe (десна)"}
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								activeTab === "fedorov-volodkina"
									? fedorovResult.isOptimal
										? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
										: fedorovResult.evaluation === "moderate"
											? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
											: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
									: activeTab === "php"
										? phpResult.isOptimal
											? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
											: phpResult.evaluation === "good"
												? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
												: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
										: silnessResult.isOptimal
											? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
											: silnessResult.evaluation === "good"
												? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
												: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{activeTab === "fedorov-volodkina"
								? fedorovResult.evaluation === "good"
									? "Норма (хор.)"
									: fedorovResult.evaluation === "moderate"
										? "Удовл."
										: "Плохая"
								: activeTab === "php"
									? phpResult.isOptimal
										? "Норма (отл.)"
										: phpResult.evaluation === "good"
											? "Хорошая"
											: "Неудовл."
									: silnessResult.isOptimal
										? "Норма (0)"
										: silnessResult.evaluation === "good"
											? "Хорошая"
											: "Налет"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								activeTab === "fedorov-volodkina"
									? fedorovResult.isOptimal
										? "text-emerald-600 dark:text-emerald-400"
										: "text-amber-600 dark:text-amber-400"
									: activeTab === "php"
										? phpResult.isOptimal
											? "text-emerald-600 dark:text-emerald-400"
											: "text-amber-600 dark:text-amber-400"
										: silnessResult.isOptimal
											? "text-emerald-600 dark:text-emerald-400"
											: "text-amber-600 dark:text-amber-400"
							}`}
						>
							{activeTab === "fedorov-volodkina"
								? fedorovResult.score.toFixed(1)
								: activeTab === "php"
									? phpResult.score.toFixed(1)
									: silnessResult.score.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							{activeTab === "fedorov-volodkina"
								? "окрашивание Шиллера-Писарева"
								: activeTab === "php"
									? "зоны налета (0..5)"
									: "налет в придесневой зоне"}
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						{activeTab === "fedorov-volodkina"
							? "Норма: 1.0 (хорошая гигиена ≤ 1.5)"
							: activeTab === "php"
								? "Норма: 0.0 (отличная) / ≤ 0.6 (хорошая)"
								: "Норма: 0.0 (налет у края десны отсутствует)"}
					</span>
				</div>

				{/* 3. PMA / Parma Index */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							Индекс PMA (Парма / воспаление)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								report.pma.severity === "intact"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: report.pma.severity === "mild"
										? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
										: report.pma.severity === "moderate"
											? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
											: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{report.pma.severity === "intact"
								? "Норма 0%"
								: report.pma.severity === "mild"
									? "Легкий"
									: report.pma.severity === "moderate"
										? "Средний"
										: "Тяжелый"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								report.pma.pmaPercent === 0
									? "text-emerald-600 dark:text-emerald-400"
									: report.pma.pmaPercent <= 25
										? "text-amber-600 dark:text-amber-400"
										: "text-rose-600 dark:text-rose-400"
							}`}
						>
							{report.pma.pmaPercent}%
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							баллы: <strong>{report.pma.totalPoints}</strong> из{" "}
							{report.pma.maxPossiblePoints}
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: 0% (воспаление десны отсутствует)
					</span>
				</div>

				{/* 4. KPI / Leus Complex Index */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							КПИ Леуса (состояние пародонта)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								report.kpi.severity === "healthy"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: report.kpi.severity === "risk"
										? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
										: report.kpi.severity === "mild"
											? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
											: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{report.kpi.severity === "healthy"
								? "Здоров 0.0"
								: report.kpi.severity === "risk"
									? "Риск"
									: report.kpi.severity === "mild"
										? "Легкая"
										: report.kpi.severity === "moderate"
											? "Средняя"
											: "Тяжелая"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								report.kpi.kpiScore === 0
									? "text-emerald-600 dark:text-emerald-400"
									: report.kpi.kpiScore <= 1.0
										? "text-teal-700 dark:text-teal-300"
										: report.kpi.kpiScore <= 2.0
											? "text-amber-600 dark:text-amber-400"
											: "text-rose-600 dark:text-rose-400"
							}`}
						>
							{report.kpi.kpiScore.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							обследовано: <strong>{report.kpi.assessedTeethCount}</strong> зубов
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: 0.0 (здоровый периодонт)
					</span>
				</div>
			</div>

			{/* ─── 6 Index Teeth Grid Matrix ─────────────────────────────────── */}
			<div className="flex flex-col gap-3">
				<div className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center justify-between flex-wrap gap-1">
					<span className="truncate">
						СЕТКА 6 ИНДЕКСНЫХ ЗУБОВ (16, 11, 26 • 46, 31, 36) — РЕЖИМ:{" "}
						{activeTab === "ohi-s" && "OHI-S (ГРИН-ВЕРМИЛЛИОН)"}
						{activeTab === "silness-loe" && "SILNESS-LÖE (СИДНЕСС-ЛОЭ)"}
						{activeTab === "fedorov-volodkina" && "ФЕДОРОВА-ВОЛОДКИНОЙ"}
						{activeTab === "php" && "PHP (ПОДОШАДЛЕЙ-ХЕЙЛИ)"}:
					</span>
					<span className="text-[11px] text-[var(--muted)] font-normal truncate">
						Кликните на цифру для выбора балла
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
					{HYGIENE_INDEX_TEETH_CONFIG.map((cfg) => {
						const item = assessments[cfg.toothNumber] ?? {
							toothNumber: cfg.toothNumber,
						};
						const debris = item.debrisScore ?? 0;
						const calculus = item.calculusScore ?? 0;
						const pma = item.pmaScore ?? 0;
						const kpi = item.kpiScore ?? 0;

						return (
							<div
								key={cfg.toothNumber}
								className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2.5 min-w-0"
							>
								{/* Tooth Header */}
								<div className="flex items-center justify-between min-w-0">
									<div className="flex items-center gap-2 min-w-0 flex-1">
										<span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-800 dark:text-teal-300 font-mono font-black text-sm flex items-center justify-center border border-teal-500/30 shrink-0">
											{cfg.toothNumber}
										</span>
										<div className="min-w-0 flex-1">
											<div className="text-xs font-bold text-[var(--ink)] truncate">
												{cfg.anatomicalNameRu}
											</div>
											<div className="text-[10px] text-teal-700 dark:text-teal-400 font-medium truncate">
												{cfg.surfaceLabelRu}
											</div>
										</div>
									</div>
								</div>

								{/* Row 1: Primary Hygiene Score (OHI-S DI-S / Silness-Löe / Fedorov-Volodkina / PHP) */}
								{activeTab === "ohi-s" && (
									<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line)]/60">
										<span className="text-[11px] text-[var(--muted)] font-medium truncate">
											Налёт (DI-S):
										</span>
										<div className="flex items-center gap-1 shrink-0">
											{[0, 1, 2, 3].map((val) => (
												<button
													key={val}
													type="button"
													disabled={readOnly}
													onClick={() =>
														updateToothScore(cfg.toothNumber, "debrisScore", val)
													}
													className={`min-h-[44px] min-w-[30px] sm:min-w-[34px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
														debris === val
															? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300"
															: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
													}`}
													title={
														val === 0
															? "0: Зубной налет отсутствует"
															: val === 1
																? "1: Налет покрывает до 1/3 поверхности"
																: val === 2
																	? "2: Налет покрывает от 1/3 до 2/3"
																	: "3: Налет покрывает более 2/3 поверхности"
													}
												>
													{val}
												</button>
											))}
										</div>
									</div>
								)}

								{activeTab === "silness-loe" && (
									<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line)]/60">
										<span className="text-[11px] text-[var(--muted)] font-medium truncate">
											Сиднесс-Лоэ:
										</span>
										<div className="flex items-center gap-1 shrink-0">
											{[
												{ val: 0, hint: "0: Налет у десны отсутствует (норма)" },
												{ val: 1, hint: "1: Тонкая пленка у края десны (видна зондом)" },
												{ val: 2, hint: "2: Умеренное скопление налета, видимое глазом" },
												{ val: 3, hint: "3: Обильный налет на десне и зубе" },
											].map(({ val, hint }) => {
												const silness = item.silnessScore ?? debris;
												return (
													<button
														key={val}
														type="button"
														disabled={readOnly}
														onClick={() =>
															updateToothScore(cfg.toothNumber, "silnessScore", val)
														}
														className={`min-h-[44px] min-w-[30px] sm:min-w-[34px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
															silness === val
																? "bg-teal-600 text-white font-black shadow-xs ring-1 ring-teal-300"
																: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
														}`}
														title={hint}
													>
														{val}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{activeTab === "fedorov-volodkina" && (
									<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line)]/60">
										<span className="text-[11px] text-[var(--muted)] font-medium truncate">
											Федорова-В.:
										</span>
										<div className="flex items-center gap-1 shrink-0">
											{[
												{ val: 1, hint: "1: Нет окрашивания (норма / чистая поверхность)" },
												{ val: 2, hint: "2: Окрашивание до 1/4 поверхности коронки" },
												{ val: 3, hint: "3: Окрашивание до 1/2 поверхности коронки" },
												{ val: 4, hint: "4: Окрашивание до 3/4 поверхности коронки" },
												{ val: 5, hint: "5: Окрашивание всей поверхности коронки" },
											].map(({ val, hint }) => {
												const fedorov =
													item.fedorovScore ??
													(debris === 0 ? 1 : Math.min(5, debris + 1));
												return (
													<button
														key={val}
														type="button"
														disabled={readOnly}
														onClick={() =>
															updateToothScore(cfg.toothNumber, "fedorovScore", val)
														}
														className={`min-h-[44px] min-w-[26px] sm:min-w-[28px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
															fedorov === val
																? val === 1
																	? "bg-emerald-500 text-slate-950 font-black shadow-xs ring-1 ring-emerald-300"
																	: "bg-indigo-600 text-white font-black shadow-xs ring-1 ring-indigo-300"
																: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
														}`}
														title={hint}
													>
														{val}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{activeTab === "php" && (
									<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line)]/60">
										<span className="text-[11px] text-[var(--muted)] font-medium truncate">
											PHP (зоны):
										</span>
										<div className="flex items-center gap-1 shrink-0">
											{[0, 1, 2, 3, 4, 5].map((val) => {
												const php =
													item.phpScore ?? Math.min(5, Math.round(debris * 1.67));
												return (
													<button
														key={val}
														type="button"
														disabled={readOnly}
														onClick={() =>
															updateToothScore(cfg.toothNumber, "phpScore", val)
														}
														className={`min-h-[44px] min-w-[24px] sm:min-w-[26px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
															php === val
																? val === 0
																	? "bg-emerald-500 text-slate-950 font-black shadow-xs ring-1 ring-emerald-300"
																	: "bg-cyan-600 text-white font-black shadow-xs ring-1 ring-cyan-300"
																: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
														}`}
														title={`${val} из 5 зон поверхности окрашено`}
													>
														{val}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{/* Row 2: CI-S Calculus (Камень 0..3) */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[11px] text-[var(--muted)] font-medium truncate">
										Камень (CI-S):
									</span>
									<div className="flex items-center gap-1 shrink-0">
										{[0, 1, 2, 3].map((val) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() =>
													updateToothScore(
														cfg.toothNumber,
														"calculusScore",
														val,
													)
												}
												className={`min-h-[44px] min-w-[30px] sm:min-w-[34px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
													calculus === val
														? "bg-orange-500 text-white font-black shadow-xs ring-1 ring-orange-300"
														: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
												}`}
												title={
													val === 0
														? "0: Зубной камень отсутствует"
														: val === 1
															? "1: Наддесневой камень до 1/3 коронки"
															: val === 2
																? "2: Наддесневой 1/3..2/3 или отдельные очаги поддесневого"
																: "3: Наддесневой >2/3 или сплошной поддесневой валик"
												}
											>
												{val}
											</button>
										))}
									</div>
								</div>

								{/* Row 3: PMA (Десна 0..3: P, M, A) */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[11px] text-[var(--muted)] font-medium truncate">
										Воспаление (PMA):
									</span>
									<div className="flex items-center gap-1 shrink-0">
										{[
											{ val: 0, label: "0", hint: "0: Десна здорова" },
											{
												val: 1,
												label: "P",
												hint: "1: Сосочек (P - Papillary)",
											},
											{ val: 2, label: "M", hint: "2: Маргинальная десна (M)" },
											{ val: 3, label: "A", hint: "3: Альвеолярная десна (A)" },
										].map(({ val, label, hint }) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() =>
													updateToothScore(cfg.toothNumber, "pmaScore", val)
												}
												className={`min-h-[44px] min-w-[30px] sm:min-w-[34px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
													pma === val
														? val === 0
															? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
															: "bg-rose-500 text-white font-black shadow-xs ring-1 ring-rose-300"
														: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
												}`}
												title={hint}
											>
												{label}
											</button>
										))}
									</div>
								</div>

								{/* Row 4: KPI (КПИ 0..4) */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[11px] text-[var(--muted)] font-medium truncate">
										Периодонт (КПИ):
									</span>
									<div className="flex items-center gap-1 shrink-0">
										{[
											{ val: 0, label: "0", hint: "0: Здоровый периодонт" },
											{ val: 1, label: "1", hint: "1: Кровоточивость (BOP)" },
											{ val: 2, label: "2", hint: "2: Зубной камень" },
											{ val: 3, label: "3", hint: "3: Карман 4-5 мм" },
											{
												val: 4,
												label: "4",
												hint: "4: Карман ≥ 6 мм или подвижность",
											},
										].map(({ val, label, hint }) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() =>
													updateToothScore(cfg.toothNumber, "kpiScore", val)
												}
												className={`min-h-[44px] min-w-[28px] sm:min-w-[32px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
													kpi === val
														? val === 0
															? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
															: val <= 2
																? "bg-amber-500 text-slate-950 font-black ring-1 ring-amber-300"
																: "bg-rose-600 text-white font-black ring-1 ring-rose-300"
														: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
												}`}
												title={hint}
											>
												{label}
											</button>
										))}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

function valToExtended(item: HygieneToothAssessment): ExtendedToothAssessment {
	return {
		...item,
		silnessScore: item.debrisScore ?? 0,
		fedorovScore: (item.debrisScore ?? 0) === 0 ? 1 : Math.min(5, (item.debrisScore ?? 0) + 1),
		phpScore: Math.min(5, Math.round((item.debrisScore ?? 0) * 1.67)),
	};
}
