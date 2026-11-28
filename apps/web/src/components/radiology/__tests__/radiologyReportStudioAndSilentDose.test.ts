/**
 * radiologyReportStudioAndSilentDose.test.ts
 * Runtime Behavioral Test Suite for EzDent-i Report Studio & Radiation Safety Registry.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RadiologyReportStudioModal } from "../RadiologyReportStudioModal";
import { RadiationSafetyRegistryModal } from "../RadiationSafetyRegistryModal";
import { RadiationDoseSheetForm as RadiologyBridgeForm } from "../RadiationDoseSheetForm";
import { RadiationDoseSheetForm } from "../../documents/forms/RadiationDoseSheetForm";
import { RadiologyModule } from "../RadiologyModule";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("Window #5: EzDent-i Report Studio & Silent Dose Sheet Runtime Gate", () => {
	it("1. RadiologyReportStudioModal renders Virtual Sheet (A4 & Film), templates, resize handles & quiet DAP", () => {
		const html = renderToStaticMarkup(
			React.createElement(RadiologyReportStudioModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Тест Пациент",
				initialImages: [
					{
						id: "img-1",
						url: "/radiology/sample_rvg_tooth16.jpg",
						title: "Зуб 16",
						modality: "RVG",
						date: "2026-11-28",
					},
				],
			}),
		);

		assert.ok(html.includes('data-testid="radiology-virtual-sheet"'));
		assert.ok(html.includes('data-testid="btn-layout-two-vert"'));
		assert.ok(html.includes('data-testid="btn-add-image-frame"'));
		assert.ok(html.includes('data-testid="btn-add-text-frame"'));
		assert.ok(html.includes('data-testid="radiology-bottom-filmstrip"'));
		assert.ok(html.includes('data-testid="btn-open-print-settings"'));
		assert.ok(html.includes('data-testid="btn-execute-print"'));
		assert.ok(html.includes('data-testid="frame-telemetry-legend"'));
		assert.ok(html.includes("dGy*cm² [DAP]"));
		assert.equal(html.includes("0[kVp]"), false);
		assert.equal(html.includes("0[mA]"), false);
		assert.equal(html.includes("Зона радиационной опасности"), false);
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
	});

	it("2. RadiationSafetyRegistryModal renders quiet statutory archive with 0 disabled buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(RadiationSafetyRegistryModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pt-rad-1",
				patientName: "Пациент Тест",
			}),
		);

		assert.ok(html.includes('data-testid="radiation-safety-registry-modal"'));
		assert.ok(html.includes('data-testid="metric-studies-count"'));
		assert.ok(html.includes('data-testid="metric-total-dose"'));
		assert.ok(html.includes('data-testid="metric-safety-status"'));
		assert.ok(html.includes('data-testid="dose-records-table"'));
		assert.ok(html.includes('data-testid="btn-add-rvg-dose"'));
		assert.ok(html.includes('data-testid="btn-export-csv"'));
		assert.ok(html.includes('data-testid="btn-print-sanpin-form"'));
		assert.equal(html.includes("alert-danger"), false);
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
	});

	it("3. RadiationDoseSheetForm bridge matches canonical documents form & RadiologyModule wires Studio launchers", () => {
		assert.equal(RadiologyBridgeForm, RadiationDoseSheetForm);

		const moduleHtml = renderToStaticMarkup(
			React.createElement(RadiologyModule, {
				patient: { id: "pt-rad-1", fullName: "Тест Пациент" },
			}),
		);
		assert.ok(
			moduleHtml.includes('data-testid="btn-open-report-studio"') ||
				moduleHtml.includes('data-testid="btn-hub-report-studio"'),
		);
		assert.ok(moduleHtml.includes("Отчет и печать"));
	});
});
