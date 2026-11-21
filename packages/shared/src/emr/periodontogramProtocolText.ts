/**
 * packages/shared/src/emr/periodontogramProtocolText.ts
 *
 * Clinical textual protocol generator for SEPA / WHO periodontogram examination.
 * Extracted according to Mandate 8b (monolith decomposition < 500 lines).
 */

import type { PeriodontogramIndices, SepaToothValue } from "./periodontogram.js";
import { computeCompletePerioIndices } from "./periodontogram.js";

/**
 * Генерация клинического протокола обследования пародонта в медицинскую карту приёма.
 */
export function generateSepaPeriodontalProtocolText(
	teeth: readonly SepaToothValue[],
	indices?: PeriodontogramIndices | null,
	options?: { presetName?: string; customNotes?: string },
): string {
	const currentIndices = indices ?? computeCompletePerioIndices(teeth);
	const deepCount = currentIndices.deepPocketsCount;
	const bop = currentIndices.bopPct.toFixed(1);
	const pi = currentIndices.piPct.toFixed(1);

	let diagnosis = "Интактный пародонт / Клиническая норма (Z01.2)";
	let icd10 = "Z01.2";
	let statusLocalis =
		"Десна бледно-розовая, плотная, зубодесневая борозда 1-2 мм. Кровоточивость при зондировании отсутствует (BOP 0%). Патологических зубодесневых карманов нет, подвижность зубов 0.";
	let treatment =
		"Санация полости рта, профилактический осмотр через 6 месяцев. Рекомендации по индивидуальной гигиене.";

	if (
		Boolean(currentIndices.sitesWithSuppurationCount) ||
		((currentIndices.teethWithMobilityCount ?? 0) >= 8 && deepCount >= 8)
	) {
		diagnosis = "Хронический генерализованный пародонтит тяжёлой степени (K05.32)";
		icd10 = "K05.32";
		statusLocalis = `Десна застойно гиперемирована с цианотичным оттенком, выраженная кровоточивость (BOP ${bop}%), налет (PI ${pi}%). Обнаружены глубокие пародонтальные карманы от 6 до 8 мм (глубоких карманов: ${deepCount}), гноетечение из ${currentIndices.sitesWithSuppurationCount ?? 0} точек, подвижность зубов II-III ст. у ${currentIndices.teethWithMobilityCount ?? 0} зубов. Выраженная рецессия десны.`;
		treatment =
			"Неотложная противовоспалительная терапия, антисептическая обработка пародонтальных карманов хлоргексидином 0.05%, эвакуация экссудата. Временное шинирование подвижных зубов (A16.07.019). Направление на глубокий закрытый кюретаж / хирургическое лечение.";
	} else if (
		deepCount > 0 ||
		(currentIndices.teethWithFurcationCount ?? 0) > 0
	) {
		diagnosis = "Хронический генерализованный пародонтит средней степени (K05.31)";
		icd10 = "K05.31";
		statusLocalis = `Десна цианотична, отечна, выраженная кровоточивость при зондировании (BOP ${bop}%), зубной налет (PI ${pi}%). Пародонтальные карманы глубиной 4-5.5 мм, рецессия десны 1-2 мм, под- и наддесневой зубной камень. Патологическая подвижность I ст. у ${currentIndices.teethWithMobilityCount ?? 0} зубов.`;
		treatment =
			"Комплексная профессиональная гигиена и поддесневой скейлинг (SRP A16.07.051), ультразвуковая обработка пародонтальных карманов, антисептическое орошение, аппликации Метрогил Дента. Обучение гигиене.";
	} else if (currentIndices.moderatePocketsCount && currentIndices.moderatePocketsCount > 0) {
		diagnosis = "Хронический пародонтит лёгкой степени (K05.30)";
		icd10 = "K05.30";
		statusLocalis = `Маргинальная десна отечна, умеренно гиперемирована, кровоточивость при зондировании (BOP ${bop}%), налет (PI ${pi}%). Пародонтальные карманы глубиной 3-4 мм без гноетечения, над- и поддесневые зубные отложения. Патологическая подвижность зубов 0-I ст.`;
		treatment =
			"Профессиональная гигиена полости рта (A16.07.051), снятие над- и поддесневых зубных отложений УЗ + Air-Flow, полировка пастой, аппликация антисептического геля.";
	} else if (currentIndices.bopPct > 10) {
		diagnosis = "Хронический катаральный гингивит (K05.1)";
		icd10 = "K05.1";
		statusLocalis = `Десна гиперемирована, отечна, выраженная диффузная кровоточивость сосочков (BOP ${bop}%), налет (PI ${pi}%). Глубина десневой борозды 2-3 мм (ложные карманы за счет отека десны, зубодесневое прикрепление сохранено). Мягкий налет, наддесневой зубной камень. Подвижность 0.`;
		treatment =
			"Профессиональная гигиена полости рта (ультразвуковое снятие отложений + Air-Flow), антисептическая обработка десен, противовоспалительные аппликации. Подбор индивидуальных средств гигиены.";
	}

	let text = `• Обследование пародонта (6-точечная пародонтограмма ВОЗ / СтАР):\n`;
	text += `  - Диагноз: ${diagnosis}\n`;
	text += `  - МКБ-10: ${icd10}\n`;
	text += `  - Индексы: BOP (кровоточивость) ${bop}%, PI (налет) ${pi}%, средняя потеря прикрепления (CAL) ${currentIndices.calMeanMm.toFixed(1)} мм, зубов с глубокими карманами (>= 5 мм): ${deepCount}.\n`;
	text += `  - Status localis: ${statusLocalis}\n`;
	text += `  - Лечение и план: ${treatment}`;

	if (options?.customNotes?.trim()) {
		text += `\n  - Особые отметки: ${options.customNotes.trim()}`;
	}

	return text;
}
