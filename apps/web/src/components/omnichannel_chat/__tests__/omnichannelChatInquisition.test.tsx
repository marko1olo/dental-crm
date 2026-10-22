import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { OmnichannelChatView } from "../OmnichannelChatView";
import { OMNICHANNEL_TEMPLATES, applyTemplateVariables } from "../omnichannelChatTemplates";

describe("Omnichannel Chat Inquisitor Suite (Apple HIG & Mandates 8e, 8n)", () => {
	it("1. OmnichannelChatView renders channel filter bar and conversations list", () => {
		const html = renderToString(<OmnichannelChatView />);

		assert.ok(html.includes("data-testid=\"omnichannel-chat-root\""), "Omnichannel chat root must render");
		assert.ok(html.includes("data-testid=\"channel-filter-all\""), "Filter for all channels must render");
		assert.ok(html.includes("data-testid=\"channel-filter-whatsapp\""), "WhatsApp filter must render");
		assert.ok(html.includes("data-testid=\"channel-filter-telegram\""), "Telegram filter must render");
		assert.ok(html.includes("data-testid=\"channel-filter-sms\""), "SMS filter must render");
		assert.ok(html.includes("data-testid=\"omnichannel-conversations-list\""), "Conversations list must render");
	});

	it("2. Active chat pane provides 1-click clinical actions (Mandate 8e & 8n)", () => {
		const html = renderToString(<OmnichannelChatView />);

		assert.ok(html.includes("data-testid=\"chat-action-open-card\""), "Chat must provide open patient card button");
		assert.ok(html.includes("data-testid=\"chat-action-quick-book\""), "Chat must provide quick booking button");
		assert.ok(html.includes("data-testid=\"chat-send-message-btn\""), "Send message button must be present");
		assert.ok(html.includes("data-testid=\"chat-attachment-btn\""), "Attachment button must be present");

		// Buttons are not disabled
		assert.ok(!html.includes("chat-action-open-card\" disabled"), "Card button must not be disabled");
		assert.ok(!html.includes("chat-action-quick-book\" disabled"), "Booking button must not be disabled");
	});

	it("3. Clinical reminder templates include 'Приём завтра в 14:00' and variable interpolation", () => {
		const tomorrowTemplate = OMNICHANNEL_TEMPLATES.find((t) => t.id === "reminder_tomorrow");
		assert.ok(tomorrowTemplate, "Reminder tomorrow template must exist");
		assert.ok(tomorrowTemplate.text.includes("14:00"), "Template text must mention 14:00");

		const interpolated = applyTemplateVariables(tomorrowTemplate.text, {
			name: "Анна Сергеевна",
		});
		assert.ok(interpolated.includes("Анна Сергеевна"), "Interpolation must inject patient name");
		assert.ok(interpolated.includes("14:00"), "Interpolation must retain time");
	});

	it("4. OmnichannelChatView renders quick templates pills", () => {
		const html = renderToString(<OmnichannelChatView />);

		assert.ok(html.includes("quick-template-reminder_tomorrow"), "Tomorrow reminder pill must render");
		assert.ok(html.includes("quick-template-post_op_care"), "Post-op care pill must render");
		assert.ok(html.includes("quick-template-payment_receipt"), "Payment receipt pill must render");
	});
});
