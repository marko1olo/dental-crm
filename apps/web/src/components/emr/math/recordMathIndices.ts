import {
	type FdiToothRecord,
	type DmftIndex,
	type CpitnSextantCode,
	calculateDmftFromOdontogram,
} from "@dental/shared";

/** Расчет индекса КПУ / DMFT по зубной формуле */
export function calculateDmftIndex(teeth: FdiToothRecord[]): DmftIndex & { dmftTotal: number; intensityLevelLabel: string } {
	return calculateDmftFromOdontogram(teeth);
}

/** Расчет и расшифровка пародонтального индекса CPITN (PSR) */
export function calculateCpitnIndex(sextants: {
	sextant18_14?: CpitnSextantCode;
	sextant13_23?: CpitnSextantCode;
	sextant24_28?: CpitnSextantCode;
	sextant48_44?: CpitnSextantCode;
	sextant43_33?: CpitnSextantCode;
	sextant34_38?: CpitnSextantCode;
}): {
	maxCode: number;
	maxCodeText: string;
	treatmentNeedCategory: "0_none" | "1_hygiene_instructions" | "2_scaling_root_planing" | "3_complex_periodontal";
	treatmentNeedLabel: string;
	treatmentRecommendations: string;
} {
	const values = [
		sextants.sextant18_14 || "0_healthy",
		sextants.sextant13_23 || "0_healthy",
		sextants.sextant24_28 || "0_healthy",
		sextants.sextant48_44 || "0_healthy",
		sextants.sextant43_33 || "0_healthy",
		sextants.sextant34_38 || "0_healthy",
	];

	const codeRank = (code: string): number => {
		if (code.startsWith("4")) return 4;
		if (code.startsWith("3")) return 3;
		if (code.startsWith("2")) return 2;
		if (code.startsWith("1")) return 1;
		return 0;
	};

	let maxCode = 0;
	for (const val of values) {
		const r = codeRank(val);
		if (r > maxCode) maxCode = r;
	}

	switch (maxCode) {
		case 4:
			return {
				maxCode: 4,
				maxCodeText: "Код 4: Пародонтальный карман глубиной 6 мм и более",
				treatmentNeedCategory: "3_complex_periodontal",
				treatmentNeedLabel: "TN-3: Комплексное пародонтологическое лечение",
				treatmentRecommendations: "Глубокий поддесневой скейлинг, кюретаж / лоскутные операции, антимикробная терапия, шинирование при подвижности.",
			};
		case 3:
			return {
				maxCode: 3,
				maxCodeText: "Код 3: Пародонтальный карман глубиной 4-5 мм",
				treatmentNeedCategory: "2_scaling_root_planing",
				treatmentNeedLabel: "TN-2: Скейлинг и снятие поддесневых отложений",
				treatmentRecommendations: "Профессиональная гигиена, закрытый кюретаж, полировка корней (Root Planing), местная противовоспалительная терапия.",
			};
		case 2:
			return {
				maxCode: 2,
				maxCodeText: "Код 2: Над- и поддесневой зубной камень, нависающие края пломб",
				treatmentNeedCategory: "2_scaling_root_planing",
				treatmentNeedLabel: "TN-2: Профессиональная гигиена полости рта",
				treatmentRecommendations: "Ультразвуковой скейлинг, воздушно-абразивная обработка Air-Flow, устранение ретенционных факторов (коррекция пломб), полировка.",
			};
		case 1:
			return {
				maxCode: 1,
				maxCodeText: "Код 1: Кровоточивость при зондировании без карманов и камня",
				treatmentNeedCategory: "1_hygiene_instructions",
				treatmentNeedLabel: "TN-1: Индивидуальный инструктаж по гигиене",
				treatmentRecommendations: "Обучение контролируемой чистке зубов, подбор межзубных ершиков, флоссов, антисептические ополаскиватели.",
			};
		default:
			return {
				maxCode: 0,
				maxCodeText: "Код 0: Ткани пародонта здоровы, патологических карманов нет",
				treatmentNeedCategory: "0_none",
				treatmentNeedLabel: "TN-0: Лечение не требуется",
				treatmentRecommendations: "Поддерживающая индивидуальная гигиена полости рта, профилактический осмотр через 6 месяцев.",
			};
	}
}

/** Расчет индекса гигиены Грина-Вермиллиона (OHI-S) */
export function calculateOhiSScore(debrisScores: number[], calculusScores: number[]): {
	debrisScore: number;
	calculusScore: number;
	totalScore: number;
	ratingText: string;
	clinicalEvaluation: "good" | "satisfactory" | "unsatisfactory" | "poor";
} {
	const avgDebris = debrisScores.length > 0 ? debrisScores.reduce((a, b) => a + b, 0) / debrisScores.length : 0;
	const avgCalculus = calculusScores.length > 0 ? calculusScores.reduce((a, b) => a + b, 0) / calculusScores.length : 0;
	const total = Number((avgDebris + avgCalculus).toFixed(2));

	if (total <= 0.6) return { debrisScore: Number(avgDebris.toFixed(2)), calculusScore: Number(avgCalculus.toFixed(2)), totalScore: total, ratingText: `OHI-S = ${total} (Хороший уровень гигиены)`, clinicalEvaluation: "good" };
	if (total <= 1.6) return { debrisScore: Number(avgDebris.toFixed(2)), calculusScore: Number(avgCalculus.toFixed(2)), totalScore: total, ratingText: `OHI-S = ${total} (Удовлетворительный уровень гигиены)`, clinicalEvaluation: "satisfactory" };
	if (total <= 2.5) return { debrisScore: Number(avgDebris.toFixed(2)), calculusScore: Number(avgCalculus.toFixed(2)), totalScore: total, ratingText: `OHI-S = ${total} (Неудовлетворительный уровень гигиены)`, clinicalEvaluation: "unsatisfactory" };
	return { debrisScore: Number(avgDebris.toFixed(2)), calculusScore: Number(avgCalculus.toFixed(2)), totalScore: total, ratingText: `OHI-S = ${total} (Плохой уровень гигиены)`, clinicalEvaluation: "poor" };
}
