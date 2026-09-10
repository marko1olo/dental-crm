import { STOMX_KEY_CLINICAL_PROTOCOLS } from "./stomtProtocolsData.js";
import {
	STOMX_ALL_448_TEMPLATES_INDEX,
} from "./stomtTemplatesIndex.js";

/**
 * 5 базовых клинических специальностей стоматологического приема
 */
export type OutpatientSpecialty =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "implantology"
	| "periodontics";

/**
 * Метаданные специальности
 */
export interface OutpatientSpecialtyMeta {
	readonly id: OutpatientSpecialty;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly defaultMkbGroup: string;
	readonly iconName: string;
}

export const STOMX_SPECIALTIES: readonly OutpatientSpecialtyMeta[] = [
	{
		id: "therapy",
		label: "Терапевтическая стоматология",
		shortLabel: "Терапия",
		description: "Лечение кариеса, пульпита, периодонтита, эстетические реставрации, отбеливание",
		defaultMkbGroup: "K02, K04",
		iconName: "Stethoscope",
	},
	{
		id: "orthopedics",
		label: "Ортопедическая стоматология",
		shortLabel: "Ортопедия",
		description: "Вкладки, виниры Emax, коронки из диоксида циркония и металлокерамики, съемные протезы",
		defaultMkbGroup: "K02, K08",
		iconName: "Crown",
	},
	{
		id: "surgery",
		label: "Хирургическая стоматология",
		shortLabel: "Хирургия",
		description: "Удаление зубов, альвеолит, перикоронит, периостит, абсцессы, резекция верхушек корней",
		defaultMkbGroup: "K01, K04.7, K10, K12",
		iconName: "Scissors",
	},
	{
		id: "implantology",
		label: "Дентальная имплантология",
		shortLabel: "Имплантация",
		description: "Установка имплантатов, открытый и закрытый синус-лифтинг, костная пластика, формирователи",
		defaultMkbGroup: "K08.1, K08.8",
		iconName: "Flame",
	},
	{
		id: "periodontics",
		label: "Пародонтология и профилактика",
		shortLabel: "Пародонтология",
		description: "Гингивит, пародонтит, пародонтоз, закрытый и открытый кюретаж, гингивэктомия",
		defaultMkbGroup: "K05",
		iconName: "HeartPulse",
	},
];

/**
 * Структурированный клинический протокол приема 043/у
 */
export interface OutpatientProtocolTemplate {
	readonly id: string;
	readonly stomxId?: number | undefined;
	readonly name: string;
	readonly specialty: OutpatientSpecialty;
	readonly subcategory: string;
	readonly mkbCode: string;
	readonly mkbName: string;
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentProtocol: string;
	readonly recommendations: string;
	readonly defaultTooth?: number | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly fullText?: string | undefined;
}

/**
 * Метаданные шаблона из 448 позиций StomX
 */
export interface StomxTemplateMetadata {
	readonly id: number;
	readonly categoryId: number;
	readonly name: string;
	readonly categoryName: string;
	readonly specialty: OutpatientSpecialty;
	readonly mkbCode: string;
	readonly order: number;
}

/**
 * Узел дерева рубрик шаблонов StomX
 */
export interface StomxCategoryTreeItem {
	readonly id: number;
	readonly name: string;
	readonly children?: readonly StomxCategoryTreeItem[] | undefined;
}

/**
 * Параметры подстановки для формирования текста дневника визита
 */
export interface PopulateTemplateParams {
	readonly toothNumber?: number | undefined;
	readonly toothName?: string | undefined;
	readonly surfaces?: string | undefined;
}

/**
 * Подставляет реальные клинические параметры зуба (номер зуба, поверхности)
 * вместо плейсхолдеров StomX: `__ зубе`, `зубе __`, `дефект __________зуба`, `на ______________поверхности`
 * и нормализует секционные метки `${Жалобы}`, `${Анамнез}`, `${Протокол лечения}`.
 *
 * @param templateText Исходный текст шаблона с плейсхолдерами
 * @param params Номер зуба, название анатомической сущности, поверхности дефекта
 * @returns Готовый к вставке в медицинскую карту текст дневника
 */
