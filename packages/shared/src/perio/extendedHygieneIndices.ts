/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXTENDED CLINICAL HYGIENE INDICES (SILNESS-LÖE, FEDOROV-VOLODKINA, PHP)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements additional standard clinical dental hygiene assessments:
 * 1. Silness-Löe (1964):
 *    - Assesses plaque thickness at the cervical margin (0..3) across index teeth:
 *      * 0 = Зубной налёт в придесневой области отсутствует
 *      * 1 = Тонкая невидимая пленка налета, определяемая кончиком зонда
 *      * 2 = Умеренное скопление налета, видимое невооруженным глазом
 *      * 3 = Обильное отложение налета в десневом желобке и межзубном промежутке
 *    - Evaluation: 0: норма, <=0.9: хорошая, <=1.9: удовлетворительная, >1.9: плохая
 *
 * 2. Fedorov-Volodkina (1971):
 *    - Hygienic index of Schiller-Pisarev solution staining on 6 lower/upper front teeth (1..5).
 *    - Evaluation: 1.0..1.5: хорошая (норма), 1.6..2.0: удовл., 2.1..2.5: неудовл., 2.6..3.4: плохая, >3.4: очень плохая
 *
 * 3. PHP (Podshadley-Haley / Personal Hygiene Performance, 1968):
 *    - Divides tooth crown into 5 zones (0..5).
 *    - Evaluation: 0: отлично, <=0.6: хорошо, <=1.6: удовл., >1.6: неудовл.
 *
 * All functions gracefully handle partial teeth (1..6) without crashing or NaN division.
 */

import {
	HYGIENE_INDEX_TEETH_CONFIG,
	type HygieneToothAssessment,
} from "./hygieneIndices.js";

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

/**
 * Calculates Silness-Löe cervical plaque index (0.0..3.0).
 */
export function calculateSilnessLoeScore(
	assessments: Record<number, ExtendedToothAssessment> | readonly ExtendedToothAssessment[],
): SilnessLoeResult {
	const map = Array.isArray(assessments)
		? new Map(assessments.map((a) => [a.toothNumber, a]))
		: new Map(Object.entries(assessments).map(([k, v]) => [Number(k), v]));

	let total = 0;
	let count = 0;

	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = map.get(cfg.toothNumber);
		if (item) {
			const score = item.silnessScore ?? item.debrisScore ?? 0;
			total += Math.max(0, Math.min(3, score));
			count++;
		}
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

/**
 * Calculates Fedorov-Volodkina staining index (1.0..5.0).
 */
export function calculateFedorovVolodkinaScore(
	assessments: Record<number, ExtendedToothAssessment> | readonly ExtendedToothAssessment[],
): FedorovVolodkinaResult {
	const map = Array.isArray(assessments)
		? new Map(assessments.map((a) => [a.toothNumber, a]))
		: new Map(Object.entries(assessments).map(([k, v]) => [Number(k), v]));

	let total = 0;
	let count = 0;

	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = map.get(cfg.toothNumber);
		if (item) {
			const rawDebris = item.debrisScore ?? 0;
			const score =
				item.fedorovScore ??
				(rawDebris === 0 ? 1 : Math.min(5, rawDebris + 1));
			total += Math.max(1, Math.min(5, score));
			count++;
		}
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

/**
 * Calculates Podshadley-Haley PHP index (0.0..5.0).
 */
export function calculatePhpScore(
	assessments: Record<number, ExtendedToothAssessment> | readonly ExtendedToothAssessment[],
): PhpResult {
	const map = Array.isArray(assessments)
		? new Map(assessments.map((a) => [a.toothNumber, a]))
		: new Map(Object.entries(assessments).map(([k, v]) => [Number(k), v]));

	let total = 0;
	let count = 0;

	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = map.get(cfg.toothNumber);
		if (item) {
			const rawDebris = item.debrisScore ?? 0;
			const score =
				item.phpScore ?? Math.min(5, Math.round(rawDebris * 1.67));
			total += Math.max(0, Math.min(5, score));
			count++;
		}
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

// ─── CLINICAL PROTOCOLS & EXPRESSED SERVICES (NOMENCLATURE 804n) ────────────

export const CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU =
	"Глубокое фторирование эмали (Tiefenfluorid / Сафорайд, A11.07.012)";

export const CLINICAL_TOOTH_MOUSSE_SUMMARY_RU =
	"Реминерализирующая терапия каппой (GC Tooth Mousse, A11.07.010)";

export const CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU =
	"Медикаментозная обработка пародонтальных карманов (Хлоргексидин + Метрогил Дента, A16.07.053)";

export const HYGIENE_EXPRESS_SERVICES = {
	proHygiene: {
		code: "A16.07.051",
		name: "Комплексная профессиональная гигиена: ультразвуковой скейлинг над- и поддесневых отложений + Air-Flow глицином + полировка пастой Kerr Cleanic + ремотерапия/фторирование эмали Fluocal",
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
