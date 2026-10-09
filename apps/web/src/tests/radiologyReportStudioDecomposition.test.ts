/**
 * DENTE CRM — Radiology Report Studio Modal Decomposition Unit Tests
 * Verifies Behavioral Conservation, Line Budgets, Export Parity, and Anchor Integrity.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
	DEFAULT_PRINT_SETTINGS,
	ReportStudioToolbar,
	ReportA4PrintableSheet,
	ReportClinicalConclusion,
	ReportDoctorSignatureStamp,
	ReportFilmstripTray,
	ReportPrintSettingsModal,
	ReportStudioContainer,
	useReportStudioState,
	type PageSizeOption,
	type OrientationOption,
	type LegendPlacementOption,
	type ReportPrintSettings,
	type ReportFrameItem,
	type RadiologyReportStudioModalProps,
	type RadiologyReportLayoutPreset,
} from "../components/radiology/reportStudio";

const getWebRoot = () =>
	fs.existsSync(path.resolve(process.cwd(), "apps/web"))
		? path.resolve(process.cwd(), "apps/web")
		: process.cwd();

describe("Radiology Report Studio Decomposition Invariants", () => {
	it("verifies line count budget (<= 800 lines per module, <= 150 lines for facade)", () => {
		const baseDir = path.resolve(
			getWebRoot(),
			"src/components/radiology/reportStudio",
		);
		const files = fs.readdirSync(baseDir);

		assert.ok(files.length >= 8, `Expected at least 8 decomposed files, found ${files.length}`);

		for (const file of files) {
			const filePath = path.join(baseDir, file);
			if (fs.statSync(filePath).isFile() && /\.(ts|tsx)$/.test(file)) {
				const lineCount = fs.readFileSync(filePath, "utf8").split("\n").length;
				assert.ok(
					lineCount <= 800,
					`File ${file} has ${lineCount} lines, exceeding 800 line budget`,
				);
			}
		}

		const facadePath = path.resolve(
			getWebRoot(),
			"src/components/radiology/RadiologyReportStudioModal.tsx",
		);
		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 150,
			`Facade has ${facadeLines} lines, exceeding 150 line ceiling (got ${facadeLines})`,
		);
	});

	it("verifies public export parity and type contracts in decomposed module", () => {
		assert.equal(typeof ReportStudioToolbar, "function");
		assert.equal(typeof ReportA4PrintableSheet, "function");
		assert.equal(typeof ReportClinicalConclusion, "function");
		assert.equal(typeof ReportDoctorSignatureStamp, "function");
		assert.equal(typeof ReportFilmstripTray, "function");
		assert.equal(typeof ReportPrintSettingsModal, "function");
		assert.equal(typeof ReportStudioContainer, "function");
		assert.equal(typeof useReportStudioState, "function");

		// Test DEFAULT_PRINT_SETTINGS contract
		assert.equal(DEFAULT_PRINT_SETTINGS.pageSize, "A4");
		assert.equal(DEFAULT_PRINT_SETTINGS.orientation, "portrait");
		assert.equal(DEFAULT_PRINT_SETTINGS.legendPlacement, "below");
		assert.equal(DEFAULT_PRINT_SETTINGS.header.showDate, true);
		assert.equal(DEFAULT_PRINT_SETTINGS.header.showPatientInfo, true);
		assert.equal(DEFAULT_PRINT_SETTINGS.header.showClinicLogo, true);
		assert.equal(DEFAULT_PRINT_SETTINGS.footer.showClinicName, true);
		assert.equal(DEFAULT_PRINT_SETTINGS.footer.showPhone, true);
		assert.equal(DEFAULT_PRINT_SETTINGS.footer.showWebsite, true);
		assert.equal(DEFAULT_PRINT_SETTINGS.footer.showAddress, true);
	});

	it("verifies facade re-exports all 7 canonical public symbols", () => {
		const facadePath = path.resolve(
			getWebRoot(),
			"src/components/radiology/RadiologyReportStudioModal.tsx",
		);
		const content = fs.readFileSync(facadePath, "utf8");

		const requiredExports = [
			"PageSizeOption",
			"OrientationOption",
			"LegendPlacementOption",
			"ReportPrintSettings",
			"ReportFrameItem",
			"RadiologyReportStudioModalProps",
			"RadiologyReportStudioModal",
		];

		for (const exp of requiredExports) {
			assert.ok(
				content.includes(exp),
				`Expected facade to include export symbol ${exp}`,
			);
		}
	});

	it("verifies all 26 test anchors exist in the decomposed module directory", () => {
		const targetDir = path.resolve(
			getWebRoot(),
			"src/components/radiology/reportStudio",
		);

		const requiredAnchors = [
			"radiology-report-studio-modal",
			"btn-layout-two-vert",
			"btn-add-image-frame",
			"btn-add-text-frame",
			"btn-delete-frame",
			"btn-open-print-settings",
			"btn-execute-print",
			"btn-close-report-studio",
			"radiology-virtual-sheet",
			"frame-telemetry-legend",
			"resize-handle-nw",
			"resize-handle-se",
			"radiology-bottom-filmstrip",
			"btn-filmstrip-insert",
			"print-settings-modal",
			"radio-legend-below",
			"cb-header-date",
			"cb-header-patient",
			"cb-header-logo",
			"cb-footer-name",
			"cb-footer-phone",
			"cb-footer-web",
			"cb-footer-address",
			"btn-cancel-print-settings",
			"btn-apply-print-settings",
		];

		const allContent = fs
			.readdirSync(targetDir)
			.filter((f) => /\.(ts|tsx)$/.test(f))
			.map((f) => fs.readFileSync(path.join(targetDir, f), "utf8"))
			.join("\n");

		for (const anchor of requiredAnchors) {
			assert.ok(
				allContent.includes(`data-testid="${anchor}"`),
				`Required anchor data-testid="${anchor}" is missing in decomposed directory`,
			);
		}

		assert.ok(
			allContent.includes('aria-label="Раскладка отчета"'),
			'Required anchor aria-label="Раскладка отчета" is missing',
		);
	});
});
