/**
 * @file cabinetReadinessDecomposition.test.ts
 * @description Integration & Execution Suite for CabinetReadinessTab Decomposition
 * (Mandates 8b, 8d, 8e, SanPiN 3.3686-21).
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateLampOperatingHours,
	createCabinetReadinessRecord,
	createDefaultPaperJournalCabinetRecord,
	evaluateCabinetReadiness,
	exportCabinetReadinessToCsv,
	generateCabinetReadinessPrintHtml,
	getCabinetReadinessPreset,
} from "@dental/shared";
import { CabinetReadinessTab } from "../CabinetReadinessTab.js";
import {
	CabinetBactericidalTimer,
	CabinetReadinessActions,
	CabinetReadinessHistoryTable,
	CabinetReadinessStatusHeader,
	CabinetSanpinChecklist,
	useCabinetReadinessState,
} from "../cabinetReadiness/index.js";

describe("CabinetReadinessTab Monolith Decomposition & SanPiN Autonomy (Mandates 8b, 8e)", () => {
	it("1. Public exports are preserved on facade and barrel", () => {
		assert.equal(typeof CabinetReadinessTab, "function");
		assert.equal(typeof CabinetReadinessStatusHeader, "function");
		assert.equal(typeof CabinetSanpinChecklist, "function");
		assert.equal(typeof CabinetBactericidalTimer, "function");
		assert.equal(typeof CabinetReadinessActions, "function");
		assert.equal(typeof CabinetReadinessHistoryTable, "function");
		assert.equal(typeof useCabinetReadinessState, "function");
	});

	it("2. Domain Logic: Cabinet readiness evaluation, 1-click record creation and lamp hours math", () => {
		const preset = getCabinetReadinessPreset("therapy");
		assert.equal(preset.type, "therapy");
		assert.equal(preset.requiresCofferdam, true);

		const evalReady = evaluateCabinetReadiness({
			appointmentType: "therapy",
			surfaceDisinfection: { isCompleted: true, disinfectantBrand: "Бациллол АФ", exposureMinutes: 3 },
			handpiecesSterility: {
				isCompleted: true,
				turbineHandpieceSterile: true,
				contraAngleHandpieceSterile: true,
				class5IndicatorsVerified: true,
				packageIntegrityVerified: true,
			},
			sterileTray: {
				isCompleted: true,
				mirrorReady: true,
				probeReady: true,
				tweezersReady: true,
				excavatorReady: true,
				spatulaPluggerReady: true,
			},
			aspirationSystem: {
				isCompleted: true,
				salivaEjectorConnected: true,
				hveVacuumConnected: true,
				bacterialFilterChecked: true,
			},
			isolationCofferdam: {
				isCompleted: true,
				rubberDamSheetReady: true,
				clampsReady: true,
				forcepsReady: true,
			},
		});
		assert.equal(evalReady.isFullyReady, true);
		assert.equal(evalReady.missingItems.length, 0);

		const paperNorm = createDefaultPaperJournalCabinetRecord({
			cabinetNumber: "Кабинет № 1",
			appointmentType: "therapy",
			operatorStaffFullName: "Ассистент стоматолога",
		});
		assert.equal(paperNorm.isFullyReady, true);
		assert.equal(paperNorm.digitalStampHash.length > 0, true);

		const lampCalc = calculateLampOperatingHours(1420, 30, 8000);
		assert.equal(lampCalc.sessionHours, 0.5);
		assert.equal(lampCalc.cumulativeHoursAfterSession, 1420.5);
		assert.equal(lampCalc.lampStatus, "normal");
	});

	it("3. Mandates 8e & 8n: Anti-Tamagotchi Law — Cabinet readiness has executive background auto-calculation", () => {
		const unfilledDefault = evaluateCabinetReadiness({
			appointmentType: "therapy",
			nurseBypassedPaperLog: true,
		});
		assert.equal(unfilledDefault.isFullyReady, true);
		assert.equal(unfilledDefault.missingItems.length, 0);
	});

	it("4. Reporting & Exports: CSV and Print HTML generators produce valid document structures", () => {
		const record = createCabinetReadinessRecord({
			cabinetNumber: "Кабинет № 2",
			appointmentType: "surgery",
			operatorStaffFullName: "Медсестра Сидорова А.И.",
			operatorStaffPosition: "Медицинская сестра",
			surfaceDisinfection: { isCompleted: true, disinfectantBrand: "Дезефект", exposureMinutes: 15 },
			handpiecesSterility: { isCompleted: true, turbineHandpieceSterile: true, contraAngleHandpieceSterile: true, micromotorHandpieceSterile: true, class5IndicatorsVerified: true, packageIntegrityVerified: true },
			sterileTray: { isCompleted: true, mirrorReady: true, probeReady: true, tweezersReady: true, excavatorReady: true, spatulaPluggerReady: true },
			aspirationSystem: { isCompleted: true, salivaEjectorConnected: true, hveVacuumConnected: true, bacterialFilterChecked: true },
			isolationCofferdam: { isCompleted: true, rubberDamSheetReady: false, clampsReady: false, forcepsReady: false, isNotRequiredForProfile: true },
			notes: "Хирургический приём готов",
		});

		const csv = exportCabinetReadinessToCsv([record]);
		assert.equal(csv.includes("Кабинет № 2"), true);
		assert.equal(csv.includes("Сидорова А.И."), true);

		const html = generateCabinetReadinessPrintHtml({ records: [record] });
		assert.equal(html.includes("Журнал экспресс-контроля готовности кабинетов"), true);
		assert.equal(html.includes("Кабинет № 2"), true);
	});
});
