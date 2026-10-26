/**
 * ScannerViewCockpit.test.tsx
 *
 * Comprehensive test suite for Sterilization Workspace & Document Scanner Cockpit:
 * 1. Default routing opens SanPiN & Autoclave Sterilization Workspace.
 * 2. Seamless mode switcher allows toggling to Document Scanner.
 * 3. Human clinical language: "Направление на лечение" (eradication of bureaucratic "Форма 057/у").
 * 4. 1 Primary CTA per visible mode (Mandate 8am).
 * 5. Autonomy & Non-blocking buttons (Mandate 8e).
 * 6. Tokenized CSS design & zero cartoon emojis (Mandate 8d).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScannerView } from "../../../ScannerView.js";
import { ScannerDocumentWorkspace } from "../ScannerDocumentWorkspace.js";
import { DOCUMENT_PRESETS_LIST } from "../documentScannerEngine.js";

describe("Document Scanner & SanPiN Workspace Suite (ScannerView)", () => {
	it("1. Renders SanPiN & Autoclave Sterilization Workspace by default in ScannerView", () => {
		const html = renderToStaticMarkup(createElement(ScannerView));

		// Check default header title & subtitle: SanPiN & Sterilization
		assert.ok(
			html.includes("Журналы стерилизации и санитарного режима"),
			"ScannerView renders authentic sterilization title by default",
		);
		assert.ok(
			html.includes("Автоклавирование, предстерилизационная очистка"),
			"ScannerView renders sterilization & autoclave subtitle",
		);
		assert.ok(
			html.includes("ЦСО активен"),
			"ScannerView renders active central sterilization department telemetry chip",
		);
		assert.ok(
			html.includes("Стерилизация и дезинфекция"),
			"ScannerView renders sterilization compliance chip",
		);

		// Mode switcher tabs
		assert.ok(
			html.includes('data-testid="scanner-tab-sanpin"'),
			"Contains tab for SanPiN registers",
		);
		assert.ok(
			html.includes('data-testid="scanner-tab-camera"'),
			"Contains tab for document scanner",
		);

		// SanPiN tabs and registers are mounted by default
		assert.ok(
			html.includes("sanpin-container") || html.includes("sanpin-tabs-nav") || html.includes("Автоклав"),
			"SanPiN sterilization registers are rendered by default",
		);
	});

	it("2. Document Scanner Workspace renders authentic clinical presets without bureaucratic Form 057/u", () => {
		const html = renderToStaticMarkup(createElement(ScannerDocumentWorkspace));

		assert.ok(html.includes("Паспорт РФ"), "Contains Passport preset");
		assert.ok(html.includes("СНИЛС"), "Contains SNILS preset");
		assert.ok(html.includes("Полис ОМС"), "Contains OMS policy preset");
		assert.ok(html.includes("Полис ДМС"), "Contains DMS policy preset");

		// Eradication of Soviet bureaucratic order "Форма 057/у" (Mandate 8x, 8ap)
		assert.ok(
			html.includes("Направление"),
			"Uses clean clinical language 'Направление' instead of 'Форма 057/у'",
		);
		assert.ok(
			!html.includes("Форма 057/у"),
			"Zero bureaucratic jargon 'Форма 057/у' in rendered document scanner",
		);

		// Verify presets list in engine
		const clinicalReferral = DOCUMENT_PRESETS_LIST.find((p) => p.shortTitle === "Направление");
		assert.ok(clinicalReferral, "DOCUMENT_PRESETS_LIST contains 'Направление'");
		assert.equal(clinicalReferral?.id, "referral_clinical", "Preset has semantic id 'referral_clinical'");
	});

	it("3. Renders enhancement filters & stage controls in Document Scanner Workspace", () => {
		const html = renderToStaticMarkup(createElement(ScannerDocumentWorkspace));

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
		const html = renderToStaticMarkup(createElement(ScannerDocumentWorkspace));

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

	it("5. Verifies Zero Cartoon Emojis, Zero Dev-Jargon and Zero Soviet forms in Scanner UI files", () => {
		const scannerFiles = [
			path.resolve(process.cwd(), "apps/web/src/ScannerView.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/ScannerHeaderBar.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/ScannerDocumentWorkspace.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/ScannerDocumentStage.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/ScannerPatientIntakePanel.tsx"),
			path.resolve(process.cwd(), "apps/web/src/components/scanner/documentScannerEngine.ts"),
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

			// Zero raw "Форма 057/у" in customer facing code
			if (!file.endsWith("documentScannerEngine.ts")) {
				assert.ok(
					!content.includes("Форма 057/у"),
					`File ${path.basename(file)} must not contain 'Форма 057/у'`,
				);
			}
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
