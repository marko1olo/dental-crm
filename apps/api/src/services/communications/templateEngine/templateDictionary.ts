export type TemplateVariableDefinition = {
	/** Имя внутри фигурных скобок: `{patient}`. */
	readonly key: string;
	/** Подпись для редактора шаблонов. */
	readonly label: string;
	/** Значение для предпросмотра — реальных данных пациента здесь быть не должно. */
	readonly example: string;
	/** Содержит сведения о здоровье: диагноз, зуб, план лечения, документ. */
	readonly phi: boolean;
};

/**
 * Справочник переменных.
 */
export const communicationTemplateVariables: readonly TemplateVariableDefinition[] =
	[
		{ key: "patient", label: "Имя пациента", example: "Марина Петровна", phi: false },
		{
			key: "patientFullName",
			label: "Пациент полностью",
			example: "Орлова Марина Петровна",
			phi: false,
		},
		{ key: "clinic", label: "Название клиники", example: "Клиника на Ленина", phi: false },
		{ key: "clinicPhone", label: "Телефон клиники", example: "+7 495 000-00-00", phi: false },
		{ key: "clinicAddress", label: "Адрес клиники", example: "Москва, ул. Ленина, 1", phi: false },
		{ key: "date", label: "Дата приёма", example: "12 августа", phi: false },
		{ key: "time", label: "Время приёма", example: "14:30", phi: false },
		{ key: "weekday", label: "День недели", example: "вторник", phi: false },
		{ key: "doctor", label: "Врач", example: "Иванов И. И.", phi: false },
		{ key: "amount", label: "Сумма", example: "12 400 ₽", phi: false },
		{ key: "balance", label: "Остаток по счёту", example: "3 200 ₽", phi: false },
		{ key: "link", label: "Ссылка", example: "https://clinic.example/portal", phi: false },
		{
			key: "confirmLink",
			label: "Ссылка подтверждения приёма",
			example: "https://clinic.example/c/ab12",
			phi: false,
		},
		{
			key: "cancelLink",
			label: "Ссылка отмены приёма",
			example: "https://clinic.example/x/ab12",
			phi: false,
		},
		{
			key: "rescheduleLink",
			label: "Ссылка запроса переноса приёма",
			example: "https://clinic.example/r/ab12",
			phi: false,
		},
		{ key: "cabinet", label: "Кабинет / номер кресла", example: "Кабинет 1", phi: false },
		{ key: "chair", label: "Кресло / кабинет", example: "Кресло 1", phi: false },
		{ key: "reviewLink", label: "Ссылка на отзыв", example: "https://clinic.example/review", phi: false },
		{ key: "procedure", label: "Процедура", example: "лечение кариеса", phi: true },
		{ key: "tooth", label: "Зуб", example: "2.6", phi: true },
		{ key: "diagnosis", label: "Диагноз", example: "K02.1", phi: true },
		{
			key: "planTitle",
			label: "План лечения",
			example: "Терапия верхней челюсти",
			phi: true,
		},
		{
			key: "documentTitle",
			label: "Документ",
			example: "Акт выполненных работ",
			phi: true,
		},
		{ key: "discountPercent", label: "Скидка (%)", example: "15%", phi: false },
		{ key: "promoCode", label: "Промокод", example: "DENTE2026", phi: false },
		{ key: "validUntil", label: "Срок действия акции", example: "до 30 сентября", phi: false },
		{ key: "bonusAmount", label: "Сумма бонуса", example: "1 000 ₽", phi: false },
	];

export const templateVariableByKey = new Map(
	communicationTemplateVariables.map((variable) => [variable.key, variable]),
);

export function findTemplateVariable(
	key: string,
): TemplateVariableDefinition | null {
	return templateVariableByKey.get(key) ?? null;
}

/**
 * `{name}` — подстановка, `{{` и `}}` — литеральные скобки. Имя переменной:
 * латиница, цифры и `_`, начиная с буквы.
 */
export const PLACEHOLDER_PATTERN =
	/\{\{|\}\}|\{([A-Za-z][A-Za-z0-9_]*)\}/g;

/** Имена переменных в порядке появления, без повторов. */
export function extractTemplateVariables(body: string): string[] {
	const found: string[] = [];
	const seen = new Set<string>();
	for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
		const key = match[1];
		if (!key || seen.has(key)) continue;
		seen.add(key);
		found.push(key);
	}
	return found;
}

export type TemplateValidationResult = {
	readonly ok: boolean;
	readonly variables: string[];
	readonly unknownVariables: string[];
	readonly phiVariables: string[];
	readonly problems: string[];
};

export type ValidateTemplateBodyOptions = {
	readonly allowPhi?: boolean | undefined;
};

export function validateTemplateBody(
	body: string,
	options: ValidateTemplateBodyOptions = {},
): TemplateValidationResult {
	const variables = extractTemplateVariables(body);
	const unknownVariables = variables.filter(
		(key) => !templateVariableByKey.has(key),
	);
	const phiVariables = variables.filter(
		(key) => templateVariableByKey.get(key)?.phi === true,
	);
	const problems: string[] = [];

	if (!body.trim()) {
		problems.push("Текст шаблона пуст.");
	}
	if (unknownVariables.length > 0) {
		problems.push(
			`Неизвестные переменные: ${unknownVariables.map((key) => `{${key}}`).join(", ")}. ` +
				"Проверьте написание или уберите их из текста.",
		);
	}
	if (phiVariables.length > 0 && options.allowPhi !== true) {
		problems.push(
			`Медицинские сведения в канале без согласия: ${phiVariables.map((key) => `{${key}}`).join(", ")}. ` +
				"Замените на нейтральный текст со ссылкой на портал клиники.",
		);
	}

	return {
		ok: problems.length === 0,
		variables,
		unknownVariables,
		phiVariables,
		problems,
	};
}
