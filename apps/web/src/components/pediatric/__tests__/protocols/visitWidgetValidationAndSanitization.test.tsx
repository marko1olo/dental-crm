import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitPediatricProtocolWidget, isValidFdiTooth } from "../../VisitPediatricProtocolWidget";
import { FranklBehaviorBadge } from "../../FranklBehaviorBadge";

describe("VisitPediatricProtocolWidget Validation & Sanitization", () => {
	it("renders 1-click adaptation visit button in top header (Mandate 8e, 8k)", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 54, initialFranklRating: 3,
		}));
		assert.ok(html.includes("1-клик Адаптация") || html.includes("Адаптация"));
		assert.ok(html.includes("pediatric-one-click-adaptation-btn"));
		assert.ok(html.includes("pediatric-one-click-norm-btn"));
	});

	it("renders FranklBehaviorBadge in compact toolbar mode per Hick's Law (32-36px)", () => {
		const html = renderToStaticMarkup(createElement(FranklBehaviorBadge, { rating: 3, toolbar: true }));
		assert.ok(html.includes("frankl-compact-toolbar"));
		assert.ok(html.includes("Франкл:"));
		assert.ok(html.includes("frankl-toolbar-btn-1") && html.includes("frankl-toolbar-btn-2"));
		assert.ok(html.includes("frankl-toolbar-btn-3") && html.includes("frankl-toolbar-btn-4"));
	});

	it("verifies isValidFdiTooth rejects invalid FDI tooth numbers (Defect 5)", () => {
		assert.strictEqual(isValidFdiTooth(11), true);
		assert.strictEqual(isValidFdiTooth(18), true);
		assert.strictEqual(isValidFdiTooth(46), true);
		assert.strictEqual(isValidFdiTooth(51), true);
		assert.strictEqual(isValidFdiTooth(55), true);
		assert.strictEqual(isValidFdiTooth(74), true);
		assert.strictEqual(isValidFdiTooth(85), true);

		// Invalid deciduous numbers
		assert.strictEqual(isValidFdiTooth(56), false);
		assert.strictEqual(isValidFdiTooth(58), false);
		assert.strictEqual(isValidFdiTooth(60), false);
		assert.strictEqual(isValidFdiTooth(66), false);
		assert.strictEqual(isValidFdiTooth(70), false);
		assert.strictEqual(isValidFdiTooth(76), false);
		assert.strictEqual(isValidFdiTooth(80), false);
		assert.strictEqual(isValidFdiTooth(19), false);
		assert.strictEqual(isValidFdiTooth(20), false);
		assert.strictEqual(isValidFdiTooth(99), false);
		assert.strictEqual(isValidFdiTooth(0), false);
	});

	it("sanitizes invalid tooth numbers to default 54 without throwing (Defect 5)", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 58 as any, initialFranklRating: 3,
		}));
		assert.ok(html.includes("Зуб 54"));
		assert.ok(html.includes("Верхний правый первый моляр"));
	});

	it("auto-substitutes legal representative and somatic norm into clinical note preview", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 54, initialFranklRating: 3,
			representativeFullName: "Иванова Анна Сергеевна",
			representativePhone: "+7 (999) 123-45-67",
			representativeRole: "Мать",
		}));
		assert.ok(html.includes("Законный представитель"));
		assert.ok(html.includes("Иванова Анна Сергеевна"));
		assert.ok(html.includes("родитель / опекун") || html.includes("Законный представитель"));
		assert.ok(html.includes("pediatric-teeth-chart"));
		assert.ok(html.includes("pediatric-somatic-legal-rep"));
	});
});
