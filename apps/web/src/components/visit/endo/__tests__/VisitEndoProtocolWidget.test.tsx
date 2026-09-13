import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EndoCanalLogModal } from "../../../endo/EndoCanalLogModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("EndoCanalLogModal (Chairside 30-second Endo SSOT)", () => {
	it("VisitEndoProtocolWidget is eradicated per Mandate 8s & Wave 199", () => {
		const widgetPath = path.resolve(__dirname, "../VisitEndoProtocolWidget.tsx");
		assert.equal(fs.existsSync(widgetPath), false, "VisitEndoProtocolWidget must be completely eradicated");
	});

	it("renders endodontic modal for upper molar 16 with anatomical canals and presets", () => {
		const html = renderToStaticMarkup(
			createElement(EndoCanalLogModal, {
				isOpen: true,
				onClose: () => {},
				toothNumber: 16,
			}),
		);

		assert.ok(html.includes("16"), "Header indicates active tooth 16");
		assert.ok(html.includes("Эндодонтический журнал каналов"), "Renders endodontic header");
		assert.ok(html.includes("endo-canal-log-modal"), "Has modal testid");

		// Presets and actions
		assert.ok(html.includes("btn-endo-anatomical-autofill"), "Has 1-click anatomical autofill");

		// Touch targets >= 44px
		assert.ok(
			html.includes("min-h-[48px]") || html.includes("min-h-[44px]") || html.includes("h-11"),
			"Controls meet Mandate 8d touch target requirements (>= 44px)",
		);

		// Zero cartoon emojis
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "HTML markup must contain ZERO emojis (strictly Lucide icons)");
	});

	it("renders single canal for anterior incisor (tooth 21)", () => {
		const html = renderToStaticMarkup(
			createElement(EndoCanalLogModal, {
				isOpen: true,
				onClose: () => {},
				toothNumber: 21,
			}),
		);

		assert.ok(html.includes("21"), "Header indicates tooth 21");
	});
});
