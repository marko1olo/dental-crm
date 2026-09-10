import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitSoapEditor } from "../VisitSoapEditor";
import { VisitAnamnesisTab } from "../VisitAnamnesisTab";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { STOMX_KEY_CLINICAL_PROTOCOLS, populateOutpatientTemplateText } from "@dental/shared";

describe("VisitSoapEditor & Form 043/u StomX 448 Protocols Integration", () => {
	it("verifies STOMX_KEY_CLINICAL_PROTOCOLS catalog completeness across 5 specialties", () => {
		assert.ok(
			STOMX_KEY_CLINICAL_PROTOCOLS.length >= 25,
			`Expected at least 25 key protocols, found ${STOMX_KEY_CLINICAL_PROTOCOLS.length}`,
		);
		const specialties = new Set(STOMX_KEY_CLINICAL_PROTOCOLS.map((p) => p.specialty));
		assert.ok(specialties.has("therapy"), "Contains therapy specialty");
		assert.ok(specialties.has("orthopedics"), "Contains orthopedics specialty");
		assert.ok(specialties.has("surgery"), "Contains surgery specialty");
		assert.ok(specialties.has("implantology"), "Contains implantology specialty");
		assert.ok(specialties.has("periodontics"), "Contains periodontics specialty");
	});

	it("populates outpatient template text replacing tooth placeholder correctly", () => {
		const template = "Кариозная полость на жевательной поверхности в __ зубе. Дно плотное.";
		const populated = populateOutpatientTemplateText(template, {
			toothNumber: 46,
			surfaces: "O",
		});
		assert.ok(populated.includes("46 зубе"), "Replaced placeholder with tooth 46");
		assert.ok(!populated.includes("__"), "No raw placeholders remain");
	});

	it("renders VisitSoapEditor with 1-line toolbar, 1-click norm, tooth selector and template trigger", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 36,
				initialValues: {
					complaint: "Кровоточивость десен при чистке",
					anamnesis: "Соматически здоров",
					objectiveStatus: "Зуб 36: умеренные зубные отложения",
					diagnosis: "K05.0 Острый гингивит",
					treatmentPlan: "УЗ-чистка, Air-Flow",
					recommendations: "Полоскания хлоргексидином 0.05%",
					icd10: "K05.0",
				},
				isTemplatesOpen: false,
			}),
		);

		assert.ok(html.includes("Форма 043/у • SOAP"), "Renders title");
		assert.ok(html.includes("btn-soap-physio-norm"), "Renders 1-click physiological norm button (Mandate 8e)");
		assert.ok(html.includes("btn-open-stomt-templates"), "Renders StomX 448 templates toggle button");
		assert.ok(html.includes("soap-select-tooth"), "Renders FDI tooth selector");
		assert.ok(html.includes("36 зуб"), "Option 36 tooth is present");
		assert.ok(html.includes("Кровоточивость десен при чистке"), "Renders initial complaint");
		assert.ok(html.includes("K05.0"), "Renders ICD-10");
	});

	it("renders StomX 448 drawer when isTemplatesOpen is true", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 26,
				isTemplatesOpen: true,
			}),
		);

		assert.ok(html.includes("Клинические протоколы StomX"), "Renders drawer header");
		assert.ok(html.includes("Все протоколы"), "Renders all protocols button");
		assert.ok(html.includes("Терапия"), "Renders Therapy category filter");
		assert.ok(html.includes("Ортопедия"), "Renders Orthopedics category filter");
		assert.ok(html.includes("Хирургия"), "Renders Surgery category filter");
		assert.ok(html.includes("Имплантация"), "Renders Implantology category filter");
		assert.ok(html.includes("Пародонтология"), "Renders Periodontics category filter");
	});

	it("renders VisitAnamnesisTab with StomX 448 header button and activeTooth support", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={{} as any}>
				<VisitAnamnesisTab
					activeTooth={16}
					onOpenStomxTemplates={() => {}}
					onAppendAnamnesis={() => {}}
					onAppendComorbidities={() => {}}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes("btn-open-stomt-templates-anamnesis"), "Renders StomX templates button in header");
		assert.ok(html.includes("Клинические шаблоны StomX (448)"), "Button contains descriptive text");
	});

	it("verifies Mandate 8e: VisitSoapEditor never blocks buttons with disabled when isLocked=true and renders revision button", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 16,
				isLocked: true,
				initialValues: {
					complaint: "Зуб 16: кариес",
					anamnesis: "Соматически здоров",
					objectiveStatus: "Полость на жевательной",
					diagnosis: "K02.1 Кариес дентина",
					treatmentPlan: "Пломбирование световой композит",
					recommendations: "Контроль",
					icd10: "K02.1",
				},
			}),
		);

		// Must render correction button («Исправленному верить»)
		assert.ok(html.includes("btn-soap-enable-correction"), "Renders correction button when isLocked");
		assert.ok(html.includes("Исправленному верить"), "Contains «Исправленному верить» label");

		// Must NOT have disabled attribute on template and norm buttons
		assert.ok(!html.includes('data-testid="btn-open-stomt-templates" disabled'), "Templates button is NOT disabled");
		assert.ok(!html.includes('data-testid="btn-soap-physio-norm" disabled'), "Physiological norm button is NOT disabled");

		// Fields must NOT be disabled
		assert.ok(!html.includes('id="soap-complaints" disabled'), "Complaints field is NOT disabled");
		assert.ok(!html.includes('id="soap-treatment" disabled'), "Treatment plan field is NOT disabled");
	});
});
