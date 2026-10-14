import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	OrthopedicsChairsidePanel,
	STANDARD_ZTL_ORDER_PRESETS,
	PREPARATION_MARGIN_PRESETS,
	VITA_3D_MASTER_SHADE_GROUPS,
} from "../OrthopedicsChairsidePanel";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	VITA_SHADE_GROUPS,
} from "../orthopedicProtocols";

describe("OrthopedicsChairsidePanel — EMR & Chairside Autonomy (Mandates 8d, 8e, 8i, 8k, 8n)", () => {
	it("renders OrthopedicsChairsidePanel with panel title and stage 3 binding", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes("Ортопедический протокол у кресла"), "Must render panel header");
		assert.ok(html.includes("043/у"), "Must state 043/u badge");
		assert.ok(html.includes('data-testid="orthopedics-chairside-panel"'), "Must contain root testid");
	});

	it("auto-binds initialLabOrder attributes (order #, technician, material, warranty passport, tooth FDI) and renders 1-click fitting confirmation", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={46}
				initialLabOrder={{
					id: "lab-order-402",
					orderNumber: "ЗТЛ-402",
					toothFdi: "46",
					workType: "Коронка цирконий",
					material: "ZrO2 Multi-Layer",
					colorVita: "A2",
					technicianName: "Смирнов А.В.",
					warrantyPassport: "ГП-ЗТЛ-402",
					status: "delivered_to_clinic",
				}}
			/>,
		);

		assert.ok(html.includes('data-testid="ortho-chairside-linked-lab-order-banner"'));
		assert.ok(html.includes("Работа из ЗТЛ доставлена: Коронка цирконий зуб 46"));
		assert.ok(html.includes("ЗТЛ-402"));
		assert.ok(html.includes("Смирнов А.В."));
		assert.ok(html.includes("ГП-ЗТЛ-402"));
		assert.ok(html.includes("A16.07.004"));
		assert.ok(html.includes('data-testid="ortho-chairside-confirm-fitting-btn"'));
		assert.ok(html.includes("Подтвердить примерку / фиксацию (A16.07.004)"));
	});

	it("renders all canonical orthopedic protocols with 1-click action buttons", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(ORTHOPEDIC_CANONICAL_PROTOCOLS.length >= 5, "Must contain all canonical protocols");
		for (const proto of ORTHOPEDIC_CANONICAL_PROTOCOLS) {
			assert.ok(html.includes(proto.shortLabel), `Must render label for ${proto.shortLabel}`);
			assert.ok(html.includes(proto.defaultIcd10), `Must render ICD-10 for ${proto.defaultIcd10}`);
			assert.ok(html.includes(`data-testid="apply-ortho-protocol-${proto.id}"`), `Must render apply button for ${proto.id}`);
		}
	});

	it("renders 1-click ZTL order presets with authentic dental materials and warranty calculation (Mandate 8i, 8k)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(STANDARD_ZTL_ORDER_PRESETS.length >= 5, "Must export at least 5 ZTL presets (ZrO2, e.max, Noritake, PMMA, Clasp)");
		for (const preset of STANDARD_ZTL_ORDER_PRESETS) {
			assert.ok(html.includes(preset.name), `Must render preset name ${preset.name}`);
			assert.ok(html.includes(preset.badge), `Must render preset badge ${preset.badge}`);
			assert.ok(html.includes(`data-testid="ztl-preset-${preset.id}"`), `Must render testid for ${preset.id}`);
			assert.ok(html.includes(preset.warrantyLabelRu), `Must render calculated warranty: ${preset.warrantyLabelRu}`);
		}

		// Verify PMMA temporary crown preset is present
		const pmma = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === "pmma_temp");
		assert.ok(pmma, "Must include PMMA temporary crown preset");
		assert.strictEqual(pmma.warrantyMonths, 6, "PMMA temporary crown has 6-month warranty");
	});

	it("renders 1-click preparation margin presets without blocking dialogs (Chamfer, Shoulder, Knife Edge)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="prep-margin-section"'), "Must render prep margin section");
		assert.strictEqual(PREPARATION_MARGIN_PRESETS.length, 4, "Must define 4 preparation margins");

		for (const margin of PREPARATION_MARGIN_PRESETS) {
			assert.ok(html.includes(margin.labelRu), `Must render margin label: ${margin.labelRu}`);
			assert.ok(html.includes(margin.shortBadge), `Must render margin badge: ${margin.shortBadge}`);
			assert.ok(html.includes(`data-testid="prep-margin-${margin.id}"`), `Must render testid for margin ${margin.id}`);
		}
	});

	it("links actual tooth X-ray/images and current FDI tooth formula from visit", () => {
		// When recentToothXrayUrl is provided:
		const htmlWithXray = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={21}
				selectedTeeth={[21]}
				recentToothXrayUrl="https://clinic.dente/storage/xrays/tooth-21-pa.png"
			/>,
		);
		assert.ok(htmlWithXray.includes('data-testid="attached-xray-badge"'), "Must render attached X-ray badge");
		assert.ok(htmlWithXray.includes("Снимок привязан"), "Must show attached status text");
		assert.ok(htmlWithXray.includes('value="21"'), "Must sync activeToothFdi to activeTeethInput");

		// When no X-ray is provided:
		const htmlWithoutXray = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={46}
				selectedTeeth={[46]}
			/>,
		);
		assert.ok(htmlWithoutXray.includes("Без снимка"), "Must show no image status text");
		assert.ok(htmlWithoutXray.includes('value="46"'), "Must sync tooth 46 to input");
	});

	it("renders VITA Classical and VITA 3D-Master shade systems tabs", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="vita-classical-tab"'), "Must render VITA Classical tab");
		assert.ok(html.includes('data-testid="vita-3d-master-tab"'), "Must render VITA 3D-Master tab");
		assert.ok(html.includes("VITA Classical"), "Must contain text VITA Classical");
		assert.ok(html.includes("VITA 3D-Master"), "Must contain text VITA 3D-Master");

		// Default shade Classical A2
		assert.ok(html.includes('data-testid="vita-shade-A2"'), "Must render A2 shade button");
		assert.ok(html.includes('data-testid="vita-shade-BL1"'), "Must render Bleach BL1 shade button");
	});

	it("renders Doctor Clinical Override button for advance < 50% without modal gates (Mandate 8e)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(
			html.includes('data-testid="doctor-clinical-override-toggle"'),
			"Must render doctor clinical override toggle",
		);
		assert.ok(
			html.includes("Клинический оверрайд (Аванс &lt; 50%)") || html.includes("Клинический оверрайд"),
			"Must display override button text",
		);
		assert.ok(
			html.includes('data-testid="direct-send-lab-order-btn"'),
			"Must render 1-click send to ZTL button",
		);
	});

	it("enforces touch target ergonomics with min-h-[48px] on interactive buttons", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		// Verify touch target class min-h-[48px] is applied to key buttons
		assert.ok(html.includes("min-h-[48px]"), "All buttons must enforce min-h-[48px]");
	});

	it("renders 5-stage manufacturing tracker (Слепок/Скан, Каркас/Примерка, Нанесение керамики, Готовая работа, Фиксация)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes("Этапы изготовления ЗТЛ (1 клик):"), "Must render 5-stage tracker header");
		assert.ok(html.includes("Слепок/Скан"), "Must render stage 1 Слепок/Скан");
		assert.ok(html.includes("Каркас/Примерка"), "Must render stage 2 Каркас/Примерка");
		assert.ok(html.includes("Нанесение керамики"), "Must render stage 3 Нанесение керамики");
		assert.ok(html.includes("Готовая работа"), "Must render stage 4 Готовая работа");
		assert.ok(html.includes("Фиксация"), "Must render stage 5 Фиксация");
		assert.ok(html.includes('data-testid="chairside-stage-impression_scan"'), "Must render testid for stage 1");
		assert.ok(html.includes('data-testid="chairside-stage-framework_fitting"'), "Must render testid for stage 2");
		assert.ok(html.includes('data-testid="chairside-stage-ceramic_layering"'), "Must render testid for stage 3");
		assert.ok(html.includes('data-testid="chairside-stage-ready_in_clinic"'), "Must render testid for stage 4");
		assert.ok(html.includes('data-testid="chairside-stage-patient_fixation"'), "Must render testid for stage 5");
	});

	it("renders visual color swatches for VITA shade buttons", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		// Verify color swatches are embedded in shade buttons
		assert.ok(html.includes("background-color"), "Shade buttons must include visual background-color swatches");
		assert.ok(html.includes("rounded-full"), "Swatch indicators must be circular rounded-full elements");
	});

	it("renders 1-click chairside warranty rework toggle for 0 ₽ patient replacement (Mandate 8e)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(
			html.includes('data-testid="chairside-warranty-rework-toggle"'),
			"Must render chairside warranty rework toggle button",
		);
		assert.ok(
			html.includes("Гарантийная замена (0 ₽)"),
			"Must render 0 ₽ label for warranty rework",
		);
	});

	it("renders 1-click stump shade selector (Natural Die ND1..ND9) with color swatches", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="stump-shade-section"'), "Must render stump shade section");
		assert.ok(html.includes("Цвет культи зуба (Natural Die ND1–ND9, 1 клик)"), "Must render header for ND1..ND9");
		for (let i = 1; i <= 9; i++) {
			assert.ok(html.includes(`data-testid="stump-shade-ND${i}"`), `Must render button for ND${i}`);
		}
	});

	it("renders solo doctor economics and margin calculator (Mandate 8n) with calculated due date", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="solo-economics-section"'), "Must render solo economics section");
		assert.ok(html.includes("Экономика наряда и маржинальность:"), "Must render economics header");
		assert.ok(html.includes("Пациент (выручка)"), "Must display gross revenue label");
		assert.ok(html.includes("Лаборатория (ЗТЛ)"), "Must display lab cost label");
		assert.ok(html.includes("Расходные материалы"), "Must display consumables cost label");
		assert.ok(html.includes("Чистая маржа"), "Must display net margin label");
		assert.ok(html.includes("Готовность ЗТЛ"), "Must display calculated turnaround due date");
	});

	it("renders compact occlusion section with articulator chips and facebow checkbox", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="occlusion-section"'), "Must render occlusion section");
		assert.ok(html.includes("Окклюзия и артикулятор (1 клик):"), "Must render occlusion header");
		assert.ok(html.includes('data-testid="articulator-chip-bio_art"'), "Must render Bio-Art chip");
		assert.ok(html.includes('data-testid="articulator-chip-kavo_protar"'), "Must render KaVo Protar chip");
		assert.ok(html.includes('data-testid="articulator-chip-average_anatomical"'), "Must render average anatomical chip");
		assert.ok(html.includes('data-testid="facebow-checkbox"'), "Must render facebow checkbox");
		assert.ok(html.includes("Лицевая дуга (суставной путь 33° / Беннетт 15°)"), "Must render facebow angles label");
	});

	it("renders 5 core indirect construction presets including Bridge and All-on-4 (Paragraph 1)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="ztl-preset-bridge"'), "Must render bridge preset button");
		assert.ok(html.includes('data-testid="ztl-preset-all_on_4"'), "Must render all-on-4 preset button");
		assert.ok(html.includes("Мостовидный протез"), "Must display bridge label");
		assert.ok(html.includes("All-on-4"), "Must display All-on-4 label");
		assert.ok(html.includes("10 лет"), "All-on-4 must specify 10-year warranty");
	});

	it("renders Fixation Type selector (cement vs. screw vs. clasp) and Antagonists toggle (Paragraph 1)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="fixation-type-section"'), "Must render fixation type section");
		assert.ok(html.includes('data-testid="fixation-type-cement"'), "Must render cement fixation button");
		assert.ok(html.includes('data-testid="fixation-type-screw"'), "Must render screw fixation button");
		assert.ok(html.includes('data-testid="fixation-type-clasp"'), "Must render clasp fixation button");
		assert.ok(html.includes('data-testid="antagonists-checkbox"'), "Must render antagonists checkbox");
		assert.ok(html.includes("Слепок/скан антагонистов"), "Must label antagonists toggle");
	});

	it("highlights master complete protocol «✓ Стандартное протезирование коронкой» across full width", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="ortho-protocol-card-ortho_standard_crown_complete"'), "Must render card for master preset");
		assert.ok(html.includes("1-клик Полный цикл"), "Must render badge 1-клик Полный цикл");
		assert.ok(html.includes("Автосписание БОМ"), "Must indicate warehouse soft overdraft write-off");
		assert.ok(html.includes('data-testid="apply-ortho-protocol-ortho_standard_crown_complete"'), "Must render button for master preset");
	});

	it("renders 1-click button for Orthopedic Construction Passport and Warranty Certificate (A4) (Paragraph 2)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		assert.ok(html.includes('data-testid="open-orthopedic-passport-btn"'), "Must render passport button in footer");
		assert.ok(html.includes("Паспорт (А4)"), "Must contain label Паспорт (А4)");
	});

	it("strictly complies with Mandate 8d p. 7 (Zero cartoon emojis in clinical documents/panels)", () => {
		const html = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={16}
				selectedTeeth={[16]}
			/>,
		);

		const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!forbiddenEmojis.test(html), "OrthopedicsChairsidePanel must contain 0 cartoon emojis");
	});
});
