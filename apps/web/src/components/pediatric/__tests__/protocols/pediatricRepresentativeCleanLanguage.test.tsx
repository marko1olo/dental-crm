import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	PediatricSomaticAndLegalRep,
	formatPediatricRepresentativeText,
} from "../../PediatricSomaticAndLegalRep";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";

describe("Pediatric Representative Clean Language & Protocol Formatting", () => {
	it("renders clean doctor-facing labels in PediatricSomaticAndLegalRep without bird language", () => {
		const html = renderToStaticMarkup(
			createElement(PediatricSomaticAndLegalRep, {
				initialRepresentative: {
					fullName: "Анна Смирнова",
					phone: "+7 (999) 123-45-67",
					role: "Мать",
					consentSigned: true,
				},
			}),
		);
		assert.ok(html.includes("Родитель / Законный представитель"));
		assert.ok(html.includes("Родитель на приёме (норма)"));
		assert.ok(html.includes("Согласие на приём оформлено"));
		assert.ok(html.includes("Законный представитель ребёнка"));
	});

	it("formats representative protocol line in clean human Russian", () => {
		const text = formatPediatricRepresentativeText({
			fullName: "Анна",
			phone: "+7 (999) 123-45-67",
			role: "Мать",
			statutoryDocument: "",
			consentSigned: true,
		});
		assert.strictEqual(
			text,
			"Родитель: Мама (Анна, +7 (999) 123-45-67). Согласие на лечение получено.",
		);

		const widgetHtml = renderToStaticMarkup(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 54,
				initialFranklRating: 3,
				initialShowDetails: true,
			}),
		);
		assert.ok(widgetHtml.includes("Родитель:"));
	});
});
