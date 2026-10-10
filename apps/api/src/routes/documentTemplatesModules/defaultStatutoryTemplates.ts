import {
	ALL_DEFAULT_TEMPLATES_BY_ALIAS,
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	getDefaultTemplateContentHtml,
} from "@dental/shared";
import type { ParsedPassportFields } from "./typesAndSchemas.js";

export {
	ALL_DEFAULT_TEMPLATES_BY_ALIAS,
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	getDefaultTemplateContentHtml,
};

export interface FallbackStatutoryTemplateRecord {
	id: null;
	stomxId: number | null;
	systemAlias: string;
	name: string;
	categoryId: number;
	contentHtml: string;
	isEgisz: boolean;
	esiaRequired: boolean;
	isXrayIds: boolean;
	isBlock: boolean;
}

export function parsePassportFromString(
	str: string | null | undefined,
): ParsedPassportFields {
	if (!str || !str.trim()) return {};
	const trimmed = str.trim();

	// Попытка найти серию и номер вида "4510 123456" или "45 10 123456"
	const match = trimmed.match(
		/(?:паспорт|рф)?\s*(\d{2}\s*\d{2}|\d{4})\s*№?\s*(\d{6})/i,
	);
	const series = match ? match[1]?.replace(/\s+/g, "") : "";
	const number = match ? match[2] : "";

	// Дата выдачи
	const dateMatch = trimmed.match(/(?:выдан|от)\s*(\d{2}\.\d{2}\.\d{4})/i);
	const issuedDate = dateMatch ? dateMatch[1] : "";

	// Кем выдан
	let issuedBy = "";
	const issuedByMatch = trimmed.match(
		/(?:выдан|выдачи)\s*(?:[0-9.]+\s*)?([^,.]+)/i,
	);
	if (issuedByMatch) {
		issuedBy = issuedByMatch[1]?.trim() ?? "";
	}

	// Код подразделения
	const divMatch = trimmed.match(/(?:код|подразделения)?\s*(\d{3}-\d{3})/i);
	const divisionCode = divMatch ? divMatch[1] : "";

	return {
		series: series || undefined,
		number: number || undefined,
		issuedDate: issuedDate || undefined,
		issuedBy: issuedBy || undefined,
		divisionCode: divisionCode || undefined,
	};
}

/**
 * Резолюция канонического нормативного шаблона РФ (Приказ Минздрава № 1051н, ПП РФ № 736,
 * Акт выполненных работ, Справка ФНС КНД 1151156) при отсутствии кастомной записи в БД.
 */
export function resolveFallbackStatutoryTemplateByIdentifier(
	identifier: string,
): FallbackStatutoryTemplateRecord | null {
	const isNumeric = /^\d+$/.test(identifier);
	const stomxIdNum = isNumeric ? Number.parseInt(identifier, 10) : undefined;
	const alias = !isNumeric ? identifier : undefined;
	const knownHtml =
		(alias ? ALL_DEFAULT_TEMPLATES_BY_ALIAS[alias] : undefined) ??
		(stomxIdNum
			? ALL_DEFAULT_TEMPLATES_BY_ALIAS[getDefaultTemplateContentHtml(stomxIdNum)]
			: undefined);

	if (!knownHtml) {
		return null;
	}

	return {
		id: null,
		stomxId: stomxIdNum ?? null,
		systemAlias: identifier,
		name: identifier,
		categoryId: 1,
		contentHtml: knownHtml,
		isEgisz: false,
		esiaRequired: false,
		isXrayIds: false,
		isBlock: false,
	};
}

/**
 * Возвращает HTML-контент шаблона из БД либо нормативный эталон по stomxId / systemAlias.
 */
export function resolveRenderTemplateContentHtml(
	identifier: string,
	templateName: string,
	existingContentHtml: string | null | undefined,
): string {
	if (existingContentHtml && existingContentHtml.trim()) {
		return existingContentHtml;
	}
	const isNumeric = /^\d+$/.test(identifier);
	return getDefaultTemplateContentHtml(
		isNumeric ? Number.parseInt(identifier, 10) : undefined,
		!isNumeric ? identifier : undefined,
		templateName,
	);
}
