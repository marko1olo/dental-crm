/**
 * ScannerViewCockpit.test.tsx
 *
 * Comprehensive test suite for Document Scanner Cockpit:
 * 1. Monolithic Document Intake Workspace rendering without SanPiN imposter.
 * 2. Document presets & aspect-ratio guide frames (Passport РФ, СНИЛС, ОМС).
 * 3. 1 Primary CTA per visible mode (Mandate 8am).
 * 4. Autonomy & Non-blocking buttons (Mandate 8e).
 * 5. Tokenized CSS design & zero cartoon emojis (Mandate 8d).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScannerView } from "../../../ScannerView.js";

describe("Document Scanner Cockpit Suite (ScannerView)", () => {
	it("1. Renders Document Scanner Cockpit workspace without SanPiN autoclaves", () => {
		const html = renderToStaticMarkup(createElement(ScannerView));

		// Check header title & subtitle
		assert.ok(
			html.includes("Оцифровка документов регистратуры"),
			"ScannerView renders authentic document intake title",
		);
		assert.ok(
			html.includes("Быстрое сканирование паспорта, СНИЛС, полиса ОМС"),
			"ScannerView renders clinical subtitle",
		);
		assert.ok(
			html.includes("Защита данных пациентов") || html.includes("защита"),
			"ScannerView renders privacy compliance telemetry chip",
		);

		// Verify SanPiN registers imposter is eradicated from default ScannerView
		assert.ok(
			!html.includes("Журнал контроля стерилизации"),
			"ScannerView does not render SanPiN autoclave sterilization registers",
		);
		assert.ok(
			!html.includes("Контроль качества ПСО"),
			"ScannerView does not render PSO azopiram tests",
		);
	});

	it("2. Renders all Russian clinical document presets", () => {
		const html = renderToStaticMarkup(createElement(ScannerView));

		assert.ok(html.includes("Паспорт РФ"), "Contains Passport preset");
		assert.ok(html.includes("СНИЛС"), "Contains SNILS preset");
		assert.ok(html.includes("Полис ОМС"), "Contains OMS policy preset");
		assert.ok(html.includes("Полис ДМС"), "Contains DMS policy preset");
		assert.ok(html.includes("Форма 057/у"), "Contains referral 057/u preset");
	});

	it("3. Renders enhancement filters & stage controls", () => {
		const html = renderToStaticMarkup(createElement(ScannerView));

		assert.ok(html.includes("Контраст"), "Contains contrast filter");
		assert.ok(html.includes("Ч/Б текст"), "Contains Otsu B/W filter");
		assert.ok(html.includes("Серое"), "Contains grayscale filter");
		assert.ok(html.includes("Оригинал"), "Contains original filter");

		// Secondary stage buttons
		assert.ok(html.includes("Файл"), "Contains file fallback button");
		assert.ok(
			html.includes('data-testid="scanner-capture-button"'),
			"Contains capture button",
		);
	});

	it("4. Enforces Single Primary CTA button and non-blocking autonomy (Mandates 8e, 8am)", () => {
		const html = renderToStaticMarkup(createElement(ScannerView));

		// Primary CTA button for existing mode
		assert.ok(
			html.includes('data-testid="scanner-save-attachment-button"'),
			"Contains Primary CTA button for saving attachment",
		);
		assert.ok(
			html.includes("Прикрепить к карте пациента"),
			"Primary CTA button has clear descriptive text",
		);

		// Autonomy invariant: Primary button is NOT disabled
		const saveButtonMatch = html.match(
			/<button[^>]*data-testid="scanner-save-attachment-button"[^>]*>/,
		);
		assert.ok(saveButtonMatch, "Found save button element");
		assert.ok(
			!saveButtonMatch[0].includes("disabled"),
			"Primary CTA is NEVER disabled (Mandate 8e)",
		);
	});

	it("5. Verifies Zero Cartoon Emojis and Zero Dev-Jargon in Scanner UI files", () => {
		const scannerFiles = [
			path.resolve(process.cwd(), "apps/web/src/ScannerView.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/ScannerDocumentStage.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/ScannerPatientIntakePanel.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/useScannerCockpit.ts"),
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/u;

		for (const file of scannerFiles) {
			assert.ok(fs.existsSync(file), `File ${path.basename(file)} must exist`);
			const content = fs.readFileSync(file, "utf8");

			// Zero cartoon emojis
			assert.ok(
				!emojiRegex.test(content),
				`File ${path.basename(file)} must contain 0 cartoon emojis`,
			);

			// Zero dev-jargon
			assert.ok(
				!content.includes("Мандат 8e"),
				`File ${path.basename(file)} must not leak dev-jargon 'Мандат 8e'`,
			);
			assert.ok(
				!content.includes("Мандат 8am"),
				`File ${path.basename(file)} must not leak dev-jargon 'Мандат 8am'`,
			);
		}
	});

	it("6. Verifies CSS tokenization and mobile touch target standards", () => {
		const cssPath = path.resolve(
			process.cwd(),
			"apps/web/src/components/scanner/scannerCockpit.css",
		);
		assert.ok(fs.existsSync(cssPath), "scannerCockpit.css must exist");
		const css = fs.readFileSync(cssPath, "utf8");

		// Token purity
		assert.ok(css.includes("var(--paper)"), "Uses --paper token");
		assert.ok(css.includes("var(--ink)"), "Uses --ink token");
		assert.ok(css.includes("var(--line)"), "Uses --line token");
		assert.ok(css.includes("var(--teal)"), "Uses --teal token");

		// Touch targets >= 44px
		assert.ok(
			css.includes("min-height: 44px") || css.includes("height: 44px"),
			"Provides 44px touch targets on mobile/coarse pointer",
		);
	});
});
