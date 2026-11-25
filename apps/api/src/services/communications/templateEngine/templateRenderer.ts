import { and, eq } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import { communicationTemplates } from "../../../db/schema.js";
import { calculateSmsSegments, checkChannelLimits } from "./channelLimits.js";
import { MACRO_KEY_ALIASES } from "./macroAliases.js";
import {
	detectMedicalSecrecyLeaks,
	sanitizeMedicalSecrecy,
} from "./secrecyDetector.js";
import { resolveContextVariables } from "./templateContextResolver.js";
import {
	PLACEHOLDER_PATTERN,
	type TemplateValidationResult,
	type TemplateVariableDefinition,
	type ValidateTemplateBodyOptions,
	communicationTemplateVariables,
	extractTemplateVariables,
	findTemplateVariable,
	templateVariableByKey,
	validateTemplateBody,
} from "./templateDictionary.js";
import {
	type ChannelFitResult,
	type CheckChannelFitOptions,
	type SmsPayloadDescription,
	channelBodyLimits,
	checkChannelFit,
	describeSmsPayload,
} from "./smsPayloadAndLimits.js";
import type { RenderTemplateOptions, RenderTemplateResult } from "./types.js";

export type {
	ChannelFitResult,
	CheckChannelFitOptions,
	SmsPayloadDescription,
	TemplateValidationResult,
	TemplateVariableDefinition,
	ValidateTemplateBodyOptions,
};
export {
	channelBodyLimits,
	checkChannelFit,
	communicationTemplateVariables,
	describeSmsPayload,
	extractTemplateVariables,
	findTemplateVariable,
	validateTemplateBody,
};

export type TemplateRenderSuccess = {
	readonly ok: true;
	readonly text: string;
	readonly usedVariables: string[];
};

export type TemplateRenderFailure = {
	readonly ok: false;
	readonly missingVariables: string[];
	readonly unknownVariables: string[];
	readonly problems: string[];
};

export type TemplateRenderResult =
	| TemplateRenderSuccess
	| TemplateRenderFailure;

export type LegacyRenderTemplateOptions = ValidateTemplateBodyOptions & {
	readonly allowEmptyValues?: boolean | undefined;
};

function stripControlCharacters(value: string): string {
	let result = "";
	for (let i = 0; i < value.length; i += 1) {
		const code = value.charCodeAt(i);
		const isDisallowedControl =
			(code >= 0x00 && code <= 0x08) ||
			code === 0x0b ||
			code === 0x0c ||
			(code >= 0x0e && code <= 0x1f) ||
			code === 0x7f;
		if (!isDisallowedControl) {
			result += value[i];
		}
	}
	return result;
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
				return templateVariableByKey.get(key)?.example ?? `{${key}}`;
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

export async function renderTemplateAsync(
	organizationId: string,
	options: RenderTemplateOptions,
	tx?: TenantDb,
): Promise<RenderTemplateResult> {
	let rawText = options.templateText ?? "";
	let channel = options.channel ?? "telegram";

	const needsDbLookup = Boolean(
		options.templateId ||
			options.patientId ||
			options.appointmentId ||
			options.visitId,
	);

	let dbContext: Record<string, string> = {};
	if (needsDbLookup) {
		const loadData = async (tenantTx: TenantDb) => {
			if (options.templateId) {
				const [existing] = await tenantTx
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
			if (options.patientId || options.appointmentId || options.visitId) {
				dbContext = await resolveContextVariables(
					organizationId,
					options.patientId,
					options.appointmentId,
					options.visitId,
					tenantTx,
				);
			}
		};
		if (tx) {
			await loadData(tx);
		} else {
			await withTenantCtx(organizationId, loadData);
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
