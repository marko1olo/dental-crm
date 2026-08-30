import assert from "node:assert";
import { describe, test } from "node:test";
import {
	SanPiNRegulatoryEngine,
	calculatePackageExpiration,
	createBactericidalEquipmentDtoSchema,
	createBactericidalLogEntryDtoSchema,
	createEmergencyBiohazardLogDtoSchema,
	createGeneralCleaningLogDtoSchema,
	createMedicalWasteLogDtoSchema,
	createPsoCleaningLogDtoSchema,
	createSterilizationLogDtoSchema,
	createTemperatureHumidityEquipmentDtoSchema,
	createTemperatureHumidityLogDtoSchema,
	generateSanpinCode128Svg,
	generateSanpinDataMatrixSvg,
	generateTsplLabel,
	generateZplLabel,
	generateSanpinConsolidatedInspectionHtml,
	exportSanpinConsolidatedArchiveToCsv,
	generateTemperatureHumidityJournalPrintHtml,
	exportTemperatureHumidityJournalToCsv,
	integerToRussianWords,
	formatRussianSheetsCount,
	KRAFT_PACKAGE_MATERIALS,
	generateSanpinShiftAutopilotBundle,
} from "../index.js";

describe("SanPiN Regulatory Engine & Shared Contracts", () => {
	// ─── 1. ПСО (Форма № 366/у) ────────────────────────────────────────────────
	describe("1. Pre-sterilization Cleaning (PSO / Форма № 366/у)", () => {
		test("approves batch when sample size is >= 1% (min 3) and both tests are negative", () => {
			// 100 items -> 1% = 1 -> min is 3
			const eval1 = SanPiNRegulatoryEngine.evaluatePsoSampling(100, 3, true, true);
			assert.strictEqual(eval1.isBatchApproved, true);
			assert.strictEqual(eval1.samplingSatisfied, true);
			assert.strictEqual(eval1.rejectionReason, null);

			// 500 items -> 1% = 5
			const eval2 = SanPiNRegulatoryEngine.evaluatePsoSampling(500, 5, true, true);
			assert.strictEqual(eval2.isBatchApproved, true);
			assert.strictEqual(eval2.minSampleRequired, 5);
		});

		test("rejects batch if sample count is less than 1% or less than 3 items", () => {
			const evalFail = SanPiNRegulatoryEngine.evaluatePsoSampling(100, 2, true, true);
			assert.strictEqual(evalFail.isBatchApproved, false);
			assert.strictEqual(evalFail.samplingSatisfied, false);
			assert.ok(evalFail.rejectionReason?.includes("Недостаточный объем выборки"));
		});

		test("rejects batch on positive Azopyram test (blood traces detected)", () => {
			const evalBlood = SanPiNRegulatoryEngine.evaluatePsoSampling(100, 5, false, true);
			assert.strictEqual(evalBlood.isBatchApproved, false);
			assert.ok(evalBlood.rejectionReason?.includes("азопирамовая проба"));
		});

		test("rejects batch on positive Phenolphthalein test (alkaline detergent residues)", () => {
			const evalAlkali = SanPiNRegulatoryEngine.evaluatePsoSampling(100, 5, true, false);
			assert.strictEqual(evalAlkali.isBatchApproved, false);
			assert.ok(evalAlkali.rejectionReason?.includes("фенолфталеиновая проба"));
		});

		test("validates createPsoCleaningLogDtoSchema", () => {
			const valid = createPsoCleaningLogDtoSchema.safeParse({
				instrumentName: "Боры стоматологические",
				batchItemCount: 150,
				testedSampleCount: 5,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				detergentBrand: "Биолот 0.5%",
			});
			assert.strictEqual(valid.success, true);
		});
	});

	// ─── 2. Автоклавы и Стерилизаторы (Форма № 257/у) ──────────────────────────
	describe("2. Sterilizer Control & Autoclaves (Форма № 257/у)", () => {
		test("validates createSterilizationLogDtoSchema", () => {
			const valid = createSterilizationLogDtoSchema.safeParse({
				deviceName: "Melag Vacuklav 23 B+",
				sterilizerType: "autoclave_steam",
				serialNumber: "SN-98214",
				cycleNumber: 2,
				itemsDescription: "Хирургический набор №3 (щипцы, элеваторы)",
				packagingType: "kraft_heat_sealed",
				temperatureCelsius: 134,
				pressureBar: 2.15,
				durationMin: 5,
				indicatorType: "class5_integrating",
				passedIndicator: true,
				biologicalTestResult: "not_conducted",
			});
			assert.strictEqual(valid.success, true);
		});
	});

	// ─── 3. Бактерицидные облучатели и рециркуляторы ─────────────────────────
	describe("3. Bactericidal Irradiators & Recirculators", () => {
		test("calculates lamp life correctly for normal operation (<90%)", () => {
			const res = SanPiNRegulatoryEngine.calculateLampLife(3000, 8000);
			assert.strictEqual(res.remainingHours, 5000);
			assert.strictEqual(res.remainingPercent, 62.5);
			assert.strictEqual(res.status, "normal");
			assert.strictEqual(res.isCritical, false);
			assert.strictEqual(res.warningMessage, null);
		});

		test("triggers warning alert when lamp life is >= 90%", () => {
			const res = SanPiNRegulatoryEngine.calculateLampLife(7300, 8000);
			assert.strictEqual(res.status, "warning_replace_soon");
			assert.strictEqual(res.isCritical, false);
			assert.ok(res.warningMessage?.includes("Запланируйте закупку"));
		});

		test("triggers critical expired alert when lamp life is >= 100%", () => {
			const res = SanPiNRegulatoryEngine.calculateLampLife(8100, 8000);
			assert.strictEqual(res.status, "expired_replace_now");
			assert.strictEqual(res.isCritical, true);
			assert.strictEqual(res.remainingHours, 0);
			assert.ok(res.warningMessage?.includes("РЕСУРС БАКТЕРИЦИДНЫХ ЛАМП ИСЧЕРПАН"));
		});

		test("validates equipment and log entry schemas", () => {
			const equipValid = createBactericidalEquipmentDtoSchema.safeParse({
				roomName: "Кабинет №1 Терапия",
				roomVolumeM3: 45.5,
				deviceBrand: "Дезар-4",
				serialNumber: "DZ-4412",
				deviceType: "recirculator_closed",
				maxLampHours: 8000,
			});
			assert.strictEqual(equipValid.success, true);

			const logValid = createBactericidalLogEntryDtoSchema.safeParse({
				equipmentId: "a0000000-0000-0000-0000-000000000001",
				date: "2026-08-19",
				sessionStartTime: "08:00",
				sessionEndTime: "14:00",
				durationMinutes: 360,
				operatingMode: "continuous_presence",
			});
			assert.strictEqual(logValid.success, true);
		});
	});

	// ─── 4. Генеральные уборки и дезинфекция ─────────────────────────────────
	describe("4. General Cleaning & Disinfection Register", () => {
		test("validates createGeneralCleaningLogDtoSchema", () => {
			const valid = createGeneralCleaningLogDtoSchema.safeParse({
				cleaningType: "general",
				scheduledDate: "2026-08-19",
				actualDateTime: "2026-08-19T09:00:00Z",
				roomName: "Операционная / Хирургический кабинет",
				treatedAreaM2: 28.5,
				disinfectantName: "Аламинол 1.5%",
				activeIngredient: "ЧАС + Глутаровый альдегид",
				solutionConcentrationPercent: 1.5,
				applicationMethod: "wiping",
				exposureTimeMinutes: 60,
				uvIrradiationMinutes: 60,
				ventilationMinutes: 15,
				status: "completed",
			});
			assert.strictEqual(valid.success, true);
		});
	});

	// ─── 5. Медицинские отходы классов А, Б, В, Г ────────────────────────────
	describe("5. Medical Waste Register (СанПиН 2.1.3684-21)", () => {
		test("validates createMedicalWasteLogDtoSchema for Class B (Biological hazardous)", () => {
			const valid = createMedicalWasteLogDtoSchema.safeParse({
				operationType: "accumulation",
				logDate: "2026-08-19T14:30:00Z",
				wasteClass: "class_B",
				wasteDescription: "Использованные ватные валики, карпулы, перчатки, удаленные зубы",
				packageType: "yellow_bag",
				packageCount: 2,
				weightKg: 3.45,
				disinfectionMethod: "chemical_soaking",
				disinfectantUsed: "Бриллиант Классик 2%",
			});
			assert.strictEqual(valid.success, true);
		});

		test("validates createMedicalWasteLogDtoSchema for Class G (Toxicological / mercury / lamps)", () => {
			const valid = createMedicalWasteLogDtoSchema.safeParse({
				operationType: "transfer_to_disposal_company",
				logDate: "2026-08-19T16:00:00Z",
				wasteClass: "class_G",
				wasteDescription: "Отработанные бактерицидные ртутьсодержащие лампы",
				packageType: "hazard_g_container",
				packageCount: 1,
				weightKg: 1.2,
				disinfectionMethod: "none_centralized",
				disposalCompany: "ООО «ЭкоУтилизация-Мед»",
				contractNumber: "ДОГ-ЭКО-2026/88",
				transferActNumber: "АКТ-00412",
			});
			assert.strictEqual(valid.success, true);
		});
	});

	// ─── 6. Аварийные ситуации («Анти-ВИЧ») ──────────────────────────────────
	describe("6. Emergency Biohazard Protocol (Аптечка «Анти-ВИЧ»)", () => {
		test("confirms complete compliance when all steps are performed", () => {
			const evalResult = SanPiNRegulatoryEngine.evaluateBiohazardEmergencyProtocol({
				antiHivKitUsed: true,
				bloodSampled: true,
				arvRecommended: true,
				arvStartedWithin72h: true,
				chiefPhysicianNotified: true,
			});
			assert.strictEqual(evalResult.isProtocolCompliant, true);
			assert.strictEqual(evalResult.missingSteps.length, 0);
		});

		test("flags critical violations when Anti-HIV kit or ARV 72h window is omitted", () => {
			const evalResult = SanPiNRegulatoryEngine.evaluateBiohazardEmergencyProtocol({
				antiHivKitUsed: false,
				bloodSampled: false,
				arvRecommended: true,
				arvStartedWithin72h: false,
				chiefPhysicianNotified: false,
			});
			assert.strictEqual(evalResult.isProtocolCompliant, false);
			assert.strictEqual(evalResult.missingSteps.length, 4);
			assert.ok(evalResult.missingSteps.some((s) => s.includes("аптечки «Анти-ВИЧ»")));
			assert.ok(evalResult.missingSteps.some((s) => s.includes("72 часов")));
		});

		test("validates createEmergencyBiohazardLogDtoSchema", () => {
			const valid = createEmergencyBiohazardLogDtoSchema.safeParse({
				incidentDateTime: "2026-08-19T11:15:00Z",
				victimFullName: "Иванова Мария Сергеевна",
				victimRole: "Ассистент стоматолога",
				injuryType: "needle_stick",
				circumstances: "Укол карпульной иглой при надевании защитного колпачка",
				firstAidMeasures:
					"Сняты перчатки, выдавлена кровь, рана промыта водой с мылом, обработана 70% спиртом и 5% йодом, наложен пластырь",
				antiHivKitUsed: true,
				bloodSampledForTesting: true,
				arvProphylaxisRecommended: false,
				arvProphylaxisStartedWithin72h: false,
				chiefPhysicianNotified: true,
			});
			assert.strictEqual(valid.success, true);
		});
	});

	// ─── 7. Температурный режим и влажность (Приказ 706н) ─────────────────────
	describe("7. Temperature & Humidity Monitoring (Приказ 706н / 646н)", () => {
		test("validates normal temperature in refrigerator (+2..+8°C)", () => {
			const res = SanPiNRegulatoryEngine.evaluateTemperatureHumidity({
				equipmentType: "refrigerator_cold",
				targetTempMin: 2.0,
				targetTempMax: 8.0,
				actualTemp: 4.5,
			});
			assert.strictEqual(res.isWithinNorm, true);
			assert.strictEqual(res.tempViolation, false);
			assert.strictEqual(res.deviationMessage, null);
			assert.strictEqual(res.requiresEmergencyTransfer, false);
		});

		test("flags violation and emergency transfer when temperature is critical", () => {
			const res = SanPiNRegulatoryEngine.evaluateTemperatureHumidity({
				equipmentType: "refrigerator_cold",
				targetTempMin: 2.0,
				targetTempMax: 8.0,
				actualTemp: 12.5, // 4.5°C above max
			});
			assert.strictEqual(res.isWithinNorm, false);
			assert.strictEqual(res.tempViolation, true);
			assert.strictEqual(res.requiresEmergencyTransfer, true);
			assert.ok(res.deviationMessage?.includes("12.5°C вне допустимого диапазона"));
		});

		test("validates storage room temperature (15..25°C) and humidity (30..65%)", () => {
			const normal = SanPiNRegulatoryEngine.evaluateTemperatureHumidity({
				equipmentType: "storage_room",
				targetTempMin: 15.0,
				targetTempMax: 25.0,
				actualTemp: 21.0,
				targetHumidityMin: 30,
				targetHumidityMax: 65,
				actualHumidity: 48,
			});
			assert.strictEqual(normal.isWithinNorm, true);

			const highHumidity = SanPiNRegulatoryEngine.evaluateTemperatureHumidity({
				equipmentType: "storage_room",
				targetTempMin: 15.0,
				targetTempMax: 25.0,
				actualTemp: 22.0,
				targetHumidityMin: 30,
				targetHumidityMax: 65,
				actualHumidity: 78,
			});
			assert.strictEqual(highHumidity.isWithinNorm, false);
			assert.strictEqual(highHumidity.humidityViolation, true);
		});

		test("validates schemas for equipment and logs", () => {
			const equip = createTemperatureHumidityEquipmentDtoSchema.safeParse({
				equipmentType: "refrigerator_cold",
				name: "Холодильник Pozis ХФ-250 №1",
				location: "Процедурный кабинет",
				meterDeviceName: "Термометр ТМН-1",
				targetTempMinCelsius: 2.0,
				targetTempMaxCelsius: 8.0,
			});
			assert.strictEqual(equip.success, true);

			const log = createTemperatureHumidityLogDtoSchema.safeParse({
				equipmentId: "b0000000-0000-0000-0000-000000000002",
				measurementDate: "2026-08-19",
				measurementPeriod: "morning",
				temperatureCelsius: 4.2,
			});
			assert.strictEqual(log.success, true);
		});
	});

	// ─── 7. Крафт-пакеты, сроки годности и термоэтикетки (СанПиН 3.3686-21) ────
	describe("7. Kraft Packages, Sterility Expiration & Thermal Labels", () => {
		test("verifies statutory shelf lives per SanPiN 3.3686-21", () => {
			const singlePaper = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "paper_self_seal_single");
			assert.ok(singlePaper);
			assert.strictEqual(singlePaper.statutoryShelfLifeDays, 50);

			const doublePaper = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "paper_self_seal_double");
			assert.ok(doublePaper);
			assert.strictEqual(doublePaper.statutoryShelfLifeDays, 60);

			const plasticPouch = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "paper_plastic_pouch");
			assert.ok(plasticPouch);
			assert.strictEqual(plasticPouch.statutoryShelfLifeDays, 180);
		});

		test("calculates package expiration accurately across time horizons", () => {
			const packDate = new Date("2026-08-01T10:00:00Z");
			// Test 1: Active sterile package (day 10 of 50)
			const resActive = calculatePackageExpiration(packDate, "paper_self_seal_single", new Date("2026-08-11T10:00:00Z"));
			assert.strictEqual(resActive.status, "sterile_valid");
			assert.strictEqual(resActive.isExpired, false);
			assert.strictEqual(resActive.isExpiringSoon, false);
			assert.strictEqual(resActive.daysRemaining, 40);

			// Test 2: Expiring soon package (4 days remaining)
			const resExpiring = calculatePackageExpiration(packDate, "paper_self_seal_single", new Date("2026-09-16T10:00:00Z"));
			assert.strictEqual(resExpiring.status, "expiring_soon_7d");
			assert.strictEqual(resExpiring.isExpiringSoon, true);
			assert.strictEqual(resExpiring.daysRemaining, 4);

			// Test 3: Expired package
			const resExpired = calculatePackageExpiration(packDate, "paper_self_seal_single", new Date("2026-09-25T10:00:00Z"));
			assert.strictEqual(resExpired.status, "expired");
			assert.strictEqual(resExpired.isExpired, true);
		});

		test("generates vector SVG DataMatrix and Code128 barcodes", () => {
			const code128Svg = generateSanpinCode128Svg("STE-20260823-001");
			assert.ok(code128Svg.includes("<svg"));
			assert.ok(code128Svg.includes("STE-20260823-001"));

			const dataMatrixSvg = generateSanpinDataMatrixSvg("DENTE:STE:001");
			assert.ok(dataMatrixSvg.includes("<svg"));
			assert.ok(dataMatrixSvg.includes("<rect"));
		});

		test("generates printer commands for TSPL (Xprinter) and ZPL (Zebra)", () => {
			const samplePackage = {
				id: "pkg-001",
				batchId: "BAT-20260823-01",
				serialNumber: 1,
				packageType: "paper_self_seal_single" as const,
				packageSize: "size_100x200" as const,
				toolSetId: "set-01",
				toolSetNameRu: "Терапевтический лоток базовый",
				itemsListRu: ["Зонд угловой", "Пинцет анатомический", "Зеркало стоматологическое"],
				packDate: "2026-08-23",
				expDate: "2026-10-12",
				daysLifespan: 50,
				daysRemaining: 50,
				status: "sterile_valid" as const,
				autoclaveId: "MELAG-01",
				cycleNumber: 4,
				operatorId: "usr-01",
				operatorName: "Иванова М.А.",
				indicatorId: "IND-CLASS5-01",
				indicatorVerified: true,
				barcode128: "STE-20260823-0001",
				barcodeDataMatrixPayload: "DENTE:STE:20260823:0001",
				isBreached: false,
				notes: "",
				createdAt: "2026-08-23T10:00:00Z",
			};

			const tspl = generateTsplLabel(samplePackage);
			assert.ok(tspl.includes("SIZE 58 mm, 40 mm"));
			assert.ok(tspl.includes("MELAG-01"));
			assert.ok(tspl.includes("STE-20260823-0001"));

			const zpl = generateZplLabel(samplePackage);
			assert.ok(zpl.includes("^XA"));
			assert.ok(zpl.includes("^XZ"));
			assert.ok(zpl.includes("MELAG-01"));
		});
	});

	// ─── 8. Сводный сшив и экспорт для Роспотребнадзора ────────────────────────
	describe("8. Consolidated SanPiN Binder & Supervisory Dossier Export", () => {
		test("converts numbers to Russian words and declensions accurately", () => {
			assert.strictEqual(integerToRussianWords(0), "ноль");
			assert.strictEqual(integerToRussianWords(1), "один");
			assert.strictEqual(integerToRussianWords(4), "четыре");
			assert.strictEqual(integerToRussianWords(12), "двенадцать");
			assert.strictEqual(integerToRussianWords(21), "двадцать один");
			assert.strictEqual(integerToRussianWords(25), "двадцать пять");
			assert.strictEqual(integerToRussianWords(124), "сто двадцать четыре");

			const sheets1 = formatRussianSheetsCount(1);
			assert.strictEqual(sheets1.count, 1);
			assert.strictEqual(sheets1.declensionRu, "лист");
			assert.strictEqual(sheets1.formattedRu, "1 (один) лист");

			const sheets4 = formatRussianSheetsCount(4);
			assert.strictEqual(sheets4.count, 4);
			assert.strictEqual(sheets4.declensionRu, "листа");
			assert.strictEqual(sheets4.formattedRu, "4 (четыре) листа");

			const sheets25 = formatRussianSheetsCount(25);
			assert.strictEqual(sheets25.count, 25);
			assert.strictEqual(sheets25.declensionRu, "листов");
			assert.strictEqual(sheets25.formattedRu, "25 (двадцать пять) листов");
		});

		test("generates full A4 Landscape inspection HTML binder with license № ЛО41-01137-77/00368421 and all sections", () => {
			const html = generateSanpinConsolidatedInspectionHtml({
				clinicInfo: {
					name: "ООО «Стоматологическая клиника ДЕНТЕ»",
					ogrn: "1027700123456",
					inn: "7701234567",
					address: "г. Москва, ул. Клиническая, д. 10",
					chiefDoctor: "Смирнов А. В.",
					headNurse: "Иванова М. П.",
					licenseNumber: "№ ЛО41-01137-77/00368421",
					volumeNumber: 1,
				},
				periodLabelRu: "за период с 01.08.2026 по 25.08.2026",
				volumeNumber: 1,
				totalPagesCount: 8,
				psoRecords: [
					{
						id: "pso-1",
						timestamp: "2026-08-22T09:00:00Z",
						instrumentName: "Терапевтический смотровой набор",
						categoryId: "therapeutic_kit",
						batchItemCount: 120,
						testedSampleCount: 5,
						testType: "both_standard",
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						isSudanNegative: true,
						detergentBrand: "Биолот 0.5%",
						isBatchApproved: true,
						operatorStaffFullName: "Смирнова А. В.",
						operatorStaffPosition: "Медсестра ЦСО",
						electronicStampVerified: true,
					},
				],
				form257Records: [
					{
						id: "f257-1",
						date: "2026-08-22",
						cycleNumber: 14,
						sterilizerId: "autoclave-01",
						sterilizerCode: "АВТОКЛАВ-01",
						sterilizerBrandModel: "Euronda E9 Next",
						sterilizerSerialNumber: "SN-EUR-99824",
						regimeId: "steam_134_5min",
						regimeNameRu: "134°C Универсальный",
						targetTemperatureCelsius: 134,
						targetPressureBar: 2.1,
						targetExposureMinutes: 5,
						actualTemperatureCelsius: 134.5,
						actualPressureBar: 2.15,
						actualExposureMinutes: 5.5,
						itemsDescriptionRu: "Стоматологические наконечники, боры",
						packsCount: 18,
						packagingType: "kraft_pouch",
						packagingNameRu: "Пакеты комбинированные",
						shelfLifeDays: 50,
						chamberPoints: [
							{ pointIndex: 1, code: "KT-1", nameRu: "Верхний левый", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 2, code: "KT-2", nameRu: "Верхний правый", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 3, code: "KT-3", nameRu: "Центр", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 4, code: "KT-4", nameRu: "Нижний левый", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 5, code: "KT-5", nameRu: "Точка стока", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
						],
						areAllPointsPassed: true,
						chemicalIndicatorNameRu: "Медтест 134/5",
						isCyclePassed: true,
						status: "sterile_passed",
						operatorStaffFullName: "Смирнова А. В.",
						operatorStaffPosition: "Медсестра ЦСО",
						isHeadNurseVerified: true,
						headNurseSignatureFullName: "Иванова М. П.",
						digitalStampHash: "STAMP-HASH-01",
						createdAt: "2026-08-22T10:00:00Z",
					},
				],
				bactericidalSessions: [
					{
						id: "bac-1",
						equipmentId: "eq-1",
						roomName: "Кабинет №1",
						deviceBrand: "Дезар-Кронт 802",
						date: "2026-08-22",
						sessionStartTime: "08:00",
						sessionEndTime: "08:30",
						durationMinutes: 30,
						durationHours: 0.5,
						operatingMode: "pre_op_preparation",
						cumulativeHoursAfterSession: 1420.5,
						operatorStaffFullName: "Соколова Т. Н.",
					},
				],
				generalCleanings: [
					{
						id: "clean-1",
						roomType: "surgical",
						roomName: "Хирургический кабинет №2",
						scheduledDate: "2026-08-22",
						actualDateTime: "2026-08-22T08:00:00Z",
						treatedAreaM2: 32.5,
						disinfectantName: "Аламинол 1.5%",
						activeIngredient: "Альдегиды",
						solutionConcentrationPercent: 1.5,
						applicationMethodRu: "Протирание",
						exposureTimeMinutes: 60,
						uvIrradiationMinutes: 60,
						ventilationMinutes: 15,
						operatorStaffFullName: "Смирнова А. В.",
						inspectorStaffFullName: "Иванова М. П.",
						isInspectorVerified: true,
						status: "verified_by_inspector",
					},
				],
				temperatureLogs: [
					{
						id: "temp-1",
						measurementDate: "2026-08-22",
						measurementPeriod: "morning",
						equipmentName: "Фармацевтический холодильник Pozis",
						location: "ЦСО",
						meterDeviceName: "Термометр ТМН-1",
						meterSerialNumber: "SN-90412",
						temperatureCelsius: 4.2,
						relativeHumidityPercent: 55,
						targetTempMinCelsius: 2,
						targetTempMaxCelsius: 8,
						isWithinNorm: true,
						operatorStaffFullName: "Иванова М. П.",
					},
				],
			});

			// Verify Title Page
			assert.ok(html.includes("№ ЛО41-01137-77/00368421"), "Title page must include medical license number");
			assert.ok(html.includes("ТОМ № 1"), "Title page must include Volume number");
			assert.ok(html.includes("Смирнов А. В."), "Title page must include chief doctor approval");
			assert.ok(html.includes("Иванова М. П."), "Title page must include head nurse signature");

			// Verify Section 1: PSO Form 366/u
			assert.ok(html.includes("ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)"));
			assert.ok(html.includes("Терапевтический смотровой набор"));

			// Verify Section 2: Form 257/u
			assert.ok(html.includes("ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/у)"));
			assert.ok(html.includes("Euronda E9 Next"));

			// Verify Section 3: Bactericidal & Cleanings
			assert.ok(html.includes("ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК"));
			assert.ok(html.includes("Дезар-Кронт 802"));
			assert.ok(html.includes("ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ЗАКЛЮЧИТЕЛЬНОЙ ДЕЗИНФЕКЦИИ"));
			assert.ok(html.includes("Хирургический кабинет №2"));

			// Verify Section 4: Temperature Logs
			assert.ok(html.includes("ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ"));
			assert.ok(html.includes("Фармацевтический холодильник Pozis"));

			// Verify Final Binder Certification Sheet
			assert.ok(html.includes("ЗАВЕРИТЕЛЬНАЯ НАДПИСЬ СШИВА ТОМА № 1"));
			assert.ok(html.includes("пронумеровано, прошнуровано и скреплено оттиском печати:"));
			assert.ok(html.includes("8 (восемь) листов"));
			assert.ok(html.includes("МЕСТО ДЛЯ ОТТИСКА ПЕЧАТИ [ М.П. ]"));
		});

		test("exports consolidated archive to RFC 4180 CSV with UTF-8 BOM, license, and page section banners", () => {
			const csv = exportSanpinConsolidatedArchiveToCsv({
				clinicInfo: {
					name: "ООО «Стоматологическая клиника ДЕНТЕ»",
					ogrn: "1027700123456",
					inn: "7701234567",
					address: "г. Москва, ул. Клиническая, д. 10",
					chiefDoctor: "Смирнов А. В.",
					headNurse: "Иванова М. П.",
					licenseNumber: "№ ЛО41-01137-77/00368421",
					volumeNumber: 1,
				},
				periodLabelRu: "за август 2026 г.",
				totalPagesCount: 12,
				psoRecords: [
					{
						id: "pso-1",
						timestamp: "2026-08-22T09:00:00Z",
						instrumentName: "Терапевтический набор",
						categoryId: "therapeutic_kit",
						batchItemCount: 100,
						testedSampleCount: 5,
						testType: "both_standard",
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						isSudanNegative: true,
						detergentBrand: "Биолот 0.5%",
						isBatchApproved: true,
						operatorStaffFullName: "Смирнова А. В.",
						operatorStaffPosition: "Медсестра ЦСО",
						electronicStampVerified: true,
					},
				],
				form257Records: [],
				bactericidalSessions: [],
				generalCleanings: [],
				temperatureLogs: [
					{
						id: "temp-1",
						measurementDate: "2026-08-22",
						measurementPeriod: "morning",
						equipmentName: "Холодильник Pozis",
						location: "ЦСО",
						meterDeviceName: "ТМН-1",
						temperatureCelsius: 4.5,
						targetTempMinCelsius: 2,
						targetTempMaxCelsius: 8,
						isWithinNorm: true,
						operatorStaffFullName: "Иванова М. П.",
					},
				],
			});

			assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM for Excel / 1C");
			assert.ok(csv.includes("№ ЛО41-01137-77/00368421"), "CSV must contain medical license number");
			assert.ok(csv.includes("=== РАЗДЕЛ 1: ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/У) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 2: ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/У) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 3.1: ЖУРНАЛ РЕГИСТРАЦИИ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК (Р 3.5.1904-04) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 3.2: ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК (САНПИН 3.3686-21) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 4: ЖУРНАЛ ТЕМПЕРАТУРНОГО РЕЖИМА ХОЛОДИЛЬНИКОВ И ХРАНЕНИЯ ЛС (ПРИКАЗ 706Н) ==="));
			assert.ok(csv.includes("=== ЗАВЕРИТЕЛЬНЫЙ ЛИСТ СШИВА ТОМА № 1 ==="));
			assert.ok(csv.includes("12 (двенадцать) листов"));
		});

		test("generates and exports Temperature and Humidity logs", () => {
			const tempRecord = {
				id: "t-01",
				measurementDate: "2026-08-22",
				measurementPeriod: "morning" as const,
				equipmentName: "Холодильник Pozis ХФ-250",
				location: "Процедурный кабинет",
				meterDeviceName: "ТМН-1",
				meterSerialNumber: "SN-4412",
				temperatureCelsius: 5.1,
				relativeHumidityPercent: 60,
				targetTempMinCelsius: 2,
				targetTempMaxCelsius: 8,
				isWithinNorm: true,
				operatorStaffFullName: "Иванова М. П.",
			};

			const html = generateTemperatureHumidityJournalPrintHtml({
				records: [tempRecord],
			});
			assert.ok(html.includes("ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ"));
			assert.ok(html.includes("5.1°C"));

			const csv = exportTemperatureHumidityJournalToCsv([tempRecord]);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("Холодильник Pozis ХФ-250"));
			assert.ok(csv.includes("5.1"));
		});
	});

	// ─── 9. Сквозной 1-Клик Автопилот смены СанПиН ─────────────────────────────
	describe("9. SanPiN 1-Click Shift Autopilot Suite", () => {
		test("generates complete statutory shift bundle with all 5 points and approvals", () => {
			const bundle = generateSanpinShiftAutopilotBundle({
				date: "2026-08-30",
				operatorFullName: "Смирнова О. И.",
				headNurseFullName: "Иванова М. П.",
			});

			assert.strictEqual(bundle.date, "2026-08-30");
			assert.strictEqual(bundle.operatorFullName, "Смирнова О. И.");
			assert.strictEqual(bundle.headNurseFullName, "Иванова М. П.");

			// PSO verification
			assert.strictEqual(bundle.psoRecords.length, 3);
			assert.strictEqual(bundle.psoRecords[0]!.isBatchApproved, true);
			assert.strictEqual(bundle.psoRecords[0]!.isAzopyramNegative, true);
			assert.strictEqual(bundle.psoRecords[0]!.isPhenolphthaleinNegative, true);
			assert.strictEqual(bundle.psoRecords[0]!.isSudanNegative, true);
			assert.strictEqual(bundle.summary.totalPsoItems, 310);
			assert.strictEqual(bundle.summary.totalPsoSamplesTested, 14);

			// Sterilization Form 257/u verification
			assert.strictEqual(bundle.form257Records.length, 3);
			assert.strictEqual(bundle.form257Records[0]!.isCyclePassed, true);
			assert.strictEqual(bundle.form257Records[0]!.areAllPointsPassed, true);
			assert.strictEqual(bundle.form257Records[0]!.chamberPoints.length, 5);
			assert.strictEqual(bundle.form257Records[0]!.actualTemperatureCelsius, 134.4);
			assert.strictEqual(bundle.form257Records[0]!.actualPressureBar, 2.15);
			assert.ok(bundle.form257Records[0]!.digitalStampHash.length > 0);
			assert.strictEqual(bundle.summary.totalSterilePacks, 38);

			// Bactericidal & Cleanings verification
			assert.strictEqual(bundle.bactericidalSessions.length, 2);
			assert.strictEqual(bundle.cleaningRecords.length, 1);
			assert.strictEqual(bundle.cleaningRecords[0]!.isInspectorVerified, true);
			assert.strictEqual(bundle.disinfectantRecords.length, 1);
			assert.strictEqual(bundle.disinfectantRecords[0]!.isConcentrationNormal, true);

			// Temperature & Waste verification
			assert.strictEqual(bundle.temperatureRecords.length, 2);
			assert.strictEqual(bundle.temperatureRecords[0]!.isWithinNorm, true);
			assert.strictEqual(bundle.temperatureRecords[1]!.isWithinNorm, true);
			assert.strictEqual(bundle.wasteRecords.length, 1);
			assert.strictEqual(bundle.wasteRecords[0]!.weightKg, 1.25);

			// Compliance Summary
			assert.strictEqual(bundle.summary.allProtocolsCompliant, true);
			assert.ok(bundle.summary.complianceStatementRu.includes("Смена 2026-08-30 полностью опечатана"));
		});
	});
});


