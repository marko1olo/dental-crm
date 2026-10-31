/**
 * apps/web/src/components/settings/imports/__tests__/settingsImportsDecomposition.test.tsx
 *
 * Strict Architectural Decomposition & Invariant Verification Test for Settings Imports SSOT.
 * Mandates:
 * - Mandate 8b / 8zi: Sweet Spot 200-300 lines, strict ceiling <= 500 lines. Facade <= 100 lines.
 * - Mandate 8e: Doctor & user autonomy, non-blocking buttons.
 * - Mandate 8n: Solo doctor scale sovereignty, 1-click standard clinical pricelist template.
 * - Mandate 8ap: Zero alien brands in UI (no IDENT, DentalPRO, StomX).
 * - Mandate 8wy: Honest production vs isolated demo showcase mode.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	MigrationPreviewSection,
	STANDARD_CLINICAL_PRICELIST_TEMPLATE,
} from "../MigrationPreviewSection";
import { MigrationSourcePanel } from "../../migration/MigrationSourcePanel";
import { useSettingsImportsLogic } from "../useSettingsImportsLogic";
import { useClinicProfileDraftLogic } from "../logic/useClinicProfileDraftLogic";
import { useDataImportIntakeLogic } from "../logic/useDataImportIntakeLogic";
import { useDicomViewerLogic } from "../logic/useDicomViewerLogic";
import { useMigrationAutopilotLogic } from "../logic/useMigrationAutopilotLogic";

describe("Settings Imports SSOT Decomposition & Invariants", () => {
	it("1. Facade coordinates all 4 specialized domain sub-hooks seamlessly", () => {
		const mockParams: any = {
			smartImportText: "Иванов Иван;+79991112233;1990-01-01",
			importText: "Код;Услуга;Цена\nA16.07;Пломба;3000",
			clinicProfileDraft: { name: "Дента Люкс" },
			clinicProfileSaveState: "saved",
			migrationAutopilot: null,
			dicomFirstFrameViewerState: { brightness: 100, contrast: 100 },
		};

		const logic = useSettingsImportsLogic(mockParams);

		// Verified from useDataImportIntakeLogic
		assert.equal(logic.smartImportInputReady, true);
		assert.equal(logic.patientImportInputReady, true);
		assert.equal(typeof logic.focusSmartImportWorkbench, "function");

		// Verified from useClinicProfileDraftLogic
		assert.equal(logic.clinicProfileSaveButtonText, "Профиль сохранен");
		assert.equal(typeof logic.applyClinicLookupSuggestion, "function");
		assert.equal(typeof logic.clinicLookupSuggestionApplySummary, "function");

		// Verified from useDicomViewerLogic
		assert.equal(logic.dicomFirstFrameSelectableCount, 0);
		assert.equal(typeof logic.updateDicomFirstFrameViewerState, "function");

		// Verified from useMigrationAutopilotLogic
		assert.ok(Array.isArray(logic.migrationProgressItems));
		assert.equal(logic.migrationProgressItems.length, 4);
		assert.equal(typeof logic.migrationCandidatePreviewReady, "function");
	});

	it("2. File sizes adhere strictly to Sweet Spot & Anti-Monolith limits (Mandate 8b)", () => {
		const baseDir = path.resolve(
			process.cwd(),
			"apps/web/src/components/settings/imports",
		);

		const facadeLines = fs
			.readFileSync(path.join(baseDir, "useSettingsImportsLogic.ts"), "utf8")
			.split("\n").length;
		assert.ok(
			facadeLines <= 100,
			`useSettingsImportsLogic.ts must be a clean facade <= 100 lines (actual: ${facadeLines})`,
		);

		const logicDir = path.join(baseDir, "logic");
		const logicFiles = fs.readdirSync(logicDir);
		for (const file of logicFiles) {
			const filePath = path.join(logicDir, file);
			const lines = fs.readFileSync(filePath, "utf8").split("\n").length;
			assert.ok(
				lines <= 400,
				`Logic module ${file} must stay within Sweet Spot <= 400 lines (actual: ${lines})`,
			);
		}
	});

	it("3. Standard clinical pricelist template is ready for 1-click load (Mandate 8n)", () => {
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.length > 0);
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("Терапия"));
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("Ортопедия"));
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("Хирургия"));
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("Гигиена"));
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("A16.07.002"));
	});

	it("4. Empty state in MigrationPreviewSection displays 1-click standard pricelist CTA", () => {
		let textValue = "";
		const html = renderToString(
			React.createElement(MigrationPreviewSection, {
				settingsTab: "imports",
				typedImportSourceKinds: ["patients", "service_catalog"],
				importSourceKind: "patients",
				importSourceLabels: { patients: { title: "Пациенты" } },
				typedDocumentIngestionTargets: ["patients"],
				documentIngestionTarget: "patients",
				ingestionTargetLabels: { patients: "Пациенты" },
				isDocumentIngesting: false,
				typedDocumentIngestion: null,
				documentDetectedKindLabel: () => "Таблица",
				documentIngestionQualityLabels: {},
				importText: "",
				patientImportInputReady: false,
				isImportLoading: false,
				isImportCommitting: false,
				typedImportIntake: null,
				typedImportPreview: null,
				importCommit: null,
				setImportSourceKind: () => {},
				setImportPreview: () => {},
				setImportCommit: () => {},
				setImportIntake: () => {},
				setDocumentIngestionTarget: () => {},
				ingestImportFile: () => {},
				setImportText: (updater: any) => {
					textValue = typeof updater === "function" ? updater("") : updater;
				},
				previewImport: () => {},
				commitImport: () => {},
			} as any),
		);

		assert.ok(
			html.includes("data-testid=\"load-standard-pricelists-btn\""),
			"Empty state must contain 1-click standard pricelist button",
		);
		assert.ok(
			html.includes("Загрузить типовой прейскурант"),
			"Button must have friendly doctor-facing label",
		);
	});

	it("5. Zero alien brands in UI cards: IDENT, DentalPRO, StomX are eradicated (Mandate 8ap)", () => {
		const html = renderToString(
			React.createElement(MigrationSourcePanel, {
				busy: false,
				allowLlm: false,
				onAllowLlmChange: () => {},
				fileInputRef: { current: null },
				onFile: () => {},
			}),
		);

		assert.ok(
			!html.includes("IDENT"),
			"MigrationSourcePanel must not display IDENT in UI",
		);
		assert.ok(
			!html.includes("DentalPRO"),
			"MigrationSourcePanel must not display DentalPRO in UI",
		);
		assert.ok(
			!html.includes("StomX"),
			"MigrationSourcePanel must not display StomX in UI",
		);
		assert.ok(
			html.includes("Универсальный Excel"),
			"MigrationSourcePanel must display universal Excel format",
		);
		assert.ok(
			html.includes("Выгрузка из медицинской системы"),
			"MigrationSourcePanel must display medical system export format",
		);
	});
});
