import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientOmnichannelHubModal } from "../PatientOmnichannelHubModal.js";

describe("PatientOmnichannelHubModal Component Suite", () => {
	it("returns null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(PatientOmnichannelHubModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});

	it("renders main modal with header, channel status pills, tabs, and unified chat interface", () => {
		const html = renderToStaticMarkup(
			createElement(PatientOmnichannelHubModal, {
				isOpen: true,
				onClose: () => {},
				initialPatientId: "pat-101",
				clinicName: "DENTE Dental Clinic",
			}),
		);

		// Заголовок и статусы каналов
		assert.ok(
			html.includes("Омниканальный центр сообщений и лояльности"),
			"Contains title",
		);
		assert.ok(html.includes("WhatsApp:"), "Contains WhatsApp channel status");
		assert.ok(html.includes("Подключено"), "WhatsApp status connected");
		assert.ok(html.includes("Telegram:"), "Contains Telegram status");
		assert.ok(html.includes("@DenteClinicBot"), "Contains bot handle");
		assert.ok(html.includes("NPS:"), "Contains NPS score badge in header");

		// Навигационные табы
		assert.ok(html.includes("Диалог с пациентом"), "Contains Chat tab");
		assert.ok(html.includes("Клинические шаблоны"), "Contains Templates tab");
		assert.ok(html.includes("Дашборд NPS и отзывов"), "Contains NPS Dashboard tab");

		// Сайдбар пациентов
		assert.ok(html.includes("Смирнов Алексей Викторович"), "Contains patient 101");
		assert.ok(html.includes("Волкова Мария Сергеевна"), "Contains patient 102");
		assert.ok(html.includes("Барабаш Сергей Владимирович"), "Contains patient 103");

		// Лента сообщений активного диалога
		assert.ok(html.includes("Напоминаем о вашем визите в клинику"), "Contains visit reminder bubble");
		assert.ok(html.includes("Подтверждаю"), "Contains interactive confirmation button");
		assert.ok(html.includes("Да, подтверждаю визит"), "Contains patient reply");

		// Поле ввода и действия
		assert.ok(html.includes("Выставить счет СБП"), "Contains 1-click SBP invoice button");
		assert.ok(html.includes("Отправить"), "Contains send button");
		assert.ok(html.includes("Канал:"), "Contains channel selector label");
	});
});
