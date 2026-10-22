/**
 * emergencyDoctorAutonomy.test.ts
 * Doctor Autonomy & Ergonomics (Mandate 8e: 0 disabled buttons, weight chips, 112 cheat sheet, writeoff)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../../../testCssStub.mjs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EmergencyRescueModal } from '../EmergencyRescueModal';
import { calculateAllEmergencyDosages, calculateLipidRescueDoses, generateSmpDispatchCheatSheet, type EmergencyIncidentInput } from '../emergencyRescueEngine';

const emergencyDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Red Team Inquisition: Doctor Autonomy (Mandate 8e)', () => {
	it('Has zero disabled buttons or blocked controls on critical rescue path', () => {
		const modalPath = path.join(emergencyDir, 'EmergencyRescueModal.tsx');
		const content = fs.readFileSync(modalPath, 'utf8');
		const buttonMatches = content.match(/<button[^>]*disabled[^>]*>/gi) || [];
		assert.equal(buttonMatches.length, 0, 'No buttons in EmergencyRescueModal may be disabled');

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
		const childDoses = calculateAllEmergencyDosages(15, 4);
		assert.equal(childDoses.adrenaline_epi_01.calculatedVolumeMl, 0.15, 'Child 15kg adrenaline volume must be 0.15 ml');
		assert.equal(childDoses.prednisolone_30mg.calculatedDoseMg, 38, 'Child 15kg prednisolone ~ 38 mg');
		assert.ok(childDoses.adrenaline_epi_01.isPediatricDose, 'Must be flagged as pediatric dose');

		const adultDoses = calculateAllEmergencyDosages(70, 35);
		assert.equal(adultDoses.adrenaline_epi_01.calculatedVolumeMl, 0.5, 'Adult 70kg adrenaline volume must be 0.5 ml');
		assert.equal(adultDoses.prednisolone_30mg.calculatedDoseMg, 120, 'Adult 70kg prednisolone must be 120 mg');
		assert.ok(!adultDoses.adrenaline_epi_01.isPediatricDose, 'Must be flagged as adult dose');

		const lipidDoses = calculateLipidRescueDoses(70);
		assert.equal(lipidDoses.bolusVolumeMl, 105, 'Lipid bolus for 70kg must be 105 ml');
		assert.equal(lipidDoses.maxTotalDoseMl, 840, 'Max lipid dose for 70kg must be 840 ml');
	});

	it('Provides 1-click SMP 112 dispatch cheat sheet copy button with dedicated testid', () => {
		const html = renderToString(React.createElement(EmergencyRescueModal, { isOpen: true, onClose: () => {} }));
		assert.ok(html.includes('data-testid="emergency-call-112-header-btn"'), 'Header call 112 button must have testid');
		assert.ok(html.includes('emergency-call-112-btn'), 'Header button must have call class');

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
			initialVitals: { bpSystolic: 80, bpDiastolic: 50, hr: 120, spo2: 90, rr: 22, consciousnessRu: 'Спутанное' },
			completedSteps: [],
			patientOutcomeRu: 'Купировано'
		};
		const cheatSheet = generateSmpDispatchCheatSheet(incident);
		assert.ok(cheatSheet.includes('103 / 112'), 'Cheat sheet must include 103 / 112');
		assert.ok(cheatSheet.includes('ул. Стоматологическая 5'), 'Cheat sheet must include clinic address');
		assert.ok(cheatSheet.includes('Анафилактический шок'), 'Cheat sheet must include scenario name');
	});

	it('Provides 1-click Antishock kit warehouse write-off buttons', () => {
		const html = renderToString(React.createElement(EmergencyRescueModal, { isOpen: true, onClose: () => {} }));
		assert.ok(html.includes('data-testid="emergency-writeoff-kit-btn"'), 'Must have emergency-writeoff-kit-btn in kit pane');
		assert.ok(html.includes('data-testid="emergency-handover-writeoff-btn"'), 'Must have emergency-handover-writeoff-btn in cheatsheet pane');
	});
});
