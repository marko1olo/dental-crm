import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ToothContextDrawer, TOOTH_EXPRESS_ANESTHESIA_OPTIONS } from "../ToothContextDrawer.js";
import { ToothSurfacesAndEndoMatrix, BLACK_MACROS } from "../ToothSurfacesAndEndoMatrix.js";
import { AnesthesiaQuickBar, WEIGHT_PRESETS } from "../../anesthesia/AnesthesiaQuickBar.js";
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
		assert.ok(!html.includes("Крафт СанПиН"), "SanPiN Kraft quick tab must NOT be present (Mandate 8v, 8k)");
		assert.ok(html.includes("3. Снимок RVG"), "RVG quick tab should be present");
		assert.ok(html.includes("4. Депозит &amp; Бонусы") || html.includes("4. Депозит & Бонусы"), "Deposit tab should be present");
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

	it("AnesthesiaQuickBar calculates safe carpule limits by patient weight", () => {
		const html = renderToString(
			<AnesthesiaQuickBar
				targetToothNumberFdi={16}
				patientWeightKg={70}
				patientAgeYears={30}
				hasCardiovascularRisk={false}
				onApplyAnesthesia={() => {}}
			/>,
		);

		assert.ok(html.includes("anesthesia-quick-bar"), "Anesthesia tool should render");
		assert.ok(html.includes("70 кг"), "Weight preset should be displayed");
		assert.ok(html.includes("Ультракаин Д-С"), "Standard articaine option should be present");
		assert.ok(html.includes("Скандонест 3%"), "Plain mepivacaine option should be present");
		assert.ok(html.includes("безопасно"), "Safe dosage badge should be ok for standard dose");
	});

	it("ToothContextDrawer contains NO per-tooth Kraft package binding bloat (Mandates 8v, 8k, 8s)", () => {
		const html = renderToString(
			<ToothContextDrawer
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
			/>,
		);

		assert.ok(!html.includes("tooth-sanpin-kraft-binding"), "Kraft binding component must NOT be rendered in tooth drawer");
		assert.ok(!html.includes("Привязка крафт-пакета автоклава"), "Kraft accordion title must NOT be present");
		assert.ok(!html.includes("Крафт СанПиН"), "Kraft tab must NOT be present in drawer");
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

	it("ToothContextDrawer renders 1-click express anesthesia presets without weight sliders", () => {
		assert.equal(TOOTH_EXPRESS_ANESTHESIA_OPTIONS.length, 5);
		const ids = TOOTH_EXPRESS_ANESTHESIA_OPTIONS.map((o) => o.id);
		assert.ok(ids.includes("articaine_1_100k"));
		assert.ok(ids.includes("ultracain_1_200k"));
		assert.ok(ids.includes("scandonest_cardio"));
		assert.ok(ids.includes("septanest_1_100k"));
		assert.ok(ids.includes("topical_application"));

		const html = renderToString(
			<ToothContextDrawer
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
			/>,
		);

		assert.ok(html.includes("2. Экспресс-анестезия (1 клик)"), "1-click express title should be present");
		assert.ok(html.includes("Артикаин • Ультракаин • Скандонест • Септанест"), "Preset drugs summary should be present");
	});

	it("ToothContextDrawer renders 1-click somatic norm strip and button for healthy patient (Mandate 8e)", () => {
		const html = renderToString(
			<ToothContextDrawer
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
				initialSection="anesthesia"
				patient={{
					id: "pat-norm",
					fullName: "Петров Петр Петрович",
					hasCardioRisk: false,
					hasSulfiteAllergy: false,
					hasAsthma: false,
					isPregnant: false,
				}}
			/>,
		);

		assert.ok(html.includes("tooth-somatic-norm-strip"), "Somatic norm strip should render for healthy patient");
		assert.ok(html.includes("tooth-somatic-norm-btn"), "1-click somatic norm button should be present");
		assert.ok(html.includes("Соматически здоров (ASA I) • Норма"), "Should display physiological norm label");
	});

	it("ToothContextDrawer renders somatic risk warning alert when patient has cardiovascular risk", () => {
		const html = renderToString(
			<ToothContextDrawer
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
				initialSection="anesthesia"
				patient={{
					id: "pat-cardio",
					fullName: "Сидоров Сидор Сидорович",
					hasCardioRisk: true,
				}}
			/>,
		);

		assert.ok(html.includes("tooth-somatic-risk-alert"), "Somatic risk alert should render for cardio patient");
		assert.ok(html.includes("Отягощенный соматический статус"), "Alert title should be present");
		assert.ok(html.includes("Кардио-риск"), "Cardio risk label should be present");
		assert.ok(html.includes("Рекомендован Скандонест 3%"), "Should recommend plain mepivacaine");
	});

	it("ToothSurfacesAndEndoMatrix renders permanent obturation preset and anatomical length button", () => {
		const html = renderToString(
			<ToothSurfacesAndEndoMatrix
				toothNumber={21}
				toothData={{
					toothNumber: 21,
					state: "Pulpitis",
				}}
			/>,
		);

		assert.ok(html.includes("endo-preset-obturation"), "Permanent obturation preset button should render");
		assert.ok(html.includes("Обтурация до апекса (AH Plus)"), "Permanent obturation label should be present");
		assert.ok(html.includes("btn-endo-anatomical-lengths"), "Anatomical length button should render");
		assert.ok(html.includes("Авто-длина по FDI"), "Anatomical length label should be present");
	});
});

