/**
 * packages/shared/src/clinical/soap/templateInterpolator.ts
 *
 * Канонический интерполятор клинических шаблонов и протоколов SOAP (Мандаты 8e, 8x, 8ap, 8bf).
 * Подставляет реальные анатомические параметры зуба (номер зуба, поверхности)
 * вместо плейсхолдеров и нормализует секционные метки медкарты (Жалобы, Анамнез, Status localis, Лечение).
 */

export interface PopulateTemplateParams {
	readonly toothNumber?: number | string | null | undefined;
	readonly toothName?: string | undefined;
	readonly surfaces?: string | undefined;
}

/**
 * Подставляет реальные клинические параметры зуба (номер зуба, поверхности)
 * вместо плейсхолдеров: `__ зубе`, `зубе __`, `дефект __________зуба`, `на ______________поверхности`
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
		result = result.replace(
			/области\s+_{2,}\s+зуба/gi,
			`области ${toothStr} зуба`,
		);
		result = result.replace(
			/области\s+зуба\s+_{2,}/gi,
			`области зуба ${toothStr}`,
		);
		result = result.replace(
			/дефект\s+_{2,}\s*зуба/gi,
			`дефект ${toothStr} зуба`,
		);
		result = result.replace(
			/поверхности\s*_{2,}\s*зуба/gi,
			`поверхности ${toothStr} зуба`,
		);

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
		result = result.replace(
			/на\s+_{2,}\s*поверхности/gi,
			`на ${surfaceStr} поверхности`,
		);
		result = result.replace(
			/_{2,}\s*поверхности/gi,
			`${surfaceStr} поверхности`,
		);
	}

	// 5. Нормализация меток ${...} в канонические разделы медкарты
	result = result.replace(/\$\{\s*Жалобы\s*\}/gi, "Жалобы:");
	result = result.replace(/\$\{\s*Анамнез\s*\}/gi, "Анамнез:");
	result = result.replace(
		/\$\{\s*Aнамнез(?:\s+заболевания)?\s*\}/gi,
		"Анамнез:",
	);
	result = result.replace(
		/\$\{\s*Объективное\s+исследование\s*\}/gi,
		"Объективное исследование:",
	);
	result = result.replace(
		/\$\{\s*Осмотр\s+полости\s+рта\s*\}/gi,
		"Осмотр полости рта:",
	);
	result = result.replace(/\$\{\s*Внешний\s+осмотр\s*\}/gi, "Внешний осмотр:");
	result = result.replace(
		/\$\{\s*Протокол\s+[Лл]ечения\s*\}/gi,
		"Протокол лечения:",
	);
	result = result.replace(
		/\$\{\s*Клинический\s+диагноз\s*\}/gi,
		"Клинический диагноз:",
	);
	result = result.replace(/\$\{\s*Рекомендации\s*\}/gi, "Рекомендации:");
	result = result.replace(/\$\{\s*Прогноз\s*\}/gi, "Прогноз:");
	result = result.replace(
		/\$\{\s*План\s+обследования\s*\}/gi,
		"План обследования:",
	);
	result = result.replace(
		/\$\{\s*Рентген\s+общи?е\s+описание\s*\}/gi,
		"Рентгенография:",
	);

	return result;
}
