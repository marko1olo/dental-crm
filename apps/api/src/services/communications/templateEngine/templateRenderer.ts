import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { communicationTemplates } from "../../../db/schema.js";
import { calculateSmsSegments, checkChannelLimits } from "./channelLimits.js";
import { MACRO_KEY_ALIASES } from "./macroAliases.js";
import { detectMedicalSecrecyLeaks, sanitizeMedicalSecrecy } from "./secrecyDetector.js";
import { resolveContextVariables } from "./templateContextResolver.js";
import type { RenderTemplateOptions, RenderTemplateResult } from "./types.js";

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
 * отправка остановится.
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
			key: "rescheduleLink",
			label: "Ссылка запроса переноса приёма",
			example: "https://clinic.example/r/ab12",
			phi: false,
		},
		{
			key: "cabinet",
			label: "Кабинет / номер кресла",
			example: "Кабинет 1",
			phi: false,
		},
		{
			key: "chair",
			label: "Кресло / кабинет",
			example: "Кресло 1",
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
		{
			key: "discountPercent",
			label: "Скидка (%)",
			example: "15%",
			phi: false,
		},
		{
			key: "promoCode",
			label: "Промокод",
			example: "DENTE2026",
			phi: false,
		},
		{
			key: "validUntil",
			label: "Срок действия акции",
			example: "до 30 сентября",
			phi: false,
		},
		{
			key: "bonusAmount",
			label: "Сумма бонуса",
			example: "1 000 ₽",
			phi: false,
		},
	];

const variableByKey = new Map(
	communicationTemplateVariables.map((variable) => [variable.key, variable]),
);

export function findTemplateVariable(key: string): TemplateVariableDefinition | null {
	return variableByKey.get(key) ?? null;
}

/**
 * `{name}` — подстановка, `{{` и `}}` — литеральные скобки. Имя переменной:
 * латиница, цифры и `_`, начиная с буквы.
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
	readonly allowPhi?: boolean | undefined;
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

export type TemplateRenderSuccess = {
	readonly ok: true;
	readonly text: string;
	readonly usedVariables: string[];
};

export type TemplateRenderFailure = {
	readonly ok: false;
	/** Переменные, для которых не пришло значение. Отправка останавливается. */
	readonly missingVariables: string[];
	readonly unknownVariables: string[];
	readonly problems: string[];
};

export type TemplateRenderResult =
	| TemplateRenderSuccess
	| TemplateRenderFailure;

export type LegacyRenderTemplateOptions = ValidateTemplateBodyOptions & {
	/**
	 * Разрешить пустые значения. По умолчанию `false`. Включать
	 * только для предпросмотра в редакторе, никогда — для реальной отправки.
	 */
	readonly allowEmptyValues?: boolean | undefined;
};

/**
 * Управляющие символы ломают и SMS-шлюзы, и разметку мессенджеров.
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

/**
 * Синхронный рендеринг текста шаблона с подстановкой значений.
 */
