import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { MessageTemplate } from "@dental/shared";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { PublicBookingLinkPanel } from "../PublicBookingLinkPanel";
import { ReminderCadenceConfigPanel } from "../ReminderCadenceConfigPanel";
import { SettingsMessageTemplatesTab } from "../SettingsMessageTemplatesTab";
import { MessageTemplatePhonePreview } from "../templates/MessageTemplatePhonePreview";

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

const MOCK_APP_LOGIC = {
	auth: {
		denteClinicalReadHeaders: () => ({}),
		denteClinicalMutationHeaders: () => ({}),
	},
	dashboard: {
		clinicSettings: {
			profile: {
				organizationId: "00000000-0000-4000-8000-000000000001",
				clinicName: "Клиника ДЕНТЕ",
			},
		},
	},
};

const SAMPLE_TEMPLATE: MessageTemplate = {
	id: "tpl-1",
	organizationId: "00000000-0000-4000-8000-000000000001",
	channel: "whatsapp",
	scenario: "appointment_reminder_24h",
	title: "Напоминание за 24 часа",
	templateText: "Здравствуйте, {patient_name}! Ждём вас у врача {doctor_name} в {appointment_time}.",
	isActive: true,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

test("Message Templates & Messengers Runtime Render & Zero Cartoon Emoji Inquisition", async (t) => {
	const templatesHtml = renderToString(
		React.createElement(
			AppLogicProvider,
			{ value: MOCK_APP_LOGIC as never },
			React.createElement(SettingsMessageTemplatesTab),
		),
	);
	const previewHtml = renderToString(
		React.createElement(MessageTemplatePhonePreview, { template: SAMPLE_TEMPLATE }),
	);
	const cadenceHtml = renderToString(React.createElement(ReminderCadenceConfigPanel));
	const bookingHtml = renderToString(
		React.createElement(
			AppLogicProvider,
			{ value: MOCK_APP_LOGIC as never },
			React.createElement(PublicBookingLinkPanel),
		),
	);

	await t.test("1. SettingsMessageTemplatesTab renders editor layout cleanly", () => {
		assert.ok(templatesHtml.includes('data-testid="settings-message-templates-tab"'));
		assert.ok(templatesHtml.includes("Шаблоны сообщений"));
	});

	await t.test("2. SettingsMessageTemplatesTab rendered markup contains 0 raw cartoon emojis", () => {
		assert.equal(EMOJI_REGEX.test(templatesHtml), false);
	});

	await t.test("3. SettingsMessageTemplatesTab renders 0 emoji bars or emoji pickers", () => {
		assert.equal(templatesHtml.includes("emoji-bar"), false);
	});

	await t.test("4. MessageTemplatePhonePreview & tab render vector Lucide SVG icons", () => {
		assert.ok(templatesHtml.includes("<svg"));
		assert.ok(previewHtml.includes("<svg"));
		assert.ok(previewHtml.includes("Анна Сергеевна"));
		assert.ok(previewHtml.includes("Д-р Воронов А.В."));
	});

	await t.test("5. MessageTemplatePhonePreview rendered markup contains 0 raw cartoon emojis", () => {
		assert.equal(EMOJI_REGEX.test(previewHtml), false);
	});

	await t.test("6. SettingsMessageTemplatesTab renders macro placeholders {patient_name}, {doctor_name}, {time}, {clinic_address}", () => {
		assert.ok(templatesHtml.includes("{patient_name}"));
		assert.ok(templatesHtml.includes("{doctor_name}"));
		assert.ok(templatesHtml.includes("{time}"));
		assert.ok(templatesHtml.includes("{clinic_address}"));
	});

	await t.test("7. ReminderCadenceConfigPanel and PublicBookingLinkPanel render cleanly with 0 cartoon emojis", () => {
		assert.ok(cadenceHtml.length > 0);
		assert.ok(bookingHtml.includes('data-testid="public-booking-panel"'));
		assert.equal(EMOJI_REGEX.test(cadenceHtml), false);
		assert.equal(EMOJI_REGEX.test(bookingHtml), false);
	});
});
