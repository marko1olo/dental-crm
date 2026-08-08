/**
 * Подстановка переменных в шаблоны сообщений и подсчёт стоимости отправки.
 *
 * ЗАЧЕМ: таблица `communication_templates` и поле `variables_json` существуют с
 * нулевой ревизии, шаблоны засеяны (`sampleData.ts`), но подставлять переменные
 * было нечем. Единственный живой отправитель — services/notificationWorker.ts —
 * брал `payload.text` как есть, а при его отсутствии слал пациенту
 * `JSON.stringify(payload)`. Ни один шаблон из справочника не использовался.
 *
 * Правила, заданные здесь и обязательные для всех каналов:
 *
 * 1. Пустая подстановка — ошибка, а не пустая строка. «Здравствуйте, .» или
 *    «остаток по лечению составляет {amount}» уходят живому пациенту и стоят
 *    клинике доверия. Незаполненная переменная останавливает отправку.
 * 2. Незнакомая переменная — ошибка на сохранении шаблона, а не на отправке.
 *    Опечатку `{pacient}` должен ловить администратор в редакторе, а не пациент
 *    в сообщении.
 * 3. Переменные с медицинским содержанием помечены `phi: true`. Канал, у
 *    которого нет согласия на передачу медданных (`no_phi_by_default` в
 *    dente_telegram_bot_configs.privacy_mode), их не пропускает.
 * 4. Длина считается по правилам GSM 03.38 / UCS-2. Кириллица — это UCS-2, то
 *    есть 70 символов в сегменте, а не 160. Клиника платит за сегменты, и
 *    разница между «влезло» и «не влезло» — это счёт в конце месяца.
 */

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
 * Справочник переменных. Расширять можно, но каждая новая переменная обязана
 * получить резолвер в dispatcher — иначе шаблон с ней не отрендерится и
 * отправка остановится (правило 1).
 */
export const communicationTemplateVariables: readonly TemplateVariableDefinition[] =
	[
		{
			key: "patient",
			label: "Имя пациента",
			example: "Марина Петровна",
			phi: false,
		},
		{
			key: "patientFullName",
			label: "Пациент полностью",
			example: "Орлова Марина Петровна",
			phi: false,
		},
		{
			key: "clinic",
			label: "Название клиники",
			example: "Клиника на Ленина",
			phi: false,
		},
		{
			key: "clinicPhone",
			label: "Телефон клиники",
			example: "+7 495 000-00-00",
			phi: false,
		},
		{
			key: "clinicAddress",
			label: "Адрес клиники",
			example: "Москва, ул. Ленина, 1",
			phi: false,
		},
		{ key: "date", label: "Дата приёма", example: "12 августа", phi: false },
		{ key: "time", label: "Время приёма", example: "14:30", phi: false },
		{ key: "weekday", label: "День недели", example: "вторник", phi: false },
		{ key: "doctor", label: "Врач", example: "Иванов И. И.", phi: false },
		{ key: "amount", label: "Сумма", example: "12 400 ₽", phi: false },
		{
			key: "balance",
			label: "Остаток по счёту",
			example: "3 200 ₽",
			phi: false,
		},
		{
			key: "link",
			label: "Ссылка",
			example: "https://clinic.example/portal",
			phi: false,
		},
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
			key: "reviewLink",
			label: "Ссылка на отзыв",
			example: "https://clinic.example/review",
			phi: false,
		},
		// Ниже — медицинские сведения. Канал без согласия их не пропустит.
		{
			key: "procedure",
			label: "Процедура",
			example: "лечение кариеса",
			phi: true,
		},
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
	];

const variableByKey = new Map(
	communicationTemplateVariables.map((variable) => [variable.key, variable]),
);

function _findTemplateVariable(key: string): TemplateVariableDefinition | null {
	return variableByKey.get(key) ?? null;
}

/**
 * `{name}` — подстановка, `{{` и `}}` — литеральные скобки. Имя переменной:
 * латиница, цифры и `_`, начиная с буквы. Всё остальное внутри скобок остаётся
 * текстом: в теле сообщения встречаются и «{ }» из прайса, и эмодзи.
 */
