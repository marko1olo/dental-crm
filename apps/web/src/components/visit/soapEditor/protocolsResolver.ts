import {
	type OutpatientProtocolTemplate,
	type StomxOutpatientTemplateMetadata,
	buildAuthenticProtocolTemplate,
} from "@dental/shared";

export const resolvedProtocolsCache = new Map<number, OutpatientProtocolTemplate>();

/**
 * Преобразует шаблон StomX из каталога 448 шаблонов в полноценный клинический протокол медицинской карты (SOAP).
 * Использует аутентичные тексты 448 шаблонов СтАР / StomX без суррогатных заглушек [CLN-04].
 * Результат кэшируется в RAM для 0 ms разрешения при поиске на слабых CPU/HDD.
 */
export function resolveProtocolFromTemplate(
	tpl: StomxOutpatientTemplateMetadata,
): OutpatientProtocolTemplate {
	const cached = resolvedProtocolsCache.get(tpl.id);
	if (cached) {
		return cached;
	}

	const resolved = buildAuthenticProtocolTemplate(tpl);
	resolvedProtocolsCache.set(tpl.id, resolved);
	return resolved;
}
