import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ClinicalProtocolsCatalogModal } from "../ClinicalProtocolsCatalogModal.js";

describe("ClinicalProtocolsCatalogModal - SSR & markup integrity", () => {
	it("renders null when isOpen is false", () => {
		const html = renderToString(
			<ClinicalProtocolsCatalogModal
				isOpen={false}
				onClose={() => {}}
				onApplyPatch={() => {}}
			/>,
		);
		assert.equal(html, "");
	});

	it("renders full catalog modal with 1 142 protocol badge and categories when isOpen is true", () => {
		const html = renderToString(
			<ClinicalProtocolsCatalogModal
				isOpen={true}
				onClose={() => {}}
				onApplyPatch={() => {}}
				activeTooth={16}
			/>,
		);

		// Must render the modal container
		assert.ok(html.includes("clinical-protocols-catalog-modal"));
		assert.ok(html.includes("Каталог клинических протоколов"));
		assert.ok(html.includes("1 142 протокола"));
		assert.ok(html.includes("Зуб 16"));

		// Must render specialty category tabs
		assert.ok(html.includes("Терапия"));
		assert.ok(html.includes("Хирургия"));
		assert.ok(html.includes("Ортопедия"));
		assert.ok(html.includes("Детство"));

		// Must have 0 cartoon emojis (Mandate 8d)
		assert.ok(!html.includes("🎉"));
		assert.ok(!html.includes("🚀"));
		assert.ok(!html.includes("🦷"));
		assert.ok(!html.includes("💡"));

		// Must have no 043/у text (Mandate 8y)
		assert.ok(!html.includes("043/у"));
		assert.ok(!html.includes("043у"));
	});
});
