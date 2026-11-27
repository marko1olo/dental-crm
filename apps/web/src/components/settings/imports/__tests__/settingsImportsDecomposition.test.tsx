/**
 * apps/web/src/components/settings/imports/__tests__/settingsImportsDecomposition.test.tsx
 *
 * Честные runtime-тесты подсистемы импорта и миграции (Часть 6Г):
 * - Никаких `readFileSync`, `typeof === "function"` и проверок `lines.length`.
 * - Реальные вызовы хуков, фильтров и React `renderToString` для всех ключевых секций.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { MigrationLocalSourceDiscoveryCandidate } from "@dental/shared";
import { MigrationDiscoverySection } from "../MigrationDiscoverySection";
import {
	MigrationPreviewSection,
	STANDARD_CLINICAL_PRICELIST_TEMPLATE,
	STANDARD_PATIENT_IMPORT_TEMPLATE,
} from "../MigrationPreviewSection";
import { MigrationSourcePanel } from "../../migration/MigrationSourcePanel";
import { useSettingsImportsLogic } from "../useSettingsImportsLogic";

function makeBasePreviewProps(
	overrides: Partial<React.ComponentProps<typeof MigrationPreviewSection>> = {},
): React.ComponentProps<typeof MigrationPreviewSection> {
	return {
		settingsTab: "imports",
		typedImportSourceKinds: ["csv_text", "mis_export"],
		importSourceKind: "csv_text",
		importSourceLabels: {
			csv_text: { title: "CSV / Таблица", detail: "Импорт таблицы" },
			mis_export: { title: "Выгрузка МИС", detail: "Архив клиники" },
		},
		typedDocumentIngestionTargets: ["patients", "pricelist", "smart_import"],
		documentIngestionTarget: "patients",
		ingestionTargetLabels: {
			patients: "Пациенты",
			pricelist: "Прайс-лист",
			smart_import: "Умный импорт",
		},
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
		setImportText: () => {},
		previewImport: () => {},
		commitImport: () => {},
		...overrides,
	};
}

describe("Settings Imports SSOT Behavioral Suite (Part 6G)", () => {
	it("1. useSettingsImportsLogic delegates all 4 domain hooks and mutates state on real calls", () => {
		const updatedProfile: Record<string, string> = {};
		let viewerState = {
			brightness: 100,
			contrast: 100,
			invert: false,
			rotationDeg: 0,
			zoom: 1,
		};

		const logic = useSettingsImportsLogic({
			smartImportText: "Иванов Иван;+79991112233;1990-01-01",
			importText: "ФИО;Телефон\nИванов Иван;+79991112233",
			clinicProfileDraft: { clinicName: "Дента Люкс", phone: "", address: "", inn: "", ogrn: "", medicalLicenseNumber: "" },
			clinicProfileSaveState: "saved",
			updateClinicProfileDraft: (key, value) => {
				updatedProfile[key] = value;
			},
			migrationAutopilot: null,
			dicomFirstFrameViewerState: viewerState,
			setDicomFirstFrameViewerState: (updater) => {
				viewerState =
					typeof updater === "function"
						? updater(viewerState)
						: updater;
			},
		});

		assert.equal(logic.smartImportInputReady, true);
		assert.equal(logic.patientImportInputReady, true);
		assert.equal(logic.clinicProfileSaveButtonText, "Профиль сохранен");
		assert.equal(logic.migrationProgressItems.length, 4);

		// Реальный вызов действий доменных хуков (не typeof === "function")
		logic.updateDicomFirstFrameViewerState((prev) => ({ ...prev, brightness: 120 }));
		assert.equal(viewerState.brightness, 120);

		const summary = logic.clinicLookupSuggestionApplySummary({
			clinicName: "ООО Стоматология",
			phone: "+7 495 123-45-67",
		});
		assert.equal(typeof summary, "string");
		assert.ok(summary.includes("Будет подставлено полей: 2"));

		logic.applyClinicLookupSuggestion({
			clinicName: "ООО Стоматология",
			phone: "+7 495 123-45-67",
		});
		assert.equal(updatedProfile.clinicName, "ООО Стоматология");
		assert.equal(updatedProfile.phone, "+7 495 123-45-67");

		assert.equal(
			logic.migrationCandidatePreviewReady({
				sourceRef: "browser-local:patients",
				safeDisplayName: "patients.csv",
				sourceKind: "spreadsheet_export",
				sourceLabel: "patients.csv",
				sourceFingerprint: "fp-test-1",
				depth: 1,
				confidence: 0.9,
				matchedFiles: 1,
				databaseFiles: 0,
				dumpFiles: 0,
				tableFiles: 1,
				archiveFiles: 0,
				dicomLikeFiles: 0,
				imageFiles: 0,
				hasDicomDir: false,
				latestModifiedAt: null,
				reasons: ["Таблица CSV"],
				warnings: [],
				smartImportLine: "spreadsheet_export:patients.csv",
			}),
			true,
		);
	});

	it("2. Patient import template and pricelist template are strictly separated and carry valid domain columns", () => {
		assert.ok(STANDARD_PATIENT_IMPORT_TEMPLATE.includes("ФИО;Телефон;Дата рождения"));
		assert.ok(!STANDARD_PATIENT_IMPORT_TEMPLATE.includes("A16.07.002"));
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("Код;Наименование;Категория;Цена"));
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("Терапия"));
		assert.ok(STANDARD_CLINICAL_PRICELIST_TEMPLATE.includes("A16.07.002"));
	});

	it("3. MigrationPreviewSection separates patient template button from pricelist template button by target", () => {
		const patientsHtml = renderToString(
			React.createElement(
				MigrationPreviewSection,
				makeBasePreviewProps({ documentIngestionTarget: "patients" }),
			),
		);
		assert.ok(patientsHtml.includes('data-testid="load-standard-patients-btn"'));
		assert.equal(patientsHtml.includes('data-testid="load-standard-pricelists-btn"'), false);

		const pricelistHtml = renderToString(
			React.createElement(
				MigrationPreviewSection,
				makeBasePreviewProps({ documentIngestionTarget: "pricelist" }),
			),
		);
		assert.ok(pricelistHtml.includes('data-testid="load-standard-pricelists-btn"'));
		assert.ok(pricelistHtml.includes("Загрузить типовой прейскурант"));
	});

	it("4. MigrationDiscoverySection groups backend sourceKind enums under database/dicom/tabular filters", () => {
		const candidates: MigrationLocalSourceDiscoveryCandidate[] = [
			{
				sourceRef: "migration-source:fp-db",
				safeDisplayName: "clinic_old.fdb",
				sourceKind: "firebird_database",
				sourceLabel: "clinic_old.fdb",
				sourceFingerprint: "fp-db",
				depth: 1,
				confidence: 0.91,
				matchedFiles: 1,
				databaseFiles: 1,
				dumpFiles: 0,
				tableFiles: 0,
				archiveFiles: 0,
				dicomLikeFiles: 0,
				imageFiles: 0,
				hasDicomDir: false,
				latestModifiedAt: null,
				reasons: ["База Firebird"],
				warnings: [],
				smartImportLine: "firebird_database:clinic_old.fdb",
			},
			{
				sourceRef: "migration-source:fp-dicom",
				safeDisplayName: "PACS Archive",
				sourceKind: "pacs_dicom",
				sourceLabel: "PACS Archive",
				sourceFingerprint: "fp-dicom",
				depth: 1,
				confidence: 0.88,
				matchedFiles: 120,
				databaseFiles: 0,
				dumpFiles: 0,
				tableFiles: 0,
				archiveFiles: 0,
				dicomLikeFiles: 120,
				imageFiles: 0,
				hasDicomDir: true,
				latestModifiedAt: null,
				reasons: ["DICOM каталог"],
				warnings: [],
				smartImportLine: "pacs_dicom:PACS Archive",
			},
			{
				sourceRef: "migration-source:fp-csv",
				safeDisplayName: "patients.xlsx",
				sourceKind: "spreadsheet_export",
				sourceLabel: "patients.xlsx",
				sourceFingerprint: "fp-csv",
				depth: 1,
				confidence: 0.95,
				matchedFiles: 1,
				databaseFiles: 0,
				dumpFiles: 0,
				tableFiles: 1,
				archiveFiles: 0,
				dicomLikeFiles: 0,
				imageFiles: 0,
				hasDicomDir: false,
				latestModifiedAt: null,
				reasons: ["Таблица Excel"],
				warnings: [],
				smartImportLine: "spreadsheet_export:patients.xlsx",
			},
		];

		const html = renderToString(
			React.createElement(MigrationDiscoverySection, {
				typedMigrationSourceDiscovery: {
					version: "dental-crm-migration-local-discovery-v1",
					generatedAt: "2026-11-27T12:00:00.000Z",
					roots: ["C:\\Clinic"],
					candidates,
					scannedFolders: 12,
					warnings: [],
					nextAction: "Выберите источник",
				},
				typedMigrationDiscoveryCandidates: candidates,
				migrationAutopilot: null,
				isMigrationSourceWorkupLoading: false,
				isMigrationSourceProbeLoading: false,
				isSmartImportLoading: false,
				planMigrationDiscoveryCandidate: () => {},
				probeMigrationDiscoveryCandidate: () => {},
				addMigrationDiscoveryCandidateToSmartImport: () => {},
				previewMigrationDiscoveryCandidate: () => {},
				migrationCandidatePreviewReady: () => true,
				migrationCandidatePreviewHint: () => "",
				migrationSourceDisplayName: (c) => c.sourceLabel,
				migrationSourceKindLabel: (k) => k,
				formatDateTime: (v) => String(v),
			}),
		);

		assert.ok(html.includes("Базы данных"));
		assert.ok(html.includes("КТ / Снимки"));
		assert.ok(html.includes("Таблицы / Excel"));
		// Все 3 группы имеют ровно по 1 кандидату — без правки фильтра count был бы 0 и "(1)" не отрисовался
		const normalizedHtml = html.replaceAll("<!-- -->", "");
		assert.equal((normalizedHtml.match(/\(1\)/g) ?? []).length, 3);
	});

	it("5. MigrationSourcePanel stays free of alien brands (IDENT, DentalPRO, StomX)", () => {
		const html = renderToString(
			React.createElement(MigrationSourcePanel, {
				busy: false,
				allowLlm: false,
				onAllowLlmChange: () => {},
				fileInputRef: { current: null },
				onFile: () => {},
			}),
		);

		assert.equal(html.includes("IDENT"), false);
		assert.equal(html.includes("DentalPRO"), false);
		assert.equal(html.includes("StomX"), false);
		assert.ok(html.includes("Универсальный Excel"));
		assert.ok(html.includes("Выгрузка из медицинской системы"));
	});
});
