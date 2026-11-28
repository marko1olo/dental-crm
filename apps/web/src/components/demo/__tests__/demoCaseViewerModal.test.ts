/**
 * @file demoCaseViewerModal.test.ts
 * @description Юнит-тесты и проверка рендера DemoCaseViewerModal (6G Live SUT).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	DemoCaseViewerModal,
	DemoCaseHeaderBar,
	DemoCaseMediaGallery,
	DemoCaseTreatmentTimeline,
	DemoCaseFinancialSummary,
	DEMO_CLINICAL_CASES,
} from "../DemoCaseViewerModal.js";

describe("DemoCaseViewerModal Clinical Parity & Live Render (6G Live SUT)", () => {
	describe("1. Role Context & Case Rendering Isolation", () => {
		it("renders DemoCaseViewerModal consistently across clinical specialties without disabled controls", () => {
			for (const roleKey of ["therapist", "surgeon", "orthopedist", "orthodontist", "director"] as const) {
				const html = renderToStaticMarkup(
					React.createElement(DemoCaseViewerModal, {
						isOpen: true,
						activeRoleKey: roleKey,
						onClose: () => {},
					}),
				);
				assert.ok(html.includes('data-testid="demo-case-modal"'), `Modal must render for ${roleKey}`);
				assert.equal(html.includes('disabled=""'), false, `CTA must not be disabled for ${roleKey}`);
			}
		});

		it("ensures all cases in DEMO_CLINICAL_CASES contain non-empty stages, media, and valid kopecks/rub totals", () => {
			const entries = Object.entries(DEMO_CLINICAL_CASES);
			assert.ok(entries.length >= 4);
			for (const [key, clinicalCase] of entries) {
				assert.ok(clinicalCase.stages.length >= 1, `Missing stages on ${key}`);
				assert.ok(clinicalCase.media.length >= 1, `Missing media on ${key}`);
				assert.ok(clinicalCase.totalNetRub > 0, `Invalid net total on ${key}`);
			}
		});
	});

	describe("2. Clinical Cases & Service Catalog Price Verification", () => {
		it("validates All-on-4 clinical case integrity", () => {
			const all4 = DEMO_CLINICAL_CASES.all_on_4;
			assert.ok(all4, "All-on-4 case must exist");
			assert.equal(all4.category, "all_on_4");
			assert.equal(all4.diagnosisIcd10, "K08.1");
			assert.ok(all4.stages.length >= 3, "Must have multi-stage timeline");
			assert.ok(all4.media.length >= 2, "Must have CT and photo media");

			const ct = all4.media.find((m) => m.type === "ct_slice");
			assert.ok(ct, "Must contain CT slice item");
			assert.ok(Number(ct.boneDensityHounsfield) > 0, "Must specify Hounsfield bone density");

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

		it("ensures zero raw regulatory slang and Soviet order numbers in clinical cases", () => {
			const rawCasesJson = JSON.stringify(DEMO_CLINICAL_CASES);
			assert.ok(!rawCasesJson.includes("804н"), "Must not contain raw 804н in demo clinical cases");
			assert.ok(!rawCasesJson.includes("1051н"), "Must not contain raw 1051н in demo clinical cases");
			assert.ok(!rawCasesJson.includes("043/у"), "Must not contain raw 043/у in demo clinical cases");
		});
	});

	describe("3. React Component Rendering & Test Anchor Parity", () => {
		it("renders null when isOpen is false", () => {
			const html = renderToStaticMarkup(
				React.createElement(DemoCaseViewerModal, {
					isOpen: false,
					activeRoleKey: "therapist",
					onClose: () => {},
				}),
			);
			assert.equal(html, "");
		});

		it("renders full modal with required test anchors when isOpen is true", () => {
			const html = renderToStaticMarkup(
				React.createElement(DemoCaseViewerModal, {
					isOpen: true,
					activeRoleKey: "therapist",
					onClose: () => {},
				}),
			);

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
			const currentCase = DEMO_CLINICAL_CASES.all_on_4;
			assert.ok(currentCase);
			const html = renderToStaticMarkup(
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
			const currentCase = DEMO_CLINICAL_CASES.all_on_4;
			assert.ok(currentCase);
			const html = renderToStaticMarkup(
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
			const currentCase = DEMO_CLINICAL_CASES.all_on_4;
			assert.ok(currentCase);
			const html = renderToStaticMarkup(
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

		it("renders DemoCaseFinancialSummary with clinical services table and SBP CTA", () => {
			const currentCase = DEMO_CLINICAL_CASES.all_on_4;
			assert.ok(currentCase);
			const html = renderToStaticMarkup(
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