const PLACEHOLDER_PATTERN = /\{\{|\}\}|\{([A-Za-z][A-Za-z0-9_]*)\}/g;

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
	/** Все переменные известны и допустимы для канала. */
	readonly ok: boolean;
	/** Найденные в теле переменные. */
	readonly variables: string[];
	/** Нет в справочнике — почти всегда опечатка. */
	readonly unknownVariables: string[];
	/** Медицинские переменные, найденные в теле. */
	readonly phiVariables: string[];
	/** Человекочитаемые причины отказа. */
	readonly problems: string[];
};

export type ValidateTemplateBodyOptions = {
	/** Канал согласован на передачу медицинских сведений. */
	readonly allowPhi?: boolean;
};

export function validateTemplateBody(
	body: string,
	options: ValidateTemplateBodyOptions = {},
): TemplateValidationResult {
	const variables = extractTemplateVariables(body);
	const unknownVariables = variables.filter((key) => !variableByKey.has(key));
	const phiVariables = variables.filter(
		(key) => variableByKey.get(key)?.phi === true,
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

type TemplateRenderSuccess = {
	readonly ok: true;
	readonly text: string;
	readonly usedVariables: string[];
};

type TemplateRenderFailure = {
	readonly ok: false;
	/** Переменные, для которых не пришло значение. Отправка останавливается. */
	readonly missingVariables: string[];
	readonly unknownVariables: string[];
	readonly problems: string[];
};

export type TemplateRenderResult =
	| TemplateRenderSuccess
	| TemplateRenderFailure;

export type RenderTemplateOptions = ValidateTemplateBodyOptions & {
	/**
	 * Разрешить пустые значения. По умолчанию `false` (правило 1). Включать
	 * только для предпросмотра в редакторе, никогда — для реальной отправки.
	 */
	readonly allowEmptyValues?: boolean;
};

/**
 * Управляющие символы ломают и SMS-шлюзы, и разметку мессенджеров, а в SMS
 * ещё и тратят сегмент. Перевод строки, возврат каретки и табуляция сохраняются —
 * их приводит к общему виду `normalizeRenderedText`.
 */
function stripControlCharacters(value: string): string {
	return value.replace(
		// biome-ignore lint/complexity/useRegexLiterals: control character range
		new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "g"),
		"",
	);
}

function normalizeRenderedText(value: string): string {
	return stripControlCharacters(value)
		.replace(/\r\n?/g, "\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function isEmptyValue(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") return value.trim().length === 0;
	if (typeof value === "number") return !Number.isFinite(value);
	return false;
}

function stringifyValue(value: string | number): string {
	return typeof value === "number" ? String(value) : value;
}

export function renderTemplate(
	body: string,
	values: Readonly<Record<string, string | number | null | undefined>>,
	options: RenderTemplateOptions = {},
): TemplateRenderResult {
	const validation = validateTemplateBody(body, options);
	const missingVariables: string[] = [];
	const usedVariables: string[] = [];

	const rendered = body.replace(PLACEHOLDER_PATTERN, (match, key?: string) => {
		if (match === "{{") return "{";
		if (match === "}}") return "}";
		if (!key) return match;

		const value = values[key];
		if (isEmptyValue(value)) {
			if (options.allowEmptyValues === true) {
				// Предпросмотр: показываем пример из справочника, а не пустоту.
				return variableByKey.get(key)?.example ?? `{${key}}`;
			}
			if (!missingVariables.includes(key)) missingVariables.push(key);
			return match;
		}
		if (!usedVariables.includes(key)) usedVariables.push(key);
		return stringifyValue(value as string | number);
	});

	if (!validation.ok || missingVariables.length > 0) {
		const problems = [...validation.problems];
		if (missingVariables.length > 0) {
			problems.push(
				`Нет значений для переменных: ${missingVariables.map((key) => `{${key}}`).join(", ")}. ` +
					"Сообщение не отправлено, чтобы пациент не получил текст с пропуском.",
			);
		}
		return {
			ok: false,
			missingVariables,
			unknownVariables: validation.unknownVariables,
			problems,
		};
	}

	const text = normalizeRenderedText(rendered);
	if (!text) {
		return {
			ok: false,
			missingVariables: [],
			unknownVariables: [],
			problems: ["После подстановки текст оказался пустым."],
		};
	}

	return { ok: true, text, usedVariables };
}

/**
 * Базовый алфавит GSM 03.38. Символы из расширенной таблицы (`^{}\[~]|€`)
 * занимают два места — это учтено в `describeSmsPayload`.
 */
const GSM7_BASIC =
	"@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
	"¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";

const gsm7Basic = new Set(GSM7_BASIC.split(""));
const gsm7Extended = new Set(GSM7_EXTENDED.split(""));

export type SmsPayloadDescription = {
	readonly encoding: "gsm7" | "ucs2";
	/** Тарифицируемых символов: для GSM-7 расширенные считаются за два. */
	readonly characters: number;
	/** Сегментов, за которые выставит счёт оператор. */
	readonly segments: number;
	/** Свободно в последнем сегменте — подсказка редактору. */
	readonly charactersLeftInSegment: number;
};

/**
 * Русский текст всегда UCS-2: 70 символов в одиночном сообщении, 67 в каждой
 * части составного. Одна «ё» в латинском тексте превращает 160 символов в 70 —
 * поэтому кодировка определяется по всему тексту, а не по первому символу.
 */
export function describeSmsPayload(text: string): SmsPayloadDescription {
	let characters = 0;
	let requiresUcs2 = false;

	for (const character of text) {
		if (gsm7Basic.has(character)) {
			characters += 1;
			continue;
		}
		if (gsm7Extended.has(character)) {
			characters += 2;
			continue;
		}
		requiresUcs2 = true;
		break;
	}

	if (requiresUcs2) {
		// UCS-2 считается в 16-битных единицах: эмодзи вне BMP занимает две.
		const units = [...text].reduce(
			(total, character) =>
				total + ((character.codePointAt(0) ?? 0) > 0xffff ? 2 : 1),
			0,
		);
		const single = 70;
		const multipart = 67;
		const segments =
			units <= single
				? Math.max(1, Math.ceil(units / single))
				: Math.ceil(units / multipart);
		const capacity = segments <= 1 ? single : multipart * segments;
		return {
			encoding: "ucs2",
			characters: units,
			segments,
			charactersLeftInSegment: Math.max(0, capacity - units),
		};
	}

	const single = 160;
	const multipart = 153;
	const segments =
		characters <= single
			? Math.max(1, Math.ceil(characters / single))
			: Math.ceil(characters / multipart);
	const capacity = segments <= 1 ? single : multipart * segments;
	return {
		encoding: "gsm7",
		characters,
		segments,
		charactersLeftInSegment: Math.max(0, capacity - characters),
	};
}

/**
 * Жёсткие ограничения площадок. Превышение — отказ провайдера, а не усечение:
 * обрезать медицинское сообщение молча нельзя.
 */
export const channelBodyLimits: Readonly<Record<string, number>> = {
	sms: 1000,
	whatsapp: 4096,
	telegram: 4096,
	max: 4000,
	vk: 4096,
	email: 100_000,
	phone: 4000,
	in_person: 4000,
};

export type ChannelFitResult = {
	readonly ok: boolean;
	readonly length: number;
	readonly limit: number;
	readonly sms: SmsPayloadDescription | null;
	readonly problems: string[];
};

export type CheckChannelFitOptions = {
	/** Потолок сегментов SMS. Больше — почти всегда ошибка составителя. */
	readonly maxSmsSegments?: number;
};

export function checkChannelFit(
	channel: string,
	text: string,
	options: CheckChannelFitOptions = {},
): ChannelFitResult {
	const limit = channelBodyLimits[channel] ?? 4096;
	const problems: string[] = [];
	const length = [...text].length;

	if (length > limit) {
		problems.push(
			`Текст длиннее предела канала: ${length} из ${limit} символов.`,
		);
	}

	let sms: SmsPayloadDescription | null = null;
	if (channel === "sms") {
		sms = describeSmsPayload(text);
		const maxSegments = options.maxSmsSegments ?? 4;
		if (sms.segments > maxSegments) {
			problems.push(
				`SMS разобьётся на ${sms.segments} сегмент(ов) при пределе ${maxSegments}. ` +
					"Клиника платит за каждый сегмент — сократите текст или отправьте ссылку.",
			);
		}
	}

	return { ok: problems.length === 0, length, limit, sms, problems };
}
