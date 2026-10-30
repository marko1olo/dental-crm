import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { FranklBehaviorBadge, getFranklVectorIcon } from "../../FranklBehaviorBadge";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";
import { PediatricTeethChart } from "../../PediatricTeethChart";
import { PediatricSomaticAndLegalRep } from "../../PediatricSomaticAndLegalRep";
import { PediatricParentMemoModal } from "../../PediatricParentMemoModal";
import { FRANKL_SCALE_DEFINITIONS, type FranklRating } from "../../../odontogram/pediatricDentitionEngine";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Frankl Behavioral Scale & Vector Icons (Zero Emojis)", () => {
	it("provides full clinical specifications for Frankl ratings 1..4 without emojis", () => {
		for (const r of [1, 2, 3, 4] as FranklRating[]) {
			const def = FRANKL_SCALE_DEFINITIONS[r];
			assert.ok(def, `Rating ${r} must exist`);
			assert.strictEqual(def.emoji, "", `Rating ${r} emoji must be empty`);
			assert.ok(def.nameRu.includes("Поведение по Франклу"));
			assert.ok(def.managementStrategiesRu.length >= 3);
		}
	});

	it("getFranklVectorIcon returns valid Lucide components for all ratings", () => {
		for (const r of [1, 2, 3, 4] as FranklRating[]) {
			const IconComponent = getFranklVectorIcon(r);
			assert.ok(typeof IconComponent === "object" || typeof IconComponent === "function");
			const rendered = renderToString(createElement(IconComponent, { className: "w-4 h-4" }));
			assert.ok(rendered.includes("<svg"));
			assert.ok(!EMOJI_REGEX.test(rendered));
		}
	});

	it("renders FranklBehaviorBadge compact toolbar per Hick's Law with zero emojis", () => {
		const html = renderToString(createElement(FranklBehaviorBadge, { rating: 3, toolbar: true, onChange: () => {} }));
		assert.ok(html.includes('data-testid="frankl-compact-toolbar"'));
		for (const r of [1, 2, 3, 4]) {
			assert.ok(html.includes(`data-testid="frankl-toolbar-btn-${r}"`));
		}
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("renders 1-click positive behavior button in full card mode", () => {
		const html = renderToString(createElement(FranklBehaviorBadge, { rating: 2, readOnly: false, onChange: () => {} }));
		assert.ok(html.includes('data-testid="frankl-one-click-btn"'));
		assert.ok(html.includes("1-клик: Поведение позитивное (Frankl 4/4)"));
		assert.ok(!EMOJI_REGEX.test(html));
	});
});

describe("Zero Cartoon Emojis Mandate Across Pediatric Components", () => {
	it("proves 0 emojis across VisitPediatricProtocolWidget", () => {
		const html = renderToString(createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }));
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("proves 0 emojis across PediatricTeethChart", () => {
		const html = renderToString(createElement(PediatricTeethChart, { mode: "mixed", activeTooth: 16 }));
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("proves 0 emojis across FranklBehaviorBadge", () => {
		const html = renderToString(createElement(FranklBehaviorBadge, { rating: 4, showStrategies: true }));
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("proves 0 emojis across PediatricSomaticAndLegalRep", () => {
		const html = renderToString(createElement(PediatricSomaticAndLegalRep, {}));
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("proves 0 emojis across PediatricParentMemoModal", () => {
		const html = renderToString(createElement(PediatricParentMemoModal, { isOpen: true, onClose: () => {} }));
		assert.ok(!EMOJI_REGEX.test(html));
	});
});