export function populateOutpatientTemplateText(
	templateText: string,
	params: PopulateTemplateParams = {},
): string {
	if (!templateText) return "";
	let result = templateText;

	const toothStr =
		params.toothNumber !== undefined && params.toothNumber !== null
			? String(params.toothNumber)
			: "";
	const surfaceStr = params.surfaces ? params.surfaces.trim() : "";

	if (toothStr) {
		// 1. Предложный падеж с предлогом "в" или "на": "в __ зубе", "в зубе __"
		result = result.replace(/в\s+_{2,}\s+зубе/gi, `в ${toothStr} зубе`);
		result = result.replace(/в\s+зубе\s+_{2,}/gi, `в зубе ${toothStr}`);
		result = result.replace(/на\s+_{2,}\s+зубе/gi, `на ${toothStr} зубе`);
		result = result.replace(/на\s+зубе\s+_{2,}/gi, `на зубе ${toothStr}`);

		// 2. Конструкции "из __ зуба", "области ___ зуба"
		result = result.replace(/из\s+_{2,}\s+зуба/gi, `из ${toothStr} зуба`);
		result = result.replace(/области\s+_{2,}\s+зуба/gi, `области ${toothStr} зуба`);
		result = result.replace(/области\s+зуба\s+_{2,}/gi, `области зуба ${toothStr}`);
		result = result.replace(/дефект\s+_{2,}\s*зуба/gi, `дефект ${toothStr} зуба`);
		result = result.replace(/поверхности\s*_{2,}\s*зуба/gi, `поверхности ${toothStr} зуба`);

		// 3. Прямое указание "Зуб __", "зуба __", "зубе __"
		result = result.replace(/Зуб\s*_{2,}/g, `Зуб ${toothStr}`);
		result = result.replace(/зуб\s*_{2,}/g, `зуб ${toothStr}`);
		result = result.replace(/(?:зуб[ае])\s*_{2,}/gi, (match) => {
			const lower = match.toLowerCase();
			if (lower.startsWith("зубе")) return `зубе ${toothStr}`;
			return `зуба ${toothStr}`;
		});

		// 4. Одиночные подчеркивания перед падежами
		result = result.replace(/_{2,}\s*зубе/gi, `${toothStr} зубе`);
		result = result.replace(/_{2,}\s*зуба/gi, `${toothStr} зуба`);
		result = result.replace(/_{2,}\s*зуб\b/gi, `${toothStr} зуб`);
		result = result.replace(/_{2,}\s*зубах/gi, `зубах ${toothStr}`);
		result = result.replace(/_{2,}\s*зубами/gi, `${toothStr} зубами`);
	}

	if (surfaceStr) {
		result = result.replace(/на\s+_{2,}\s*поверхности/gi, `на ${surfaceStr} поверхности`);
		result = result.replace(/_{2,}\s*поверхности/gi, `${surfaceStr} поверхности`);
	}

	// 5. Нормализация меток ${...} в канонические разделы медкарты
	result = result.replace(/\$\{\s*Жалобы\s*\}/gi, "Жалобы:");
	result = result.replace(/\$\{\s*Анамнез\s*\}/gi, "Анамнез:");
	result = result.replace(/\$\{\s*Aнамнез(?:\s+заболевания)?\s*\}/gi, "Анамнез:");
	result = result.replace(/\$\{\s*Объективное\s+исследование\s*\}/gi, "Объективное исследование:");
	result = result.replace(/\$\{\s*Осмотр\s+полости\s+рта\s*\}/gi, "Осмотр полости рта:");
	result = result.replace(/\$\{\s*Внешний\s+осмотр\s*\}/gi, "Внешний осмотр:");
	result = result.replace(/\$\{\s*Протокол\s+[Лл]ечения\s*\}/gi, "Протокол лечения:");
	result = result.replace(/\$\{\s*Клинический\s+диагноз\s*\}/gi, "Клинический диагноз:");
	result = result.replace(/\$\{\s*Рекомендации\s*\}/gi, "Рекомендации:");
	result = result.replace(/\$\{\s*Прогноз\s*\}/gi, "Прогноз:");
	result = result.replace(/\$\{\s*План\s+обследования\s*\}/gi, "План обследования:");
	result = result.replace(/\$\{\s*Рентген\s+общи?е\s+описание\s*\}/gi, "Рентгенография:");

	return result;
}

