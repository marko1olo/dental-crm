/**
 * emergencyOutpatientAutonomyInquisition.test.ts
 *
 * Inquisitorial Red Team Test Suite for:
 * - Outpatient Clinical Autonomy & Statutory Standards (Приказ Минздрава РФ № 786н / 1079н / 1144н / 138н)
 * - Eradication of Hospital Inpatient ICU Bloat (propofol, vasopressin, intraosseous access in dental chair)
 * - Doctor Autonomy (Mandate 8e: zero disabled buttons, 1-click dose calculation, 1-click SMP 112 dispatch cheat sheet)
 * - Zero Cartoon Emojis (Mandate 8d pt 7)
 * - Timer Cleanup & Memory Leak Safety (Node/React 19 lifecycle safety, no leaking intervals/timeouts)
 * - CSS Design Token Compliance (zero hardcoded hex colors)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
	EmergencyRescueModal,
	formatEmergencyRelativeNotice
} from '../EmergencyRescueModal';
import {
	calculateWeightAdjustedDose,
	calculateAllEmergencyDosages,
	calculateLipidRescueDoses,
	generateEmergencyIncidentAct,
	generateSmpDispatchCheatSheet,
	STATUTORY_EMERGENCY_KIT_MEMO,
	formatTimerSeconds,
	type EmergencyIncidentInput
} from '../emergencyRescueEngine';
import {
	EMERGENCY_SCENARIOS,
	type EmergencyScenarioId
} from '../emergencyRescuePresets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const emergencyDir = path.resolve(__dirname, '..');

// Cartoon Emoji Validator per Mandate 8d pt 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('Red Team Inquisition: Outpatient Clinical Autonomy & Emergency Protocols', () => {

	describe('1. Outpatient Dental Statutory Standards (Order 786n / 1079н / 1144н / 138н)', () => {
		it('STATUTORY_EMERGENCY_KIT_MEMO contains essential outpatient dental drugs per Order 786n', () => {
			const drugIds = STATUTORY_EMERGENCY_KIT_MEMO.map((item) => item.drugId);
			assert.ok(drugIds.includes('adrenaline_epi_01'), 'Must include adrenaline per 786n/1079n');
			assert.ok(drugIds.includes('prednisolone_30mg'), 'Must include prednisolone per 786n/1144n');
			assert.ok(drugIds.includes('suprastin_2_percent'), 'Must include suprastin per 786n');
			assert.ok(drugIds.includes('salbutamol_spray'), 'Must include salbutamol per 786n/1144n');
			assert.ok(drugIds.includes('nitroglycerin_sublingual'), 'Must include nitroglycerin per 786n/138n');
			assert.ok(drugIds.includes('glucose_dextrose_40'), 'Must include 40% glucose per 786n');

			// Every item references Order 786n
			for (const item of STATUTORY_EMERGENCY_KIT_MEMO) {
				assert.ok(
					item.statutoryOrderRu.includes('786н'),
					`Item ${item.tradeNameRu} must cite statutory order 786н`
				);
			}
		});

		it('Cardiac arrest adrenaline route is strictly outpatient IV / IM without intraosseous ICU bloat', () => {
			const adultDose = calculateWeightAdjustedDose('adrenaline_epi_01', 70, 40, true);
			assert.ok(adultDose.routeRu.includes('в/в'), 'Adult CPR route must support IV');
			assert.ok(!adultDose.routeRu.includes('внутрикостно'), 'Eradicate intraosseous ICU bloat');

			const pediatricDose = calculateWeightAdjustedDose('adrenaline_epi_01', 15, 4, true);
			assert.ok(!pediatricDose.routeRu.includes('внутрикостно'), 'Pediatric CPR route must not mention intraosseous');
		});

		it('Eradicates hospital ICU bloat (propofol, vasopressin, ca-channel blockers) from scenario action steps', () => {
			const lastScenario = EMERGENCY_SCENARIOS.local_anesthetic_toxicity;
			assert.ok(lastScenario, 'LAST scenario must exist');

			const allText = JSON.stringify(lastScenario);
			assert.ok(!allText.includes('пропофол'), 'Must not reference inpatient propofol');
			assert.ok(!allText.includes('вазопрессин'), 'Must not reference inpatient vasopressin');
			assert.ok(!allText.includes('блокаторы Ca-каналов'), 'Must not reference hospital Ca-channel blockers');
		});

		it('Header badge in EmergencyRescueModal explicitly cites Order 786n dental standard', () => {
			const html = renderToString(React.createElement(EmergencyRescueModal, { isOpen: true, onClose: () => {} }));
			assert.ok(html.includes('786н'), 'Modal header badge must include Order 786н');
		});
	});

	describe('2. Doctor Autonomy (Mandate 8e)', () => {
		it('Has zero disabled buttons or blocked controls on critical rescue path', () => {
			const modalPath = path.join(emergencyDir, 'EmergencyRescueModal.tsx');
			const content = fs.readFileSync(modalPath, 'utf8');

			// Check for disabled attribute in JSX buttons
			const buttonMatches = content.match(/<button[^>]*disabled[^>]*>/gi) || [];
			assert.equal(buttonMatches.length, 0, 'No buttons in EmergencyRescueModal may be disabled');

			// Also render SSR and verify no disabled buttons in output HTML
			const html = renderToString(React.createElement(EmergencyRescueModal, { isOpen: true, onClose: () => {} }));
			assert.ok(!html.includes('disabled=""') && !html.includes('disabled '), 'Rendered HTML must have zero disabled buttons');
		});

		it('Provides 1-click weight preset chips for instantaneous dose recalculation without keyboard typing', () => {
			const html = renderToString(React.createElement(EmergencyRescueModal, { isOpen: true, onClose: () => {} }));
			assert.ok(html.includes('data-testid="preset-weight-15"'), 'Must have 15 kg child preset chip');
			assert.ok(html.includes('data-testid="preset-weight-45"'), 'Must have 45 kg teen preset chip');
			assert.ok(html.includes('data-testid="preset-weight-70"'), 'Must have 70 kg adult preset chip');
			assert.ok(html.includes('data-testid="preset-weight-90"'), 'Must have 90 kg heavy adult preset chip');
		});

		it('Recalculates all drug dosages accurately across pediatric and adult weight presets', () => {
			// Child 15 kg
			const childDoses = calculateAllEmergencyDosages(15, 4);
			assert.equal(childDoses.adrenaline_epi_01.calculatedVolumeMl, 0.15, 'Child 15kg adrenaline volume must be 0.15 ml');
			assert.equal(childDoses.prednisolone_30mg.calculatedDoseMg, 38, 'Child 15kg prednisolone (2.5 mg/kg) ~ 38 mg');
			assert.ok(childDoses.adrenaline_epi_01.isPediatricDose, 'Must be flagged as pediatric dose');

			// Adult 70 kg
			const adultDoses = calculateAllEmergencyDosages(70, 35);
			assert.equal(adultDoses.adrenaline_epi_01.calculatedVolumeMl, 0.5, 'Adult 70kg adrenaline volume must be 0.5 ml');
			assert.equal(adultDoses.prednisolone_30mg.calculatedDoseMg, 120, 'Adult 70kg prednisolone must be 120 mg');
			assert.ok(!adultDoses.adrenaline_epi_01.isPediatricDose, 'Must be flagged as adult dose');

			// Lipid Rescue calculation
			const lipidDoses = calculateLipidRescueDoses(70);
			assert.equal(lipidDoses.bolusVolumeMl, 105, 'Lipid bolus for 70kg must be 105 ml (1.5 ml/kg)');
			assert.equal(lipidDoses.maxTotalDoseMl, 840, 'Max lipid dose for 70kg must be 840 ml (12 ml/kg)');
		});

		it('Provides 1-click SMP 112 dispatch cheat sheet copy button with dedicated testid', () => {
			const html = renderToString(React.createElement(EmergencyRescueModal, { isOpen: true, onClose: () => {} }));
			assert.ok(html.includes('data-testid="emergency-call-112-header-btn"'), 'Header call 112 button must have testid');
			assert.ok(html.includes('emergency-call-112-btn'), 'Header button must have call class');

			// Check generated cheat sheet content
			const incident: EmergencyIncidentInput = {
				clinicName: 'ДЕНТЕ Клиника',
				clinicAddress: 'ул. Стоматологическая 5',
				cabinetNumber: '2',
				doctorFullName: 'Иванов И.И.',
				patientFullName: 'Петров П.П.',
				patientAgeYears: 30,
				patientWeightKg: 75,
				patientGender: 'male',
				medCardNumber: '043-123',
				scenarioId: 'anaphylactic_shock',
				incidentStartTime: new Date(),
				initialVitals: {
					bpSystolic: 80,
					bpDiastolic: 50,
					hr: 120,
					spo2: 90,
					rr: 22,
					consciousnessRu: 'Спутанное'
				},
				completedSteps: [],
				patientOutcomeRu: 'Купировано'
			};
			const cheatSheet = generateSmpDispatchCheatSheet(incident);
			assert.ok(cheatSheet.includes('103 / 112'), 'Cheat sheet must include 103 / 112');
			assert.ok(cheatSheet.includes('ул. Стоматологическая 5'), 'Cheat sheet must include clinic address');
			assert.ok(cheatSheet.includes('Анафилактический шок'), 'Cheat sheet must include scenario name');
		});
	});

	describe('3. Cartoon Emoji Invariance (Mandate 8d pt 7)', () => {
		const targetFiles = [
			'EmergencyRescueModal.tsx',
			'emergencyRescueEngine.ts',
			'emergencyRescuePresets.ts',
			'emergencyRescue.css'
		];

		for (const file of targetFiles) {
			it(`File ${file} contains strictly ZERO cartoon emojis`, () => {
				const filePath = path.join(emergencyDir, file);
				const content = fs.readFileSync(filePath, 'utf8');
				const lines = content.split('\n');

				lines.forEach((line, idx) => {
					assert.ok(
						!CARTOON_EMOJI_REGEX.test(line),
						`Cartoon emoji found in ${file}:${idx + 1}: ${line}`
					);
				});
			});
		}

		it('Generated emergency notice for relatives contains zero cartoon emojis', () => {
			const notice = formatEmergencyRelativeNotice({
				clinicName: 'DENTE',
				clinicAddress: 'Москва',
				clinicPhone: '+7 (495) 000-00-00',
				cabinetNumber: '1',
				patientName: 'Сидоров С.С.',
				scenarioTitleRu: 'Анафилактический шок',
				doctorFullName: 'Доктор'
			});
			assert.ok(!CARTOON_EMOJI_REGEX.test(notice), 'Relative notice must not contain cartoon emojis');
		});

		it('Generated Form 043/u Act contains zero cartoon emojis', () => {
			const incident: EmergencyIncidentInput = {
				clinicName: 'DENTE',
				clinicAddress: 'Москва',
				cabinetNumber: '1',
				doctorFullName: 'Доктор',
				patientFullName: 'Пациент',
				patientAgeYears: 40,
				patientWeightKg: 70,
				patientGender: 'male',
				medCardNumber: '043-1',
				scenarioId: 'anaphylactic_shock',
				incidentStartTime: new Date(),
				initialVitals: {
					bpSystolic: 80,
					bpDiastolic: 50,
					hr: 110,
					spo2: 92,
					rr: 20,
					consciousnessRu: 'Ясное'
				},
				completedSteps: [],
				patientOutcomeRu: 'Стабилизирован'
			};
			const actText = generateEmergencyIncidentAct(incident);
			assert.ok(!CARTOON_EMOJI_REGEX.test(actText), 'Act text must not contain cartoon emojis');
		});
	});

	describe('4. Timer & Memory Leak Safety', () => {
		it('EmergencyRescueModal handles interval cleanup and pauses timer when closed', () => {
			const modalPath = path.join(emergencyDir, 'EmergencyRescueModal.tsx');
			const content = fs.readFileSync(modalPath, 'utf8');

			// Check for clearInterval in useEffect cleanup
			assert.ok(content.includes('clearInterval(intervalId)'), 'Must call clearInterval in cleanup');

			// Check that isOpen guards the timer effect
			assert.ok(content.includes('if (!isOpen)'), 'Must guard timer with !isOpen to stop when closed');

			// Check for timeout ref cleanup
			assert.ok(content.includes('clearTimeout(copyActTimeoutRef.current)'), 'Must clear copyAct timeout');
			assert.ok(content.includes('clearTimeout(copyCheatSheetTimeoutRef.current)'), 'Must clear copyCheatSheet timeout');
		});

		it('formatTimerSeconds correctly formats minutes and seconds', () => {
			assert.equal(formatTimerSeconds(300), '05:00');
			assert.equal(formatTimerSeconds(0), '00:00');
			assert.equal(formatTimerSeconds(65), '01:05');
			assert.equal(formatTimerSeconds(599), '09:59');
			assert.equal(formatTimerSeconds(-5), '00:00');
		});
	});

	describe('5. CSS Token Compliance & Zero Hardcoded Hex Colors', () => {
		it('emergencyRescue.css contains strictly ZERO hardcoded hex colors', () => {
			const cssPath = path.join(emergencyDir, 'emergencyRescue.css');
			const content = fs.readFileSync(cssPath, 'utf8');
			const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
			assert.equal(hexMatches, null, `Found forbidden hex colors in emergencyRescue.css: ${hexMatches?.join(', ')}`);
		});

		it('EmergencyRescueModal.tsx contains strictly ZERO hardcoded hex colors', () => {
			const tsxPath = path.join(emergencyDir, 'EmergencyRescueModal.tsx');
			const content = fs.readFileSync(tsxPath, 'utf8');
			const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
			assert.equal(hexMatches, null, `Found forbidden hex colors in EmergencyRescueModal.tsx: ${hexMatches?.join(', ')}`);
		});

		it('emergencyRescue.css defines and uses semantic classes for buttons and chips', () => {
			const cssPath = path.join(emergencyDir, 'emergencyRescue.css');
			const content = fs.readFileSync(cssPath, 'utf8');

			assert.ok(content.includes('.emergency-copy-act-btn.teal'), 'Must have .teal button modifier');
			assert.ok(content.includes('.emergency-copy-act-btn.primary'), 'Must have .primary button modifier');
			assert.ok(content.includes('.emergency-copy-act-btn.danger'), 'Must have .danger button modifier');
			assert.ok(content.includes('.emergency-copy-act-btn.surface'), 'Must have .surface button modifier');
			assert.ok(content.includes('.emergency-quick-weight-presets'), 'Must have .emergency-quick-weight-presets');
			assert.ok(content.includes('.emergency-weight-chip'), 'Must have .emergency-weight-chip');
			assert.ok(content.includes('.emergency-kit-row'), 'Must have .emergency-kit-row');
		});
	});
});
