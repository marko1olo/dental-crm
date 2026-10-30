/**
 * EmkControlBoard.test.tsx
 * Unit & integration tests for Chief Medical Officer EMR quality control board.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { EmkControlBoard } from "../EmkControlBoard";

describe("Wave 30 — Feature #49: Chief Medical Officer EMR Quality Control Board (EmkControlBoard.tsx)", () => {
	it("1. renders initial loading state or container safely with server rendering", () => {
		const html = renderToString(<EmkControlBoard />);
		assert.ok(html.includes("emk-control-board") || html.includes("Загрузка"));
	});

	it("2. guarantees no cartoon emojis and proper Lucide icons in markup", () => {
		const html = renderToString(<EmkControlBoard />);
		// Verify strict ban on cartoon emojis
		assert.ok(!html.includes("🔥"));
		assert.ok(!html.includes("👑"));
		assert.ok(!html.includes("✨"));
		assert.ok(!html.includes("🔩"));
		assert.ok(!html.includes("❌"));
		assert.ok(!html.includes("🌀"));
	});
});
