/**
 * Communications, WhatsApp Kapso & Recall Cascade Mining Unit Tests
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	buildWhatsappInteractiveButtons,
	buildWhatsappInteractiveList,
	buildWhatsappNamedParameters,
	buildWhatsappTemplatePayload,
	calculateNextRecallDueMonth,
	channelCascadeConfigSchema,
	evaluateCascadeStepAdvance,
	kapsoSettingsResponseSchema,
	kapsoSettingsUpdateSchema,
	kapsoTemplateMapRequestSchema,
	kapsoTemplateResponseSchema,
	kapsoTestRequestSchema,
	normalizeDueMonthString,
	planCascadeDispatchSchedule,
	recallAttemptSchema,
	recallCreateSchema,
	recallSnoozeSchema,
	recallUpdateSchema,
	renderRecallReminderTemplate,
	whatsappDeliveryStatusSchema,
	whatsappInboundMessageSchema,
	whatsappInteractiveButtonMessageSchema,
	whatsappInteractiveListMessageSchema,
} from "../communications/index.js";

describe("Communications & WhatsApp Kapso Contracts", () => {
	it("validates kapso settings update schema", () => {
		const validUpdate = kapsoSettingsUpdateSchema.parse({
			apiKey: "mock_kapso_api_key_sample",
			phoneNumberId: "10492837492837",
			businessAccountId: "293847293847",
			webhookSecret: "super_secret_verify",
			displayPhoneNumber: "+7 (916) 123-45-67",
			isActive: true,
		});

		assert.equal(validUpdate.apiKey, "mock_kapso_api_key_sample");
		assert.equal(validUpdate.isActive, true);
	});

	it("validates kapso settings response schema", () => {
		const response = kapsoSettingsResponseSchema.parse({
			phoneNumberId: "10492837492837",
			businessAccountId: "293847293847",
			displayPhoneNumber: "+7 (916) 123-45-67",
			hasApiKey: true,
			hasWebhookSecret: true,
			isActive: true,
			isVerified: true,
			lastVerifiedAt: "2026-08-27T00:00:00.000Z",
			lastTemplateSyncAt: "2026-08-27T01:00:00.000Z",
		});

		assert.equal(response.hasApiKey, true);
		assert.equal(response.isVerified, true);
	});

	it("validates template response and map request schemas", () => {
		const tpl = kapsoTemplateResponseSchema.parse({
			name: "appointment_reminder_ru",
			language: "ru",
			status: "APPROVED",
			category: "UTILITY",
		});
		assert.equal(tpl.status, "APPROVED");

		const mapReq = kapsoTemplateMapRequestSchema.parse({
			notificationType: "appointment_reminder",
			locale: "ru",
			templateName: "appointment_reminder_ru",
		});
		assert.equal(mapReq.notificationType, "appointment_reminder");

		const testReq = kapsoTestRequestSchema.parse({
			toNumber: "+79161234567",
			templateName: "appointment_reminder_ru",
		});
		assert.equal(testReq.language, "ru");
	});

	it("builds named parameters for Meta WABA template payloads", () => {
		const context = {
			patient_name: "Ольга Смирнова",
			appointment_date: "10 сентября 2026",
			appointment_time: "15:00",
			locale: "ru",
			password: "secret_value",
		};

		const params = buildWhatsappNamedParameters(context);
		assert.equal(params.length, 3);
		assert.deepEqual(
			params.map((p) => p.parameter_name),
			["patient_name", "appointment_date", "appointment_time"],
		);
	});

	it("builds valid Meta Cloud API template payload", () => {
		const params = buildWhatsappNamedParameters({ patient_name: "Иван" });
		const payload = buildWhatsappTemplatePayload("+79169998877", "appointment_confirmation", "ru", params);

		assert.equal(payload.messaging_product, "whatsapp");
		assert.equal(payload.to, "+79169998877");
		assert.equal(payload.type, "template");
		assert.equal(payload.template.name, "appointment_confirmation");
		assert.equal(payload.template.language.code, "ru");
		assert.equal(payload.template.components.length, 1);
	});

	it("builds and validates interactive button message", () => {
		const buttons = [
			{ id: "BTN_CONFIRM", title: "Подтверждаю" },
			{ id: "BTN_CANCEL", title: "Отмена" },
		];

		const msg = buildWhatsappInteractiveButtons(
			"+79161234567",
			"Подтвердите ваш визит в клинику ДЕНТЕ:",
			buttons,
			"Напоминание о приёме",
			"Клиника ДЕНТЕ",
		);

		const validated = whatsappInteractiveButtonMessageSchema.parse(msg);
		assert.equal(validated.interactive.type, "button");
		assert.equal(validated.interactive.action.buttons.length, 2);
		assert.equal(validated.interactive.action.buttons[0]?.reply.id, "BTN_CONFIRM");
		assert.equal(validated.interactive.header?.text, "Напоминание о приёме");
	});

	it("builds and validates interactive list message", () => {
		const sections = [
			{
				title: "Услуги",
				rows: [
					{ id: "SRV_HYGIENE", title: "Профгигиена", description: "Чистка Air-Flow + УЗ" },
					{ id: "SRV_CONSULT", title: "Консультация", description: "Осмотр и план лечения" },
				],
			},
		];

		const listMsg = buildWhatsappInteractiveList(
			"+79161234567",
			"Выберите интересующую услугу:",
			"Выбрать услугу",
			sections,
		);

		const validated = whatsappInteractiveListMessageSchema.parse(listMsg);
		assert.equal(validated.interactive.type, "list");
		assert.equal(validated.interactive.action.sections[0]?.rows.length, 2);
	});

	it("validates delivery status and inbound message webhook payloads", () => {
		const delivery = whatsappDeliveryStatusSchema.parse({
			id: "wamid.HBgLM...",
			status: "delivered",
			timestamp: "1724716800",
			recipient_id: "79161234567",
		});
		assert.equal(delivery.status, "delivered");

		const inboundText = whatsappInboundMessageSchema.parse({
			from: "79161234567",
			id: "wamid.inbound.1",
			timestamp: 1724716850,
			type: "text",
			text: { body: "Да, буду вовремя" },
		});
		assert.equal(inboundText.text?.body, "Да, буду вовремя");

		const inboundButton = whatsappInboundMessageSchema.parse({
			from: "79161234567",
			id: "wamid.inbound.2",
			timestamp: 1724716890,
			type: "interactive",
			interactive: {
				type: "button_reply",
				button_reply: { id: "BTN_CONFIRM", title: "Подтверждаю" },
			},
		});
		assert.equal(inboundButton.interactive?.button_reply?.id, "BTN_CONFIRM");
	});
});

describe("Recall Cascade & Multi-Channel Reminder Automation", () => {
	it("normalizes due month strings to YYYY-MM-01", () => {
		const date = new Date("2026-08-15T10:00:00Z");
		assert.equal(normalizeDueMonthString(date), "2026-08-01");
	});

	it("calculates accurate medical recall intervals", () => {
		const baseDate = new Date("2026-03-10T12:00:00Z");

		// Hygiene -> 6 months -> 2026-09-01
		assert.equal(calculateNextRecallDueMonth(baseDate, "hygiene"), "2026-09-01");
		// Checkup -> 12 months -> 2027-03-01
		assert.equal(calculateNextRecallDueMonth(baseDate, "checkup"), "2027-03-01");
		// Surgery -> 1 month -> 2026-04-01
		assert.equal(calculateNextRecallDueMonth(baseDate, "surgery"), "2026-04-01");
		// Treatment followup -> 3 months -> 2026-06-01
		assert.equal(calculateNextRecallDueMonth(baseDate, "treatment_followup"), "2026-06-01");
	});

	it("interpolates template variables in {var} and {{var}} formats", () => {
		const template1 = "Здравствуйте, {patient_name}! Ждём вас на приём к врачу {doctor_name}. Запись: {booking_link}";
		const context = {
			patient_name: "Екатерина",
			doctor_name: "д-р Иванов",
			booking_link: "https://dente.clinic/b/123",
		};

		const res1 = renderRecallReminderTemplate(template1, context);
		assert.equal(
			res1,
			"Здравствуйте, Екатерина! Ждём вас на приём к врачу д-р Иванов. Запись: https://dente.clinic/b/123",
		);

		const template2 = "Уважаемый {{patient_name}}, напоминаем о профосмотре за {{due_month}} в {{clinic_name}}.";
		const res2 = renderRecallReminderTemplate(template2, {
			patient_name: "Аркадий",
			due_month: "сентябрь 2026",
			clinic_name: "ДЕНТЕ",
		});
		assert.equal(res2, "Уважаемый Аркадий, напоминаем о профосмотре за сентябрь 2026 в ДЕНТЕ.");
	});

	it("validates recall CRUD and snooze schemas", () => {
		const created = recallCreateSchema.parse({
			patientId: "00000000-0000-0000-0000-000000000001",
			dueMonth: "2026-09-01",
			reason: "hygiene",
			priority: "high",
		});
		assert.equal(created.reason, "hygiene");
		assert.equal(created.priority, "high");

		const updated = recallUpdateSchema.parse({
			reasonNote: "Пациент просил напомнить во второй половине дня",
		});
		assert.equal(updated.reasonNote, "Пациент просил напомнить во второй половине дня");

		const snoozed = recallSnoozeSchema.parse({
			months: 3,
			reasonNote: "В отъезде до ноября",
		});
		assert.equal(snoozed.months, 3);

		const attempt = recallAttemptSchema.parse({
			channel: "whatsapp",
			outcome: "scheduled",
			linkedAppointmentId: "00000000-0000-0000-0000-000000000002",
		});
		assert.equal(attempt.outcome, "scheduled");
	});

	it("plans multi-channel cascade timeline with delay accumulation", () => {
		const config = channelCascadeConfigSchema.parse({
			organizationId: "00000000-0000-0000-0000-000000000001",
			name: "Стандартный каскад профосмотра",
			steps: [
				{ stepNumber: 1, channel: "whatsapp", delayHoursAfterPrevious: 0, templateKey: "recall_whatsapp" },
				{ stepNumber: 2, channel: "sms", delayHoursAfterPrevious: 48, templateKey: "recall_sms" },
				{ stepNumber: 3, channel: "call_task", delayHoursAfterPrevious: 24, templateKey: "admin_call" },
			],
		});

		const baseDate = new Date("2026-08-27T10:00:00.000Z");
		const plan = planCascadeDispatchSchedule(config, baseDate);

		assert.equal(plan.length, 3);
		// Step 1: 0h delay
		assert.equal(plan[0]?.scheduledAt, "2026-08-27T10:00:00.000Z");
		assert.equal(plan[0]?.channel, "whatsapp");

		// Step 2: +48h delay
		assert.equal(plan[1]?.scheduledAt, "2026-08-29T10:00:00.000Z");
		assert.equal(plan[1]?.channel, "sms");

		// Step 3: +48h + 24h = +72h delay
		assert.equal(plan[2]?.scheduledAt, "2026-08-30T10:00:00.000Z");
		assert.equal(plan[2]?.channel, "call_task");
	});

	it("evaluates cascade advance vs termination accurately", () => {
		// Successful booking -> stop cascade
		const scheduled = evaluateCascadeStepAdvance("scheduled");
		assert.equal(scheduled.shouldContinue, false);
		assert.equal(scheduled.finalStatus, "contacted_scheduled");

		// Declined -> stop cascade
		const declined = evaluateCascadeStepAdvance("declined");
		assert.equal(declined.shouldContinue, false);
		assert.equal(declined.finalStatus, "contacted_declined");

		// Wrong number -> stop cascade, flag needs_review
		const wrong = evaluateCascadeStepAdvance("wrong_number");
		assert.equal(wrong.shouldContinue, false);
		assert.equal(wrong.finalStatus, "needs_review");

		// No answer -> escalate to next channel
		const noAnswer = evaluateCascadeStepAdvance("no_answer");
		assert.equal(noAnswer.shouldContinue, true);
		assert.equal(noAnswer.finalStatus, "contacted_no_answer");
	});
});
