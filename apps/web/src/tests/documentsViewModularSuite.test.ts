/**
 * documentsViewModularSuite.test.ts
 *
 * RED TEAM MODULAR SUITE:
 * Verifies the decomposed `apps/web/src/documentsView/` architecture:
 * 1. DocumentsToolbar: 1-row compact bar, search padding >= 38px, autoclave log anchor.
 * 2. DocumentsTemplateGrid: responsive template grid, zero cartoon emojis, fast action anchors.
 * 3. DocumentsRecentList: patient registry section (`id="document-registry-section"`).
 * 4. DocumentsA4PrintPreview: depth-1 focus editor & A4 container (`data-testid="document-focus-editor"`, `data-testid="btn-close-focus-editor"`).
 * 5. Export & Anchor Parity across facade and submodules.
 */

import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	DocumentsA4PrintPreview,
	DocumentsRecentList,
	DocumentsTemplateGrid,
	DocumentsToolbar,
} from "../documentsView/index.js";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Decomposed DocumentsView Submodules (apps/web/src/documentsView/)", () => {
	it("1. DocumentsToolbar renders 1-row toolbar with >= 38px search padding and zero emojis", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentsToolbar, {
				activePatient: {
					id: "pat-1",
					fullName: "Смирнов Алексей Владимирович",
					phone: "+7 999 123-45-67",
					birthDate: "1985-06-15",
				} as any,
				patientIssuedDocsCount: 4,
				patientDraftDocsCount: 1,
				activeCategoryTab: "all",
				onSelectCategoryTab: () => {},
				searchQuery: "",
				onSearchChange: () => {},
				onOpenAutoclaveLog: () => {},
				onOpenPrimaryIntakePackage: () => {},
			}),
		);

		assert.ok(!EMOJI_REGEX.test(html), "DocumentsToolbar must contain ZERO cartoon emojis");
		assert.ok(
			html.includes('data-testid="documents-open-autoclave-log-257-btn"'),
			"Must preserve autoclave log button test anchor",
		);
		assert.ok(
			html.includes("padding-left:38px") || html.includes("padding-left: 38px"),
			"Search input must enforce >= 38px left padding for icon clearance",
		);
		assert.ok(html.includes("Смирнов Алексей Владимирович"), "Must render active patient name");
	});

	it("2. DocumentsTemplateGrid renders clinical document cards with zero emojis and required anchors", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentsTemplateGrid, {
				selectedDocumentKind: "dental_medical_card_043u",
				onSelectDocumentKind: () => {},
				onCreateDocument: () => {},
				onOpenFocusEditor: () => {},
				activeCategoryTab: "all",
				searchQuery: "",
			}),
		);

		assert.ok(!EMOJI_REGEX.test(html), "DocumentsTemplateGrid must contain ZERO cartoon emojis");
		assert.ok(
			html.includes('data-testid="documents-catalog-grid"'),
			"Must render catalog grid test anchor",
		);
		assert.ok(
			html.includes('id="document-kind-selector"'),
			"Must preserve document-kind-selector anchor",
		);
		assert.ok(
			html.includes('data-testid="select-document-kind"'),
			"Must preserve select-document-kind anchor",
		);
		assert.ok(
			html.includes('data-testid="btn-create-selected-document"'),
			"Must preserve btn-create-selected-document anchor",
		);
	});

	it("3. DocumentsRecentList preserves #document-registry-section anchor and zero emojis", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentsRecentList, {
				typedActiveDocuments: [],
				filteredActiveDocuments: [],
				activeCategoryTab: "all",
				setActiveCategoryTab: () => {},
				registrySearchQuery: "",
				setRegistrySearchQuery: () => {},
				registryStatusFilter: "all",
				setRegistryStatusFilter: () => {},
				registryEdsFilter: "all",
				setRegistryEdsFilter: () => {},
				registryKindFilter: "all",
				setRegistryKindFilter: () => {},
				availableRegistryKinds: [],
				documentsSlice: {
					visibleItems: [],
					hasMore: false,
					remainingCount: 0,
				},
				setDisplayLimit: () => {},
				openDocActionMenuId: null,
				setOpenDocActionMenuId: () => {},
				requestDocumentIssue: () => {},
				downloadIssuedDocumentPdf: () => {},
				openIssuedDocumentHtml: () => {},
				loadDocumentAuditFacts: () => {},
				downloadIssuedDocumentHtml: () => {},
				downloadTaxDocumentXml: () => {},
				setIsFnsNdflXmlOpen: () => {},
				setIsEgiszRemdOpen: () => {},
				requestDocumentVoid: () => {},
				formatShortDate: (d) => d || "",
				money: (v) => `${v} ₽`,
			}),
		);

		assert.ok(!EMOJI_REGEX.test(html), "DocumentsRecentList must contain ZERO cartoon emojis");
		assert.ok(
			html.includes('id="document-registry-section"'),
			"Must preserve #document-registry-section anchor",
		);
	});

	it("4. DocumentsA4PrintPreview renders depth-1 focus editor with A4 standard header and zero emojis", () => {
		const html = renderToStaticMarkup(
			createElement(
				DocumentsA4PrintPreview,
				{
					isEditingInFocus: true,
					onCloseFocus: () => {},
					selectedDocumentKind: "dental_medical_card_043u",
					documentLabels: {
						dental_medical_card_043u: "Медицинская карта стоматологического пациента (043/у)",
					},
					patient: {
						id: "pat-1",
						fullName: "Иванов Пётр Сергеевич",
					} as any,
					doctorName: "Д-р Волкова Н.А.",
					clinicName: "Стоматологическая клиника DENTE",
				},
				createElement("div", { className: "a4-preview-test-child" }, "Содержимое бланка A4"),
			),
		);

		assert.ok(!EMOJI_REGEX.test(html), "DocumentsA4PrintPreview must contain ZERO cartoon emojis");
		assert.ok(
			html.includes('data-testid="document-focus-editor"'),
			"Must preserve document-focus-editor anchor",
		);
		assert.ok(
			html.includes('data-testid="btn-close-focus-editor"'),
			"Must preserve btn-close-focus-editor anchor",
		);
		assert.ok(html.includes("A4 • 210×297 мм"), "Must display A4 dimension badge");
		assert.ok(html.includes("Иванов Пётр Сергеевич"), "Must display patient name");
	});
});