export function renderTemplateSync(
	body: string,
	values: Readonly<Record<string, string | number | null | undefined>>,
	options: LegacyRenderTemplateOptions = {},
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

function applyPreviewFallbacks(v: Record<string, string>) {
	if (!v.patient_name) v.patient_name = "Пациент";
	if (!v.patient_first_name) v.patient_first_name = "Пациент";
	if (!v.doctor_name) v.doctor_name = "Лечащий врач";
	if (!v.clinic_name) v.clinic_name = "Стоматологическая клиника";
	if (!v.clinic_phone) v.clinic_phone = "+7 (000) 000-00-00";
	if (!v.clinic_address) v.clinic_address = "Адрес клиники";
	if (!v.appointment_date) v.appointment_date = "Дата визита";
	if (!v.appointment_time) v.appointment_time = "Время визита";
	if (!v.chair_number) v.chair_number = "Кабинет №1";
	if (!v.total_amount_rub) v.total_amount_rub = "0 ₽";
	if (!v.portal_link) v.portal_link = "https://dente.clinic/portal";
	if (!v.sbp_payment_link) v.sbp_payment_link = "https://sbp.nspk.ru/pay";
}

/**
 * Асинхронный рендеринг через контекст организации, БД и детекцию врачебной тайны (152-ФЗ / 323-ФЗ).
 */
export async function renderTemplateAsync(
	organizationId: string,
	options: RenderTemplateOptions,
): Promise<RenderTemplateResult> {
	let rawText = options.templateText ?? "";
	let channel = options.channel ?? "telegram";

	if (options.templateId) {
		const [existing] = await db
			.select()
			.from(communicationTemplates)
			.where(
				and(
					eq(communicationTemplates.id, options.templateId),
					eq(communicationTemplates.organizationId, organizationId),
				),
			)
			.limit(1);
		if (existing) {
			rawText = existing.body;
			channel = options.channel || existing.channel;
		}
	}

	if (!rawText.trim()) {
		return {
			ok: false,
			renderedText: "",
			channel,
			characterCount: 0,
			usedMacros: [],
			missingMacros: [],
			hasMedicalSecrecyViolation: false,
			detectedMedicalTerms: [],
			error: "Текст шаблона не передан или шаблон не найден",
			problems: ["Текст шаблона не передан или шаблон не найден"],
		};
	}

	const dbContext = await resolveContextVariables(
		organizationId,
		options.patientId,
		options.appointmentId,
		options.visitId,
	);
	const mergedValues: Record<string, string> = { ...dbContext };

	if (options.variables) {
		for (const [k, v] of Object.entries(options.variables)) {
			if (v !== undefined && v !== null) {
				mergedValues[k] = String(v);
				const canonical = MACRO_KEY_ALIASES[k.toLowerCase()];
				if (canonical) mergedValues[canonical] = String(v);
			}
		}
	}
	if (options.allowPreviewFallback === true) applyPreviewFallbacks(mergedValues);

	const usedMacros: string[] = [];
	const missingMacros: string[] = [];
	let rendered = rawText.replace(
		/\{([a-zA-Z0-9_]+)\}/g,
		(match, key: string) => {
			const canonicalKey = MACRO_KEY_ALIASES[key.toLowerCase()] || key;
			if (mergedValues[canonicalKey] !== undefined) {
				usedMacros.push(canonicalKey);
				return String(mergedValues[canonicalKey]);
			}
			if (mergedValues[key] !== undefined) {
				usedMacros.push(key);
				return String(mergedValues[key]);
			}
			missingMacros.push(key);
			return match;
		},
	);

	const leakCheck = detectMedicalSecrecyLeaks(rendered);
	const handling = options.violationHandling ?? "block";
	let hasMedicalSecrecyViolation = false;
	let warning: string | undefined;
	let error: string | undefined;

	if (leakCheck.hasLeak) {
		hasMedicalSecrecyViolation = true;
		if (handling === "block") {
			error = `Отказ в отправке сообщения в открытый канал связи (${channel}): обнаружена врачебная тайна (152-ФЗ / 323-ФЗ ст. 13): ${leakCheck.reasons.join(", ")}. Сообщения пациентам в SMS и мессенджерах не должны содержать медицинские диагнозы, формулы зубов или детали полостей.`;
		} else {
			const sanitized = sanitizeMedicalSecrecy(rendered);
			rendered = sanitized.sanitizedText;
			warning = `Текст сообщения автоматически санирован по 152-ФЗ: исключены термины врачебной тайны (${sanitized.strippedTerms.join(", ")}).`;
		}
	}

	const channelLimitsResult = checkChannelLimits(channel, rendered);
	const problems = [...channelLimitsResult.problems];
	if (missingMacros.length > 0 && !options.allowPreviewFallback) {
		problems.push(
			`Не заполнены обязательные макросы: ${missingMacros.map((m) => `{${m}}`).join(", ")}`,
		);
	}
	if (error) problems.push(error);

	const smsDetails =
		channel === "sms" ? calculateSmsSegments(rendered) : undefined;
	return {
		ok: problems.length === 0 && !error,
		renderedText: rendered,
		channel,
		characterCount: rendered.length,
		usedMacros: Array.from(new Set(usedMacros)),
		missingMacros: Array.from(new Set(missingMacros)),
		smsSegments: smsDetails?.segments,
		smsEncoding: smsDetails?.encoding,
		hasMedicalSecrecyViolation,
		detectedMedicalTerms: leakCheck.detectedTerms,
		warning,
		error,
		problems,
	};
}

function isAsyncRenderOptions(
	arg1: string,
	arg2: unknown,
	arg3?: unknown,
): arg2 is RenderTemplateOptions {
	if (arg3 !== undefined) return false;
	if (!arg2 || typeof arg2 !== "object") return false;
	const obj = arg2 as Record<string, unknown>;
	if (
		"templateId" in obj ||
		"templateText" in obj ||
		"patientId" in obj ||
		"appointmentId" in obj ||
		"visitId" in obj ||
		"violationHandling" in obj ||
		"allowPreviewFallback" in obj
	) {
		return true;
	}
	if (arg1.includes("{") && arg1.includes("}")) {
		return false;
	}
	if ("variables" in obj && typeof obj.variables === "object") {
		return true;
	}
	if ("channel" in obj && !arg1.includes("{")) {
		return true;
	}
	return false;
}

/**
 * Единый канонический фасад шаблонизатора (Мандат 8bf).
 * Поддерживает как асинхронный контекстный рендеринг (через organizationId и RenderTemplateOptions),
 * так и синхронный строковый рендеринг (через body, values, options).
 */
export function renderTemplate(
	organizationId: string,
	options: RenderTemplateOptions,
): Promise<RenderTemplateResult>;
export function renderTemplate(
	body: string,
	values: Readonly<Record<string, string | number | null | undefined>>,
	options?: LegacyRenderTemplateOptions,
): TemplateRenderResult;
export function renderTemplate(
	first: string,
	second:
		| RenderTemplateOptions
		| Readonly<Record<string, string | number | null | undefined>>,
	third?: LegacyRenderTemplateOptions,
): Promise<RenderTemplateResult> | TemplateRenderResult {
	if (isAsyncRenderOptions(first, second, third)) {
		return renderTemplateAsync(first, second as RenderTemplateOptions);
	}
	return renderTemplateSync(
		first,
		second as Readonly<Record<string, string | number | null | undefined>>,
		third,
	);
}

/**
 * Базовый алфавит GSM 03.38. Символы из расширенной таблицы (`^{}\[~]|€`)
 * занимают два места.
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
 * части составного.
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
 * Жёсткие ограничения площадок.
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
	readonly maxSmsSegments?: number | undefined;
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
