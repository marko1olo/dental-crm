import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { messageTemplateCatalogs } from "../../../db/schema.js";
import { calculateSmsSegments, checkChannelLimits } from "./channelLimits.js";
import { MACRO_KEY_ALIASES } from "./macroAliases.js";
import { detectMedicalSecrecyLeaks, sanitizeMedicalSecrecy } from "./secrecyDetector.js";
import { resolveContextVariables } from "./templateContextResolver.js";
import type { RenderTemplateOptions, RenderTemplateResult } from "./types.js";

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

export async function renderTemplate(organizationId: string, options: RenderTemplateOptions): Promise<RenderTemplateResult> {
	let rawText = options.templateText ?? "";
	let channel = options.channel ?? "telegram";

	if (options.templateId) {
		const [existing] = await db.select().from(messageTemplateCatalogs)
			.where(and(eq(messageTemplateCatalogs.id, options.templateId), eq(messageTemplateCatalogs.organizationId, organizationId)))
			.limit(1);
		if (existing) {
			rawText = existing.templateText;
			channel = options.channel || existing.channel;
		}
	}

	if (!rawText.trim()) {
		return {
			ok: false, renderedText: "", channel, characterCount: 0,
			usedMacros: [], missingMacros: [], hasMedicalSecrecyViolation: false,
			detectedMedicalTerms: [], error: "Текст шаблона не передан или шаблон не найден",
			problems: ["Текст шаблона не передан или шаблон не найден"],
		};
	}

	const dbContext = await resolveContextVariables(organizationId, options.patientId, options.appointmentId, options.visitId);
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
	let rendered = rawText.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
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
	});

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

	const channelLimits = checkChannelLimits(channel, rendered);
	const problems = [...channelLimits.problems];
	if (missingMacros.length > 0 && !options.allowPreviewFallback) {
		problems.push(`Не заполнены обязательные макросы: ${missingMacros.map((m) => `{${m}}`).join(", ")}`);
	}
	if (error) problems.push(error);

	const smsDetails = channel === "sms" ? calculateSmsSegments(rendered) : undefined;
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
