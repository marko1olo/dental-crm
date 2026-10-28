/**
 * Alveolar Ridge Clinical Protocol & Sinus Lift Recommendation Engine
 * Standards: ITI Consensus, Misch CE, Buser, Mandate 8x (human clinical language).
 * Mandate 8b (<= 150 lines).
 */

import type { AlveolarRidgeCaliperResult } from "./cbctRidgeCaliperCore";

export interface RidgeProtocolResult {
	readonly toothFdi: string;
	readonly statusLocalis: string;
	readonly surgicalRecommendation: string;
	readonly sinusLiftNeeded: boolean;
	readonly sinusLiftType: "none" | "transcrestal_closed" | "lateral_open";
	readonly boneAugmentationNeeded: boolean;
	readonly fullProtocolText: string;
	// Backward-compatible aliases for existing callers
	readonly statusLocalis043: string;
	readonly surgicalRecommendation043: string;
}

export type Ridge043ProtocolResult = RidgeProtocolResult;

/**
 * Generates official clinical medical record protocol and evidence-based surgical
 * bone augmentation / sinus lift recommendations (ITI Consensus / Misch CE / Buser).
 */
export function generateRidgeProtocolText(
	caliper: AlveolarRidgeCaliperResult,
	patientName = "Пациент",
	toothFdi?: string,
): RidgeProtocolResult {
	const effectiveTooth = toothFdi || caliper.toothFdiOrSite || "implant_site";
	const isMaxilla = caliper.anatomicalLimit === "maxillary_sinus" || caliper.anatomicalLimit === "nasal_floor";
	const isSinus = caliper.anatomicalLimit === "maxillary_sinus";

	let sinusLiftNeeded = false;
	let sinusLiftType: "none" | "transcrestal_closed" | "lateral_open" = "none";
	let sinusLiftText = "";

	if (isSinus) {
		if (caliper.availableHeightMm >= 10.0) {
			sinusLiftNeeded = false;
			sinusLiftType = "none";
			sinusLiftText = `Высота резидуальной кости достаточна для дентальной имплантации (H = ${caliper.availableHeightMm.toFixed(1)} мм >= 10 мм). Синус-лифтинг не требуется.`;
		} else if (caliper.availableHeightMm >= 5.0) {
			sinusLiftNeeded = true;
			sinusLiftType = "transcrestal_closed";
			sinusLiftText = `Умеренный дефицит высоты резидуальной кости альвеолярного отростка верхней челюсти (H = ${caliper.availableHeightMm.toFixed(1)} мм). Показана дентальная имплантация с симультанным закрытым (транскрестальным / остеотомным по Summers) синус-лифтингом.`;
		} else {
			sinusLiftNeeded = true;
			sinusLiftType = "lateral_open";
			sinusLiftText = `Выраженная вертикальная атрофия альвеолярного отростка верхней челюсти (H = ${caliper.availableHeightMm.toFixed(1)} мм < 5 мм). Показан предварительный или симультанный открытый (латеральный по Tatum) синус-лифтинг с остеопластическим материалом и коллагеновой мембраной.`;
		}
	} else if (caliper.anatomicalLimit === "mandibular_canal") {
		if (caliper.availableHeightMm < 8.0) {
			sinusLiftText = `Дефицит высоты кости над нижнечелюстным каналом (H = ${caliper.availableHeightMm.toFixed(1)} мм < 8 мм). Показана вертикальная костная пластика или использование коротких имплантатов с повышенным диаметром.`;
		} else {
			sinusLiftText = `Высота кости над нижнечелюстным каналом достаточна для стандартной имплантации (H = ${caliper.availableHeightMm.toFixed(1)} мм).`;
		}
	} else {
		sinusLiftText = `Высота доступной костной ткани составляет H = ${caliper.availableHeightMm.toFixed(1)} мм.`;
	}

	const boneAugmentationNeeded = caliper.widthAt2Mm < 5.0 || caliper.widthAt6Mm < 6.0;
	let widthAugmentationText = "";
	if (caliper.widthAt2Mm < 5.0) {
		widthAugmentationText = `Горизонтальный дефицит гребня в коронковой трети (W2 = ${caliper.widthAt2Mm.toFixed(1)} мм < 5.0 мм). Показана направленная костная регенерация (НКР / GBR) или расщепление альвеолярного гребня (ridge split).`;
	}

	const anatLimitRu =
		caliper.anatomicalLimit === "maxillary_sinus"
			? "дна верхнечелюстного синуса (гайморовой пазухи)"
			: caliper.anatomicalLimit === "mandibular_canal"
				? "верхней стенки нижнечелюстного канала (IAN)"
				: caliper.anatomicalLimit === "nasal_floor"
					? "дна носовой полости"
					: "базального края челюсти";

	const w6Formatted =
		caliper.widthAt6Mm > 0
			? `${caliper.widthAt6Mm.toFixed(1)} мм`
			: `н/д (H = ${caliper.availableHeightMm.toFixed(1)} мм < 6.0 мм)`;

	const statusLocalis =
		`КЛКТ-морфометрия альвеолярного гребня в области отсутствующего зуба #${effectiveTooth}: ` +
		`ширина гребня на 2 мм ниже вершины W2 = ${caliper.widthAt2Mm.toFixed(1)} мм, ` +
		`базальная ширина на 6 мм ниже вершины W6 = ${w6Formatted}. ` +
		`Высота резидуальной кости до ${anatLimitRu}: H = ${caliper.availableHeightMm.toFixed(1)} мм. ` +
		`Плотность кости: класс Misch ${caliper.boneQualityMisch} (средняя плотность ${caliper.meanDensityHU} HU).`;

	const surgicalRecommendation = [
		`План хирургического лечения (область #${effectiveTooth}):`,
		sinusLiftText,
		widthAugmentationText,
		`Рекомендованный тип костной ткани: Misch ${caliper.boneQualityMisch}.`,
	]
		.filter(Boolean)
		.join("\n");

	const fullProtocolText =
		`═══════════════════════════════════════════════════════════════════════════════\n` +
		`ПРОТОКОЛ РЕНТГЕНОЛОГИЧЕСКОГО ИССЛЕДОВАНИЯ КЛКТ (МЕДИЦИНСКАЯ КАРТА ПРИЁМА)\n` +
		`═══════════════════════════════════════════════════════════════════════════════\n` +
		`Пациент:                   ${patientName}\n` +
		`Область обследования:      Дефект зубного ряда, область отсутствующего зуба FDI #${effectiveTooth}\n` +
		`Анатомическая зона:        ${isMaxilla ? "Верхняя челюсть (Maxilla)" : "Нижняя челюсть (Mandible)"}\n` +
		`───────────────────────────────────────────────────────────────────────────────\n` +
		`1. ОБЪЕКТИВНЫЕ ЗАМЕРЫ АЛЬВЕОЛЯРНОГО ГРЕБНЯ (МОРФОМЕТРИЯ):\n` +
		`  • Ширина гребня W2 (на 2 мм апикальнее вершины):   ${caliper.widthAt2Mm.toFixed(1)} мм\n` +
		`  • Базальная ширина W6 (на 6 мм апикальнее вершины): ${w6Formatted}\n` +
		`  • Высота доступной кости H (до ориентира):           ${caliper.availableHeightMm.toFixed(1)} мм\n` +
		`  • Анатомический ориентир дна:                       ${anatLimitRu}\n` +
		`  • Оптическая плотность трабекулярного ядра:         ${caliper.meanDensityHU} HU\n` +
		`  • Классификация плотности кости по C.E. Misch:      Класс ${caliper.boneQualityMisch}\n` +
		`───────────────────────────────────────────────────────────────────────────────\n` +
		`2. КЛИНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ТАКТИКА:\n` +
		`  ${statusLocalis}\n\n` +
		`  Хирургические рекомендации:\n` +
		`  - ${sinusLiftText}\n` +
		(widthAugmentationText ? `  - ${widthAugmentationText}\n` : "") +
		`═══════════════════════════════════════════════════════════════════════════════`;

	return {
		toothFdi: effectiveTooth,
		statusLocalis,
		surgicalRecommendation,
		sinusLiftNeeded,
		sinusLiftType,
		boneAugmentationNeeded,
		fullProtocolText,
		statusLocalis043: statusLocalis,
		surgicalRecommendation043: surgicalRecommendation,
	};
}

export const generateRidge043ProtocolText = generateRidgeProtocolText;
