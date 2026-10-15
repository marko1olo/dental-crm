/**
 * @file packages/shared/src/clinical/stenographer/clinicalVoiceSpeechFormatter.ts
 * @description Canonical Clinical Voice & Tooth Grammar Speech Formatter.
 * Converts raw spoken clinical speech from dental chairside into structured, professional Form 043/y diary entries.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (hands-free sterile dictation at chairside).
 * - Mandate 8s: Single Source of Truth for Tooth Grammar & ICD-10.
 * - Ministry of Health Order 804n / Dental Association of Russia (СтАР) clinical standards.
 */

import {
	extractFdiTeethNumbers,
	extractToothSurfaces,
} from "../../ai/toothGrammarSsot.js";
import type { ClinicalFormFieldTarget } from "./types.js";

export interface ClinicalSpeechFormatResult {
	readonly rawSpeech: string;
	readonly formattedText: string;
	readonly detectedTeeth: readonly number[];
	readonly detectedDiagnoses: readonly string[];
	readonly detectedSurfaces: readonly string[];
	readonly detectedMaterials: readonly string[];
	readonly suggestedSoapField: ClinicalFormFieldTarget;
	readonly isToothGrammarMatch: boolean;
}

interface KnownDiagnosisRule {
	readonly patterns: readonly string[];
	readonly title: string;
	readonly icdCode: string;
	readonly defaultCategory: ClinicalFormFieldTarget;
}

const KNOWN_DIAGNOSES: readonly KnownDiagnosisRule[] = [
	{
		patterns: [
			"глубокий кариес",
			"кариес дентина",
			"средний кариес",
			"кариозная полость",
			"кариозное поражение",
			"кариес",
		],
		title: "Кариес дентина",
		icdCode: "K02.1",
		defaultCategory: "objective",
	},
	{
		patterns: [
			"кариес эмали",
			"начальный кариес",
			"в стадии пятна",
			"меловидное пятно",
		],
		title: "Кариес эмали (стадия белого пятна)",
		icdCode: "K02.0",
		defaultCategory: "objective",
	},
	{
		patterns: [
			"острый пульпит",
			"очаговый пульпит",
			"диффузный пульпит",
			"гнойный пульпит",
			"пульпит",
		],
		title: "Острый пульпит",
		icdCode: "K04.0",
		defaultCategory: "objective",
	},
	{
		patterns: [
			"хронический периодонтит",
			"апикальный периодонтит",
			"гранулирующий периодонтит",
			"фиброзный периодонтит",
			"периодонтит",
		],
		title: "Хронический апикальный периодонтит",
		icdCode: "K04.5",
		defaultCategory: "objective",
	},
	{
		patterns: [
			"острый периодонтит",
			"острый апикальный периодонтит",
		],
		title: "Острый апикальный периодонтит",
		icdCode: "K04.4",
		defaultCategory: "objective",
	},
	{
		patterns: [
			"скол зуба",
			"дефект пломбы",
			"отлом коронки",
			"трещина эмали",
			"перелом коронки",
		],
		title: "Перелом коронки зуба без повреждения пульпы",
		icdCode: "S02.50",
		defaultCategory: "objective",
	},
	{
		patterns: [
			"хронический пародонтит",
			"генерализованный пародонтит",
			"пародонтальный карман",
			"пародонтит",
		],
		title: "Хронический пародонтит",
		icdCode: "K05.3",
		defaultCategory: "objective",
	},
];

interface KnownMaterialRule {
	readonly patterns: readonly string[];
	readonly label: string;
	readonly actionPrefix: string;
}

const KNOWN_MATERIALS: readonly KnownMaterialRule[] = [
	{
		patterns: [
			"пломба эстет икс",
			"эстет икс",
			"эстетикс",
			"esthet x",
			"esthet-x",
		],
		label: "Esthet-X",
		actionPrefix: "Поставлена светоотверждаемая пломба Esthet-X",
	},
	{
		patterns: [
			"пломба филтек",
			"филтек",
			"filtek supreme",
			"filtek",
		],
		label: "Filtek Supreme",
		actionPrefix: "Поставлена светоотверждаемая пломба Filtek Supreme",
	},
	{
		patterns: [
			"пломба харизма",
			"харизма",
			"charisma",
		],
		label: "Charisma",
		actionPrefix: "Поставлена светоотверждаемая пломба Charisma",
	},
	{
		patterns: [
			"пломба градиа",
			"градиа",
			"gradia direct",
			"gradia",
		],
		label: "Gradia Direct",
		actionPrefix: "Поставлена светоотверждаемая пломба Gradia Direct",
	},
	{
		patterns: [
			"пломба световая",
			"светоотверждаемая пломба",
			"пломба",
			"световой композит",
			"композит",
		],
		label: "Светоотверждаемый композит",
		actionPrefix: "Поставлена светоотверждаемая пломба из композитного материала",
	},
	{
		patterns: [
			"убистезин",
			"ubistesin",
		],
		label: "Убистезин",
		actionPrefix: "Анестезия инфильтрационная sol. Ubistesin 1:200 000 — 1.7 мл",
	},
	{
		patterns: [
			"ультракаин",
			"ultracain",
		],
		label: "Ультракаин",
		actionPrefix: "Анестезия инфильтрационная sol. Ultracaini D-S — 1.7 мл",
	},
	{
		patterns: [
			"септанест",
			"septanest",
		],
		label: "Септанест",
		actionPrefix: "Анестезия инфильтрационная sol. Septanest 1:100 000 — 1.7 мл",
	},
	{
		patterns: [
			"коффердам",
			"раббердам",
		],
		label: "Коффердам",
		actionPrefix: "Изоляция операционного поля коффердамом",
	},
];

