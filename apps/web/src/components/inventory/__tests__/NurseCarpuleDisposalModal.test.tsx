/**
 * NurseCarpuleDisposalModal.test.tsx
 * DENTE Dental CRM — Unit tests for NurseCarpuleDisposalModal (React layer)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { NurseCarpuleDisposalModal } from "../NurseCarpuleDisposalModal";

describe("NurseCarpuleDisposalModal", () => {
	it("1. NurseCarpuleDisposalModal renders 1-click disposal dialog for doctor/admin with SanPiN 3.3686-21", () => {
		const html = renderToString(
			<NurseCarpuleDisposalModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Modal title and SanPiN 1-click clearance
		assert.ok(html.includes("1-клик пакеты: Учет карпул"), "Modal title must be rendered");
		assert.ok(html.includes("СанПиН 3.3686-21 Быстрая утилизация врачом/админом (без комиссии из 3 человек)"), "Fast disposal SanPiN text must be rendered");

		// 1-click clinical writeoff packet button
		assert.ok(html.includes('data-testid="btn-writeoff-anesthesia-packet"'), "Standard anesthesia packet button must exist");

		// Single signer affirmation
		assert.ok(html.includes("Списание в 1 клик (СанПиН 3.3686-21):"), "Single signer affirmation must be displayed");
	});

	it("2. NurseCarpuleDisposalModal renders nothing when isOpen is false", () => {
		const html = renderToString(
			<NurseCarpuleDisposalModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);
		assert.equal(html, "");
	});
});
