import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileSelfCheckinModal } from "../MobileSelfCheckinModal";

describe("MobileSelfCheckinModal Component & 1-Touch Checkin Flow", () => {
	it("renders 1-Touch Checkin screen with 4 digits input and instant ticket button without mandatory 3-signature maze", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialPhone: "+7 (913) 770-41-99",
				patientName: "Смирнова Анна Викторовна",
				doctorName: "Д-р Воронова Е. С.",
				appointmentTime: "Сегодня в 14:30",
			}),
		);

		// Modal and Header
		assert.ok(html.includes("selfcheckin-modal-window"), "Renders modal window");
		assert.ok(html.includes("Смирнова Анна Викторовна"), "Renders patient name");
		assert.ok(html.includes("Д-р Воронова Е. С."), "Renders doctor name");
		assert.ok(html.includes("Сегодня в 14:30"), "Renders appointment time");

		// 1-Touch Checkin controls
		assert.ok(
			html.includes("one-touch-phone-input"),
			"Renders 4-digit phone confirmation input",
		);
		assert.ok(
			html.includes("one-touch-checkin-btn"),
			"Renders prominent 1-touch checkin button",
		);
		assert.ok(
			html.includes("Я в клинике — Получить талон"),
			"Button text matches 'Я в клинике — Получить талон'",
		);
		assert.ok(
			html.includes("qr-checkin-btn"),
			"Renders QR ticket checkin option",
		);

		// Must NOT block with 3 mandatory canvas signatures or mandatory 15 questions on arrival
		assert.equal(
			html.includes("signature-canvas"),
			false,
			"Does not display mandatory signature canvas on arrival",
		);
		assert.ok(
			html.includes("Нормативные документы"),
			"Contains optional collapsible documents accordion",
		);
	});
});
