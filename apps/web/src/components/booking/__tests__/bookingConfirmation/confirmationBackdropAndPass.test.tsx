import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingConfirmationView } from "../../BookingConfirmationView";
import { mockConfirmationData } from "./mockConfirmationData";

describe("BookingConfirmationView: Ambient Art Backdrop & Floating Pass", () => {
	it("renders ambient art backdrop with soft scrim filter by default", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				showArtBackdrop: true,
				artPack: "abstract",
			}),
		);

		assert.ok(html.includes("dbw-confirmation-view-container"));
		assert.ok(html.includes("dbw-confirmation-art-wrapper"));
		assert.ok(html.includes("dbw-confirmation-scrim"));
	});

	it("renders floating Dental Boarding Pass with elevated card classes", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				isFloating: true,
			}),
		);

		assert.ok(html.includes("dbw-boarding-pass"));
		assert.ok(html.includes("dbw-floating-pass"));
		assert.ok(html.includes("Dental Boarding Pass"));
		assert.ok(html.includes("Подтверждено"));
		assert.ok(html.includes("dbw-pass-perforation"));
	});

	it("renders exact ticket reference and details without data loss", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
			}),
		);

		assert.ok(html.includes("DNT-7788-9900"));
		assert.ok(html.includes("Д-р Смирнова Анна Павловна"));
		assert.ok(html.includes("Кабинет №5 (Хирургическое отделение)"));
		assert.ok(html.includes("DENTE Центр — г. Москва, ул. Тверская, д. 12"));
		assert.ok(html.includes("Алексей Смирнов"));
		assert.ok(html.includes("+7 (999) 111-22-33"));
		assert.ok(html.includes("14:30"));
	});
});
