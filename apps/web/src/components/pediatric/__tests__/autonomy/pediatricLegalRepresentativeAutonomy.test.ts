import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";
import { PediatricSomaticAndLegalRep, DEFAULT_LEGAL_REPRESENTATIVE } from "../../PediatricSomaticAndLegalRep";

describe("Legal Representative Verification (Clean Russian & Doctor Autonomy)", () => {
	it("provides clean human basis in default state without raw statutory numbers", () => {
		assert.ok(DEFAULT_LEGAL_REPRESENTATIVE.statutoryDocument.includes("Законный представитель"));
		assert.ok(DEFAULT_LEGAL_REPRESENTATIVE.role === "Мать");
	});

	it("renders non-blocking warning banner when consent is unsigned in PediatricSomaticAndLegalRep", () => {
		const html = renderToString(createElement(PediatricSomaticAndLegalRep, {
			initialRepresentative: { fullName: "Петрова Елена Викторовна", role: "Мать", consentSigned: false },
		}));
		assert.ok(html.includes('data-testid="rep-consent-warning-banner"'));
		assert.ok(html.includes("Требуется согласие родителя на медицинское вмешательство"));
		assert.ok(html.includes('data-testid="btn-one-click-sign-consent"'));
		assert.ok(!html.includes("disabled"));
	});

	it("renders non-blocking alert banner in VisitPediatricProtocolWidget when consent unsigned", () => {
		const html = renderToString(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 54, initialFranklRating: 3,
		}));
		// By default, consentSigned is true, so no alert banner is shown
		assert.ok(!html.includes('data-testid="pediatric-323fz-alert-banner"'));
	});
});