interface KnownObservationRule {
	readonly patterns: readonly string[];
	readonly canonicalText: string;
}

const KNOWN_OBSERVATIONS: readonly KnownObservationRule[] = [
	{
		patterns: ["дно плотное", "плотное дно"],
		canonicalText: "дно плотное",
	},
	{
		patterns: ["дно размягчено", "размягченное дно", "размягчённое дно"],
		canonicalText: "дно размягчено, пигментировано",
	},
	{
		patterns: ["зондирование болезненно", "болезненное зондирование"],
		canonicalText: "зондирование дна болезненно",
	},
	{
		patterns: ["зондирование безболезненно", "безболезненное зондирование"],
		canonicalText: "зондирование дна безболезненно",
	},
	{
		patterns: ["перкуссия безболезненна", "безболезненная перкуссия"],
		canonicalText: "перкуссия зуба безболезненна",
	},
	{
		patterns: ["перкуссия болезненна", "болезненная перкуссия"],
		canonicalText: "перкуссия зуба болезненна",
	},
	{
		patterns: ["термометрия безболезненна", "холодовая проба безболезненна"],
		canonicalText: "реакция на температурные раздражители безболезненна",
	},
	{
		patterns: ["термометрия болезненна", "холодовая проба болезненна"],
		canonicalText: "реакция на температурные раздражители кратковременно болезненна",
	},
	{
		patterns: ["полость зуба закрыта", "пульпарная камера закрыта"],
		canonicalText: "полость зуба закрыта, сообщение с пульпарной камерой отсутствует",
	},
	{
		patterns: ["сообщение с пульпой", "вскрыта пульпарная камера"],
		canonicalText: "вскрыт рог пульпы, сообщение с пульпарной камерой",
	},
];

function surfaceToLocative(surface: string): string {
	switch (surface.toUpperCase()) {
		case "MOD":
			return "на медиально-окклюзионно-дистальной поверхности";
		case "MO":
			return "на медиально-окклюзионной поверхности";
		case "OD":
			return "на окклюзионно-дистальной поверхности";
		case "O":
			return "на окклюзионной поверхности";
		case "V":
			return "на вестибулярной поверхности";
		case "M":
			return "на медиальной поверхности";
		case "D":
			return "на дистальной поверхности";
		case "L":
			return "на язычной поверхности";
		case "P":
			return "на небной поверхности";
		default:
			return `на поверхности ${surface}`;
	}
}

function formatSurfacesToLocative(surfaces: readonly string[]): string {
	const set = new Set(surfaces.map((s) => s.toUpperCase()));
	if (set.has("M") && set.has("O") && set.has("D")) {
		return "на медиально-окклюзионно-дистальной поверхности";
	}
	if (set.has("M") && set.has("O")) {
		return "на медиально-окклюзионной поверхности";
	}
	if (set.has("O") && set.has("D")) {
		return "на окклюзионно-дистальной поверхности";
	}
	return surfaces.map(surfaceToLocative).join(", ");
}

/**
 * Intelligent Chairside Clinical Speech Formatter.
 * Parses raw doctor dictation into canonical medical diary text complying with Order 804n & СтАР.
 */
