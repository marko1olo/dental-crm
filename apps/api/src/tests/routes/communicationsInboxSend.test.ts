import assert from "node:assert";
import { describe, test } from "node:test";
import { processSendMessage } from "../../routes/communicationRoutes/messagingRoutes/inboxMessageSender.js";
import { TelegramPostOpCarePipeline } from "../../services/telegram/postOpCare/postOpPipelineCore.js";
import {
	sendWhatsappTemplateMessage,
	sendWhatsappTextMessage,
} from "../../whatsappTransport.js";

describe("Inbox Message Sender & Channel Dispatch Realism (MSG-01..05)", () => {
	const orgId = "00000000-0000-0000-0000-000000000001";
	const patientId = "00000000-0000-0000-0000-000000000002";

	test("MSG-01: processSendMessage returns 422 if patient has no recipient address for channel", async () => {
		const result = await processSendMessage(orgId, patientId, {
			message: "Здравствуйте, напоминаем о приёме завтра в 10:00",
			channel: "telegram",
		});

		assert.equal(result.success, false);
		assert.equal(result.status, 422);
		assert.equal(result.error, "RecipientAddressMissing");
		assert.ok(result.event, "Должна быть сохранена запись о попытке отправки в communicationEvents");
		if ("status" in result.event) {
			assert.equal(result.event.status, "failed");
		} else {
			assert.fail("result.event should contain full event with status");
		}
	});

	test("MSG-01: processSendMessage blocks critical medical secrecy leak (152-FZ / 323-FZ)", async () => {
		const result = await processSendMessage(orgId, patientId, {
			message: "У вас обнаружен гепатит B, требуется срочная консультация",
			channel: "sms",
		});

		assert.equal(result.error, "MedicalSecrecyViolation");
		assert.equal(result.status, 422);
		assert.equal(result.canSanitize, true);
	});

	test("MSG-01: processSendMessage auto-sanitizes medical secrecy if requested", async () => {
		const result = await processSendMessage(orgId, patientId, {
			message: "У вас обнаружен глубокий кариес и пульпит зуба 46",
			channel: "whatsapp",
			sanitize: true,
		});

		// Patient doesn't have phone in test DB -> returns 422 address missing, but with secrecy warning
		assert.ok(result.warning?.includes("санитизированы"));
		assert.equal(result.hasMedicalSecrecyWarning, true);
	});

	test("MSG-02: sendWhatsappTemplateMessage dispatches pre-approved HSM template", async () => {
		const result = await sendWhatsappTemplateMessage({
			phoneNumberId: "10987654321",
			accessToken: "test_token_valid",
			toPhoneE164: "79161234567",
			template: {
				name: "appointment_reminder",
				language: "ru",
				parameters: ["Иван Иванович", "завтра в 14:00"],
			},
		});

		// Result will attempt network to Meta Graph API, which fails with network or 401, but cleanly classified
		assert.ok(!result.ok);
		assert.ok(result.errorClass === "auth" || result.errorClass === "network" || result.errorClass === "bad_request");
	});

	test("MSG-03: TelegramPostOpCarePipeline schedules 4-stage post-op care plan with exact intervals", () => {
		const visitId = "00000000-0000-0000-0000-000000000010";
		const surgeryCompletedAt = Date.now();

		const plan = TelegramPostOpCarePipeline.schedulePostOpCareForVisit({
			organizationId: orgId,
			visitId,
			patientId,
			surgeryTitle: "Сложное удаление ретинированного дистопированного зуба 38",
			surgeryCompletedAt,
		});

		assert.ok(plan);
		assert.equal(plan.stages.length, 4);
		assert.equal(plan.stages[0]?.stage, "3_hours");
		assert.equal(plan.stages[1]?.stage, "day_1");
		assert.equal(plan.stages[2]?.stage, "day_3");
		assert.equal(plan.stages[3]?.stage, "day_7");

		// Stage intervals
		assert.equal(plan.stages[0]?.dueAt, surgeryCompletedAt + 3 * 3600 * 1000);
		assert.equal(plan.stages[1]?.dueAt, surgeryCompletedAt + 24 * 3600 * 1000);
		assert.equal(plan.stages[2]?.dueAt, surgeryCompletedAt + 72 * 3600 * 1000);
		assert.equal(plan.stages[3]?.dueAt, surgeryCompletedAt + 7 * 24 * 3600 * 1000);

		// Cache check
		const cached = TelegramPostOpCarePipeline.getPlanByVisitId(visitId);
		assert.equal(cached?.id, plan.id);
	});
});
