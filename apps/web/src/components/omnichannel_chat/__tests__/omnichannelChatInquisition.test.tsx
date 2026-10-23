import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { OmnichannelChatView } from "../OmnichannelChatView";
import { OMNICHANNEL_TEMPLATES, applyTemplateVariables } from "../omnichannelChatTemplates";

/**
 * Omnichannel Chat Inquisitor Suite (Apple HIG & Mandates 8e, 8n).
 *
 * Zero-Mocks Invariant: серверный рендер без сети обязан показывать ЧЕСТНЫЙ
 * пустой стейт. Никаких захардкоженных «демо-диалогов» с вымышленными
 * пациентами — список наполняется только живыми данными из /api/bots/inbox
 * (PostgreSQL: messengerInboundEvents + communicationEvents).
 */
describe("Omnichannel Chat Inquisitor Suite (Apple HIG & Mandates 8e, 8n)", () => {
	it("1. OmnichannelChatView renders channel filter bar and conversations list", () => {
		const html = renderToString(<OmnichannelChatView />);

		assert.ok(html.includes("data-testid=\"omnichannel-chat-root\""), "Omnichannel chat root must render");
		assert.ok(html.includes("data-testid=\"channel-filter-all\""), "Filter for all channels must render");
		assert.ok(html.includes("data-testid=\"channel-filter-whatsapp\""), "WhatsApp filter must render");
		assert.ok(html.includes("data-testid=\"channel-filter-telegram\""), "Telegram filter must render");
		assert.ok(html.includes("data-testid=\"channel-filter-sms\""), "SMS filter must render");
		assert.ok(html.includes("data-testid=\"channel-filter-vk\""), "VK filter must render");
		assert.ok(html.includes("data-testid=\"channel-filter-max\""), "MAX filter must render");
		assert.ok(html.includes("data-testid=\"omnichannel-conversations-list\""), "Conversations list must render");
	});

	it("2. Without backend data the view shows an honest empty state, no hardcoded fake dialogs", () => {
		const html = renderToString(<OmnichannelChatView />);

		assert.ok(html.includes("Загрузка диалогов"), "Loading state must be honest about fetching from the database");
		// Реэдтикт-детектор: фейковые «демо-пациенты» из снесённого omnichannelChatDefaults
		// не имеют права вернуться в код под видом стартовых данных.
		assert.ok(!html.includes("Смирнова Екатерина Васильевна"), "Hardcoded fake patient name is forbidden");
		assert.ok(!html.includes("PAT-001"), "Hardcoded fake patient id is forbidden");
		assert.ok(!html.includes("Здравствуйте! Подскажите, пожалуйста, стоимость приёма?"), "Hardcoded fake phrase is forbidden");
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

	it("4. Conversation list search input renders and loading state is honest", () => {
		const html = renderToString(<OmnichannelChatView />);

		assert.ok(html.includes("data-testid=\"conversations-search-input\""), "Search input must render");
		assert.ok(html.includes("Загрузка диалогов"), "List must show honest loading state before data arrives");
		assert.ok(!html.includes("Диалоги не найдены"), "Old fabricated fallback text must not return");
	});
});
