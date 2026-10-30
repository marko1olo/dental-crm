import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";
import { PediatricTeethChart } from "../../PediatricTeethChart";
import { FranklBehaviorBadge } from "../../FranklBehaviorBadge";
import { PediatricSomaticAndLegalRep } from "../../PediatricSomaticAndLegalRep";
import { PediatricParentMemoModal } from "../../PediatricParentMemoModal";

describe("Doctor Autonomy & Chairside Ergonomics (Mandate 8e: Zero Disabled Buttons)", () => {
	it("guarantees ZERO disabled buttons across all pediatric components in all states", () => {
		const components = [
			createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }),
			createElement(PediatricTeethChart, { mode: "primary", activeTooth: 54 }),
			createElement(PediatricTeethChart, { mode: "mixed", activeTooth: 16 }),
			createElement(FranklBehaviorBadge, { rating: 1, toolbar: true }),
			createElement(FranklBehaviorBadge, { rating: 4, readOnly: false }),
			createElement(PediatricSomaticAndLegalRep, {}),
			createElement(PediatricParentMemoModal, { isOpen: true, onClose: () => {} }),
		];
		for (const comp of components) {
			const html = renderToString(comp);
			assert.ok(!html.includes("disabled"), `Component ${comp.type} must NOT have disabled buttons`);
		}
	});

	it("renders active tooth quick finding buttons (Healthy, Caries, Filled, Endo, Watch, Crown, Extracted)", () => {
		const html = renderToString(createElement(PediatricTeethChart, {
			mode: "primary", activeTooth: 54, onToothFindingChange: () => {},
		}));
		assert.ok(html.includes('data-testid="active-tooth-findings-group"'));
		for (const f of ["Healthy", "Caries", "Filled", "EndoTreated", "Watch", "Crown", "Extracted"]) {
			assert.ok(html.includes(`data-testid="active-tooth-finding-${f}"`));
		}
	});

	it("renders 1-click presets in PediatricTeethChart (All Healthy & Mixed Dentition)", () => {
		const html = renderToString(createElement(PediatricTeethChart, {
			mode: "primary", activeTooth: 54, onSetAllHealthy: () => {}, onApplyMixedDentitionPreset: () => {},
		}));
		assert.ok(html.includes('data-testid="pediatric-all-healthy-btn"'));
		assert.ok(html.includes('data-testid="pediatric-mixed-preset-btn"'));
	});

	it("renders 1-click chairside adaptation and norm buttons in VisitPediatricProtocolWidget", () => {
		const html = renderToString(createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }));
		assert.ok(html.includes('data-testid="pediatric-one-click-adaptation-btn"'));
		assert.ok(html.includes('data-testid="pediatric-one-click-norm-btn"'));
	});
});

describe("Anti-Matryoshka Law & Theme Tokens Hygiene", () => {
	it("ensures PediatricParentMemoModal renders as single cohesive overlay with zero nested modals", () => {
		const html = renderToString(createElement(PediatricParentMemoModal, {
			isOpen: true, onClose: () => {}, patientName: "Миша Смирнов", patientAgeYears: 5,
		}));
		const overlayMatches = html.match(/fixed inset-0/g) || [];
		assert.strictEqual(overlayMatches.length, 1, "Must have exactly 1 fullscreen backdrop (depth <= 1)");
		assert.ok(html.includes("Печать памятки"));
		assert.ok(html.includes("Скопировать текст"));
		assert.ok(html.includes("WhatsApp"));
		assert.ok(html.includes("Telegram"));
	});

	it("renders Frankl rating buttons with vector icons inside parent memo modal", () => {
		const html = renderToString(createElement(PediatricParentMemoModal, {
			isOpen: true, onClose: () => {}, initialFrankl: 3,
		}));
		for (const r of [1, 2, 3, 4]) {
			assert.ok(html.includes(`data-testid="memo-frankl-btn-${r}"`));
		}
	});

	it("verifies components reference design tokens instead of raw hardcoded colors", () => {
		const html = renderToString(createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }));
		assert.ok(html.includes("var(--paper"));
		assert.ok(html.includes("var(--ink"));
		assert.ok(html.includes("var(--line"));
	});
});
