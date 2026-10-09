import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { MessageTemplateEngine } from "../../services/communications/MessageTemplateEngine.js";
import {
	checkChannelFit,
	communicationTemplateVariables,
	renderTemplate,
	validateTemplateBody,
} from "../../services/communications/templateRenderer.js";
import {
	insertTemplate,
	saveSettingsRow,
	updateTemplateRow,
	upsertPatientConsents,
} from "./outboxDispatcher.js";
import {
	fetchActiveReminderTemplate,
	fetchPatientConsents,
	fetchSettings,
	fetchTemplateById,
	fetchTemplateList,
	findPatientById,
} from "./outboxQueries.js";
import {
	consentUpdateSchema,
	previewSchema,
	settingsSchema,
	templateCreateSchema,
	templateUpdateSchema,
	validationError,
} from "./types.js";

export async function registerTemplateAndSettingsRoutes(app: FastifyInstance) {
	// ─── Справочник переменных ────────────────────────────────────────────────

	app.get("/api/communications/variables", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication variables",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;
		return { variables: communicationTemplateVariables };
	});

	// ─── Шаблоны ──────────────────────────────────────────────────────────────

	app.get("/api/communications/templates", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication templates",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const templates = await fetchTemplateList(context.organizationId);
		return { templates };
	});

	app.post("/api/communications/templates", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication template create",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsed = templateCreateSchema.safeParse(request.body);
		if (!parsed.success) {
			return validationError(reply, [
				"Проверьте название, канал, назначение и текст шаблона.",
			]);
		}

		const validation = validateTemplateBody(parsed.data.body, {
			allowPhi: parsed.data.allowPhi,
		});
		if (!validation.ok) return validationError(reply, validation.problems);

		if (!parsed.data.allowPhi) {
			const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(
				parsed.data.body,
			);
			if (secrecy.hasLeak) {
				return reply.code(422).send({
					error: "MedicalSecrecyViolation",
					message: `Шаблон не может содержать сведения о здоровье, диагнозах или зубах (152-ФЗ / 323-ФЗ ст. 13): ${secrecy.reasons.join("; ")}`,
					detectedTerms: secrecy.detectedTerms,
				});
			}
		}

		const fit = checkChannelFit(parsed.data.channel, parsed.data.body);
		if (!fit.ok) return validationError(reply, fit.problems);

		const created = await insertTemplate({
			organizationId: context.organizationId,
			clinicId: parsed.data.clinicId ?? null,
			title: parsed.data.title,
			channel: parsed.data.channel,
			intent: parsed.data.intent,
			audienceRole: parsed.data.audienceRole,
			body: parsed.data.body,
			variables: validation.variables,
			isActive: parsed.data.isActive,
		});

		return reply.code(201).send({ template: created, sms: fit.sms });
	});

	app.patch(
		"/api/communications/templates/:templateId",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"communication template update",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
			)
				return;

			const templateId = (request.params as { templateId?: string }).templateId;
			if (!templateId) return validationError(reply, ["Не указан шаблон."]);

			const parsed = templateUpdateSchema.safeParse(request.body);
			if (!parsed.success)
				return validationError(reply, ["Проверьте изменяемые поля шаблона."]);

			const existing = await fetchTemplateById(
				context.organizationId,
				templateId,
			);
			if (!existing) {
				return reply.code(404).send({
					error: "TemplateNotFound",
					message: "Шаблон не найден в этой клинике.",
				});
			}

			const nextBody = parsed.data.body ?? existing.body;
			const nextChannel = parsed.data.channel ?? existing.channel;
			const validation = validateTemplateBody(nextBody, {
				allowPhi: parsed.data.allowPhi,
			});
			if (!validation.ok) return validationError(reply, validation.problems);

			if (!parsed.data.allowPhi) {
				const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(nextBody);
				if (secrecy.hasLeak) {
					return reply.code(422).send({
						error: "MedicalSecrecyViolation",
						message: `Шаблон не может содержать сведения о здоровье, диагнозах или зубах (152-ФЗ / 323-ФЗ ст. 13): ${secrecy.reasons.join("; ")}`,
						detectedTerms: secrecy.detectedTerms,
					});
				}
			}

			const fit = checkChannelFit(nextChannel, nextBody);
			if (!fit.ok) return validationError(reply, fit.problems);

			const updated = await updateTemplateRow({
				organizationId: context.organizationId,
				templateId,
				title: parsed.data.title ?? existing.title,
				channel: nextChannel,
				intent: parsed.data.intent ?? existing.intent,
				audienceRole: parsed.data.audienceRole ?? existing.audienceRole,
				body: nextBody,
				variables: validation.variables,
				isActive: parsed.data.isActive ?? existing.isActive,
				clinicId:
					parsed.data.clinicId === undefined
						? existing.clinicId
						: parsed.data.clinicId,
			});

			if (!updated) {
				return reply.code(404).send({
					error: "TemplateNotFound",
					message: "Шаблон не найден в этой клинике.",
				});
			}

			return { template: updated, sms: fit.sms };
		},
	);

	app.post("/api/communications/templates/preview", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication template preview",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const parsed = previewSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, [
				"Проверьте текст шаблона и значения переменных.",
			]);

		if (parsed.data.allowPhi) {
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user
					?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.phi.preview",
					role: staffRole,
					message: `Отказ в предпросмотре медицинских сведений (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}
		}

		const rendered = renderTemplate(parsed.data.body, parsed.data.values, {
			allowPhi: parsed.data.allowPhi,
			allowEmptyValues: true,
		});
		if (!rendered.ok) {
			return reply.code(400).send({
				error: "TemplateRenderError",
				message: rendered.problems.join(" "),
				problems: rendered.problems,
				unknownVariables: rendered.unknownVariables,
			});
		}

		const fit = checkChannelFit(parsed.data.channel, rendered.text);
		return {
			text: rendered.text,
			usedVariables: rendered.usedVariables,
			channel: parsed.data.channel,
			fits: fit.ok,
			problems: fit.problems,
			length: fit.length,
			limit: fit.limit,
			sms: fit.sms,
		};
	});

	// ─── Настройки рассылки ───────────────────────────────────────────────────

	app.get("/api/communications/settings", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication settings",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;
		return {
			settings: await fetchSettings(context.organizationId),
		};
	});

	app.put("/api/communications/settings", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication settings update",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsed = settingsSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, ["Проверьте значения настроек рассылки."]);

		const current = await fetchSettings(context.organizationId);
		const next = {
			timezone: parsed.data.timezone ?? current.timezone,
			quietHoursStartMinute:
				parsed.data.quietHoursStartMinute ?? current.quietHoursStartMinute,
			quietHoursEndMinute:
				parsed.data.quietHoursEndMinute ?? current.quietHoursEndMinute,
			deferServiceInQuietHours:
				parsed.data.deferServiceInQuietHours ??
				current.deferServiceInQuietHours,
			blockMarketingInQuietHours:
				parsed.data.blockMarketingInQuietHours ??
				current.blockMarketingInQuietHours,
			dailyLimitPerPatient:
				parsed.data.dailyLimitPerPatient ?? current.dailyLimitPerPatient,
			maxAttempts: parsed.data.maxAttempts ?? current.maxAttempts,
			retryBaseSeconds:
				parsed.data.retryBaseSeconds ?? current.retryBaseSeconds,
			retryMaxSeconds: parsed.data.retryMaxSeconds ?? current.retryMaxSeconds,
			channelFallbackJson: JSON.stringify(
				parsed.data.channelFallback ?? current.channelFallback,
			),
			appointmentReminderEnabled:
				parsed.data.appointmentReminderEnabled ??
				current.appointmentReminderEnabled,
			appointmentReminderLeadHoursJson: JSON.stringify(
				parsed.data.appointmentReminderLeadHours ??
					current.appointmentReminderLeadHours,
			),
			appointmentReminderWindowMinutes:
				parsed.data.appointmentReminderWindowMinutes ??
				current.appointmentReminderWindowMinutes,
		};

		if (next.retryMaxSeconds < next.retryBaseSeconds) {
			return validationError(reply, [
				"Потолок паузы между попытками меньше её начального значения.",
			]);
		}

		if (
			next.appointmentReminderEnabled &&
			!current.appointmentReminderEnabled
		) {
			const reminderTemplate = await fetchActiveReminderTemplate(
				context.organizationId,
			);
			if (!reminderTemplate) {
				return validationError(reply, [
					"Нет активного шаблона с назначением «Подтверждение приёма» — напоминания отправлять нечем.",
					"Создайте шаблон для нужного канала и включите напоминания снова.",
				]);
			}
		}

		await saveSettingsRow(context.organizationId, next);

		return {
			settings: await fetchSettings(context.organizationId),
		};
	});

	// ─── Согласия пациента ────────────────────────────────────────────────────

	app.get("/api/communications/consents/:patientId", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication consents",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const patientId = (request.params as { patientId?: string }).patientId;
		if (!patientId) return validationError(reply, ["Не указан пациент."]);

		const rows = await fetchPatientConsents(context.organizationId, patientId);

		return {
			patientId,
			defaults: { service: "granted", marketing: "revoked" },
			consents: rows.map((row) => ({
				channel: row.channel,
				scope: row.scope,
				state: row.state,
				source: row.source,
				evidence: row.evidence,
				decidedAt: row.decidedAt,
			})),
		};
	});

	app.put("/api/communications/consents/:patientId", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication consents update",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const patientId = (request.params as { patientId?: string }).patientId;
		if (!patientId) return validationError(reply, ["Не указан пациент."]);

		const parsed = consentUpdateSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, ["Проверьте список согласий."]);

		const patient = await findPatientById(context.organizationId, patientId);
		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		const updatedCount = await upsertPatientConsents({
			organizationId: context.organizationId,
			patientId,
			entries: parsed.data.entries,
		});

		return { ok: true, updated: updatedCount };
	});
}
