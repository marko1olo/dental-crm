/**
 * ============================================================================
 * SANPIN CONSOLIDATED INSPECTION BINDER & LIVE REGISTERS TEST SUITE
 * Verifies live data binding, statutory empty state rendering, equipment fleet
 * inclusion, absence of mock data, and canonical print HTML generation.
 * ============================================================================
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	exportSanpinConsolidatedArchiveToCsv,
	generateGeneralCleaningJournalPrintHtml,
	generateSanpinConsolidatedInspectionHtml,
	type ConsolidatedSanpinJournalData,
	type GeneralCleaningJournalRecord,
} from "@dental/shared";

describe("SanPiN Consolidated Inspection Binder & Statutory Registers", () => {
	const mockClinicLegal = {
		name: "ООО Стоматология ДЕНТЕ",
		licenseNumber: "ЛО-77-01-018920",
		address: "г. Москва, ул. Клиническая, д. 10",
		chiefDoctor: "Иванов И.И.",
		headNurse: "Смирнова А.В.",
		ogrn: "1027700123456",
		inn: "7701234567",
		volumeNumber: 1,
	};

	describe("1. Statutory Empty State Handling (Zero Fake Mocks)", () => {
		it("renders statutory empty notices and equipment fleet when logs are empty", () => {
			const emptyConsolidatedData: ConsolidatedSanpinJournalData = {
				clinicInfo: mockClinicLegal,
				periodLabelRu: "с 01.09.2026 по 04.09.2026",
				totalPagesCount: 7,
				psoRecords: [],
				form257Records: [],
				bactericidalSessions: [],
				generalCleanings: [],
				temperatureLogs: [],
				sterilizerEquipments: [
					{
						id: "ster-01",
						name: "Автоклав Melag Vacuklav 23B+",
						brandModel: "Melag Vacuklav 23B+",
						serialNumber: "SN-2024-MEL-9921",
						deviceType: "steam_autoclave",
						chamberVolumeLiters: 22,
						inventoryNumber: "ИНВ-MELAG-01",
						lastMaintenanceDate: "2026-06-10",
						nextMaintenanceDate: "2026-12-10",
						status: "active",
					},
				],
				bactericidalEquipments: [
					{
						id: "bac-01",
						roomName: "Кабинет №1 (Терапия)",
						roomVolumeM3: 60,
						deviceBrand: "Дезар-4",
						serialNumber: "DZ-2023-4412",
						deviceType: "recirculator_closed",
						lampType: "TUV 15W Philips",
						lampCount: 3,
						maxLampHours: 9000,
						totalOperatingHours: 1240,
						remainingLampHours: 7760,
						remainingLampPercent: 86,
						lampStatus: "normal",
						isLampCritical: false,
					},
				],
			};

			const html = generateSanpinConsolidatedInspectionHtml(emptyConsolidatedData);

			// Must contain clinic legal info
			assert.ok(html.includes("ООО Стоматология ДЕНТЕ"));
			assert.ok(html.includes("ЛО-77-01-018920"));
			assert.ok(html.includes("с 01.09.2026 по 04.09.2026"));

			// Must render equipment fleet tables even if logs are empty
			assert.ok(html.includes("Melag Vacuklav 23B+"));
			assert.ok(html.includes("SN-2024-MEL-9921"));
			assert.ok(html.includes("Дезар-4"));
			assert.ok(html.includes("DZ-2023-4412"));

			// Must render statutory empty banners for logs
			assert.ok(html.includes("Записи предстерилизационной очистки за отчетный период отсутствуют"));
			assert.ok(html.includes("Записи циклов стерилизации за отчетный период отсутствуют"));
			assert.ok(html.includes("Сеансы работы установок за отчетный период отсутствуют"));
			assert.ok(html.includes("Записи проведения генеральных уборок за отчетный период отсутствуют"));
			assert.ok(html.includes("Записи контроля температурного режима за отчетный период отсутствуют"));

			// Must NOT contain any hardcoded August 2026 mock IDs
			assert.ok(!html.includes("PSO-20260822-0101"));
			assert.ok(!html.includes("F257-20260822-01"));
			assert.ok(!html.includes("clean-01"));
			assert.ok(!html.includes("temp-01"));
		});

		it("exports statutory empty notices and equipment fleet to CSV without throwing", () => {
			const emptyConsolidatedData: ConsolidatedSanpinJournalData = {
				clinicInfo: mockClinicLegal,
				periodLabelRu: "с 01.09.2026 по 04.09.2026",
				totalPagesCount: 7,
				psoRecords: [],
				form257Records: [],
				bactericidalSessions: [],
				generalCleanings: [],
				temperatureLogs: [],
				sterilizerEquipments: [
					{
						id: "ster-01",
						name: "Автоклав Melag Vacuklav 23B+",
						brandModel: "Melag Vacuklav 23B+",
						serialNumber: "SN-2024-MEL-9921",
						deviceType: "steam_autoclave",
						chamberVolumeLiters: 22,
						inventoryNumber: "ИНВ-MELAG-01",
						status: "active",
					},
				],
				bactericidalEquipments: [
					{
						id: "bac-01",
						roomName: "Кабинет №1 (Терапия)",
						roomVolumeM3: 60,
						deviceBrand: "Дезар-4",
						serialNumber: "DZ-2023-4412",
						deviceType: "recirculator_closed",
						lampType: "TUV 15W Philips",
						lampCount: 3,
						maxLampHours: 9000,
						totalOperatingHours: 1240,
						remainingLampHours: 7760,
						remainingLampPercent: 86,
						lampStatus: "normal",
						isLampCritical: false,
					},
				],
			};

			const csv = exportSanpinConsolidatedArchiveToCsv(emptyConsolidatedData);

			assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
			assert.ok(csv.includes("Melag Vacuklav 23B+"));
			assert.ok(csv.includes("Дезар-4"));
			assert.ok(csv.includes("Записи за отчетный период отсутствуют"));
			assert.ok(csv.includes("Записи циклов стерилизации отсутствуют"));
			assert.ok(csv.includes("Сеансы работы установок отсутствуют"));
			assert.ok(csv.includes("Записи генеральных уборок отсутствуют"));
			assert.ok(csv.includes("Записи температурного режима отсутствуют"));

			// Absence of mock records
			assert.ok(!csv.includes("PSO-20260822-0101"));
			assert.ok(!csv.includes("F257-20260822-01"));
		});
	});

	describe("2. General Cleaning Statutory Print HTML", () => {
		it("generates statutory SanPiN 3.3686-21 print HTML for general cleaning register", () => {
			const cleanings: GeneralCleaningJournalRecord[] = [
				{
					id: "gc-101",
					scheduledDate: "2026-09-01",
					actualDateTime: "2026-09-01T10:00:00Z",
					roomName: "Кабинет №1 (Терапия)",
					roomType: "surgical",
					treatedAreaM2: 24,
					disinfectantName: "Аламинол",
					activeIngredient: "ЧАС + Амины",
					solutionConcentrationPercent: 5,
					applicationMethodRu: "Двукратное протирание",
					exposureTimeMinutes: 60,
					uvIrradiationMinutes: 120,
					ventilationMinutes: 15,
					operatorStaffFullName: "Смирнова А.В.",
					isInspectorVerified: true,
					inspectorStaffFullName: "Иванов И.И.",
					status: "verified_by_inspector",
				},
			];

			const printHtml = generateGeneralCleaningJournalPrintHtml({
				records: cleanings,
				clinicInfo: mockClinicLegal,
			});

			assert.ok(printHtml.includes("ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК"));
			assert.ok(printHtml.includes("СанПиН 3.3686-21"));
			assert.ok(printHtml.includes("ООО Стоматология ДЕНТЕ"));
			assert.ok(printHtml.includes("Кабинет №1 (Терапия)"));
			assert.ok(printHtml.includes("Аламинол"));
			assert.ok(printHtml.includes("Смирнова А.В."));
		});

		it("generates statutory empty notice when no cleanings are recorded", () => {
			const printHtml = generateGeneralCleaningJournalPrintHtml({
				records: [],
				clinicInfo: mockClinicLegal,
			});

			assert.ok(printHtml.includes("ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК"));
			assert.ok(printHtml.includes("Записи за выбранный период отсутствуют"));
		});
	});
});
