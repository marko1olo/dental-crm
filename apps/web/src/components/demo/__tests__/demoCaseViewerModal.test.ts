/**
 * @file demoCaseViewerModal.test.ts
 * @description Юнит-тесты и валидация декомпозиции DemoCaseViewerModal (МАНДАТ 8b, МАНДАТ 8y, МАНДАТ 8n).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	DemoCaseViewerModal,
	DemoCaseHeaderBar,
	DemoCaseMediaGallery,
	DemoCaseTreatmentTimeline,
	DemoCaseFinancialSummary,
	DEMO_CLINICAL_CASES,
	type DemoCaseViewerModalProps,
	type DemoClinicalCase,
} from "../DemoCaseViewerModal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("DemoCaseViewerModal Decomposition & Clinical Parity (Wave 24)", () => {
	const demoDir = path.resolve(__dirname, "..");
	const modalDir = path.resolve(demoDir, "caseViewerModal");

	describe("1. Architectural Layer & File Budget Gate (<= 800 lines)", () => {
		it("ensures thin facade DemoCaseViewerModal.tsx is strictly <= 150 lines", () => {
			const facadePath = path.resolve(demoDir, "DemoCaseViewerModal.tsx");
			assert.ok(fs.existsSync(facadePath), "Facade file must exist");
			const content = fs.readFileSync(facadePath, "utf-8");
			const lines = content.split("\n").length;
			assert.ok(lines <= 150, `Facade must be <= 150 lines, got ${lines}`);
		});

		it("ensures all decomposed files in caseViewerModal/ are strictly <= 800 lines", () => {
			const files = fs.readdirSync(modalDir).filter((f) => /\.(ts|tsx)$/.test(f));
			assert.ok(files.length >= 5, "Must have at least 5 decomposed files");

			for (const f of files) {
				const filePath = path.join(modalDir, f);
				const content = fs.readFileSync(filePath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`File ${f} must be <= 800 lines, but has ${lines} lines`,
				);
			}
		});
	});

	describe("2. Public Export Parity", () => {
		it("exports all canonical components and data models", () => {
			assert.equal(typeof DemoCaseViewerModal, "function", "DemoCaseViewerModal must be exported");
			assert.equal(typeof DemoCaseHeaderBar, "function", "DemoCaseHeaderBar must be exported");
			assert.equal(typeof DemoCaseMediaGallery, "function", "DemoCaseMediaGallery must be exported");
			assert.equal(typeof DemoCaseTreatmentTimeline, "function", "DemoCaseTreatmentTimeline must be exported");
			assert.equal(typeof DemoCaseFinancialSummary, "function", "DemoCaseFinancialSummary must be exported");
			assert.ok(DEMO_CLINICAL_CASES, "DEMO_CLINICAL_CASES must be exported");
		});
	});

	describe("3. Clinical Cases & Order 804н Nomenclature Verification", () => {
		it("validates All-on-4 clinical case integrity", () => {
			const all4 = DEMO_CLINICAL_CASES.all_on_4;
			assert.ok(all4, "All-on-4 case must exist");
			assert.equal(all4.category, "all_on_4");
			assert.equal(all4.diagnosisIcd10, "K08.1");
			assert.ok(all4.stages.length >= 3, "Must have multi-stage timeline");
			assert.ok(all4.media.length >= 2, "Must have CT and photo media");

			// Проверка КЛКТ среза
			const ct = all4.media.find((m) => m.type === "ct_slice");
			assert.ok(ct, "Must contain CT slice item");
			assert.ok(Number(ct.boneDensityHounsfield) > 0, "Must specify Hounsfield bone density");

			// Проверка кодов 804н
			const codes = all4.financialItems.map((i) => i.code);
			assert.ok(codes.includes("A16.07.054"), "Must contain Straumann implant code A16.07.054");
			assert.ok(codes.includes("A16.07.055"), "Must contain multi-unit abutment code A16.07.055");
			assert.ok(codes.includes("A16.07.023"), "Must contain All-on-4 bridge code A16.07.023");
			assert.ok(all4.totalNetRub > 0, "Must calculate total net amount");
		});

		it("validates Total Ceramic Rehabilitation case integrity", () => {
			const rehab = DEMO_CLINICAL_CASES.total_rehab;
			assert.ok(rehab, "Total rehab case must exist");
			assert.equal(rehab.category, "total_rehab");
			assert.equal(rehab.diagnosisIcd10, "K03.0");
			const crownItem = rehab.financialItems.find((i) => i.code === "A16.07.004");
			assert.ok(crownItem, "Must contain E-max crown code A16.07.004");
			assert.equal(crownItem.quantity, 28);
		});

		it("validates Orthodontic Spark Aligners case integrity", () => {
			const ortho = DEMO_CLINICAL_CASES.orthodontics;
			assert.ok(ortho, "Orthodontics case must exist");
			assert.equal(ortho.category, "orthodontics");
			assert.equal(ortho.diagnosisIcd10, "K07.2");
			const alignerItem = ortho.financialItems.find((i) => i.code === "A16.07.048");
			assert.ok(alignerItem, "Must contain Spark aligners code A16.07.048");
		});

		it("validates Endodontics & Therapy case integrity", () => {
			const endo = DEMO_CLINICAL_CASES.therapy_endo;
			assert.ok(endo, "Endo case must exist");
			assert.ok(endo.diagnosisIcd10.includes("K02.1"));
			assert.ok(endo.diagnosisIcd10.includes("K04.0"));
		});
	});

	describe("4. React Component Rendering & Test Anchor Parity", () => {
		it("renders null when isOpen is false", () => {
			const html = renderToString(
				React.createElement(DemoCaseViewerModal, {
					isOpen: false,
					activeRoleKey: "therapist",
					onClose: () => {},
				}),
			);
			assert.equal(html, "");
		});

		it("renders full modal with required test anchors when isOpen is true", () => {
			const html = renderToString(
				React.createElement(DemoCaseViewerModal, {
					isOpen: true,
					activeRoleKey: "therapist",
					onClose: () => {},
				}),
			);

			// Проверка канонических тестовых якорей (Gate 3 test anchors)
			assert.ok(html.includes('id="demo-case-title"'), "Must preserve id demo-case-title");
			assert.ok(html.includes('aria-label="Закрыть модальное окно"'), "Must preserve close aria-label");
			assert.ok(html.includes('data-testid="demo-case-modal"'), "Must contain data-testid demo-case-modal");
			assert.ok(html.includes('data-testid="demo-tab-case"'), "Must contain data-testid demo-tab-case");
			assert.ok(html.includes('data-testid="demo-tab-media"'), "Must contain data-testid demo-tab-media");
			assert.ok(html.includes('data-testid="demo-tab-estimate"'), "Must contain data-testid demo-tab-estimate");
			assert.ok(html.includes('data-testid="demo-tab-diploma"'), "Must contain data-testid demo-tab-diploma");
			assert.ok(html.includes("Симулировать: Завершить приём"), "Must render complete simulation CTA");
			assert.ok(html.includes("Закрыть"), "Must render close button");
		});

		it("renders DemoCaseHeaderBar with case details and role controls", () => {
			const currentCase = DEMO_CLINICAL_CASES.all_on_4!;
			const html = renderToString(
				React.createElement(DemoCaseHeaderBar, {
					activeRoleKey: "surgeon",
					selectedCaseId: "all_on_4",
					currentCase,
					onSelectCase: () => {},
					onClose: () => {},
				}),
			);

			assert.ok(html.includes('id="demo-case-title"'));
			assert.ok(html.includes('aria-label="Закрыть модальное окно"'));
			assert.ok(html.includes("Смирнова Анна Сергеевна"));
			assert.ok(html.includes("K08.1"));
			assert.ok(html.includes("Тотальная реабилитация All-on-4"));
		});

		it("renders DemoCaseMediaGallery with split and comparison controls", () => {
			const currentCase = DEMO_CLINICAL_CASES.all_on_4!;
			const html = renderToString(
				React.createElement(DemoCaseMediaGallery, {
					media: currentCase.media,
				}),
			);

			assert.ok(html.includes('data-testid="demo-media-gallery"'));
			assert.ok(html.includes('data-testid="demo-photo-compare"'));
			assert.ok(html.includes('data-testid="demo-ct-split"'));
			assert.ok(html.includes("КЛКТ срез"));
			assert.ok(html.includes("ДО:"));
			assert.ok(html.includes("ПОСЛЕ:"));
		});

		it("renders DemoCaseTreatmentTimeline with clinical stages", () => {
			const currentCase = DEMO_CLINICAL_CASES.all_on_4!;
			const html = renderToString(
				React.createElement(DemoCaseTreatmentTimeline, {
					stages: currentCase.stages,
					activeRoleKey: "surgeon",
				}),
			);

			assert.ok(html.includes('data-testid="demo-treatment-timeline"'));
			assert.ok(html.includes('data-testid="demo-timeline-stage"'));
			assert.ok(html.includes("Хирургическая имплантация All-on-4"));
			assert.ok(html.includes("A06.07.013"));
		});

		it("renders DemoCaseFinancialSummary with Order 804н table and SBP CTA", () => {
			const currentCase = DEMO_CLINICAL_CASES.all_on_4!;
			const html = renderToString(
				React.createElement(DemoCaseFinancialSummary, {
					items: currentCase.financialItems,
					totalGrossRub: currentCase.totalGrossRub,
					totalDiscountRub: currentCase.totalDiscountRub,
					totalNetRub: currentCase.totalNetRub,
					patientSavingsRub: currentCase.patientSavingsRub,
				}),
			);

			assert.ok(html.includes('data-testid="demo-financial-summary"'));
			assert.ok(html.includes('data-testid="demo-estimate-table"'));
			assert.ok(html.includes("A16.07.054"));
			assert.ok(html.includes("Straumann BLX"));
			assert.ok(html.includes("Симулировать оплату через СБП"));
			assert.ok(html.includes("Экономия пациента"));
		});
	});
});
