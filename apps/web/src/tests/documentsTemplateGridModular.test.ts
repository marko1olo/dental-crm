/**
 * documentsTemplateGridModular.test.ts
 *
 * RED TEAM TEST SUITE for DocumentsTemplateGrid modular architecture:
 * 1. Zero regulatory numbers and Soviet bird-language in CANONICAL_TEMPLATES.
 * 2. Mandate 8e: Buttons are never disabled (disabled={false}).
 * 3. Mandate 8b: All modules strictly <= 120 lines, facade strictly <= 15 lines.
 * 4. Apple HIG: Mobile Grouped List layout with >= 44px touch targets.
 * 5. Fast Action anchors preserved.
 * 6. Zero cartoon emojis.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	CANONICAL_TEMPLATES,
	DocumentsTemplateGrid,
} from "../documentsView/DocumentsTemplateGrid";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const BANNED_REGULATORY_STRINGS = [
	"1051н",
	"152-ФЗ",
	"ПП РФ № 736",
	"ПП РФ 736",
	"323-ФЗ",
	"834н",
	"1094н",
	"043/у",
	"037/у",
	"039/у",
	"257/у",
	"54-ФЗ",
	"804н",
];

describe("DocumentsTemplateGrid Modular Red Team Suite", () => {
	it("1. Zero regulatory numbers and Soviet bird-language in user-facing texts", () => {
		for (const tmpl of CANONICAL_TEMPLATES) {
			for (const banned of BANNED_REGULATORY_STRINGS) {
				assert.ok(
					!tmpl.titleRu.includes(banned),
					`Template ${tmpl.id} title "${tmpl.titleRu}" contains banned regulatory string "${banned}"`,
				);
				assert.ok(
					!tmpl.badgeRu.includes(banned),
					`Template ${tmpl.id} badge "${tmpl.badgeRu}" contains banned regulatory string "${banned}"`,
				);
				assert.ok(
					!tmpl.descriptionRu.includes(banned),
					`Template ${tmpl.id} description contains banned regulatory string "${banned}"`,
				);
				if (tmpl.regulationRu) {
					assert.ok(
						!tmpl.regulationRu.includes(banned),
						`Template ${tmpl.id} regulationRu "${tmpl.regulationRu}" contains banned regulatory string "${banned}"`,
					);
				}
			}
		}
	});

	it("2. Mandate 8e: Doctor autonomy - buttons are never disabled in HTML", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentsTemplateGrid, {
				selectedDocumentKind: "dental_medical_card_043u",
				onSelectDocumentKind: () => {},
				onCreateDocument: () => {},
				onOpenFocusEditor: () => {},
				activeCategoryTab: "all",
				searchQuery: "",
				documentCreateSavingKind: "dental_medical_card_043u",
			}),
		);

		// Button anchor must NOT be disabled
		assert.ok(
			html.includes('data-testid="btn-create-selected-document"'),
			"Must include btn-create-selected-document",
		);
		assert.ok(
			!html.includes('disabled="" data-testid="btn-create-selected-document"'),
			"Anchor button must never be disabled",
		);

		// Zero cartoon emojis
		assert.ok(!EMOJI_REGEX.test(html), "Catalog must contain zero emojis");
	});

	it("3. Apple HIG: Renders mobile Grouped List layout with >= 44px touch targets", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentsTemplateGrid, {
				selectedDocumentKind: "primary_intake_package",
				onSelectDocumentKind: () => {},
				onCreateDocument: () => {},
				onOpenFocusEditor: () => {},
				activeCategoryTab: "all",
				searchQuery: "",
			}),
		);

		// Mobile grouped list container
		assert.ok(
			html.includes("sm:hidden") && html.includes("divide-y"),
			"Must render sm:hidden mobile grouped list container with dividers",
		);

		// Mobile touch targets >= 44x44px
		assert.ok(
			html.includes("min-w-[44px]") && html.includes("min-h-[44px]"),
			"Must enforce min-w-[44px] and min-h-[44px] touch targets on mobile",
		);

		// 1-Click Intake Package banner
		assert.ok(
			html.includes('data-testid="primary-intake-package-banner"'),
			"Must render primary-intake-package-banner",
		);
		assert.ok(
			html.includes('data-testid="btn-print-primary-intake-package"'),
			"Must render btn-print-primary-intake-package",
		);
	});

	it("4. Mandate 8b: All modules strictly <= 120 lines, facade strictly <= 15 lines", () => {
		const baseDir = path.resolve(
			__dirname,
			"../documentsView/templateGridModules",
		);
		const files = fs
			.readdirSync(baseDir)
			.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

		for (const f of files) {
			const fullPath = path.join(baseDir, f);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			const max = f === "index.ts" ? 15 : 120;
			assert.ok(
				lines <= max,
				`Module ${f} has ${lines} lines, exceeding limit of ${max}`,
			);
		}

		// Check facade
		const facadePath = path.resolve(
			__dirname,
			"../documentsView/DocumentsTemplateGrid.tsx",
		);
		const facadeLines = fs
			.readFileSync(facadePath, "utf8")
			.split("\n").length;
		assert.ok(
			facadeLines <= 15,
			`Facade DocumentsTemplateGrid.tsx has ${facadeLines} lines, exceeding limit of 15`,
		);
	});
});
