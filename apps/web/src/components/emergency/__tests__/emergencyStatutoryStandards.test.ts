/**
 * emergencyStatutoryStandards.test.ts
 * Outpatient Dental Statutory Standards (Order 786n / 1079н / 1144н / 138н) & Timer Safety
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
import { calculateWeightAdjustedDose, STATUTORY_EMERGENCY_KIT_MEMO, formatTimerSeconds } from '../emergencyRescueEngine';
import { EMERGENCY_SCENARIOS } from '../emergencyRescuePresets';

const emergencyDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Red Team Inquisition: Statutory Standards & Memory Safety', () => {
	it('STATUTORY_EMERGENCY_KIT_MEMO contains essential outpatient dental drugs per Order 786n', () => {
		const drugIds = STATUTORY_EMERGENCY_KIT_MEMO.map((item) => item.drugId);
		assert.ok(drugIds.includes('adrenaline_epi_01'), 'Must include adrenaline per 786n/1079n');
		assert.ok(drugIds.includes('prednisolone_30mg'), 'Must include prednisolone per 786n/1144n');
		assert.ok(drugIds.includes('suprastin_2_percent'), 'Must include suprastin per 786n');
		assert.ok(drugIds.includes('salbutamol_spray'), 'Must include salbutamol per 786n/1144n');
		assert.ok(drugIds.includes('nitroglycerin_sublingual'), 'Must include nitroglycerin per 786n/138n');
		assert.ok(drugIds.includes('glucose_dextrose_40'), 'Must include 40% glucose per 786n');

		for (const item of STATUTORY_EMERGENCY_KIT_MEMO) {
			assert.ok(item.statutoryOrderRu.includes('786н'), `Item ${item.tradeNameRu} must cite order 786н`);
		}
	});

	it('Cardiac arrest adrenaline route is strictly outpatient IV / IM without intraosseous ICU bloat', () => {
		const adultDose = calculateWeightAdjustedDose('adrenaline_epi_01', 70, 40, true);
		assert.ok(adultDose.routeRu.includes('в/в'), 'Adult CPR route must support IV');
		assert.ok(!adultDose.routeRu.includes('внутрикостно'), 'Eradicate intraosseous ICU bloat');

		const pediatricDose = calculateWeightAdjustedDose('adrenaline_epi_01', 15, 4, true);
		assert.ok(!pediatricDose.routeRu.includes('внутрикостно'), 'Pediatric CPR route must not mention intraosseous');
	});

	it('Eradicates hospital ICU bloat from scenario action steps', () => {
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

	it('EmergencyRescueModal purges ticking simulation timers and cleans up clipboard timeout refs', () => {
		const modalPath = path.join(emergencyDir, 'EmergencyRescueModal.tsx');
		const content = fs.readFileSync(modalPath, 'utf8');
		assert.ok(!content.includes('setInterval'), 'Must not run ticking countdown setInterval in modal');
		assert.ok(content.includes('clearTimeout(copyActTimeoutRef.current)'), 'Must clear copyAct timeout');
		assert.ok(content.includes('clearTimeout(copyCheatSheetTimeoutRef.current)'), 'Must clear copyCheatSheet timeout');
		assert.ok(content.includes('clearTimeout(copyRelativeTimeoutRef.current)'), 'Must clear copyRelative timeout');
	});

	it('formatTimerSeconds correctly formats minutes and seconds', () => {
		assert.equal(formatTimerSeconds(300), '05:00');
		assert.equal(formatTimerSeconds(0), '00:00');
		assert.equal(formatTimerSeconds(65), '01:05');
		assert.equal(formatTimerSeconds(599), '09:59');
		assert.equal(formatTimerSeconds(-5), '00:00');
	});
});
