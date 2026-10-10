/**
 * @file dentalVocabulary.ts
 * @description Clinical dental terminology (Order 804n, ICD-10, FDI 11-48, ODMVSh surfaces, pharmacology)
 * and prompt engineering for Google Gemini Live STT speech biasing.
 */

import type { DentalSpecialty } from "@dental/shared";
import { getDentalSpeechBiasingTerms } from "../dentalPrompt.js";
import {
	DEFAULT_GEMINI_BIDI_MODEL,
	type GeminiBidiSetupFrame,
	MANDATORY_DENTAL_BIDI_TERMS,
} from "./types.js";

/**
 * Dental anatomical surfaces (ОДМВЩ: Окклюзионная, Дистальная, Медиальная, Вестибулярная, Щечная/Язычная).
 */
export const DENTAL_SURFACES_ODMVSH: readonly string[] = [
	"окклюзионная",
	"дистальная",
	"медиальная",
	"вестибулярная",
	"язычная",
	"небная",
	"щечная",
	"пришеечная",
	"апроксимальная",
	"режущий край",
	"ОДМВЩ",
	"МОД",
	"ИРОПЗ",
];

/**
 * Key ICD-10 stomatology nosologies for accurate transcription.
 */
export const DENTAL_ICD10_NOSOLOGY: readonly string[] = [
	"К02.0", "К02.1", "К02.2", "К02.8", "К02.9", // Кариес
	"К04.0", "К04.1", "К04.2", "К04.4", "К04.5", "К04.6", "К04.7", "К04.8", // Пульпит и периодонтит
	"К05.0", "К05.1", "К05.2", "К05.3", // Гингивит и пародонтит
	"К07.2", "К07.4", // Аномалии прикуса
	"К08.1", "К08.2", // Потеря зубов и атрофия
];

/**
 * Clinical pharmacology and modern dental restorative/endodontic materials.
 */
export const DENTAL_PHARMACOLOGY_AND_MATERIALS: readonly string[] = [
	"артикаин",
	"ультракаин",
	"убистезин",
	"септонест",
	"скандонест",
	"мепивакаин",
	"адреналин",
	"эпинефрин",
	"гипохлорит натрия",
	"хлоргексидин",
	"ЭДТА",
	"кальсепт",
	"метапекс",
	"крезофен",
	"гуттаперча",
	"силер",
	"AH Plus",
	"витремер",
	"филтек",
	"эстет-х",
	"бонд",
	"протравка",
	"ортофосфорная кислота",
	"коффердам",
	"кламп",
	"оптрадам",
	"оптрагейт",
	"E.max",
	"дисиликат лития",
	"диоксид циркония",
	"ZrO2",
];

/**
 * Medical nomenclature of stomatological services (Russian Ministry of Health Order 804n).
 */
export const DENTAL_804N_TERMS: readonly string[] = [
	"анестезия инфильтрационная",
	"анестезия проводниковая",
	"анестезия аппликационная",
	"препарирование кариозной полости",
	"наложение лечебной прокладки",
	"наложение изолирующей прокладки",
	"пломбирование светоотверждаемым композитом",
	"шлифовка и полировка пломбы",
	"инструментальная обработка корневого канала",
	"медикаментозная обработка корневого канала",
	"пломбирование корневого канала гуттаперчей",
	"ультразвуковое удаление зубных отложений",
	"полировка пастой",
	"глубокое фторирование",
	"закрытый кюретаж",
	"открытый кюретаж",
	"лоскутная операция",
	"установка дентального имплантата",
	"синус-лифтинг закрытый",
	"синус-лифтинг открытый",
	"апекслокация",
	"прицельная рентгенография",
	"ортопантомография",
	"конусно-лучевая компьютерная томография",
];

/**
 * Builds the dental system instruction with mandatory and specialized speech biasing terms.
 */
export function buildDentalBidiSystemInstruction(
	specialty?: DentalSpecialty | null,
	customTermsList?: string[],
): string {
	const promptTerms = getDentalSpeechBiasingTerms(
		specialty,
		customTermsList,
	);
	const mergedTerms = Array.from(
		new Set([
			...MANDATORY_DENTAL_BIDI_TERMS,
			...DENTAL_SURFACES_ODMVSH,
			...DENTAL_ICD10_NOSOLOGY,
			...DENTAL_PHARMACOLOGY_AND_MATERIALS,
			...DENTAL_804N_TERMS,
			...promptTerms,
			...(customTermsList ?? []),
		]),
	);

	return `Ты медицинский стенографист клиники DENTE (ассистент ДЕНТА). Выполняй точную транскрипцию речи врача. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать, достраивать или дополнять текст фразами, которых не было в аудио. Если в аудио тишина, шум или неразборчивая речь — не генерируй никаких шаблонных медицинских фраз. Транскрибируй строго и буквально только то, что физически произнес врач. Режим строгого онлайн-распознавания речи (Live Speech-to-Text). Удаляй запинки, нормализуй формулу зубов и термины. Стоматологический словарь (Speech Biasing): ${mergedTerms.join(", ")}.`;
}

/**
 * Constructs the standard Gemini Live Setup frame.
 */
export function buildBidiSetupFrame(options?: {
	model?: string | undefined;
	specialty?: DentalSpecialty | null | undefined;
	customTerms?: string[] | undefined;
}): GeminiBidiSetupFrame {
	const model =
		options?.model ||
		process.env.GEMINI_BIDI_MODEL ||
		process.env.GEMINI_LIVE_STT_MODEL ||
		DEFAULT_GEMINI_BIDI_MODEL;

	const systemInstructionText = buildDentalBidiSystemInstruction(
		options?.specialty,
		options?.customTerms,
	);

	return {
		setup: {
			model,
			generationConfig: {
				responseModalities: ["TEXT"],
			},
			systemInstruction: {
				parts: [{ text: systemInstructionText }],
			},
		},
	};
}