/**
 * Собирает целостный дневник приема Формы 043/у (SOAP) из протокола с подстановкой параметров
 */
export function formatFullSoapFromProtocol(
	protocol: OutpatientProtocolTemplate,
	params: PopulateTemplateParams = {},
): string {
	const toothNumber = params.toothNumber ?? protocol.defaultTooth;
	const populatedComplaint = populateOutpatientTemplateText(protocol.complaint, {
		toothNumber,
		surfaces: params.surfaces,
	});
	const populatedAnamnesis = populateOutpatientTemplateText(protocol.anamnesis, {
		toothNumber,
		surfaces: params.surfaces,
	});
	const populatedObjective = populateOutpatientTemplateText(protocol.objectiveStatus, {
		toothNumber,
		surfaces: params.surfaces,
	});
	const populatedDiagnosis = populateOutpatientTemplateText(protocol.diagnosis, {
		toothNumber,
		surfaces: params.surfaces,
	});
	const populatedTreatment = populateOutpatientTemplateText(protocol.treatmentProtocol, {
		toothNumber,
		surfaces: params.surfaces,
	});
	const populatedRecommendations = populateOutpatientTemplateText(protocol.recommendations, {
		toothNumber,
		surfaces: params.surfaces,
	});

	const toothHeader = toothNumber ? `[Зуб ${toothNumber}] ` : "";

	return [
		`=== ${toothHeader}${protocol.name} (${protocol.mkbCode}) ===`,
		`Жалобы: ${populatedComplaint}`,
		`Анамнез: ${populatedAnamnesis}`,
		`Объективный статус: ${populatedObjective}`,
		`Диагноз: ${populatedDiagnosis}`,
		`Протокол лечения: ${populatedTreatment}`,
		`Рекомендации: ${populatedRecommendations}`,
	].join("\n\n");
}

/**
 * Получить структурированные протоколы по специальности
 */
export function getProtocolsBySpecialty(
	specialty: OutpatientSpecialty,
): readonly OutpatientProtocolTemplate[] {
	return STOMX_KEY_CLINICAL_PROTOCOLS.filter((p) => p.specialty === specialty);
}

/**
 * Поиск по ключевым клиническим протоколам (название, подкатегория, диагноз, теги)
 */
export function searchOutpatientProtocols(
	query: string,
	specialty?: OutpatientSpecialty,
): readonly OutpatientProtocolTemplate[] {
	const normalized = query.trim().toLowerCase();
	return STOMX_KEY_CLINICAL_PROTOCOLS.filter((p) => {
		if (specialty && p.specialty !== specialty) return false;
		if (!normalized) return true;

		return (
			p.name.toLowerCase().includes(normalized) ||
			p.subcategory.toLowerCase().includes(normalized) ||
			p.mkbCode.toLowerCase().includes(normalized) ||
			p.mkbName.toLowerCase().includes(normalized) ||
			(p.tags?.some((tag) => tag.toLowerCase().includes(normalized)))
		);
	});
}

/**
 * Поиск по полному индексу 448 шаблонов StomX Drop
 */
export function searchAll448Templates(
	query: string,
	specialty?: OutpatientSpecialty,
): readonly StomxOutpatientTemplateMetadata[] {
	const normalized = query.trim().toLowerCase();
	return STOMX_ALL_448_TEMPLATES_INDEX.filter((t) => {
		if (specialty && t.specialty !== specialty) return false;
		if (!normalized) return true;

		return (
			t.name.toLowerCase().includes(normalized) ||
			t.categoryName.toLowerCase().includes(normalized) ||
			t.mkbCode.toLowerCase().includes(normalized)
		);
	});
}

/**
 * Поиск ключевого протокола по ID
 */
export function findProtocolById(
	id: string | number,
): OutpatientProtocolTemplate | undefined {
	return STOMX_KEY_CLINICAL_PROTOCOLS.find(
		(p) => p.id === id || (typeof id === "number" && p.stomxId === id),
	);
}

// Реэкспорт всех каталогов и дерева рубрик
export { STOMX_KEY_CLINICAL_PROTOCOLS } from "./stomtProtocolsData.js";
export {
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_OUTPATIENT_CATEGORY_TREE,
} from "./stomtTemplatesIndex.js";
