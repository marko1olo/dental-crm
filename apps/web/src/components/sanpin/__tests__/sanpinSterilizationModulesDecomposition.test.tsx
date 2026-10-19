import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	SANPIN_STERILIZATION_REGIMES,
	SANPIN_PACKAGING_MATERIALS,
	validateSterilizationCycleParameters,
	calculatePackageExpiryDate,
	type SterilizationLogRecord,
} from "@dental/shared";

import {
	CycleParametersForm,
	PouchBarcodeScanner,
	CycleChemicalIndicatorSelect,
	SterilizationCycleModal as ModularSterilizationModal,
	STATUTORY_REGIMES_OPTIONS,
	STATUTORY_PACKAGING_PRESETS,
	INITIAL_5_POINTS,
} from "../sterilizationModules";

import { SterilizationCycleModal } from "../SterilizationCycleModal";

import {
	AutoclaveCycleRowItem,
	AutoclaveIndicatorBadge,
	AutoclaveRegisterRows,
} from "../autoclave";

describe("SanPiN 3.3686-21 — Sterilization Cycle & Autoclave Register Decomposed Architecture (Mandates 8b, 8d, 8e)", () => {
	it("verifies public export parity and component definitions", () => {
		assert.equal(typeof SterilizationCycleModal, "function");
		assert.equal(typeof ModularSterilizationModal, "function");
		assert.equal(typeof CycleParametersForm, "function");
		assert.equal(typeof PouchBarcodeScanner, "function");
		assert.equal(typeof CycleChemicalIndicatorSelect, "function");
		assert.equal(typeof AutoclaveCycleRowItem, "function");
		assert.equal(typeof AutoclaveIndicatorBadge, "function");
		assert.equal(typeof AutoclaveRegisterRows, "function");
	});

	it("verifies facade SterilizationCycleModal.tsx line count is strictly <= 50 lines", () => {
		const facadePath = path.resolve(process.cwd(), "apps/web/src/components/sanpin/SterilizationCycleModal.tsx");
		assert.ok(fs.existsSync(facadePath), "Facade file must exist");
		const content = fs.readFileSync(facadePath, "utf8");
		const lineCount = content.split(/\r?\n/).length;
		assert.ok(lineCount <= 50, `Facade must be <= 50 lines, got ${lineCount}`);
	});

	it("verifies all decomposed modules in sterilizationModules are strictly <= 250 lines", () => {
		const decomposedDir = path.resolve(process.cwd(), "apps/web/src/components/sanpin/sterilizationModules");
		assert.ok(fs.existsSync(decomposedDir), "Decomposed directory must exist");
		const files = fs.readdirSync(decomposedDir);
		for (const file of files) {
			if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
			const filePath = path.join(decomposedDir, file);
			const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
			assert.ok(lines <= 250, `Module ${file} exceeds 250 lines limit (${lines} lines)`);
		}
	});

	it("verifies all decomposed autoclave register files are strictly <= 250 lines", () => {
		const dir = path.resolve(process.cwd(), "apps/web/src/components/sanpin/autoclave");
		assert.ok(fs.existsSync(dir), "Autoclave directory must exist");
		const files = ["AutoclaveRegisterRows.tsx", "AutoclaveCycleRowItem.tsx", "AutoclaveIndicatorBadge.tsx"];
		for (const file of files) {
			const filePath = path.join(dir, file);
			assert.ok(fs.existsSync(filePath), `File ${file} must exist`);
			const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
			assert.ok(lines <= 250, `File ${file} exceeds 250 lines limit (${lines} lines)`);
		}
	});

	it("renders CycleParametersForm and binds SanPiN normative regimes", () => {
		const regime = STATUTORY_REGIMES_OPTIONS[0]!;
		const html = renderToStaticMarkup(
			<CycleParametersForm
				cycleDate="2026-10-12"
				onCycleDateChange={() => {}}
				cycleTime="10:30"
				onCycleTimeChange={() => {}}
				cycleNumber={4}
				onCycleNumberChange={() => {}}
				selectedDeviceId="melag_vacuklav_23b"
				onDeviceChange={() => {}}
				clinicDevices={[]}
				selectedRegimeId={regime.id}
				onRegimeChange={() => {}}
				selectedRegime={regime}
				actualTemp={134.5}
				onActualTempChange={() => {}}
				actualPressure={2.12}
				onActualPressureChange={() => {}}
				actualDuration={5.5}
				onActualDurationChange={() => {}}
				onFillNormIn1Click={() => {}}
			/>
		);

		assert.ok(html.includes("Стерилизационный аппарат клиники"), "Must have apparatus section");
		assert.ok(html.includes("134"), "Must contain 134 deg option");
		assert.ok(html.includes("121"), "Must contain 121 deg option");
		assert.ok(html.includes("Заполнить нормой"), "Must have fill norm action");
	});

	it("renders PouchBarcodeScanner with kraft packaging and barcode controls", () => {
		const packaging = STATUTORY_PACKAGING_PRESETS[0]!;
		const html = renderToStaticMarkup(
			<PouchBarcodeScanner
				itemsDescription="Базовый набор терапевта"
				onItemsDescriptionChange={() => {}}
				packsCount={10}
				onPacksCountChange={() => {}}
				packagingPresetId={packaging.id}
				onPackagingPresetIdChange={() => {}}
				selectedPackaging={packaging}
				expiryDateStr="11.11.2026 (до 30 сут.)"
				scannedBarcode="KP-20261012-004"
				onScannedBarcodeChange={() => {}}
				operatorName="Иванова А. С."
				onOperatorNameChange={() => {}}
			/>
		);

		assert.ok(html.includes("Стерилизуемые изделия"), "Must have items section");
		assert.ok(html.includes("KP-20261012-004"), "Must render current barcode");
		assert.ok(html.includes("Сгенерировать"), "Must render barcode generation button");
		assert.ok(html.includes("Иванова А. С."), "Must render operator name");
	});

	it("renders CycleChemicalIndicatorSelect with 5-point chamber and PSO controls", () => {
		const html = renderToStaticMarkup(
			<CycleChemicalIndicatorSelect
				recommendedIndicatorName="Медтест ВИНАР КТ-5 (134°C / 5 мин)"
				indicatorExternalPassed={true}
				onIndicatorExternalPassedChange={() => {}}
				chamberPoints={INITIAL_5_POINTS}
				onToggleChamberPoint={() => {}}
				psoAzopyramNegative={true}
				onPsoAzopyramChange={() => {}}
				psoPhenolphthaleinNegative={true}
				onPsoPhenolphthaleinChange={() => {}}
				psoSampleSize={3}
				onPsoSampleSizeChange={() => {}}
				isCycleSterileCompliant={true}
			/>
		);

		assert.ok(html.includes("Предстерилизационная очистка") || html.includes("Контроль ПСО"), "Must have PSO section");
		assert.ok(html.includes("Азопирам"), "Must have azopyram indicator");
		assert.ok(html.includes("Фенолфталеин"), "Must have phenolphthalein indicator");
		assert.ok(html.includes("КТ-1"), "Must have 5 chamber test points KT-1");
		assert.ok(html.includes("КТ-5"), "Must have 5 chamber test points KT-5");
		assert.ok(html.includes("контроль качества") || html.includes("СанПиН 3.3686-21"), "Must reference quality control or statutory rule");
	});

	it("renders AutoclaveIndicatorBadge and AutoclaveCycleRowItem correctly", () => {
		const badgePassed = renderToStaticMarkup(<AutoclaveIndicatorBadge indicatorClass={5} passed={true} />);
		assert.ok(badgePassed.includes("Кл. 5"), "Must show class 5");
		assert.ok(badgePassed.includes("sanpin-tag-success"), "Must show success tag");

		const badgeFailed = renderToStaticMarkup(<AutoclaveIndicatorBadge indicatorClass={4} passed={false} />);
		assert.ok(badgeFailed.includes("Кл. 4"), "Must show class 4");
		assert.ok(badgeFailed.includes("sanpin-tag-danger"), "Must show danger tag");

		const mockLog: SterilizationLogRecord = {
			id: "a0000000-0000-0000-0000-000000000001",
			organizationId: "b0000000-0000-0000-0000-000000000001",
			cycleNumber: 12,
			deviceName: "Автоклав Melag Vacuklav 43B+",
			sterilizerType: "autoclave_steam",
			autoclaveId: "ak-01",
			temperatureCelsius: 134.5,
			pressureBar: 2.12,
			durationMin: 5,
			itemsDescription: "Стоматологический смотровой лоток",
			packagingType: "kraft_self_adhesive",
			barcode: "KP-20261012-012",
			operatorName: "Иванова А. С.",
			passedIndicator: true,
			indicatorType: "class5_integrating",
			biologicalTestResult: "not_conducted",
			status: "passed",
			timestamp: "2026-10-12T10:30:00.000Z",
			createdAt: "2026-10-12T10:30:00.000Z",
		};

		const rowHtml = renderToStaticMarkup(
			<AutoclaveCycleRowItem
				log={mockLog}
				isStamped={false}
				onStampVerification={() => {}}
				onPrintBatchPouches={() => {}}
				onPrintSinglePouch={() => {}}
				onOpenKraftForLog={() => {}}
				isMenuOpen={false}
				onToggleMenu={() => {}}
			/>
		);

		assert.ok(rowHtml.includes("№12"), "Row must render cycle number");
		assert.ok(rowHtml.includes("134.5 °C"), "Row must display cycle temperature");
		assert.ok(rowHtml.includes("Иванова"), "Row must display operator");
		assert.ok(rowHtml.includes("KP-20261012-012"), "Row must display barcode");
	});

	it("validates SSOT packaging expiry calculations and parameters validation", () => {
		const validationResult = validateSterilizationCycleParameters("steam_134_5min", 134, 2.1, 5);
		assert.equal(validationResult.isValid, true, "134C / 2.1 bar / 5 min should be valid");

		const expiry = calculatePackageExpiryDate("2026-10-12", "kraft_self_seal");
		assert.ok(expiry.expiryDateFormatted.length > 0, "Expiry date must be calculated");
		assert.ok(expiry.shelfLifeDays > 0, "Shelf life days must be positive");
	});

	it("verifies zero cartoon emojis across decomposed files (Mandate 8d pt 7)", () => {
		const dirs = [
			path.resolve(process.cwd(), "apps/web/src/components/sanpin/sterilizationModules"),
			path.resolve(process.cwd(), "apps/web/src/components/sanpin/autoclave"),
		];

		for (const dir of dirs) {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
				const content = fs.readFileSync(path.join(dir, file), "utf8");
				const match = content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
				assert.equal(match, null, `Found cartoon emoji in ${dir}/${file}`);
			}
		}
	});
});
