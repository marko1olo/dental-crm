import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitTherapyProtocolWidget } from "../VisitTherapyProtocolWidget";
import { SpecialtyProtocolDrawer } from "../../specialtyFocusModules/SpecialtyProtocolDrawer";
import { TherapySurfaceSelector } from "../modules/TherapySurfaceSelector";
import { TherapyPresetSelector } from "../modules/TherapyPresetSelector";
import { TherapyWidgetHeader } from "../modules/TherapyWidgetHeader";
import { TherapyDetailsAccordion } from "../modules/TherapyDetailsAccordion";
import { TherapyFooterActions } from "../modules/TherapyFooterActions";
import { generateTherapySoapProtocol, generateTherapyProtocolText } from "@dental/shared";

describe("Domain 72 Fixer Surgeon: Therapy & Restorations Invariants Verification", () => {
	it("SEV-1.1: SpecialtyProtocolDrawer passes keyed remount for VisitTherapyProtocolWidget", () => {
		const htmlTooth16 = renderToStaticMarkup(
			createElement(SpecialtyProtocolDrawer, {
				isProtocolDrawerOpen: true,
				setIsProtocolDrawerOpen: () => {},
				activeWidgetTitle: "Терапевтический протокол",
				activeTooth: 16,
				isChildDentition: false,
				isSurgery: false,
				activeSurfaces: ["O"],
				setActiveSurfaces: () => {},
				handleApplyProtocolText: () => {},
				handleAddToInvoice: () => {},
				franklRating: 4,
				setFranklRating: () => {},
				setActiveTooth: () => {},
			}),
		);

		assert.ok(htmlTooth16.includes("Зуб 16"), "Drawer correctly embeds VisitTherapyProtocolWidget for tooth 16");
		assert.ok(htmlTooth16.includes('data-testid="therapy-btn-apply-diary"'), "Contains diary button");
	});

	it("SEV-2.1 & SEV-1.2: Engine and Widget use canonical fullProtocolText, therapyServices and diary actions", () => {
		const result = generateTherapySoapProtocol({
			toothNumber: 16,
			surfaces: ["M", "O", "D"],
			presetId: "caries_composite",
		});

		// fullProtocolText must be present and canonical
		assert.ok(typeof result.fullProtocolText === "string", "fullProtocolText must be a string");
		assert.ok(result.fullProtocolText.includes("ДНЕВНИК ПРИЁМА — Зуб 16:"), "Contains clinical diary header");
		assert.equal(result.fullProtocolText, result.fullProtocolText043, "Backward compatibility alias matches");

		const textOnly = generateTherapyProtocolText({
			toothNumber: 16,
			surfaces: ["M", "O", "D"],
		});
		assert.ok(textOnly.includes("ДНЕВНИК ПРИЁМА — Зуб 16:"), "Text generator produces clean diary text");

		// Catalog services / therapyServices exist and are strongly typed
		assert.ok(Array.isArray(result.catalogServices), "catalogServices is an array");
		assert.ok(result.catalogServices.length > 0, "catalogServices has items");
	});

	it("SEV-3.1: TherapySurfaceSelector complies with Apple HIG mobile touch target >= 44px", () => {
		const html = renderToStaticMarkup(
			createElement(TherapySurfaceSelector, {
				selectedSurfaces: ["M", "O"],
				onApplySurfacePreset: () => {},
				onToggleSurface: () => {},
			}),
		);

		// Touch target min-h-[44px] for mobile and sm:h-8 for desktop
		assert.ok(html.includes("min-h-[44px]"), "Surface buttons must have min-h-[44px] for Apple HIG mobile touch standard");
		assert.ok(html.includes("h-11"), "Surface buttons have h-11 for mobile touch");
		assert.ok(html.includes("sm:h-8"), "Surface buttons scale down cleanly to sm:h-8 on desktop");

		// Zero hardcoded teal-*
		assert.ok(!html.includes("bg-teal-"), "Zero hardcoded bg-teal- in surface selector");
		assert.ok(!html.includes("border-teal-"), "Zero hardcoded border-teal- in surface selector");
		assert.ok(!html.includes("text-teal-"), "Zero hardcoded text-teal- in surface selector");
	});

	it("SEV-3.2: TherapyPresetSelector complies with UPPERCASE BAN (Sentence case)", () => {
		const html = renderToStaticMarkup(
			createElement(TherapyPresetSelector, {
				activePresetId: "caries_composite",
				onSelectPreset: () => {},
			}),
		);

		assert.ok(!html.includes("uppercase"), "TherapyPresetSelector must have zero uppercase classes");
		assert.ok(html.includes("Протоколы лечения у кресла:"), "Contains clean sentence case label");
		assert.ok(!html.includes("border-teal-"), "Zero hardcoded border-teal- in preset selector");
		assert.ok(!html.includes("bg-teal-"), "Zero hardcoded bg-teal- in preset selector");
	});

	it("SEV-3.3: Zero teal-* hardcodes in Header, Accordion and Footer", () => {
		const headerHtml = renderToStaticMarkup(
			createElement(TherapyWidgetHeader, {
				effectiveTooth: 16,
				isToothSelected: true,
				selectedSurfaces: ["O"],
				blackClass: "class_I",
				warranty: { warrantyMonths: 24, rationaleRu: "Стандартная гарантия СтАР" },
				showDetailsAccordion: false,
				onToggleDetails: () => {},
			}),
		);
		assert.ok(!headerHtml.includes("teal-"), "Zero teal-* hardcodes in TherapyWidgetHeader");

		const accordionHtml = renderToStaticMarkup(
			createElement(TherapyDetailsAccordion, {
				showDetailsAccordion: true,
				isAnterior: false,
				selectedComposite: "filtek_ultimate",
				onSelectComposite: () => {},
				selectedAdhesive: "optibond_fl",
				onSelectAdhesive: () => {},
				shadeDentin: "A3B",
				onChangeShadeDentin: () => {},
				shadeEnamel: "A2E",
				onChangeShadeEnamel: () => {},
			}),
		);
		assert.ok(!accordionHtml.includes("teal-"), "Zero teal-* hardcodes in TherapyDetailsAccordion");

		const footerHtml = renderToStaticMarkup(
			createElement(TherapyFooterActions, {
				onInsertToClinicalDiary: () => {},
				onAddServicesToInvoice: () => {},
				servicesCount: 3,
				diagnosisIcd10: "K02.1",
				blackClass: "class_I",
			}),
		);
		assert.ok(footerHtml.includes('data-testid="therapy-btn-apply-diary"'), "Footer has canonical data-testid");
		assert.ok(!footerHtml.includes("therapy-btn-apply-043"), "No obsolete 043 test id");
	});
});
