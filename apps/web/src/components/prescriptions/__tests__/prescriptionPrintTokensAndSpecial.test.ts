/**
 * prescriptionPrintTokensAndSpecial.test.ts
 *
 * Red Team Inquisition: CSS Tokens, Dark Mode Theme Hygiene & Special Outpatient Prescriptions.
 * Extracted from prescriptionPrintAutonomyInquisition.test.ts per Mandate 8b.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PrescriptionPrintModal } from "../PrescriptionPrintModal.js";

describe("Red Team Inquisition: CSS Tokens & Dark Mode Theme Hygiene (WCAG AAA)", () => {
	it("6.1 PrescriptionPrintModal.tsx has 0 hardcoded static hex colors", () => {
		const rawPath = path.resolve(
			process.cwd(),
			"apps/web/src/components/prescriptions/PrescriptionPrintModal.tsx",
		);
		const filePath = fs.existsSync(rawPath)
			? rawPath
			: path.resolve(
					process.cwd(),
					"src/components/prescriptions/PrescriptionPrintModal.tsx",
				);
		const content = fs.readFileSync(filePath, "utf8");
		const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
		const matches = content.match(hexRegex) || [];

		assert.strictEqual(
			matches.length,
			0,
			`PrescriptionPrintModal.tsx must NOT contain hardcoded hex colors. Found: ${matches.join(", ")}`,
		);
	});

	it("6.2 Printable sheet preview uses CSS tokens (var(--paper-strong), var(--ink), var(--line))", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Иванов И.И." },
			}),
		);

		assert.ok(
			html.includes("bg-[var(--paper-strong)]"),
			"Preview sheet must use bg-[var(--paper-strong)] for responsive theme adaptation",
		);
		assert.ok(
			html.includes("text-[var(--ink)]"),
			"Preview sheet must use text-[var(--ink)] for crisp typography in light & dark modes",
		);
		assert.ok(
			html.includes("border-[var(--line)]"),
			"Preview sheet must use border-[var(--line)]",
		);
	});
});

describe("Red Team Inquisition: Special Outpatient Prescriptions (Accounting & Safety)", () => {
	it("7.1 Supports special prescription forms for strict accounting drugs", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				initialSelectedDrugIds: ["ketorolac_10"],
			}),
		);

		// Special prescription blank indicator without soviet bureaucracy
		assert.ok(
			html.includes("Специальный рецепт") ||
				html.includes("Специальный бланк") ||
				html.includes("148"),
			"Должен присутствовать переключатель или индикатор специального рецепта",
		);
	});

	it("7.2 Prescriptions enforce validity period and medical documentation notice", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
			}),
		);

		assert.ok(
			html.includes("Срок действия") || html.includes("дней"),
			"Должен быть указан срок действия рецепта",
		);
		assert.ok(
			html.includes("Рецептурный бланк") || html.includes("Медицинская документация"),
			"Должен присутствовать заголовок медицинской документации",
		);
	});
});