export function formatClinicalSpeechToDiaryEntry(rawText: string): ClinicalSpeechFormatResult {
	const text = (rawText || "").trim();
	if (!text) {
		return {
			rawSpeech: "",
			formattedText: "",
			detectedTeeth: [],
			detectedDiagnoses: [],
			detectedSurfaces: [],
			detectedMaterials: [],
			suggestedSoapField: "objective",
			isToothGrammarMatch: false,
		};
	}

	const lower = text.toLowerCase().replace(/ё/g, "е");

	// 1. Извлечение номеров зубов по формуле FDI (11..48, 51..85)
	const detectedTeeth = extractFdiTeethNumbers(text);
	const detectedSurfaces = extractToothSurfaces(text);

	// 2. Поиск диагнозов
	const detectedDiagnoses: string[] = [];
	let primaryDiagnosis: KnownDiagnosisRule | null = null;
	for (const rule of KNOWN_DIAGNOSES) {
		for (const pattern of rule.patterns) {
			if (lower.includes(pattern)) {
				detectedDiagnoses.push(`${rule.title} (${rule.icdCode})`);
				if (!primaryDiagnosis) {
					primaryDiagnosis = rule;
				}
				break;
			}
		}
	}

	// 3. Поиск объективных клинических симптомов
	const observations: string[] = [];
	for (const obs of KNOWN_OBSERVATIONS) {
		for (const pattern of obs.patterns) {
			if (lower.includes(pattern)) {
				observations.push(obs.canonicalText);
				break;
			}
		}
	}

	// 4. Поиск материалов и процедур
	const detectedMaterials: string[] = [];
	const materialActions: string[] = [];
	for (const mat of KNOWN_MATERIALS) {
		for (const pattern of mat.patterns) {
			if (lower.includes(pattern)) {
				detectedMaterials.push(mat.label);
				materialActions.push(mat.actionPrefix);
				break;
			}
		}
	}

	const isToothGrammarMatch = detectedTeeth.length > 0 && (primaryDiagnosis !== null || materialActions.length > 0);

	// Если это структурированное высказывание о зубе у кресла
	if (isToothGrammarMatch) {
		const toothNum = detectedTeeth[0];
		const parts: string[] = [];

		// Часть 1: Зуб и диагноз
		let diagnosisPart = `Зуб ${toothNum}:`;
		if (primaryDiagnosis) {
			diagnosisPart += ` ${primaryDiagnosis.title} (${primaryDiagnosis.icdCode}).`;
		}
		parts.push(diagnosisPart);

		// Часть 2: Локализация полости и объективный статус
		const cavitySegments: string[] = [];
		if (detectedSurfaces.length > 0) {
			const surfaceText = formatSurfacesToLocative(detectedSurfaces);
			cavitySegments.push(`Полость ${surfaceText}`);
		} else if (primaryDiagnosis?.icdCode === "K02.1" || primaryDiagnosis?.icdCode === "K02.0") {
			// Дефолт для кариеса моляров/премоляров если поверхность не произнесена
			cavitySegments.push("Полость на окклюзионной поверхности");
		}

		if (observations.length > 0) {
			if (cavitySegments.length > 0) {
				cavitySegments.push(observations.join(", "));
			} else {
				cavitySegments.push(observations.join(", "));
			}
		}

		if (cavitySegments.length > 0) {
			parts.push(`${cavitySegments.join(", ")}.`);
		}

		// Часть 3: Выполненные манипуляции / поставленная пломба
		if (materialActions.length > 0) {
			parts.push(`${materialActions.join(". ")}.`);
		}

		const formattedText = parts.join(" ");

		return {
			rawSpeech: text,
			formattedText,
			detectedTeeth,
			detectedDiagnoses,
			detectedSurfaces,
			detectedMaterials,
			suggestedSoapField: materialActions.length > 0 ? "treatment" : "objective",
			isToothGrammarMatch: true,
		};
	}

	// Эвристика для общих фраз (Жалобы, Анамнез, Рекомендации)
	let suggestedField: ClinicalFormFieldTarget = "treatment";
	if (lower.includes("жалоб") || lower.includes("болит") || lower.includes("ноет") || lower.includes("беспокоит")) {
		suggestedField = "complaints";
	} else if (lower.includes("анамнез") || lower.includes("хроническ") || lower.includes("аллерги") || lower.includes("здоров")) {
		suggestedField = "anamnesis";
	} else if (lower.includes("осмотр") || lower.includes("слизист") || lower.includes("прикус") || lower.includes("лимфоузл")) {
		suggestedField = "objective";
	} else if (lower.includes("рекомендац") || lower.includes("диета") || lower.includes("полоскан") || lower.includes("ванночки") || lower.includes("при болях")) {
		suggestedField = "recommendations";
	}

	// Очистка от слов-паразитов и капитализация
	const cleaned = text
		.replace(/\b(?:эээ|ммм|ну|значит|вот|так сказать)\b/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	const capitalized = cleaned.length > 0 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
	const formattedText = capitalized.endsWith(".") || capitalized.endsWith("!") || capitalized.endsWith("?")
		? capitalized
		: `${capitalized}.`;

	return {
		rawSpeech: text,
		formattedText,
		detectedTeeth,
		detectedDiagnoses,
		detectedSurfaces,
		detectedMaterials,
		suggestedSoapField: suggestedField,
		isToothGrammarMatch: false,
	};
}
