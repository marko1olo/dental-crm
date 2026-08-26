/**
 * emergencyVitalsMonitor.test.ts — Comprehensive Test Suite for Intraoperative Vitals Monitor & Emergency Protocols
 * Standards: Минздрав РФ / ФАР / СтАР (Wave 9)
 *
 * Test Sections:
 * 1. Blood Pressure Mathematical Triage & Adrenaline Gateway
 * 2. Heart Rate Triage (Bradycardia, Tachycardia, Asystole)
 * 3. Oxygen Saturation (SpO2) Triage & Hypoxia Severity
 * 4. Blood Glucose Triage (Hypoglycemia, Hyperglycemia, Diabetic Coma)
 * 5. Respiratory Rate & Body Temperature Triage
 * 6. Mean Arterial Pressure (MAP) & Allgower Shock Index (SI) Mathematics
 * 7. Composite Vitals Triage Engine & Priority Recommendations
 * 8. Statutory Resuscitation Protocols (Anaphylaxis, Syncope, Hypertensive Crisis)
 * 9. Weight-Adjusted Pediatric & Adult Resuscitation Dosing
 * 10. Form 043/u Official Clinical Diary Text Generation
 * 11. Ambulance (103/112) Dispatcher Call Sheet Formatting
 * 12. Step Execution Timestamps & Checklist State Management
 * 13. UI Component Render Smoke Test
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';

import {
	evaluateBloodPressure,
	evaluateHeartRate,
	evaluateSpO2,
	evaluateBloodGlucose,
	evaluateRespiratoryRate,
	evaluateBodyTemperature,
	calculateMeanArterialPressure,
	calculateShockIndex,
	evaluateVitalsTriage,
	type VitalsInput,
} from '../components/visit/emergency/vitalsTriageMath';

import {
	EMERGENCY_SCENARIOS_CATALOG,
	ANAPHYLACTIC_SHOCK_PROTOCOL,
	VASOVAGAL_SYNCOPE_PROTOCOL,
	HYPERTENSIVE_CRISIS_PROTOCOL,
	HYPOGLYCEMIA_PROTOCOL,
	ANGINA_ACS_PROTOCOL,
	calculateWeightAdjustedEmergencyDoses,
	generateEmergencyProtocol043,
	generateAmbulanceCheatSheet,
	formatEmergencyTime,
	type EmergencyIncidentData,
} from '../components/visit/emergency/emergencyProtocolsEngine';

describe('Wave 9: Intraoperative Vitals Monitor & Emergency Protocols Suite', () => {

	describe('1. Blood Pressure Triage & Epinephrine Gateway (>180/110 mmHg)', () => {
		it('classifies 120/80 as normal normotension with no adrenaline restrictions', () => {
			const res = evaluateBloodPressure(120, 80);
			assert.equal(res.level, 'normal');
			assert.equal(res.badgeVariant, 'green');
			assert.equal(res.isHypertensiveCrisis, false);
			assert.equal(res.isAdrenalineBlocked, false);
			assert.equal(res.isAdrenalineContraindicated, false);
			assert.equal(res.pulsePressure, 40);
			assert.equal(res.meanArterialPressure, 93.3);
		});

		it('identifies Stage 1 Hypertension (145/95) with attention status and cardio caution', () => {
			const res = evaluateBloodPressure(145, 95);
			assert.equal(res.level, 'attention');
			assert.equal(res.badgeVariant, 'orange');
			assert.equal(res.isStage1Hypertension, true);
			assert.equal(res.isHypertensiveCrisis, false);
			assert.equal(res.isAdrenalineBlocked, false);
		});

		it('identifies Stage 2 Hypertension (165/105) with crisis level and adrenaline blockade', () => {
			const res = evaluateBloodPressure(165, 105);
			assert.equal(res.level, 'crisis');
			assert.equal(res.badgeVariant, 'orange');
			assert.equal(res.isStage2Hypertension, true);
			assert.equal(res.isAdrenalineBlocked, true);
			assert.equal(res.isAdrenalineContraindicated, true);
		});

		it('strictly BLOCKS ADRENALINE on Hypertensive Crisis (190/115 mmHg)', () => {
			const res = evaluateBloodPressure(190, 115);
			assert.equal(res.level, 'crisis');
			assert.equal(res.badgeVariant, 'red');
			assert.equal(res.isHypertensiveCrisis, true);
			assert.equal(res.isAdrenalineBlocked, true);
			assert.equal(res.isAdrenalineContraindicated, true);
			assert.match(res.clinicalInterpretationRu, /БЛОКИРОВКА АДРЕНАЛИНА/);
			assert.match(res.clinicalInterpretationRu, /Моксонидин/);
		});

		it('triggers Emergency level on Severe Hypotension / Vascular Collapse (70/40 mmHg)', () => {
			const res = evaluateBloodPressure(70, 40);
			assert.equal(res.level, 'emergency');
			assert.equal(res.badgeVariant, 'red');
			assert.equal(res.isHypotensionCollapse, true);
			assert.match(res.clinicalInterpretationRu, /Тренделенбурга/);
		});
	});

	describe('2. Heart Rate (Pulse / BPM) Triage', () => {
		it('evaluates normal heart rate (72 BPM)', () => {
			const res = evaluateHeartRate(72);
			assert.equal(res.level, 'normal');
			assert.equal(res.badgeVariant, 'green');
			assert.equal(res.isCardiacArrest, false);
			assert.equal(res.isSevereBradycardia, false);
			assert.equal(res.isSevereTachycardia, false);
		});

		it('detects severe bradycardia (<50 BPM) with crisis level', () => {
			const res = evaluateHeartRate(45);
			assert.equal(res.level, 'crisis');
			assert.equal(res.badgeVariant, 'orange');
			assert.equal(res.isSevereBradycardia, true);
		});

		it('detects critical bradycardia (<40 BPM) with emergency level and atropine recommendation', () => {
			const res = evaluateHeartRate(35);
			assert.equal(res.level, 'emergency');
			assert.equal(res.badgeVariant, 'red');
			assert.match(res.clinicalInterpretationRu, /Атропин/);
		});

		it('detects severe tachycardia (>110 BPM) and blocks extra adrenaline', () => {
			const res = evaluateHeartRate(125);
			assert.equal(res.level, 'crisis');
			assert.equal(res.isSevereTachycardia, true);
			assert.equal(res.isAdrenalineContraindicated, true);
		});

		it('detects paroxysmal tachycardia (>140 BPM) as emergency', () => {
			const res = evaluateHeartRate(155);
			assert.equal(res.level, 'emergency');
			assert.equal(res.isSevereTachycardia, true);
			assert.equal(res.isAdrenalineContraindicated, true);
		});

		it('detects Asystole (0 BPM) as cardiac arrest requiring immediate CPR', () => {
			const res = evaluateHeartRate(0);
			assert.equal(res.level, 'emergency');
			assert.equal(res.isCardiacArrest, true);
			assert.match(res.clinicalInterpretationRu, /СЛР 30:2/);
		});
	});

	describe('3. SpO2 Oxygen Saturation Triage', () => {
		it('evaluates normal saturation (98%)', () => {
			const res = evaluateSpO2(98);
			assert.equal(res.level, 'normal');
			assert.equal(res.badgeVariant, 'green');
			assert.equal(res.isHypoxiaCritical, false);
		});

		it('evaluates moderate hypoxia (90-94%) with attention status', () => {
			const res = evaluateSpO2(92);
			assert.equal(res.level, 'attention');
			assert.equal(res.badgeVariant, 'orange');
			assert.equal(res.isHypoxiaModerate, true);
			assert.equal(res.isHypoxiaCritical, false);
		});

		it('evaluates critical hypoxia (<90%) as crisis with high-flow O2 recommendation', () => {
			const res = evaluateSpO2(88);
			assert.equal(res.level, 'crisis');
			assert.equal(res.badgeVariant, 'red');
			assert.equal(res.isHypoxiaCritical, true);
			assert.match(res.clinicalInterpretationRu, /10-15 л\/мин/);
		});

		it('evaluates severe asphyxia (<70%) as emergency resuscitation state', () => {
			const res = evaluateSpO2(65);
			assert.equal(res.level, 'emergency');
			assert.equal(res.isRespiratoryFailure, true);
		});
	});

	describe('4. Blood Glucose Triage (mmol/L)', () => {
		it('evaluates normal fasting glucose (5.2 mmol/L)', () => {
			const res = evaluateBloodGlucose(5.2);
			assert.ok(res);
			assert.equal(res?.level, 'normal');
			assert.equal(res?.badgeVariant, 'green');
			assert.equal(res?.isHypoglycemiaSevere, false);
		});

		it('detects hypoglycemia (<3.3 mmol/L) with crisis level and fast carbs trigger', () => {
			const res = evaluateBloodGlucose(3.0);
			assert.ok(res);
			assert.equal(res?.level, 'crisis');
			assert.equal(res?.badgeVariant, 'red');
			assert.equal(res?.isHypoglycemiaModerate, true);
			assert.match(res?.clinicalInterpretationRu ?? '', /15-20 г быстрых углеводов/);
		});

		it('detects severe hypoglycemic coma (<2.8 mmol/L) with 40% glucose IV recommendation', () => {
			const res = evaluateBloodGlucose(2.4);
			assert.ok(res);
			assert.equal(res?.level, 'emergency');
			assert.equal(res?.isHypoglycemiaSevere, true);
			assert.match(res?.clinicalInterpretationRu ?? '', /40% раствор глюкозы 40-60 мл/);
		});

		it('detects hyperglycemia (>11.0 mmol/L) and severe ketoacidosis risk (>13.0 mmol/L)', () => {
			const res1 = evaluateBloodGlucose(11.8);
			assert.ok(res1);
			assert.equal(res1?.level, 'attention');
			assert.equal(res1?.isHyperglycemiaModerate, true);

			const res2 = evaluateBloodGlucose(14.5);
			assert.ok(res2);
			assert.equal(res2?.level, 'crisis');
			assert.equal(res2?.isHyperglycemiaSevere, true);
		});

		it('gracefully handles null / undefined glucose inputs without throwing', () => {
			assert.equal(evaluateBloodGlucose(null), undefined);
			assert.equal(evaluateBloodGlucose(undefined), undefined);
		});
	});

	describe('5. Respiratory Rate & Body Temperature Triage', () => {
		it('evaluates normal respiratory rate (16 breaths/min)', () => {
			const res = evaluateRespiratoryRate(16);
			assert.ok(res);
			assert.equal(res?.level, 'normal');
		});

		it('detects Apnea (0 breaths/min) as emergency', () => {
			const res = evaluateRespiratoryRate(0);
			assert.ok(res);
			assert.equal(res?.level, 'emergency');
			assert.match(res?.clinicalInterpretationRu ?? '', /ИВЛ мешком Амбу/);
		});

		it('detects severe tachypnea / dyspnea (>30 breaths/min)', () => {
			const res = evaluateRespiratoryRate(34);
			assert.ok(res);
			assert.equal(res?.level, 'crisis');
			assert.equal(res?.badgeVariant, 'red');
		});

		it('evaluates febrile temperature (39.0°C)', () => {
			const res = evaluateBodyTemperature(39.0);
			assert.ok(res);
			assert.equal(res?.level, 'crisis');
			assert.match(res?.statusLabelRu ?? '', /Фебрильная/);
		});
	});

	describe('6. MAP & Allgower Shock Index (SI) Mathematics', () => {
		it('accurately calculates Mean Arterial Pressure: MAP = DBP + (SBP - DBP)/3', () => {
			// For 120/80: 80 + 40/3 = 93.333 -> 93.3
			assert.equal(calculateMeanArterialPressure(120, 80), 93.3);
			// For 150/90: 90 + 60/3 = 110.0
			assert.equal(calculateMeanArterialPressure(150, 90), 110.0);
			// For 90/60: 60 + 30/3 = 70.0
			assert.equal(calculateMeanArterialPressure(90, 60), 70.0);
		});

		it('accurately calculates Allgower Shock Index (HR / SBP) and levels', () => {
			// Normal: 70 bpm / 120 mmHg = 0.58
			const norm = calculateShockIndex(70, 120);
			assert.equal(norm.shockIndex, 0.58);
			assert.equal(norm.level, 'normal');
			assert.equal(norm.isShockThreat, false);

			// Threat of Shock: 90 bpm / 100 mmHg = 0.90
			const threat = calculateShockIndex(90, 100);
			assert.equal(threat.shockIndex, 0.9);
			assert.equal(threat.level, 'attention');
			assert.equal(threat.isShockThreat, true);

			// Moderate Shock: 110 bpm / 90 mmHg = 1.22
			const mod = calculateShockIndex(110, 90);
			assert.equal(mod.shockIndex, 1.22);
			assert.equal(mod.level, 'crisis');

			// Severe Decompensated Shock: 130 bpm / 70 mmHg = 1.86
			const severe = calculateShockIndex(130, 70);
			assert.equal(severe.shockIndex, 1.86);
			assert.equal(severe.level, 'emergency');
			assert.equal(severe.isDecompensatedShock, true);
		});
	});

	describe('7. Composite Vitals Triage Master Engine', () => {
		it('aggregates normal patient vitals to overall Normal status', () => {
			const input: VitalsInput = {
				bpSystolic: 120,
				bpDiastolic: 80,
				heartRate: 75,
				spO2: 98,
				bloodGlucose: 5.4,
				respiratoryRate: 16,
			};
			const report = evaluateVitalsTriage(input);

			assert.equal(report.overallLevel, 'normal');
			assert.equal(report.overallBadgeVariant, 'green');
			assert.equal(report.isAdrenalineBlocked, false);
			assert.equal(report.isEmergencyRescueRecommended, false);
		});

		it('identifies Hypertensive Crisis with suggested scenario and urgent guideline', () => {
			const input: VitalsInput = {
				bpSystolic: 195,
				bpDiastolic: 115,
				heartRate: 98,
				spO2: 97,
				bloodGlucose: 5.5,
			};
			const report = evaluateVitalsTriage(input);

			assert.equal(report.overallLevel, 'crisis');
			assert.equal(report.isHypertensiveCrisis, true);
			assert.equal(report.isAdrenalineBlocked, true);
			assert.equal(report.suggestedScenarioId, 'hypertensive_crisis');
			assert.ok(report.urgentActionGuidelinesRu.some((g) => g.includes('БЛОКИРОВКА АДРЕНАЛИНА')));
			assert.ok(report.urgentActionGuidelinesRu.some((g) => g.includes('Моксонидин')));
		});

		it('identifies Anaphylactic Shock profile (hypotension + severe tachycardia + hypoxia)', () => {
			const input: VitalsInput = {
				bpSystolic: 60,
				bpDiastolic: 30,
				heartRate: 130,
				spO2: 87,
			};
			const report = evaluateVitalsTriage(input);

			assert.equal(report.overallLevel, 'emergency');
			assert.equal(report.isHypotensionCollapse, true);
			assert.equal(report.isCriticalHypoxia, true);
			assert.equal(report.suggestedScenarioId, 'anaphylactic_shock');
			assert.equal(report.isEmergencyRescueRecommended, true);
		});
	});

	describe('8. Statutory Resuscitation Protocols (Минздрав РФ / ФАР / СтАР)', () => {
		it('validates all 6 core emergency protocols exist in catalog', () => {
			const requiredScenarios = [
				'anaphylactic_shock',
				'syncope_collapse',
				'hypertensive_crisis',
				'hypoglycemia',
				'angina_acs',
				'cardiac_arrest',
			];

			for (const id of requiredScenarios) {
				const sc = EMERGENCY_SCENARIOS_CATALOG[id as keyof typeof EMERGENCY_SCENARIOS_CATALOG];
				assert.ok(sc, `Scenario ${id} must exist`);
				assert.ok(sc.icd10Code.length > 0);
				assert.ok(sc.actionSteps.length >= 3);
			}
		});

		it('verifies Anaphylactic Shock mandatory steps: Epinephrine in thigh, Trendelenburg, high-flow O2, Saline, Steroids', () => {
			const sc = ANAPHYLACTIC_SHOCK_PROTOCOL;
			assert.equal(sc.icd10Code, 'T78.2');

			const step1 = sc.actionSteps.find((s) => s.id === 'stop_allergen');
			assert.ok(step1);

			const epiStep = sc.actionSteps.find((s) => s.id === 'epinephrine_im_vastus');
			assert.ok(epiStep);
			assert.equal(epiStep?.medication?.activeSubstance, 'Epinephrine');
			assert.equal(epiStep?.medication?.routeOfAdminRu, 'в/м (бедро)');
			assert.equal(epiStep?.timerSeconds, 300); // 5 min timer

			const o2Step = sc.actionSteps.find((s) => s.id === 'oxygen_high_flow');
			assert.ok(o2Step);

			const steroidStep = sc.actionSteps.find((s) => s.id === 'corticosteroids_iv');
			assert.ok(steroidStep);
			assert.match(steroidStep?.instructionRu ?? '', /Дексаметазон|Преднизолон/);
		});

		it('verifies Vasovagal Syncope mandatory steps: Trendelenburg, ammonia, vitals monitoring', () => {
			const sc = VASOVAGAL_SYNCOPE_PROTOCOL;
			assert.equal(sc.icd10Code, 'R55');

			const posStep = sc.actionSteps.find((s) => s.id === 'trendelenburg_syncope');
			assert.ok(posStep);
			assert.match(posStep?.instructionRu ?? '', /Тренделенбурга/);

			const ammoniaStep = sc.actionSteps.find((s) => s.id === 'ammonia_reflex');
			assert.ok(ammoniaStep);
			assert.match(ammoniaStep?.medication?.nameRu ?? '', /аммиак/i);
		});

		it('verifies Hypertensive Crisis mandatory steps: Stop vasoconstrictors, Moxonidine/Captopril sublingual', () => {
			const sc = HYPERTENSIVE_CRISIS_PROTOCOL;
			assert.equal(sc.icd10Code, 'I10');

			const stopStep = sc.actionSteps.find((s) => s.id === 'stop_anesthetic_epinephrine');
			assert.ok(stopStep);
			assert.match(stopStep?.instructionRu ?? '', /БЛОКИРОВКА АДРЕНАЛИНА/);

			const drugStep = sc.actionSteps.find((s) => s.id === 'antihypertensive_sublingual');
			assert.ok(drugStep);
			assert.match(drugStep?.instructionRu ?? '', /Моксонидин|Каптоприл/);
		});
	});

	describe('9. Weight-Adjusted Resuscitation Dosing Calculator', () => {
		it('calculates adult 70 kg standard emergency doses correctly', () => {
			const doses = calculateWeightAdjustedEmergencyDoses(70);

			assert.equal(doses.patientWeightKg, 70);
			assert.equal(doses.isPediatric, false);
			assert.equal(doses.adrenalineAnaphylaxis.mg, 0.5);
			assert.equal(doses.adrenalineAnaphylaxis.ml, 0.5);
			assert.equal(doses.dexamethasone.mg, 8);
			assert.equal(doses.dexamethasone.ml, 2.0);
			assert.equal(doses.prednisolone.mg, 60);
			assert.equal(doses.nacl09Infusion.ml, 500);
			assert.equal(doses.lipidRescue20.bolusMl, 105); // 70 * 1.5 = 105 ml
		});

		it('calculates pediatric 20 kg child emergency doses correctly (Clark / Direct mg/kg)', () => {
			const doses = calculateWeightAdjustedEmergencyDoses(20);

			assert.equal(doses.patientWeightKg, 20);
			assert.equal(doses.isPediatric, true);
			// Adrenaline: 20 * 0.01 = 0.20 mg = 0.20 ml 0.1%
			assert.equal(doses.adrenalineAnaphylaxis.mg, 0.2);
			assert.equal(doses.adrenalineAnaphylaxis.ml, 0.2);
			// Dexamethasone: 20 * 0.3 = 6 mg = 1.5 ml
			assert.equal(doses.dexamethasone.mg, 6);
			assert.equal(doses.dexamethasone.ml, 1.5);
			// 0.9% NaCl bolus: 20 kg * 20 ml/kg = 400 ml
			assert.equal(doses.nacl09Infusion.ml, 400);
			// Lipid bolus: 20 * 1.5 = 30 ml
			assert.equal(doses.lipidRescue20.bolusMl, 30);
		});

		it('caps adult maximum doses for heavy patients (110 kg)', () => {
			const doses = calculateWeightAdjustedEmergencyDoses(110);
			assert.equal(doses.adrenalineAnaphylaxis.mg, 0.5); // Capped at 0.5 mg max
			assert.equal(doses.dexamethasone.mg, 16);
			assert.equal(doses.nacl09Infusion.ml, 1000);
		});
	});

	describe('10. Form 043/u Statutory Clinical Protocol Generation', () => {
		const mockIncident: EmergencyIncidentData = {
			scenarioId: 'anaphylactic_shock',
			patientFullName: 'Сидоров Петр Алексеевич',
			patientAgeYears: 45,
			patientWeightKg: 80,
			clinicName: 'Стоматология DENTE',
			cabinetNumber: '2',
			doctorFullName: 'Д-р Смирнов А. В.',
			assistantFullName: 'Медсестра Петрова Е. С.',
			medCardNumber: '043/у-2026/102',
			initialVitals: {
				bpSystolic: 65,
				bpDiastolic: 35,
				heartRate: 128,
				spO2: 88,
				bloodGlucose: 5.1,
			},
			latestVitals: {
				bpSystolic: 115,
				bpDiastolic: 75,
				heartRate: 86,
				spO2: 97,
			},
			incidentStartTimeIso: '2026-08-26T14:15:00.000Z',
			executedSteps: [
				{
					stepId: 'stop_allergen',
					stepTitle: 'Прекратить введение препарата',
					executedAtIso: '2026-08-26T14:15:20.000Z',
				},
				{
					stepId: 'epinephrine_im_vastus',
					stepTitle: 'Ввести Адреналин 0.1% 0.5 мл в бедро',
					executedAtIso: '2026-08-26T14:16:00.000Z',
					administeredDrugDose: '0.5 мл (0.5 мг) 0.1% в/м',
				},
				{
					stepId: 'oxygen_high_flow',
					stepTitle: 'Оксигенотерапия 12 л/мин',
					executedAtIso: '2026-08-26T14:16:45.000Z',
				},
			],
			smpCalled: true,
			smpCallTimeIso: '2026-08-26T14:16:10.000Z',
			smpBrigadeNumber: '14',
			outcome: 'stabilized_in_clinic',
		};

		it('formats legally compliant Form 043/u text with all vitals and timestamps', () => {
			const text = generateEmergencyProtocol043(mockIncident);

			assert.match(text, /ПРОТОКОЛ ОКАЗАНИЯ НЕОТЛОЖНОЙ МЕДИЦИНСКОЙ ПОМОЩИ \(Форма 043\/у\)/);
			assert.match(text, /Сидоров Петр Алексеевич/);
			assert.match(text, /T78\.2/);
			assert.match(text, /65\/35 мм рт\.ст\./);
			assert.match(text, /128 уд\/мин/);
			assert.match(text, /Ввести Адреналин 0\.1% 0\.5 мл в бедро/);
			assert.match(text, /Вызвана СМП 103/);
			assert.match(text, /115\/75 мм рт\.ст\./);
			assert.match(text, /Д-р Смирнов А\. В\./);
		});

		it('properly documents transfer to SMP brigade when outcome is transferred', () => {
			const incidentTransferred: EmergencyIncidentData = {
				...mockIncident,
				outcome: 'transferred_to_smp',
				smpArrivalTimeIso: '2026-08-26T14:32:00.000Z',
			};

			const text = generateEmergencyProtocol043(incidentTransferred);
			assert.match(text, /передан выездной бригаде скорой медицинской помощи № 14/);
		});
	});

	describe('11. Ambulance (103 / 112) Dispatcher Call Sheet Formatting', () => {
		it('generates concise script for 103/112 telephone dispatcher', () => {
			const mockIncident: EmergencyIncidentData = {
				scenarioId: 'anaphylactic_shock',
				patientFullName: 'Кузнецов Игорь Сергеевич',
				patientAgeYears: 50,
				patientWeightKg: 85,
				patientGender: 'male',
				clinicName: 'Клиника DENTE',
				clinicAddress: 'г. Москва, ул. Ленина, д. 5',
				cabinetNumber: '3',
				doctorFullName: 'Д-р Иванов И. И.',
				initialVitals: { bpSystolic: 70, bpDiastolic: 40, heartRate: 135, spO2: 89 },
				incidentStartTimeIso: '2026-08-26T15:00:00.000Z',
				executedSteps: [{ stepId: 'epinephrine', stepTitle: 'Адреналин 0.5 мл в/м', executedAtIso: '2026-08-26T15:01:00.000Z' }],
				smpCalled: true,
				outcome: 'active_resuscitation',
			};

			const sheet = generateAmbulanceCheatSheet(mockIncident);

			assert.match(sheet, /ШПАРГАЛКА ДЛЯ ЗВОНКА В СКОРУЮ ПОМОЩЬ/);
			assert.match(sheet, /г\. Москва, ул\. Ленина, д\. 5/);
			assert.match(sheet, /Кабинет: № 3/);
			assert.match(sheet, /АНАФИЛАКТИЧЕСКИЙ ШОК/);
			assert.match(sheet, /Кузнецов Игорь Сергеевич/);
			assert.match(sheet, /70\/40/);
			assert.match(sheet, /135 уд\/мин/);
		});
	});

	describe('12. Step Execution Timestamps & Checklist State', () => {
		it('formats time string accurately', () => {
			const iso = '2026-08-26T12:30:45.000Z';
			const formatted = formatEmergencyTime(iso);
			assert.ok(formatted.length >= 5);
		});
	});

	describe('13. UI Component Render Smoke Test', () => {
		it('imports and creates EmergencyVitalsMonitorModal element safely', async () => {
			const { EmergencyVitalsMonitorModal } = await import('../components/visit/emergency/EmergencyVitalsMonitorModal');
			assert.ok(EmergencyVitalsMonitorModal, 'EmergencyVitalsMonitorModal must be exported');

			const element = React.createElement(EmergencyVitalsMonitorModal, {
				isOpen: true,
				onClose: () => {},
				initialPatientName: 'Тестовый Пациент',
				initialPatientWeightKg: 70,
			});

			assert.ok(React.isValidElement(element));
			assert.equal(element.props.isOpen, true);
			assert.equal(element.props.initialPatientName, 'Тестовый Пациент');
		});
	});
});
