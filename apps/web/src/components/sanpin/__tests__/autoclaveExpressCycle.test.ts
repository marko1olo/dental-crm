import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	AutoclaveNewCycleTab,
	EXPRESS_CYCLE_DEFAULTS,
	computeExpressStandardCycleValues,
	resolveAutoclaveCycleFallbacks,
} from "../autoclaveLog/AutoclaveNewCycleTab.js";
import {
	createForm257Record,
	evaluateCycleParameters,
	exportForm257ToCsv,
	generateForm257PrintHtml,
	type Form257Record,
} from "../autoclaveLog/autoclaveLogEngine.js";

describe("SanPiN 3.3686-21 — Autoclave 1-Click Express Standard Cycle (Mandates 8e, 8k, 8n)", () => {
	describe("1. Express Standard Cycle Parameter Initialization (computeExpressStandardCycleValues)", () => {
		it("initializes statutory Class B 134°C / 5 min parameters in 1 click", () => {
			const filled = computeExpressStandardCycleValues({
				currentPacksCount: 0,
				currentOperatorName: "",
				defaultOperatorName: "Смирнова Анна Викторовна (Медсестра ЦСО)",
			});

			assert.equal(filled.selectedRegimeId, "steam_134_5min");
			assert.equal(filled.actualTemp, 134);
			assert.equal(filled.actualPressure, 2.1);
			assert.equal(filled.actualTime, 5);
			assert.equal(
				filled.itemsDescription,
				"Наконечники турбинные и угловые, смотровые лотки (зеркала, зонды, пинцеты), хирургический инструмент",
			);
			assert.equal(filled.packsCount, 14);
			assert.equal(filled.packagingType, "kraft_pouch_sealed");
			assert.equal(filled.operatorFullName, "Смирнова Анна Викторовна (Медсестра ЦСО)");

			// All 5 chamber points set to passed
			assert.equal(filled.chamberPoints.length, 5);
			for (const pt of filled.chamberPoints) {
				assert.equal(pt.status, "passed");
				assert.ok(pt.actualColorRu.length > 0);
			}
		});

		it("preserves existing packs count when already greater than zero", () => {
			const filled = computeExpressStandardCycleValues({
				currentPacksCount: 28,
				currentOperatorName: "Кузнецова Е.В.",
			});

			assert.equal(filled.packsCount, 28);
			assert.equal(filled.operatorFullName, "Кузнецова Е.В.");
			assert.equal(filled.selectedRegimeId, "steam_134_5min");
			assert.equal(filled.actualTemp, 134);
			assert.equal(filled.actualPressure, 2.1);
			assert.equal(filled.actualTime, 5);
		});

		it("falls back to statutory default operator when none provided", () => {
			const filled = computeExpressStandardCycleValues({});
			assert.equal(filled.operatorFullName, EXPRESS_CYCLE_DEFAULTS.defaultOperatorName);
			assert.equal(filled.packsCount, 14);
		});

		it("verifies physical sensor readings strictly match SanPiN tolerance", () => {
			const filled = computeExpressStandardCycleValues({});
			const compliance = evaluateCycleParameters(filled.selectedRegimeId, {
				actualTemperatureCelsius: filled.actualTemp,
				actualPressureBar: filled.actualPressure,
				actualExposureMinutes: filled.actualTime,
			});

			assert.equal(compliance.isCompliant, true);
			assert.equal(compliance.isTempCompliant, true);
			assert.equal(compliance.isPressureCompliant, true);
			assert.equal(compliance.isTimeCompliant, true);
			assert.equal(compliance.failureReasons.length, 0);
		});
	});

	describe("2. Unhindered Cycle Record Saving with Default Fallbacks (Mandate 8e)", () => {
		it("resolves operator name fallback to defaultOperatorName or 'Дежурный ассистент'", () => {
			// When both operator and default are empty:
			const fallbackGeneral = resolveAutoclaveCycleFallbacks({
				operatorFullName: "   ",
				defaultOperatorName: "   ",
				itemsDescription: "",
				packsCount: 0,
			});
			assert.equal(fallbackGeneral.operatorStaffFullName, "Дежурный ассистент");

			// When defaultOperatorName is provided:
			const fallbackDefault = resolveAutoclaveCycleFallbacks({
				operatorFullName: "",
				defaultOperatorName: "Петрова М.С. (Ассистент)",
			});
			assert.equal(fallbackDefault.operatorStaffFullName, "Петрова М.С. (Ассистент)");

			// When operatorFullName is explicitly typed:
			const customOp = resolveAutoclaveCycleFallbacks({
				operatorFullName: "Иванов И.И.",
				defaultOperatorName: "Петрова М.С.",
			});
			assert.equal(customOp.operatorStaffFullName, "Иванов И.И.");
		});

		it("resolves itemsDescription fallback to standard set description", () => {
			const fallbackItems = resolveAutoclaveCycleFallbacks({
				itemsDescription: "    ",
			});
			assert.equal(
				fallbackItems.itemsDescriptionRu,
				"Смотровые лотки и наконечники (стандартный набор)",
			);

			const customItems = resolveAutoclaveCycleFallbacks({
				itemsDescription: "Хирургические элеваторы и кюреты",
			});
			assert.equal(customItems.itemsDescriptionRu, "Хирургические элеваторы и кюреты");
		});

		it("resolves packsCount fallback to 1 when count is 0 or negative", () => {
			const zeroPacks = resolveAutoclaveCycleFallbacks({ packsCount: 0 });
			assert.equal(zeroPacks.packsCount, 1);

			const negativePacks = resolveAutoclaveCycleFallbacks({ packsCount: -5 });
			assert.equal(negativePacks.packsCount, 1);

			const positivePacks = resolveAutoclaveCycleFallbacks({ packsCount: 16 });
			assert.equal(positivePacks.packsCount, 16);
		});
	});

	describe("3. SanPiN 3.3686-21 Statutory Form № 257/у Compliance", () => {
		it("creates a 100% compliant Form 257/у record from express fill values", () => {
			const filled = computeExpressStandardCycleValues({});
			const record = createForm257Record({
				date: "2026-09-06",
				cycleNumber: 1,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: filled.selectedRegimeId,
				sensors: {
					actualTemperatureCelsius: filled.actualTemp,
					actualPressureBar: filled.actualPressure,
					actualExposureMinutes: filled.actualTime,
				},
				itemsDescriptionRu: filled.itemsDescription,
				packsCount: filled.packsCount,
				packagingType: filled.packagingType,
				chamberPoints: filled.chamberPoints,
				operatorStaffFullName: filled.operatorFullName,
				isHeadNurseVerified: true,
			});

			assert.equal(record.isCyclePassed, true);
			assert.equal(record.status, "sterile_passed");
			assert.equal(record.areAllPointsPassed, true);
			assert.equal(record.rejectionReason, undefined);
			assert.equal(record.regimeId, "steam_134_5min");
			assert.equal(record.shelfLifeDays, 60); // kraft_pouch_sealed gives 60 days
			assert.ok(record.id.startsWith("F257-20260906-"));
			assert.ok(record.digitalStampHash.startsWith("DENTE-CSO-257-"));
		});

		it("creates a 100% compliant Form 257/у record using fallback defaults without typing", () => {
			const fallbacks = resolveAutoclaveCycleFallbacks({});
			const express = computeExpressStandardCycleValues({});

			const record = createForm257Record({
				date: "2026-09-06",
				cycleNumber: 2,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: express.selectedRegimeId,
				sensors: {
					actualTemperatureCelsius: express.actualTemp,
					actualPressureBar: express.actualPressure,
					actualExposureMinutes: express.actualTime,
				},
				itemsDescriptionRu: fallbacks.itemsDescriptionRu,
				packsCount: fallbacks.packsCount,
				packagingType: express.packagingType,
				chamberPoints: express.chamberPoints,
				operatorStaffFullName: fallbacks.operatorStaffFullName,
			});

			assert.equal(record.isCyclePassed, true);
			assert.equal(record.status, "sterile_passed");
			assert.equal(record.itemsDescriptionRu, "Смотровые лотки и наконечники (стандартный набор)");
			assert.equal(record.operatorStaffFullName, "Дежурный ассистент");
			assert.equal(record.packsCount, 1);

			// Verify export to official CSV works without defects
			const csv = exportForm257ToCsv([record]);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("Смотровые лотки и наконечники (стандартный набор)"));
			assert.ok(csv.includes("Дежурный ассистент"));
			assert.ok(csv.includes("СТЕРИЛЬНО"));

			// Verify export to official Printable A4 HTML works
			const html = generateForm257PrintHtml([record]);
			assert.ok(html.includes("Форма № 257/у"));
			assert.ok(html.includes("СТЕРИЛЬНО"));
			assert.ok(html.includes("Смотровые лотки и наконечники (стандартный набор)"));
		});
	});

	describe("4. React UI Component Autonomy & Ergonomics Audit (Mandates 8e, 8d)", () => {
		it("renders AutoclaveNewCycleTab with express cycle button and non-disabled submit button", () => {
			let savedRecord: Form257Record | null = null;
			const html = renderToString(
				React.createElement(AutoclaveNewCycleTab, {
					onSaveRecord: (r) => {
						savedRecord = r;
					},
					defaultOperatorName: "Смирнова А.В.",
				}),
			);

			// 1. Prominent Express button is rendered with official text
			assert.ok(
				html.includes("Экспресс-заполнение: Стандартный цикл (134°C / 5 мин / 14 упаковок)"),
				"Express standard cycle button must be rendered",
			);
			assert.ok(
				html.includes('data-testid="express-standard-cycle-btn"'),
				"Express button must have data-testid",
			);

			// 2. Submit button is NOT disabled by default (Mandate 8e Doctor & Nurse Autonomy)
			// In React SSR, a disabled button outputs `disabled=""` or `disabled` attribute.
			// The submit button must NOT have disabled.
			const submitBtnMatch = html.match(/<button[^>]*type="submit"[^>]*>/);
			assert.ok(submitBtnMatch, "Submit button must exist in HTML");
			const submitBtnTag = submitBtnMatch[0];
			assert.equal(
				submitBtnTag.includes("disabled"),
				false,
				"Submit button must NEVER be disabled by default (Mandate 8e)",
			);

			// 3. Touch target minimum height >= 44px
			assert.ok(
				submitBtnTag.includes("min-height:44px") || submitBtnTag.includes("min-height: 44px"),
				"Submit button must have min-height >= 44px",
			);

			// 4. Zero emojis in the document/form (strict Lucide SVG icons only)
			const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html);
			assert.equal(hasEmojis, false, "SanPiN medical forms must contain zero emojis (Lucide icons only)");
		});
	});
});
