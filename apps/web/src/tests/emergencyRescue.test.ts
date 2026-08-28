/**
 * emergencyRescue.test.ts — Unit tests for Russian Dental Emergency Protocols & HUD Engine
 * Tests cover:
 *  1. Statutory Presets (All 8 Scenarios: ICD-10, Legal Basis, Steps, Adrenaline Timer)
 *  2. Weight-Adjusted Dosage Calculator (Adult, Pediatric, Geriatric, CPR Cardiac Arrest)
 *  3. Lipid Rescue 20% Emulsion Kinematics (Bolus, Infusion, Max dose)
 *  4. CPR Metronome & 30:2 Cycle Arithmetic
 *  5. Emergency Incident Protocol & Form 043/u Official Act Generation
 *  6. Dispatcher 112 Cheat Sheet Content & Formatting
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	EMERGENCY_SCENARIOS,
	EmergencyScenarioId
} from '../components/emergency/emergencyRescuePresets';

import {
	calculateWeightAdjustedDose,
	calculateAllEmergencyDosages,
	calculateLipidRescueDoses,
	formatTimerSeconds,
	generateEmergencyIncidentAct,
	generateSmpDispatchCheatSheet,
	STATUTORY_EMERGENCY_KIT_MEMO,
	EmergencyIncidentInput
} from '../components/emergency/emergencyRescueEngine';

describe('Russian Dental Emergency Protocols & Resuscitation Suite', () => {

	describe('1. Statutory Emergency Scenarios & Algorithms (Минздрав РФ / ФАР / СтАР)', () => {
		const expectedScenarioIds: EmergencyScenarioId[] = [
			'anaphylactic_shock',
			'local_anesthetic_toxicity',
			'syncope_collapse',
			'hypertensive_crisis',
			'angina_myocardial_infarction',
			'bronchospasm_asthma',
			'hypoglycemia_diabetic',
			'accidental_swallowing'
		];

		it('contains all 8 statutory emergency scenarios', () => {
			for (const id of expectedScenarioIds) {
				assert.ok(EMERGENCY_SCENARIOS[id], `Scenario ${id} must exist in catalog`);
				assert.equal(EMERGENCY_SCENARIOS[id].id, id);
				assert.ok(EMERGENCY_SCENARIOS[id].nameRu.length > 0);
				assert.ok(EMERGENCY_SCENARIOS[id].icd10Code.length > 0);
				assert.ok(EMERGENCY_SCENARIOS[id].actionSteps.length >= 4);
				assert.ok(EMERGENCY_SCENARIOS[id].statutoryLegalBasisRu.length > 0);
			}
		});

		it('verifies Anaphylactic Shock statutory protocol details', () => {
			const scenario = EMERGENCY_SCENARIOS.anaphylactic_shock;
			assert.equal(scenario.icd10Code, 'T78.2');
			assert.equal(scenario.urgencyLevel, 'critical_resuscitation');
			assert.ok(scenario.statutoryLegalBasisRu.includes('1079н'));

			// Check adrenaline step is present and has timer requirement
			const adrenalineStep = scenario.actionSteps.find((s) => s.drugId === 'adrenaline_epi_01');
			assert.ok(adrenalineStep, 'Adrenaline step must be present in anaphylaxis protocol');
			assert.equal(adrenalineStep?.isCritical, true);
			assert.equal(adrenalineStep?.requiresAdrenalineTimer, true);
			assert.ok(adrenalineStep?.descriptionRu.includes('бедра'));

			// Check Glucocorticosteroids step
			const predStep = scenario.actionSteps.find((s) => s.drugId === 'prednisolone_30mg');
			assert.ok(predStep, 'Prednisolone step must be present');
		});

		it('verifies Local Anesthetic Systemic Toxicity (LAST) Lipid Rescue algorithm', () => {
			const scenario = EMERGENCY_SCENARIOS.local_anesthetic_toxicity;
			assert.equal(scenario.icd10Code, 'T88.5');
			assert.equal(scenario.urgencyLevel, 'critical_resuscitation');
			assert.ok(scenario.clinicalManifestationsRu.some((m) => m.toLowerCase().includes('судороги')));

			const lipidBolusStep = scenario.actionSteps.find((s) => s.drugId === 'lipid_emulsion_20' && s.order === 4);
			assert.ok(lipidBolusStep, 'Lipid bolus step must exist');
			assert.ok(lipidBolusStep?.dosageHintRu?.includes('1.5 мл/кг'));
		});

		it('verifies Accidental Swallowing / Aspiration differential diagnosis', () => {
			const scenario = EMERGENCY_SCENARIOS.accidental_swallowing;
			assert.equal(scenario.icd10Code, 'T17.9');
			assert.ok(scenario.actionSteps.some((s) => s.titleRu.includes('Геймлиха')));
			assert.ok(scenario.actionSteps.some((s) => s.descriptionRu.includes('рвоту') && s.contraindicationWarningRu));
		});
	});

	describe('2. Weight-Adjusted Emergency Dosage Calculator', () => {
		it('calculates Adult 70kg emergency dosages correctly', () => {
			const weight = 70;
			const age = 40;

			// Adrenaline 0.1% IM Anaphylaxis: 0.5 mg / 0.5 ml
			const epi = calculateWeightAdjustedDose('adrenaline_epi_01', weight, age, false);
			assert.equal(epi.calculatedDoseMg, 0.5);
			assert.equal(epi.calculatedVolumeMl, 0.5);
			assert.equal(epi.isPediatricDose, false);

			// Prednisolone 30 mg/ml: 120 mg / 4.0 ml (4 ampoules)
			const pred = calculateWeightAdjustedDose('prednisolone_30mg', weight, age, false);
			assert.equal(pred.calculatedDoseMg, 120);
			assert.equal(pred.calculatedVolumeMl, 4.0);
			assert.equal(pred.numberOfAmpoules, 4);

			// Diazepam 0.5% (5 mg/ml): 10 mg / 2.0 ml (1 ampoule of 2 ml)
			const diaz = calculateWeightAdjustedDose('diazepam_relanium', weight, age, false);
			assert.equal(diaz.calculatedDoseMg, 10);
			assert.equal(diaz.calculatedVolumeMl, 2.0);

			// Glucose 40%: 40 ml (16 g glucose)
			const gluc = calculateWeightAdjustedDose('glucose_dextrose_40', weight, age, false);
			assert.equal(gluc.calculatedVolumeMl, 40);
			assert.equal(gluc.calculatedDoseMg, 16000);
		});

		it('calculates Pediatric 20kg emergency dosages with safe caps', () => {
			const weight = 20;
			const age = 5;

			// Adrenaline 0.1% for child < 6 yrs: 0.15 mg / 0.15 ml
			const epi = calculateWeightAdjustedDose('adrenaline_epi_01', weight, age, false);
			assert.equal(epi.calculatedDoseMg, 0.15);
			assert.equal(epi.calculatedVolumeMl, 0.15);
			assert.equal(epi.isPediatricDose, true);

			// Prednisolone 20 kg (2.5 mg/kg): 50 mg / ~1.7 ml (2 ampoules)
			const pred = calculateWeightAdjustedDose('prednisolone_30mg', weight, age, false);
			assert.equal(pred.calculatedDoseMg, 50);
			assert.equal(pred.calculatedVolumeMl, 1.7);
			assert.equal(pred.numberOfAmpoules, 2);
			assert.equal(pred.isPediatricDose, true);

			// Glucose 40% (2 ml/kg): 40 ml
			const gluc = calculateWeightAdjustedDose('glucose_dextrose_40', weight, age, false);
			assert.equal(gluc.calculatedVolumeMl, 40);
			assert.equal(gluc.isPediatricDose, true);
		});

		it('calculates Cardiac Arrest CPR adrenaline dose', () => {
			// Adult 70kg cardiac arrest: 1.0 mg IV
			const adultCprEpi = calculateWeightAdjustedDose('adrenaline_epi_01', 70, 45, true);
			assert.equal(adultCprEpi.calculatedDoseMg, 1.0);
			assert.equal(adultCprEpi.calculatedVolumeMl, 1.0);
			assert.ok(adultCprEpi.routeRu.includes('в/в'));

			// Pediatric 15kg cardiac arrest: 0.15 mg IV
			const pedCprEpi = calculateWeightAdjustedDose('adrenaline_epi_01', 15, 4, true);
			assert.equal(pedCprEpi.calculatedDoseMg, 0.15);
			assert.equal(pedCprEpi.calculatedVolumeMl, 0.15);
		});

		it('calculates all dosages map without exceptions', () => {
			const allDosages = calculateAllEmergencyDosages(75, 38);
			assert.ok(allDosages.adrenaline_epi_01);
			assert.ok(allDosages.prednisolone_30mg);
			assert.ok(allDosages.lipid_emulsion_20);
			assert.ok(allDosages.nitroglycerin_sublingual);
			assert.ok(allDosages.salbutamol_spray);
			assert.ok(allDosages.captopril_sublingual);
			assert.ok(allDosages.atropine_01);
		});
	});

	describe('3. Lipid Rescue 20% Emulsion Kinematics', () => {
		it('calculates Lipid Rescue protocol doses for 70kg adult', () => {
			const lipid = calculateLipidRescueDoses(70);
			assert.equal(lipid.weightKg, 70);
			assert.equal(lipid.bolusVolumeMl, 105); // 70 * 1.5 = 105 ml
			assert.equal(lipid.infusionRateMlPerMin, 17.5); // 70 * 0.25 = 17.5 ml/min
			assert.equal(lipid.infusionRateMlPerHour, 1050); // 70 * 15 = 1050 ml/h
			assert.equal(lipid.maxTotalDoseMl, 840); // 70 * 12 = 840 ml
			assert.ok(lipid.protocolInstructionsRu.includes('105 мл'));
		});

		it('calculates Lipid Rescue protocol doses for 50kg patient', () => {
			const lipid = calculateLipidRescueDoses(50);
			assert.equal(lipid.bolusVolumeMl, 75); // 50 * 1.5 = 75 ml
			assert.equal(lipid.infusionRateMlPerMin, 12.5); // 50 * 0.25 = 12.5 ml/min
			assert.equal(lipid.infusionRateMlPerHour, 750); // 50 * 15 = 750 ml/h
			assert.equal(lipid.maxTotalDoseMl, 600); // 50 * 12 = 600 ml
		});
	});

	describe('4. Statutory Emergency Kit Memo (Приказ МЗ РФ № 786н / 1144н)', () => {
		it('contains standard statutory emergency medications (Adrenaline, Prednisolone, Suprastin)', () => {
			assert.ok(STATUTORY_EMERGENCY_KIT_MEMO.length >= 3);

			const adrenaline = STATUTORY_EMERGENCY_KIT_MEMO.find((k) => k.drugId === 'adrenaline_epi_01');
			assert.ok(adrenaline);
			assert.ok(adrenaline.tradeNameRu.includes('Адреналин'));
			assert.ok(adrenaline.dosageStandardRu.includes('0.5 мл'));
			assert.ok(adrenaline.routeRu.includes('бедра'));

			const prednisolone = STATUTORY_EMERGENCY_KIT_MEMO.find((k) => k.drugId === 'prednisolone_30mg');
			assert.ok(prednisolone);
			assert.ok(prednisolone.tradeNameRu.includes('Преднизолон'));
			assert.ok(prednisolone.dosageStandardRu.includes('90–120 мг'));

			const suprastin = STATUTORY_EMERGENCY_KIT_MEMO.find((k) => k.drugId === 'suprastin_2_percent');
			assert.ok(suprastin);
			assert.ok(suprastin.tradeNameRu.includes('Супрастин'));
			assert.ok(suprastin.dosageStandardRu.includes('20 мг'));
		});

		it('formats timer seconds cleanly', () => {
			assert.equal(formatTimerSeconds(300), '05:00');
			assert.equal(formatTimerSeconds(180), '03:00');
			assert.equal(formatTimerSeconds(65), '01:05');
			assert.equal(formatTimerSeconds(9), '00:09');
			assert.equal(formatTimerSeconds(0), '00:00');
		});
	});

	describe('5. Incident Act & SMP Protocol Generation', () => {
		const sampleIncident: EmergencyIncidentInput = {
			clinicName: 'ООО «Дента-Люкс»',
			clinicAddress: 'г. Москва, ул. Арбат, д. 25, оф. 4',
			cabinetNumber: '2',
			doctorFullName: 'Д-р Петров Сергей Александрович',
			assistantFullName: 'Медсестра Иванова М. И.',
			patientFullName: 'Сидоров Алексей Николаевич',
			patientAgeYears: 48,
			patientWeightKg: 82,
			patientGender: 'male',
			medCardNumber: '043/у-7819',
			scenarioId: 'anaphylactic_shock',
			incidentStartTime: new Date('2026-08-22T10:15:00'),
			initialVitals: {
				bpSystolic: 75,
				bpDiastolic: 45,
				hr: 125,
				spo2: 89,
				rr: 26,
				consciousnessRu: 'Спутанное'
			},
			finalVitals: {
				bpSystolic: 110,
				bpDiastolic: 70,
				hr: 88,
				spo2: 98,
				rr: 18,
				consciousnessRu: 'Ясное'
			},
			completedSteps: [
				{
					stepId: 'anaph_step_1',
					stepTitleRu: 'Прекратить воздействие аллергена и уложить пациента',
					timestamp: '10:15:20'
				},
				{
					stepId: 'anaph_step_3',
					stepTitleRu: 'Введение Адреналина (Эпинефрина) 0.1% внутримышечно',
					timestamp: '10:16:05',
					administeredMedicationRu: 'Адреналин 0.1%',
					doseDetailsRu: '0.5 мл в/м в бедро'
				}
			],
			smpCallTime: '10:16:30',
			smpArrivalTime: '10:28:00',
			smpBrigadeNumber: 'Бригада СМП № 42',
			patientOutcomeRu: 'Стабилизация гемодинамики, пациент передан бригаде СМП для госпитализации.'
		};

		it('generates statutory Russian Form 043/u incident act text', () => {
			const act = generateEmergencyIncidentAct(sampleIncident);
			assert.ok(act.includes('АКТ ОКАЗАНИЯ ЭКСТРЕННОЙ МЕДИЦИНСКОЙ ПОМОЩИ'));
			assert.ok(act.includes('043/у'));
			assert.ok(act.includes('ООО «Дента-Люкс»'));
			assert.ok(act.includes('Сидоров Алексей Николаевич'));
			assert.ok(act.includes('Анафилактический шок'));
			assert.ok(act.includes('T78.2'));
			assert.ok(act.includes('75/45'));
			assert.ok(act.includes('110/70'));
			assert.ok(act.includes('Адреналин 0.1%'));
			assert.ok(act.includes('10:16:05'));
			assert.ok(act.includes('Бригада СМП № 42'));
			assert.ok(act.includes('ПОДПИСИ'));
		});

		it('generates ambulance dispatcher 103 / 112 cheat sheet', () => {
			const cheatSheet = generateSmpDispatchCheatSheet(sampleIncident);
			assert.ok(cheatSheet.includes('ДИСПЕТЧЕРА СКОРОЙ ПОМОЩИ'));
			assert.ok(cheatSheet.includes('г. Москва, ул. Арбат, д. 25, оф. 4'));
			assert.ok(cheatSheet.includes('Сидоров Алексей Николаевич'));
			assert.ok(cheatSheet.includes('Анафилактический шок'));
			assert.ok(cheatSheet.includes('75/45'));
		});
	});

	describe('6. EmergencyRescueModal Component Rendering', () => {
		it('renders EmergencyRescueModal with high-contrast dosage cards and CPR standard', async () => {
			const React = await import('react');
			const { renderToStaticMarkup } = await import('react-dom/server');
			const { EmergencyRescueModal } = await import('../components/emergency/EmergencyRescueModal');

			const html = renderToStaticMarkup(
				React.createElement(EmergencyRescueModal, {
					isOpen: true,
					onClose: () => {},
					clinicName: 'ООО "Денте"',
					initialPatientName: 'Сидоров А.Н.',
					initialPatientAgeYears: 45,
					initialPatientWeightKg: 80,
				})
			);

			assert.ok(html.includes('ЭКСТРЕННЫЙ РЕАНИМАЦИОННЫЙ HUD'));
			assert.ok(html.includes('ВЫЗОВ СМП (103 / 112)'));
			assert.ok(html.includes('Экстренные дозировки препаратов'));
			assert.ok(html.includes('ТАЙМЕР ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА'));
			assert.ok(html.includes('СТАНДАРТ БАЗОВОЙ СЛР (МИНЗДРАВ РФ &amp; ФАР)') || html.includes('СТАНДАРТ БАЗОВОЙ СЛР (МИНЗДРАВ РФ & ФАР)'));
			assert.ok(html.includes('30 компрессий : 2 вдоха'));
			assert.ok(html.includes('100–120 в минуту'));
		});

		it('returns null when isOpen is false', async () => {
			const React = await import('react');
			const { renderToStaticMarkup } = await import('react-dom/server');
			const { EmergencyRescueModal } = await import('../components/emergency/EmergencyRescueModal');

			const html = renderToStaticMarkup(
				React.createElement(EmergencyRescueModal, {
					isOpen: false,
					onClose: () => {},
				})
			);

			assert.equal(html, '');
		});
	});
});
