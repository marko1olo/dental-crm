import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ToothContextDrawer } from "../ToothContextDrawer.js";
import { ToothSurfacesAndEndoMatrix, BLACK_MACROS } from "../ToothSurfacesAndEndoMatrix.js";
import { ToothAnesthesiaCalculator, WEIGHT_PRESETS } from "../ToothAnesthesiaCalculator.js";
import { ToothSanpinKraftBinding } from "../ToothSanpinKraftBinding.js";
import { ToothRvgThumbnail } from "../ToothRvgThumbnail.js";
import { ToothFamilyLoyaltyAccordion } from "../ToothFamilyLoyaltyAccordion.js";
import { ToothPediatricContext, RESORPTION_STAGES } from "../ToothPediatricContext.js";

describe("Tier 2 Warm Context & Tooth Drawer Tools", () => {
	it("ToothContextDrawer renders clean side-sheet with all warm accordions when open", () => {
		const html = renderToString(
			<ToothContextDrawer
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
				toothData={{
					toothNumber: 16,
					state: "Caries",
					surfaces: ["M", "O", "D"],
				}}
				patient={{
					id: "pat-123",
					fullName: "Иванов Иван Иванович",
					ageYears: 34,
					weightKg: 75,
				}}
			/>,
		);

		assert.ok(html.includes("dente-tooth-drawer-container"), "Drawer container should render");
		assert.ok(html.includes("FDI"), "FDI badge should be present");
		assert.ok(html.includes("16"), "Tooth number 16 should be displayed");
		assert.ok(html.includes("MOD &amp; Каналы") || html.includes("MOD & Каналы"), "MOD tab should be present");
		assert.ok(html.includes("2. Анестезия"), "Anesthesia quick tab should be present");
		assert.ok(html.includes("3. Крафт СанПиН"), "SanPiN Kraft quick tab should be present");
		assert.ok(html.includes("4. Снимок RVG"), "RVG quick tab should be present");
		assert.ok(html.includes("5. Депозит &amp; Бонусы") || html.includes("5. Депозит & Бонусы"), "Deposit tab should be present");
	});

	it("ToothContextDrawer returns null when closed (zero DOM bloat on Tier 1)", () => {
		const html = renderToString(
			<ToothContextDrawer
				isOpen={false}
				onClose={() => {}}
				toothNumber={16}
			/>,
		);

		assert.equal(html, "", "Closed drawer should render empty string without polluting Tier 1");
	});

	it("ToothSurfacesAndEndoMatrix renders 5-surface cross diagram and Black classification macros", () => {
		const html = renderToString(
			<ToothSurfacesAndEndoMatrix
				toothNumber={16}
				toothData={{
					toothNumber: 16,
					state: "Caries",
					surfaces: ["M", "O", "D"],
				}}
			/>,
		);

		assert.ok(html.includes("tooth-surfaces-endo-matrix"), "Surfaces component should render");
		assert.ok(html.includes("surface-btn-V"), "Vestibular button should render");
		assert.ok(html.includes("surface-btn-M"), "Mesial button should render");
		assert.ok(html.includes("surface-btn-O"), "Occlusal button should render");
		assert.ok(html.includes("surface-btn-D"), "Distal button should render");
		assert.ok(html.includes("surface-btn-L"), "Lingual button should render");
		assert.ok(html.includes("Класс II (MOD)"), "Black macro MOD should be present");
		assert.ok(html.includes("ИРОПЗ"), "IROPZ destruction index should be computed");
	});

	it("ToothSurfacesAndEndoMatrix renders express endo presets (ProTaper, Calasept, Revision) and MOD quick combo buttons", () => {
		const html = renderToString(
			<ToothSurfacesAndEndoMatrix
				toothNumber={16}
				toothData={{
					toothNumber: 16,
					state: "Pulpitis",
					surfaces: ["M", "O", "D"],
				}}
			/>,
		);

		assert.ok(html.includes("endo-presets-bar"), "Endo presets bar should render when endo table is open");
		assert.ok(html.includes("endo-preset-protaper"), "Express ProTaper preset button should be present");
		assert.ok(html.includes("endo-preset-calasept"), "Calasept Ca(OH)2 preset button should be present");
		assert.ok(html.includes("endo-preset-revision"), "Retreatment/Revision preset button should be present");
		assert.ok(html.includes("dente-surface-quick-combo-btn"), "Quick combo buttons (MOD/MO/OD) should be present");
		assert.ok(html.includes("Вставить протокол эндодонтии в карту 043/у"), "043/u protocol export action should be present");
	});

	it("ToothAnesthesiaCalculator calculates safe carpule limits by patient weight", () => {
		const html = renderToString(
			<ToothAnesthesiaCalculator
				toothNumber={16}
				initialWeightKg={70}
				initialAgeYears={30}
				hasCardioRisk={false}
			/>,
		);

		assert.ok(html.includes("tooth-anesthesia-calculator"), "Anesthesia tool should render");
		assert.ok(html.includes("70 кг"), "Weight preset should be displayed");
		assert.ok(html.includes("Ультракаин Д-С"), "Standard articaine option should be present");
		assert.ok(html.includes("Скандонест 3%"), "Plain mepivacaine option should be present");
		assert.ok(html.includes("БЕЗОПАСНО"), "Safe dosage badge should be ok for standard dose");
	});

	it("ToothSanpinKraftBinding renders Kraft autoclave packages and expiration safety check", () => {
		const html = renderToString(
			<ToothSanpinKraftBinding
				toothNumber={16}
			/>,
		);

		assert.ok(html.includes("tooth-sanpin-kraft-binding"), "Kraft binding tool should render");
		assert.ok(html.includes("СанПиН 3.3686-21"), "SanPiN standard header should be displayed");
		assert.ok(html.includes("Стерильность подтверждена"), "Sterility badge should be visible");
		assert.ok(html.includes("Привязать крафт-пакет"), "1-Click binding action button should be present");
	});

	it("ToothRvgThumbnail renders 200x200 periapical viewport with contrast and negative controls", () => {
		const html = renderToString(
			<ToothRvgThumbnail
				toothNumber={16}
			/>,
		);

		assert.ok(html.includes("tooth-rvg-thumbnail"), "RVG thumbnail tool should render");
		assert.ok(html.includes("dente-rvg-viewport-frame"), "200x200 frame should be rendered");
		assert.ok(html.includes("Негатив"), "Invert filter button should be available");
		assert.ok(html.includes("Зум апекса"), "Apex zoom button should be available");
	});

	it("ToothFamilyLoyaltyAccordion calculates family deposit split and loyalty cashback bonus", () => {
		const html = renderToString(
			<ToothFamilyLoyaltyAccordion
				toothNumber={16}
				estimatedCostRub={5000}
				familyBalanceRub={15000}
				loyaltyPointsBalance={1200}
			/>,
		);

		assert.ok(html.includes("tooth-family-loyalty-accordion"), "Family loyalty tool should render");
		assert.ok(html.includes("Семейный депозит"), "Family deposit metric should be present");
		assert.ok(html.includes("Баллы кешбэка"), "Loyalty points metric should be present");
		assert.ok(html.includes("Применить сплит к чеку 54-ФЗ"), "Split confirmation action should be present");
	});

	it("ToothPediatricContext renders Frankl behavioral scale and resorption stages for primary teeth", () => {
		const html = renderToString(
			<ToothPediatricContext
				toothNumber={54}
				initialFrankl={3}
			/>,
		);

		assert.ok(html.includes("tooth-pediatric-context"), "Pediatric context tool should render");
		assert.ok(html.includes("Шкала Франкла"), "Frankl scale badge should be present");
		assert.ok(html.includes("Резорбция"), "Resorption section should be present");
		assert.ok(html.includes("Печать памятки для родителей"), "Parent memo button should be available");
	});
});
