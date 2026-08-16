/**
 * AnesthesiaProtocolService.test.ts — Модульные тесты сервиса анестезиологического пособия
 * и мониторинга витальных функций (Приказ Минздрава РФ № 919н).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ASA_DEFINITIONS,
	ASA_SCORES,
	type AsaScore,
	AnesthesiaProtocolError,
	AnesthesiaProtocolService,
	MALLAMPATI_CLASSES,
	MALLAMPATI_DEFINITIONS,
	type MallampatiClass,
	RAMSAY_DEFINITIONS,
	RAMSAY_SCORES,
	type RamsayScore,
	VITAL_THRESHOLDS,
	isAsaScore,
	isMallampatiClass,
	isRamsayScore,
} from "./AnesthesiaProtocolService.js";

describe("AnesthesiaProtocolService — Clinical Monitoring & Order 919n Compliance", () => {
	// ==========================================================================
	// 1. Шкалы предоперационной оценки (ASA, Mallampati, Ramsay)
	// ==========================================================================

	describe("1. Preoperative Assessment Scales (ASA, Mallampati, Ramsay)", () => {
		it("validates all ASA physical status scores (ASA I to ASA V)", () => {
			for (const score of ASA_SCORES) {
				assert.equal(isAsaScore(score), true);
				const def = ASA_DEFINITIONS[score];
				assert.ok(def);
				assert.equal(def.score, score);
				assert.ok(def.titleRu.length > 0);
				assert.ok(def.descriptionRu.length > 0);
			}

			assert.equal(isAsaScore("ASA_VI"), false);
			assert.equal(isAsaScore("INVALID_ASA"), false);
			assert.equal(isAsaScore(null), false);
			assert.equal(isAsaScore(undefined), false);
			assert.equal(isAsaScore(123), false);

			// ASA I-III разрешены в амбулаторной стоматологии, ASA IV-V только в стационаре
			assert.equal(ASA_DEFINITIONS.ASA_I.ambulatoryAnesthesiaPermitted, true);
			assert.equal(ASA_DEFINITIONS.ASA_II.ambulatoryAnesthesiaPermitted, true);
			assert.equal(ASA_DEFINITIONS.ASA_III.ambulatoryAnesthesiaPermitted, true);
			assert.equal(ASA_DEFINITIONS.ASA_IV.ambulatoryAnesthesiaPermitted, false);
			assert.equal(ASA_DEFINITIONS.ASA_V.ambulatoryAnesthesiaPermitted, false);
		});

		it("validates Mallampati airway classification (Class I to Class IV)", () => {
			for (const mClass of MALLAMPATI_CLASSES) {
				assert.equal(isMallampatiClass(mClass), true);
				const def = MALLAMPATI_DEFINITIONS[mClass];
				assert.ok(def);
				assert.equal(def.classCode, mClass);
				assert.ok(def.titleRu.length > 0);
				assert.ok(def.anatomyRu.length > 0);
				assert.ok(def.airwayManagementNotes.length > 0);
			}

			assert.equal(isMallampatiClass("CLASS_V"), false);
			assert.equal(isMallampatiClass(""), false);
			assert.equal(isMallampatiClass(null), false);

			// Классы I-II низкий риск, III умеренный, IV высокий риск трудной интубации
			assert.equal(MALLAMPATI_DEFINITIONS.CLASS_I.intubationDifficultyRisk, "low");
			assert.equal(MALLAMPATI_DEFINITIONS.CLASS_II.intubationDifficultyRisk, "low");
			assert.equal(MALLAMPATI_DEFINITIONS.CLASS_III.intubationDifficultyRisk, "moderate");
			assert.equal(MALLAMPATI_DEFINITIONS.CLASS_IV.intubationDifficultyRisk, "high");
		});

		it("validates Ramsay sedation scale (Scores 1 to 6)", () => {
			for (const score of RAMSAY_SCORES) {
				assert.equal(isRamsayScore(score), true);
				const def = RAMSAY_DEFINITIONS[score];
				assert.ok(def);
				assert.equal(def.score, score);
				assert.ok(def.titleRu.length > 0);
				assert.ok(def.clinicalStateRu.length > 0);
			}

			assert.equal(isRamsayScore(0), false);
			assert.equal(isRamsayScore(7), false);
			assert.equal(isRamsayScore(2.5), false);
			assert.equal(isRamsayScore("2"), false);
			assert.equal(isRamsayScore(null), false);

			// Оптимальный уровень седации в стоматологии — 2 (бодрствует, спокоен, сотрудничает) и 3 (дремлет, выполняет команды)
			assert.equal(RAMSAY_DEFINITIONS[1].isOptimalForAmbulatoryDentalSedation, false);
			assert.equal(RAMSAY_DEFINITIONS[2].isOptimalForAmbulatoryDentalSedation, true);
			assert.equal(RAMSAY_DEFINITIONS[3].isOptimalForAmbulatoryDentalSedation, true);
			assert.equal(RAMSAY_DEFINITIONS[4].isOptimalForAmbulatoryDentalSedation, false);
			assert.equal(RAMSAY_DEFINITIONS[5].isOptimalForAmbulatoryDentalSedation, false);
			assert.equal(RAMSAY_DEFINITIONS[6].isOptimalForAmbulatoryDentalSedation, false);
		});

		it("creates a complete preoperative assessment with fasting validation", () => {
			const assessment = AnesthesiaProtocolService.createPreoperativeAssessment({
				anesthesiologistName: "Д-р Иванов А.С.",
				asaScore: "ASA_II",
				isEmergency: false,
				mallampatiClass: "CLASS_II",
				targetRamsayScore: 2,
				solidFoodFastingHours: 8,
				clearLiquidsFastingHours: 3,
				allergies: ["Пенициллины", "Новокаин"],
				chronicDiseases: ["Гипертоническая болезнь 1 ст."],
				airwayNotes: "Открывание рта свободное, подвижность шеи сохранена.",
				premedication: "Мидазолам 5 мг сублингвально за 30 мин",
				baselineVitals: {
					spO2: 98,
					heartRate: 72,
					systolicBp: 120,
					diastolicBp: 80,
					respiratoryRate: 14,
				},
			});

			assert.equal(assessment.anesthesiologistName, "Д-р Иванов А.С.");
			assert.equal(assessment.asaScore, "ASA_II");
			assert.equal(assessment.mallampatiClass, "CLASS_II");
			assert.equal(assessment.targetRamsayScore, 2);
			assert.equal(assessment.fastingStatus.isFastingAdequate, true);
			assert.equal(assessment.allergies.length, 2);
			assert.equal(assessment.chronicDiseases.length, 1);
		});

		it("flags inadequate fasting interval (<6h solids or <2h liquids)", () => {
			const assessment = AnesthesiaProtocolService.createPreoperativeAssessment({
				anesthesiologistName: "Д-р Иванов А.С.",
				asaScore: "ASA_I",
				mallampatiClass: "CLASS_I",
				solidFoodFastingHours: 3, // Меньше нормы 6 часов!
				clearLiquidsFastingHours: 1, // Меньше нормы 2 часов!
				baselineVitals: {
					spO2: 99,
					heartRate: 68,
					systolicBp: 115,
					diastolicBp: 75,
				},
			});

			assert.equal(assessment.fastingStatus.isFastingAdequate, false);
			assert.match(assessment.fastingStatus.notes || "", /НЕ АДЕКВАТЕН|аспирации/);
		});

		it("throws on invalid preoperative inputs", () => {
			assert.throws(
				() =>
					AnesthesiaProtocolService.createPreoperativeAssessment({
						anesthesiologistName: "",
						asaScore: "ASA_I",
						mallampatiClass: "CLASS_I",
						solidFoodFastingHours: 6,
						clearLiquidsFastingHours: 2,
						baselineVitals: { spO2: 98, heartRate: 70, systolicBp: 120, diastolicBp: 80 },
					}),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "ValidationError",
			);

			assert.throws(
				() =>
					AnesthesiaProtocolService.createPreoperativeAssessment({
						anesthesiologistName: "Врач",
						// @ts-expect-error test invalid enum
						asaScore: "ASA_99",
						mallampatiClass: "CLASS_I",
						solidFoodFastingHours: 6,
						clearLiquidsFastingHours: 2,
						baselineVitals: { spO2: 98, heartRate: 70, systolicBp: 120, diastolicBp: 80 },
					}),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "InvalidAsaScore",
			);
		});
	});

	// ==========================================================================
	// 2. Периодическая фиксация витальных функций и гемодинамика
	// ==========================================================================

	describe("2. Vital Signs & Hemodynamics Calculations", () => {
		it("accurately calculates MAP, Pulse Pressure and Shock Index", () => {
			// АД 120/80, ЧСС 72
			// САД = (120 + 2*80)/3 = 280/3 = 93.33 -> 93
			// ПД = 120 - 80 = 40
			// Shock Index = 72 / 120 = 0.60
			const hemo = AnesthesiaProtocolService.calculateHemodynamics(120, 80, 72);
			assert.equal(hemo.meanArterialPressure, 93);
			assert.equal(hemo.pulsePressure, 40);
			assert.equal(hemo.shockIndex, 0.6);
		});

		it("throws on impossible hemodynamic values (SBP < DBP or negative numbers)", () => {
			assert.throws(
				() => AnesthesiaProtocolService.calculateHemodynamics(70, 90, 80),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "InvalidVitalSigns",
			);

			assert.throws(
				() => AnesthesiaProtocolService.calculateHemodynamics(-120, 80, 70),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "InvalidVitalSigns",
			);
		});

		it("creates structured vital signs record with stage and calculations", () => {
			const record = AnesthesiaProtocolService.createVitalSignsRecord({
				stage: "maintenance",
				spO2: 99,
				heartRate: 65,
				systolicBp: 110,
				diastolicBp: 70,
				etCO2: 38,
				respiratoryRate: 12,
				ramsayScore: 3,
				oxygenFlowLpm: 2,
				notes: "Гемодинамика стабильна",
			});

			assert.ok(record.id);
			assert.ok(record.timestamp);
			assert.equal(record.stage, "maintenance");
			assert.equal(record.spO2, 99);
			assert.equal(record.heartRate, 65);
			assert.equal(record.systolicBp, 110);
			assert.equal(record.diastolicBp, 70);
			assert.equal(record.etCO2, 38);
			assert.equal(record.meanArterialPressure, 83);
			assert.equal(record.pulsePressure, 40);
			assert.equal(record.shockIndex, 0.59);
			assert.equal(record.hasCriticalAlarm, false);
			assert.equal(record.alarms.length, 0);
		});
	});

	// ==========================================================================
	// 3. Детекция критических состояний и тревожные маркеры (Приказ 919н)
	// ==========================================================================

	describe("3. Critical State Detection & Alarm Markers", () => {
		it("detects Critical Desaturation (SpO2 < 90%) and Emergency Desaturation (SpO2 < 85%)", () => {
			const resultCritical = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 88,
				heartRate: 75,
				systolicBp: 120,
				diastolicBp: 80,
			});

			assert.equal(resultCritical.hasCriticalAlarm, true);
			const desatAlarm = resultCritical.alarms.find(
				(a) => a.code === "CRITICAL_DESATURATION",
			);
			assert.ok(desatAlarm);
			assert.equal(desatAlarm.severity, "CRITICAL");
			assert.equal(desatAlarm.value, 88);
			assert.equal(desatAlarm.threshold, VITAL_THRESHOLDS.SPO2_CRITICAL_MIN);
			assert.match(desatAlarm.message, /КРИТИЧЕСКАЯ ДЕСАТУРАЦИЯ.*88%/);
			assert.match(desatAlarm.recommendedAction, /100% O2|ларингеальной маски/);

			const resultEmergency = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 82,
				heartRate: 75,
				systolicBp: 120,
				diastolicBp: 80,
			});
			const emergencyAlarm = resultEmergency.alarms.find(
				(a) => a.code === "CRITICAL_DESATURATION",
			);
			assert.ok(emergencyAlarm);
			assert.equal(emergencyAlarm.severity, "EMERGENCY");
		});

		it("detects Warning Desaturation (SpO2 90% - 93%)", () => {
			const result = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 92,
				heartRate: 70,
				systolicBp: 120,
				diastolicBp: 80,
			});

			assert.equal(result.hasCriticalAlarm, false);
			const warningAlarm = result.alarms.find(
				(a) => a.code === "WARNING_DESATURATION",
			);
			assert.ok(warningAlarm);
			assert.equal(warningAlarm.severity, "WARNING");
		});

		it("detects Critical Bradycardia (HR < 45 bpm)", () => {
			const result = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 98,
				heartRate: 42,
				systolicBp: 110,
				diastolicBp: 70,
			});

			assert.equal(result.hasCriticalAlarm, true);
			const bradyAlarm = result.alarms.find(
				(a) => a.code === "CRITICAL_BRADYCARDIA",
			);
			assert.ok(bradyAlarm);
			assert.equal(bradyAlarm.severity, "CRITICAL");
			assert.equal(bradyAlarm.value, 42);
			assert.equal(bradyAlarm.threshold, VITAL_THRESHOLDS.HR_BRADYCARDIA_CRITICAL);
			assert.match(bradyAlarm.message, /КРИТИЧЕСКАЯ БРАДИКАРДИЯ.*42/);
			assert.match(bradyAlarm.recommendedAction, /Атропин/);
		});

		it("detects Critical Tachycardia (HR > 140 bpm)", () => {
			const result = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 97,
				heartRate: 152,
				systolicBp: 130,
				diastolicBp: 85,
			});

			assert.equal(result.hasCriticalAlarm, true);
			const tachyAlarm = result.alarms.find(
				(a) => a.code === "CRITICAL_TACHYCARDIA",
			);
			assert.ok(tachyAlarm);
			assert.equal(tachyAlarm.severity, "CRITICAL");
			assert.equal(tachyAlarm.value, 152);
			assert.equal(tachyAlarm.threshold, VITAL_THRESHOLDS.HR_TACHYCARDIA_CRITICAL);
			assert.match(tachyAlarm.message, /КРИТИЧЕСКАЯ ТАХИКАРДИЯ.*152/);
		});

		it("detects Critical Hypotension (SBP < 85 mmHg)", () => {
			const result = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 98,
				heartRate: 80,
				systolicBp: 80,
				diastolicBp: 50,
			});

			assert.equal(result.hasCriticalAlarm, true);
			const hypoAlarm = result.alarms.find(
				(a) => a.code === "CRITICAL_HYPOTENSION",
			);
			assert.ok(hypoAlarm);
			assert.equal(hypoAlarm.severity, "CRITICAL");
			assert.equal(hypoAlarm.value, 80);
			assert.equal(hypoAlarm.threshold, VITAL_THRESHOLDS.SBP_HYPOTENSION_CRITICAL);
			assert.match(hypoAlarm.message, /КРИТИЧЕСКАЯ АРТЕРИАЛЬНАЯ ГИПОТЕНЗИЯ.*80/);
			assert.match(hypoAlarm.recommendedAction, /Эфедрин|Фенилэфрин/);
		});

		it("detects Critical Hypertension (SBP >= 180 or DBP >= 110)", () => {
			const result = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 98,
				heartRate: 90,
				systolicBp: 185,
				diastolicBp: 115,
			});

			assert.equal(result.hasCriticalAlarm, true);
			const hyperAlarm = result.alarms.find(
				(a) => a.code === "CRITICAL_HYPERTENSION",
			);
			assert.ok(hyperAlarm);
			assert.equal(hyperAlarm.severity, "CRITICAL");
		});

		it("detects Ventilatory disturbances via EtCO2 (Hypercapnia > 50, Hypocapnia < 20)", () => {
			const hyperResult = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 98,
				heartRate: 70,
				systolicBp: 120,
				diastolicBp: 80,
				etCO2: 56,
			});
			assert.equal(hyperResult.hasCriticalAlarm, true);
			assert.ok(
				hyperResult.alarms.some((a) => a.code === "CRITICAL_HYPERCAPNIA"),
			);

			const hypoResult = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 98,
				heartRate: 70,
				systolicBp: 120,
				diastolicBp: 80,
				etCO2: 16,
			});
			assert.equal(hypoResult.hasCriticalAlarm, true);
			assert.ok(
				hypoResult.alarms.some((a) => a.code === "CRITICAL_HYPOCAPNIA"),
			);
		});

		it("returns clean normal status with zero alarms when all vitals are in safe ranges", () => {
			const result = AnesthesiaProtocolService.evaluateVitalAlarms({
				spO2: 99,
				heartRate: 68,
				systolicBp: 120,
				diastolicBp: 75,
				etCO2: 38,
			});

			assert.equal(result.hasCriticalAlarm, false);
			assert.equal(result.alarms.length, 0);
		});
	});

	// ==========================================================================
	// 4. Регистрация и подсчет медикаментов
	// ==========================================================================

	describe("4. Medication Administration & Cumulative Totals", () => {
		it("creates medication administration record with automatic category detection", () => {
			const propofol = AnesthesiaProtocolService.createMedicationRecord({
				drugName: "Пропофол 1%",
				dose: 120,
				unit: "mg",
				route: "iv",
				administeredBy: "Сестра-анестезист Петрова",
				notes: "Индукция в седацию",
			});

			assert.ok(propofol.id);
			assert.equal(propofol.drugName, "Пропофол 1%");
			assert.equal(propofol.dose, 120);
			assert.equal(propofol.unit, "mg");
			assert.equal(propofol.route, "iv");
			assert.equal(propofol.category, "general_anesthetic");
			assert.equal(propofol.administeredBy, "Сестра-анестезист Петрова");

			const articaine = AnesthesiaProtocolService.createMedicationRecord({
				drugName: "Убистезин форте (артикаин + эпинефрин)",
				dose: 3.4,
				unit: "ml",
				route: "nerve_block",
				administeredBy: "Д-р Сидоров В.В.",
				targetSite: "Мандибулярная анестезия справа (4.6, 4.7)",
			});

			assert.equal(articaine.category, "local_anesthetic");
			assert.equal(articaine.route, "nerve_block");
			assert.equal(articaine.targetSite, "Мандибулярная анестезия справа (4.6, 4.7)");
		});

		it("throws on invalid medication inputs", () => {
			assert.throws(
				() =>
					AnesthesiaProtocolService.createMedicationRecord({
						drugName: "",
						dose: 10,
						unit: "mg",
						route: "iv",
						administeredBy: "Сестра",
					}),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "InvalidMedication",
			);

			assert.throws(
				() =>
					AnesthesiaProtocolService.createMedicationRecord({
						drugName: "Пропофол",
						dose: -50,
						unit: "mg",
						route: "iv",
						administeredBy: "Сестра",
					}),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "InvalidMedication",
			);
		});

		it("calculates cumulative drug totals and routes correctly", () => {
			const meds = [
				AnesthesiaProtocolService.createMedicationRecord({
					drugName: "Пропофол",
					dose: 100,
					unit: "mg",
					route: "iv",
					administeredBy: "Сестра 1",
				}),
				AnesthesiaProtocolService.createMedicationRecord({
					drugName: "Фентанил",
					dose: 100,
					unit: "mcg",
					route: "iv",
					administeredBy: "Сестра 1",
				}),
				AnesthesiaProtocolService.createMedicationRecord({
					drugName: "Пропофол",
					dose: 80,
					unit: "mg",
					route: "iv",
					administeredBy: "Сестра 1",
				}),
				AnesthesiaProtocolService.createMedicationRecord({
					drugName: "Артикаин",
					dose: 1.7,
					unit: "ml",
					route: "infiltration",
					administeredBy: "Хирург",
				}),
				AnesthesiaProtocolService.createMedicationRecord({
					drugName: "Артикаин",
					dose: 1.7,
					unit: "ml",
					route: "nerve_block",
					administeredBy: "Хирург",
				}),
			];

			const summary = AnesthesiaProtocolService.calculateCumulativeMedications(meds);

			const propSummary = summary.find((s) => s.drugName.toLowerCase().includes("пропофол"));
			assert.ok(propSummary);
			assert.equal(propSummary.totalDose, 180);
			assert.equal(propSummary.administrationCount, 2);

			const fentSummary = summary.find((s) => s.drugName.toLowerCase().includes("фентанил"));
			assert.ok(fentSummary);
			assert.equal(fentSummary.totalDose, 100);
			assert.equal(fentSummary.administrationCount, 1);

			const artSummary = summary.find((s) => s.drugName.toLowerCase().includes("артикаин"));
			assert.ok(artSummary);
			assert.equal(artSummary.totalDose, 3.4);
			assert.equal(artSummary.administrationCount, 2);
			assert.equal(artSummary.routes.length, 2);
		});
	});

	// ==========================================================================
	// 5. Шкала послеоперационного восстановления Альдрете (Aldrete Score)
	// ==========================================================================

	describe("5. Post-Anesthesia Recovery (Aldrete Scoring System)", () => {
		it("evaluates perfect recovery score (10/10) as safe for discharge", () => {
			const result = AnesthesiaProtocolService.evaluateAldreteScore({
				activity: 2,
				respiration: 2,
				circulation: 2,
				consciousness: 2,
				oxygenSaturation: 2,
			});

			assert.equal(result.totalScore, 10);
			assert.equal(result.isSafeForDischarge, true);
			assert.match(result.clinicalVerdict, /Критерии выписки.*достигнуты/);
		});

		it("evaluates score of 9/10 as safe for discharge per Order 919n", () => {
			const result = AnesthesiaProtocolService.evaluateAldreteScore({
				activity: 2,
				respiration: 2,
				circulation: 1, // АД отличается на 20-50%
				consciousness: 2,
				oxygenSaturation: 2,
			});

			assert.equal(result.totalScore, 9);
			assert.equal(result.isSafeForDischarge, true);
		});

		it("evaluates score < 9 as NOT safe for home discharge", () => {
			const result = AnesthesiaProtocolService.evaluateAldreteScore({
				activity: 1,
				respiration: 1,
				circulation: 2,
				consciousness: 1,
				oxygenSaturation: 2,
			});

			assert.equal(result.totalScore, 7);
			assert.equal(result.isSafeForDischarge, false);
			assert.match(result.clinicalVerdict, /Требуется продолжение наблюдения|Выписка преждевременна/);
		});
	});

	// ==========================================================================
	// 6. Полный жизненный цикл протокола и аудит Приказа № 919н
	// ==========================================================================

	describe("6. Complete Protocol Lifecycle & Order 919n Compliance", () => {
		it("executes complete end-to-end clinical anesthesia protocol workflow", () => {
			const preOp = AnesthesiaProtocolService.createPreoperativeAssessment({
				anesthesiologistName: "Д-р Кузнецов И.В.",
				asaScore: "ASA_II",
				isEmergency: false,
				mallampatiClass: "CLASS_II",
				targetRamsayScore: 2,
				solidFoodFastingHours: 8,
				clearLiquidsFastingHours: 3,
				allergies: [],
				chronicDiseases: ["Контролируемая АГ"],
				baselineVitals: {
					spO2: 99,
					heartRate: 74,
					systolicBp: 125,
					diastolicBp: 80,
					respiratoryRate: 14,
				},
			});

			// 1. Инициализация протокола
			let protocol = AnesthesiaProtocolService.initProtocol({
				organizationId: "org-dente-01",
				patientId: "patient-101",
				visitId: "visit-501",
				anesthesiologistId: "user-anesth-01",
				anesthesiologistName: "Д-р Кузнецов И.В.",
				attendingDentistName: "Д-р Васильев П.П. (хирург-имплантолог)",
				nurseAnesthetistName: "Медсестра Смирнова Т.В.",
				plannedProcedure: "Сложная дентальная имплантация в области 3.6, 4.6 с синус-лифтингом",
				anesthesiaType: "combined_local_sedation",
				preoperativeAssessment: preOp,
				startedAt: new Date(Date.now() - 3600000).toISOString(),
			});

			assert.match(protocol.protocolNumber, /^AP-919N-\d{8}-[A-F0-9]{6}$/);
			assert.equal(protocol.status, "in_progress");
			assert.equal(protocol.vitalSignsTimeline.length, 1);

			// 2. Введение медикаментов
			protocol = AnesthesiaProtocolService.addMedication(protocol, {
				drugName: "Мидазолам",
				dose: 2.5,
				unit: "mg",
				route: "iv",
				administeredBy: "Медсестра Смирнова Т.В.",
				notes: "Премедикация в кресле",
			});

			protocol = AnesthesiaProtocolService.addMedication(protocol, {
				drugName: "Пропофол 1%",
				dose: 100,
				unit: "mg",
				route: "iv",
				administeredBy: "Медсестра Смирнова Т.В.",
				notes: "Индукция в седацию",
			});

			protocol = AnesthesiaProtocolService.addMedication(protocol, {
				drugName: "Убистезин форте",
				dose: 3.4,
				unit: "ml",
				route: "nerve_block",
				administeredBy: "Д-р Васильев П.П.",
				targetSite: "Мандибулярная и инфильтрационная анестезия",
			});

			// 3. Периодическая фиксация витальных функций (индукция, поддержание, выход)
			protocol = AnesthesiaProtocolService.addVitalSigns(protocol, {
				stage: "induction",
				spO2: 99,
				heartRate: 70,
				systolicBp: 115,
				diastolicBp: 75,
				etCO2: 36,
				ramsayScore: 2,
			});

			protocol = AnesthesiaProtocolService.addVitalSigns(protocol, {
				stage: "maintenance",
				spO2: 98,
				heartRate: 66,
				systolicBp: 110,
				diastolicBp: 70,
				etCO2: 38,
				ramsayScore: 2,
			});

			protocol = AnesthesiaProtocolService.addVitalSigns(protocol, {
				stage: "emergence",
				spO2: 99,
				heartRate: 72,
				systolicBp: 120,
				diastolicBp: 78,
				etCO2: 37,
				ramsayScore: 2,
			});

			assert.equal(protocol.vitalSignsTimeline.length, 4);
			assert.equal(protocol.medicationLog.length, 3);

			// 4. Финализация протокола
			protocol = AnesthesiaProtocolService.finalizeProtocol(protocol, {
				endedAt: new Date().toISOString(),
				aldreteEvaluation: {
					activity: 2,
					respiration: 2,
					circulation: 2,
					consciousness: 2,
					oxygenSaturation: 2,
				},
				transferDestination: "discharged_home",
				finalNotes: "Анестезиологическое пособие протекало гладко, без гемодинамических и респираторных нарушений.",
				requireSafeAldreteForDischarge: true,
			});

			assert.equal(protocol.status, "completed");
			assert.ok(protocol.durationMinutes && protocol.durationMinutes >= 1);
			assert.ok(protocol.signatureDigest);
			assert.equal(protocol.signatureDigest.length, 64); // SHA-256

			// 5. Проверка соответствия Приказу Минздрава № 919н
			const compliance = AnesthesiaProtocolService.validateOrder919nCompliance(protocol);
			assert.equal(compliance.isCompliant, true);
			assert.equal(compliance.order919nRuleViolations.length, 0);
			assert.equal(compliance.criticalAlarmsDetectedCount, 0);

			// 6. Генерация официального печатного отчета
			const report = AnesthesiaProtocolService.generateOfficialProtocolReport(protocol);
			assert.ok(report.includes("ПРОТОКОЛ АНЕСТЕЗИОЛОГИЧЕСКОГО ПОСОБИЯ (ПРИКАЗ МЗ РФ № 919н)"));
			assert.ok(report.includes("ASA II"));
			assert.ok(report.includes("Класс II по Маллампати"));
			assert.ok(report.includes("Шкала Рамси — 2 балла"));
			assert.ok(report.includes("Пропофол"));
			assert.ok(report.includes("Убистезин"));
			assert.ok(report.includes("ШКАЛА АЛЬДРЕТЕ"));
			assert.ok(report.includes("10 / 10"));
			assert.ok(report.includes(protocol.signatureDigest));
		});

		it("handles critical event logging, intervention recording, and prevents discharge on low Aldrete score", () => {
			const preOp = AnesthesiaProtocolService.createPreoperativeAssessment({
				anesthesiologistName: "Д-р Кузнецов И.В.",
				asaScore: "ASA_I",
				mallampatiClass: "CLASS_I",
				solidFoodFastingHours: 8,
				clearLiquidsFastingHours: 3,
				baselineVitals: { spO2: 99, heartRate: 75, systolicBp: 120, diastolicBp: 80 },
			});

			let protocol = AnesthesiaProtocolService.initProtocol({
				organizationId: "org-1",
				patientId: "pat-1",
				visitId: "vis-1",
				anesthesiologistId: "anesth-1",
				anesthesiologistName: "Д-р Кузнецов И.В.",
				attendingDentistName: "Д-р Петров",
				plannedProcedure: "Удаление ретенированного зуба 3.8",
				anesthesiaType: "sedation_conscious",
				preoperativeAssessment: preOp,
			});

			// Добавляем препараты
			protocol = AnesthesiaProtocolService.addMedication(protocol, {
				drugName: "Пропофол",
				dose: 80,
				unit: "mg",
				route: "iv",
				administeredBy: "Анестезиолог",
			});

			// Вводим критическую запись: десатурация SpO2 = 87%
			protocol = AnesthesiaProtocolService.addVitalSigns(protocol, {
				stage: "maintenance",
				spO2: 87,
				heartRate: 60,
				systolicBp: 100,
				diastolicBp: 65,
			});

			const vitalMaintenance = protocol.vitalSignsTimeline[1];
			assert.ok(vitalMaintenance);
			assert.equal(vitalMaintenance.hasCriticalAlarm, true);

			// Фиксируем вмешательство
			protocol = AnesthesiaProtocolService.recordAdverseEvent(protocol, {
				eventType: "Транзиторная десатурация",
				description: "Кратковременное западение корня языка на фоне седации",
				intervention: "Тройной прием Сафара, подача O2 через маску 6 л/мин, санация ротоглотки",
				resolved: true,
				outcomeNotes: "SpO2 восстановилась до 99% в течение 30 секунд",
			});

			assert.equal(protocol.adverseEvents.length, 1);

			// Попытка выписать домой при плохом балле Альдрете (6/10) выбрасывает исключение
			assert.throws(
				() =>
					AnesthesiaProtocolService.finalizeProtocol(protocol, {
						aldreteEvaluation: {
							activity: 1,
							respiration: 1,
							circulation: 2,
							consciousness: 1,
							oxygenSaturation: 1,
						},
						transferDestination: "discharged_home",
						requireSafeAldreteForDischarge: true,
					}),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "AldreteScoreInsufficient",
			);
		});

		it("prevents mutating protocol after it has been finalized", () => {
			const preOp = AnesthesiaProtocolService.createPreoperativeAssessment({
				anesthesiologistName: "Д-р Кузнецов И.В.",
				asaScore: "ASA_I",
				mallampatiClass: "CLASS_I",
				solidFoodFastingHours: 8,
				clearLiquidsFastingHours: 3,
				baselineVitals: { spO2: 99, heartRate: 75, systolicBp: 120, diastolicBp: 80 },
			});

			let protocol = AnesthesiaProtocolService.initProtocol({
				organizationId: "org-1",
				patientId: "pat-1",
				visitId: "vis-1",
				anesthesiologistId: "anesth-1",
				anesthesiologistName: "Д-р Кузнецов",
				attendingDentistName: "Д-р Петров",
				plannedProcedure: "Пломбирование",
				anesthesiaType: "sedation_conscious",
				preoperativeAssessment: preOp,
			});

			protocol = AnesthesiaProtocolService.finalizeProtocol(protocol, {
				aldreteEvaluation: {
					activity: 2,
					respiration: 2,
					circulation: 2,
					consciousness: 2,
					oxygenSaturation: 2,
				},
				transferDestination: "day_hospital",
			});

			assert.throws(
				() =>
					AnesthesiaProtocolService.addVitalSigns(protocol, {
						stage: "maintenance",
						spO2: 99,
						heartRate: 70,
						systolicBp: 120,
						diastolicBp: 80,
					}),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "ProtocolAlreadyFinalized",
			);

			assert.throws(
				() =>
					AnesthesiaProtocolService.addMedication(protocol, {
						drugName: "Пропофол",
						dose: 50,
						unit: "mg",
						route: "iv",
						administeredBy: "Сестра",
					}),
				(err: unknown) =>
					err instanceof AnesthesiaProtocolError &&
					err.code === "ProtocolAlreadyFinalized",
			);
		});
	});
});
