import assert from "node:assert";
import { describe, test } from "node:test";
import {
	SanPiNRegulatoryEngine,
	createBactericidalEquipmentDtoSchema,
	createBactericidalLogEntryDtoSchema,
	createEmergencyBiohazardLogDtoSchema,
	createGeneralCleaningLogDtoSchema,
	createMedicalWasteLogDtoSchema,
	createPsoCleaningLogDtoSchema,
	createSterilizationLogDtoSchema,
	createTemperatureHumidityEquipmentDtoSchema,
	createTemperatureHumidityLogDtoSchema,
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
});
