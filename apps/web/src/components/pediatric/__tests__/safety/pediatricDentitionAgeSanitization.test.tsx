import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";

describe("Tooth & Dentition Sanitization by Patient Age", () => {
	it("auto-sanitizes adult tooth 16 to deciduous tooth 54 for toddlers (< 6 years)", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 16, patientAgeYears: 4,
		}));
		assert.ok(html.includes("Зуб 54") || html.includes("54"), "Sanitized to tooth 54");
		assert.ok(!html.includes("Зуб 16"), "Must NOT treat 16 as primary active tooth");
	});

	it("allows adult first permanent molars (16, 26, 36, 46) for mixed dentition (age >= 6)", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 16, patientAgeYears: 8,
		}));
		assert.ok(html.includes("16"), "Supports 16 in mixed dentition at age 8");
	});
});
