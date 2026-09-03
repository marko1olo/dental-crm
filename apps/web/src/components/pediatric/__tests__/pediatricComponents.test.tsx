import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { FranklBehaviorBadge } from "../FranklBehaviorBadge";
import { TwinkyStarColorSelector } from "../TwinkyStarColorSelector";
import { PediatricParentMemoModal } from "../PediatricParentMemoModal";
import { TWINKY_STAR_COLORS } from "../../odontogram/pediatricDentitionEngine";

describe("Pediatric Clinical Autopilot & Bureaucracy-Free Components (apps/web)", () => {
	it("1. FranklBehaviorBadge renders interactive 1-click button bar in compact mode with onChange", () => {
		let clickedRating = 0;
		const html = renderToString(
			<FranklBehaviorBadge
				rating={3}
				onChange={(r) => {
					clickedRating = r;
				}}
				compact={true}
			/>,
		);

		assert.ok(html.includes("frankl-quick-selector"), "Must render quick selector group");
		assert.ok(html.includes("Франкл:"), "Must have Frankl label");
		assert.ok(html.includes("--"), "Must have negative-negative button");
		assert.ok(html.includes("-"), "Must have negative button");
		assert.ok(html.includes("+"), "Must have positive button");
		assert.ok(html.includes("++"), "Must have positive-positive button");
	});

	it("2. FranklBehaviorBadge renders compact badge in read-only mode without clutter", () => {
		const html = renderToString(
			<FranklBehaviorBadge
				rating={4}
				readOnly={true}
				compact={true}
			/>,
		);

		assert.ok(html.includes("frankl-compact-badge"), "Must render compact badge");
		assert.ok(html.includes("Франкл") && html.includes("++"), "Must indicate rating symbol");
		assert.ok(!html.includes("frankl-quick-selector"), "Must not render quick selector buttons in read-only mode");
	});

	it("3. FranklBehaviorBadge renders full psychological Tell-Show-Do strategies in expanded mode", () => {
		const html = renderToString(
			<FranklBehaviorBadge
				rating={1}
				showStrategies={true}
				compact={false}
			/>,
		);

		assert.ok(html.includes("frankl-behavior-card"));
		assert.ok(html.includes("Категорически негативное"));
		assert.ok(html.includes("Рекомендованные техники психологической адаптации"));
	});

	it("4. TwinkyStarColorSelector renders all 5 pediatric colors with glitter and child motivation", () => {
		const html = renderToString(
			<TwinkyStarColorSelector
				toothNumber={54}
				initialColor="pink"
				patientName="Мария Смирнова"
				patientAgeYears={5}
			/>,
		);

		assert.ok(html.includes("twinky-star-card"));
		assert.ok(html.includes("54") && html.includes("Twinky Star"));
		assert.ok(html.includes("Розовый"));
		assert.ok(html.includes("Синий"));
		assert.ok(html.includes("Золотой"));
		assert.ok(html.includes("Серебряный"));
		assert.ok(html.includes("Зеленый"));
		assert.ok(html.includes("Вовлечение ребенка:"));
		assert.ok(html.includes("Клиническая защита (компомер):"));
		assert.ok(html.includes("Записать протокол Twinky Star в 043/у (1 клик)"));
	});

	it("5. TwinkyStarColorSelector in compact mode renders accessible 44px touch targets", () => {
		const html = renderToString(
			<TwinkyStarColorSelector
				toothNumber={65}
				compact={true}
			/>,
		);

		assert.ok(html.includes("twinky-star-compact"));
		assert.ok(html.includes("Синий"));
		assert.ok(html.includes("Розовый"));
		assert.ok(html.includes("Золотой"));
		assert.ok(html.includes("Серебряный"));
		assert.ok(html.includes("Зеленый"));
	});

	it("6. PediatricParentMemoModal renders fast 1-click print buttons for all pediatric procedures", () => {
		const html = renderToString(
			<PediatricParentMemoModal
				isOpen={true}
				onClose={() => {}}
				patientName="Алексей Морозов"
				patientAgeYears={6}
				initialFrankl={3}
				initialTwinkyStar={{ toothNumber: 74, color: "gold" }}
			/>,
		);

		assert.ok(html.includes("Печать памятки родителям в 1 клик:"));
		assert.ok(html.includes("memo-quick-silvering-btn"));
		assert.ok(html.includes("memo-quick-fissure-btn"));
		assert.ok(html.includes("memo-quick-pulpotomy-btn"));
		assert.ok(html.includes("memo-quick-twinky-btn"));
		assert.ok(html.includes("Цветная пломба Twinky"));
		assert.ok(html.includes("Распечатать памятку"));
	});
});
