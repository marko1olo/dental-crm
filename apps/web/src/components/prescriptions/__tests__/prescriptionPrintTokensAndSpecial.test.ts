/**
 * prescriptionPrintTokensAndSpecial.test.ts
 *
 * Red Team Inquisition: CSS Tokens, Dark Mode Theme Hygiene & Special Outpatient Prescriptions (6G Live SUT).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	PrescriptionPrintModal,
	resolvePrescriptionPatientName,
} from "../PrescriptionPrintModal.js";

describe("Red Team Inquisition: CSS Tokens & Dark Mode Theme Hygiene (6G Live SUT)", () => {
	it("6.1 PrescriptionPrintModal renders without hardcoded static hex colors in inline styles or closed null state", () => {
		const closedHtml = renderToStaticMarkup(
			React.createElement(PrescriptionPrintModal, {
				isOpen: false,
				onClose: () => {},
				disablePortal: true,
			}),
		);
		assert.strictEqual(closedHtml, "");

		const html = renderToStaticMarkup(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Иванов И.И." },
			}),
		);

		const inlineStyleHexMatches = html.match(/style="[^"]*#[0-9a-fA-F]{3,8}[^"]*"/gi) ?? [];
		assert.deepStrictEqual(
			inlineStyleHexMatches,
			[],
			`PrescriptionPrintModal inline styles must use CSS tokens, found: ${inlineStyleHexMatches.join(", ")}`,
		);
		assert.strictEqual(resolvePrescriptionPatientName({ fullName: "Петров А.В." }, "Фолбэк"), "Петров А.В.");
		assert.strictEqual(resolvePrescriptionPatientName(undefined, "Сидоров С.С."), "Сидоров С.С.");
		assert.strictEqual(resolvePrescriptionPatientName(undefined, undefined), "");
	});

	it("6.2 Printable sheet preview uses CSS tokens (var(--paper-strong), var(--ink), var(--line))", () => {
		const html = renderToStaticMarkup(
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
		const html = renderToStaticMarkup(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				initialSelectedDrugIds: ["ketorolac_10"],
			}),
		);

		assert.ok(
			html.includes("Специальный рецепт") ||
				html.includes("Специальный бланк") ||
				html.includes("148"),
			"Должен присутствовать переключатель или индикатор специального рецепта",
		);
		assert.strictEqual(html.includes('disabled=""'), false);
	});

	it("7.2 Prescriptions enforce validity period and medical documentation notice", () => {
		const html = renderToStaticMarkup(
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
