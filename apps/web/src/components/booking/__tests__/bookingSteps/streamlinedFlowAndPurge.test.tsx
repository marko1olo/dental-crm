import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	DEFAULT_BRANCHES,
	DEFAULT_DOCTORS,
	DEFAULT_SERVICE_CATEGORIES,
	PublicOnlineBookingWidget,
} from "../../PublicOnlineBookingWidget";

describe("Booking Steps: Streamlined 1-Screen 2-Click UX & Mocks Purge (Mandates 8e, 8k)", () => {
	it("renders streamlined 1-screen booking flow with Click 1 and Click 2", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, { initialStep: 1 }),
		);

		assert.ok(html.includes("Онлайн-запись в клинику DENTE"));
		assert.ok(html.includes("Стоматологический центр DENTE"));
		assert.ok(html.includes("dbw-streamlined-flow"));
		assert.ok(html.includes("Выберите дату и время приёма"));
		assert.ok(html.includes("dbw-calendar-container"));
		assert.ok(html.includes("Ваши контактные данные"));
		assert.ok(html.includes("patient-name-input"));
		assert.ok(html.includes("patient-phone-input"));
		assert.ok(html.includes("Записаться на приём"));
		assert.ok(html.includes('data-testid="step4-confirm-btn"'));
	});

	it("strictly purges hardcoded Samara mock arrays per Mandates 8a & 8k (Zero Mocks)", () => {
		assert.equal(DEFAULT_BRANCHES.length, 0);
		assert.equal(DEFAULT_DOCTORS.length, 0);
		assert.equal(DEFAULT_SERVICE_CATEGORIES.length, 0);

		const html = renderToStaticMarkup(createElement(PublicOnlineBookingWidget, {}));
		assert.equal(html.includes("г. Самара"), false);
		assert.equal(html.includes("Филиал «Центральный»"), false);
		assert.equal(html.includes("Филиал «На Московском»"), false);
		assert.equal(html.includes("Д-р Смирнова Елена Владимировна"), false);
	});
});
