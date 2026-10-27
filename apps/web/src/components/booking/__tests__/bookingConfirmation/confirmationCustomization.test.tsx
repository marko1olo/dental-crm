import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingConfirmationView } from "../../BookingConfirmationView";
import { mockConfirmationData } from "./mockConfirmationData";

describe("BookingConfirmationView: Theme & Backdrop Customization", () => {
	it("supports custom art packs (nature, abstract) and disabling backdrop", () => {
		const htmlWithout = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				showArtBackdrop: false,
			}),
		);
		assert.equal(htmlWithout.includes("dbw-confirmation-art-wrapper"), false);

		const htmlWithNature = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				artPack: "nature",
				showArtBackdrop: true,
			}),
		);
		assert.ok(htmlWithNature.includes("dbw-confirmation-art-wrapper"));
	});

	it("supports multi-theme overrides (light, dark, night, calm_teal, contrast)", () => {
		for (const theme of ["light", "dark", "night", "calm_teal", "contrast"] as const) {
			const html = renderToStaticMarkup(
				createElement(BookingConfirmationView, {
					confirmationData: mockConfirmationData,
					theme,
				}),
			);
			assert.ok(html.includes(`data-theme="${theme}"`));
		}
	});

	it("renders re-book button when onReset callback is provided", () => {
		const htmlWithReset = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				onReset: () => {},
			}),
		);
		assert.ok(htmlWithReset.includes("Записаться ещё раз"));

		const htmlWithoutReset = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
			}),
		);
		assert.equal(htmlWithoutReset.includes("Записаться ещё раз"), false);
	});
});
