import {
	type OutpatientProtocolTemplate,
	STOMX_KEY_CLINICAL_PROTOCOLS,
	type StomxOutpatientTemplateMetadata,
} from "@dental/shared";

export const resolvedProtocolsCache = new Map<number, OutpatientProtocolTemplate>();

/**
 * Преобразует шаблон StomX из каталога 448 шаблонов в полноценный клинический протокол медицинской карты (SOAP).
 * Результат кэшируется в RAM для 0 ms разрешения при поиске на слабых CPU/HDD.
 */
export function resolveProtocolFromTemplate(
	tpl: StomxOutpatientTemplateMetadata,
): OutpatientProtocolTemplate {
	const cached = resolvedProtocolsCache.get(tpl.id);
	if (cached) {
		return cached;
	}

	const exact = STOMX_KEY_CLINICAL_PROTOCOLS.find(
		(p) =>
			p.stomxId === tpl.id ||
			p.id === String(tpl.id) ||
			p.name.toLowerCase() === tpl.name.toLowerCase(),
	);
	const resolved: OutpatientProtocolTemplate = exact || {
		id: `stomx_${tpl.id}`,
		stomxId: tpl.id,
		specialty: tpl.specialty,
		subcategory: tpl.categoryName,
		name: tpl.name,
		mkbCode: tpl.mkbCode,
		mkbName: tpl.name,
		complaint: `Жалобы по протоколу ${tpl.name}: дискомфорт, боли или дефект твердых тканей в области __ зуба.`,
		anamnesis: `Соматически здоров. Аллергологический анамнез не отягощен. Ранее по поводу ${tpl.name} в __ зубе лечение не проводилось.`,
		objectiveStatus: `Объективный осмотр: в __ зубе определяется ${tpl.name}. Перкуссия безболезненна, зондирование по клиническому протоколу, слизистая оболочка десны интактна.`,
		diagnosis: `${tpl.mkbCode} ${tpl.name}`,
		treatmentProtocol: `Выполнено лечение по клиническим рекомендациям СтАР (${tpl.name} в __ зубе): антисептическая обработка, препарирование / обработка, пломбирование / фиксация по протоколу.`,
		recommendations:
			"Соблюдение гигиены полости рта, щадящая диета на стороне вмешательства 24 часа. Плановый осмотр через 6 месяцев.",
		defaultTooth: 16,
		tags: [tpl.categoryName, tpl.mkbCode, tpl.specialty],
	};

	resolvedProtocolsCache.set(tpl.id, resolved);
	return resolved;
}
