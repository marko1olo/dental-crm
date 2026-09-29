import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	DEFAULT_BILLBOARD_QUEUE_ITEMS,
	QueueBillboardItem,
	QueueBillboardView,
} from "../QueueBillboardView";

describe("QueueBillboardView Component & Waiting Room TV Display HUD", () => {
	it("renders TV Queue Billboard HUD with atmospheric artwork and default queue items", () => {
		const html = renderToStaticMarkup(
			createElement(QueueBillboardView, { items: DEFAULT_BILLBOARD_QUEUE_ITEMS }),
		);

		// Main container
		assert.ok(
			html.includes("queue-billboard-container"),
			"Renders main billboard container",
		);
		assert.ok(
			html.includes('data-testid="queue-billboard-view"'),
			"Contains queue-billboard-view testid",
		);

		// Atmospheric artwork background (nature pack)
		assert.ok(
			html.includes("auth-art-background"),
			"Renders atmospheric auth-art background in lobby TV display",
		);

		// Top Header HUD
		assert.ok(
			html.includes("queue-billboard-header"),
			"Renders top header HUD",
		);
		assert.ok(
			html.includes("Стоматологическая клиника ДЕНТЕ"),
			"Renders default clinic name",
		);
		assert.ok(
			html.includes("Электронная очередь холла ожидания"),
			"Renders default clinic subtitle",
		);
		assert.ok(
			html.includes("queue-billboard-clock-time"),
			"Renders digital clock HUD",
		);

		// Main Grid with split columns
		assert.ok(
			html.includes("queue-billboard-grid"),
			"Renders split columns grid",
		);
		assert.ok(
			html.includes("Приглашаются в кабинет"),
			"Renders invited/in-chair column header",
		);
		assert.ok(
			html.includes("Ожидают вызова"),
			"Renders waiting in lobby column header",
		);

		// High-contrast ticket cards
		assert.ok(
			html.includes("Талон № А-07"),
			"Renders active invited ticket А-07",
		);
		assert.ok(
			html.includes("Кабинет 3"),
			"Renders cabinet destination Кабинет 3",
		);
		assert.ok(
			html.includes("Д-р Воронова Е. С."),
			"Renders attending doctor name",
		);
		assert.ok(
			html.includes("Талон № В-04"),
			"Renders in-chair ticket В-04",
		);

		// Waiting tickets
		assert.ok(
			html.includes("Талон № А-12"),
			"Renders waiting ticket А-12",
		);

		// Bottom Announcement Ticker
		assert.ok(
			html.includes("queue-billboard-ticker"),
			"Renders bottom announcement ticker",
		);
		assert.ok(
			html.includes("Пожалуйста, сохраняйте тишину"),
			"Renders ticker announcement text",
		);
		assert.ok(
			html.includes("DENTE TV Billboard System"),
			"Renders system badge",
		);
	});

	it("renders custom clinic name, announcement text, and custom items", () => {
		const customItems: readonly QueueBillboardItem[] = [
			{
				id: "custom-1",
				ticketNumber: "К-99",
				patientInitials: "Ольга В.",
				doctorName: "Д-р Кузнецова Т. М.",
				doctorSpecialty: "Ортопед-гнатолог",
				cabinetName: "Кабинет 5",
				status: "invited",
				timeInfo: "Пройдите в кабинет",
			},
			{
				id: "custom-2",
				ticketNumber: "К-100",
				patientInitials: "Сергей Н.",
				doctorName: "Д-р Смирнов А. В.",
				doctorSpecialty: "Хирург-имплантолог",
				cabinetName: "Кабинет 1",
				status: "waiting",
				timeInfo: "~10 мин",
				estimatedWaitMinutes: 10,
			},
		];

		const html = renderToStaticMarkup(
			createElement(QueueBillboardView, {
				clinicName: "ДЕНТЕ ПРЕМИУМ КЛИНИКА",
				clinicSubtitle: "Табло ожидания VIP-холла",
				announcementText: "Внимание: работает кабинет рентгенодиагностики №4.",
				items: customItems,
			}),
		);

		assert.ok(
			html.includes("ДЕНТЕ ПРЕМИУМ КЛИНИКА"),
			"Renders custom clinic name",
		);
		assert.ok(
			html.includes("Табло ожидания VIP-холла"),
			"Renders custom subtitle",
		);
		assert.ok(
			html.includes("Талон № К-99"),
			"Renders custom ticket number К-99",
		);
		assert.ok(
			html.includes("Ольга В."),
			"Renders patient initials for privacy",
		);
		assert.ok(
			html.includes("Кабинет 5"),
			"Renders custom cabinet 5",
		);
		assert.ok(
			html.includes("Ортопед-гнатолог"),
			"Renders specialty",
		);
		assert.ok(
			html.includes("Талон № К-100"),
			"Renders custom waiting ticket",
		);
		assert.ok(
			html.includes("Внимание: работает кабинет рентгенодиагностики №4."),
			"Renders custom announcement text",
		);
	});

	it("adheres strictly to Zero Cartoon Emoji Mandate (Mandate 8d pt 7)", () => {
		const html = renderToStaticMarkup(createElement(QueueBillboardView));

		// Check for forbidden emoji characters in rendered HTML
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const containsEmoji = emojiRegex.test(html);
		assert.equal(
			containsEmoji,
			false,
			"QueueBillboardView must strictly contain zero cartoon emojis",
		);
	});

	it("verifies CSS design token compliance and responsive styling", async () => {
		const { readFileSync } = await import("node:fs");
		const { fileURLToPath } = await import("node:url");

		const cssPath = fileURLToPath(new URL("../QueueBillboardView.css", import.meta.url));
		const cssContent = readFileSync(cssPath, "utf-8");

		// Token usage
		assert.ok(
			cssContent.includes("var(--paper-strong"),
			"Uses var(--paper-strong) for cards and header HUD",
		);
		assert.ok(
			cssContent.includes("var(--ink"),
			"Uses var(--ink) for high-contrast typography",
		);
		assert.ok(
			cssContent.includes("var(--line"),
			"Uses var(--line) for borders",
		);
		assert.ok(
			cssContent.includes("var(--teal"),
			"Uses var(--teal) for primary clinical accent",
		);

		// TV Large Typography check (readability from 3-5 meters)
		assert.ok(
			cssContent.includes("font-size: 2.75rem;") || cssContent.includes("font-size: 2."),
			"Includes extra-large typography for ticket numbers",
		);
		assert.ok(
			cssContent.includes("font-size: 1.75rem;") || cssContent.includes("font-size: 1."),
			"Includes large typography for cabinet destination badges",
		);

		// Media query check for smaller or tablet displays
		assert.ok(
			cssContent.includes("@media (max-width: 900px)"),
			"Includes responsive breakpoint for tablet displays",
		);
	});

	it("renders honest empty billboard state in production when queue is empty", () => {
		const html = renderToStaticMarkup(createElement(QueueBillboardView, { items: [] }));
		assert.ok(html.includes("Очередь приёма пуста. Ожидайте вызова врача на приём"));
		assert.ok(html.includes("Кабинеты готовятся к приёму"));
	});
});
