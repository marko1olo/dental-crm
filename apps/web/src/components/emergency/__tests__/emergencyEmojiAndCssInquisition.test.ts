/**
 * emergencyEmojiAndCssInquisition.test.ts
 * Cartoon Emoji Invariance (Mandate 8d pt 7) & CSS Token / Touch Target Compliance
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../../../testCssStub.mjs';
import { formatEmergencyRelativeNotice } from '../EmergencyRescueModal';
import { generateEmergencyIncidentAct, type EmergencyIncidentInput } from '../emergencyRescueEngine';

const emergencyDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARTOON_EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('Red Team Inquisition: Emojis & CSS Tokens', () => {
	const targetFiles = ['EmergencyRescueModal.tsx', 'emergencyRescueEngine.ts', 'emergencyRescuePresets.ts', 'emergencyRescue.css'];
	for (const file of targetFiles) {
		it(`File ${file} contains strictly ZERO cartoon emojis`, () => {
			const content = fs.readFileSync(path.join(emergencyDir, file), 'utf8');
			content.split('\n').forEach((line, idx) => {
				assert.ok(!CARTOON_EMOJI_REGEX.test(line), `Emoji in ${file}:${idx + 1}`);
			});
		});
	}

	it('Generated notice and Act contain zero cartoon emojis', () => {
		const notice = formatEmergencyRelativeNotice({
			clinicName: 'DENTE', clinicAddress: 'Москва', clinicPhone: '+7 (495) 000-00-00',
			cabinetNumber: '1', patientName: 'Сидоров С.С.', scenarioTitleRu: 'Анафилактический шок', doctorFullName: 'Доктор'
		});
		assert.ok(!CARTOON_EMOJI_REGEX.test(notice));

		const incident: EmergencyIncidentInput = {
			clinicName: 'DENTE', clinicAddress: 'Москва', cabinetNumber: '1', doctorFullName: 'Доктор',
			patientFullName: 'Пациент', patientAgeYears: 40, patientWeightKg: 70, patientGender: 'male',
			medCardNumber: '043-1', scenarioId: 'anaphylactic_shock', incidentStartTime: new Date(),
			initialVitals: { bpSystolic: 80, bpDiastolic: 50, hr: 110, spo2: 92, rr: 20, consciousnessRu: 'Ясное' },
			completedSteps: [], patientOutcomeRu: 'Стабилизирован'
		};
		assert.ok(!CARTOON_EMOJI_REGEX.test(generateEmergencyIncidentAct(incident)));
	});

	it('emergencyRescue.css and EmergencyRescueModal.tsx contain ZERO hardcoded hex colors', () => {
		const cssContent = fs.readFileSync(path.join(emergencyDir, 'emergencyRescue.css'), 'utf8');
		assert.equal(cssContent.match(/#[0-9a-fA-F]{3,8}\b/g), null);

		const tsxContent = fs.readFileSync(path.join(emergencyDir, 'EmergencyRescueModal.tsx'), 'utf8');
		assert.equal(tsxContent.match(/#[0-9a-fA-F]{3,8}\b/g), null);
	});

	it('emergencyRescue.css defines semantic classes for buttons and chips', () => {
		const content = fs.readFileSync(path.join(emergencyDir, 'emergencyRescue.css'), 'utf8');
		assert.ok(content.includes('.emergency-copy-act-btn.teal'));
		assert.ok(content.includes('.emergency-copy-act-btn.primary'));
		assert.ok(content.includes('.emergency-copy-act-btn.danger'));
		assert.ok(content.includes('.emergency-copy-act-btn.surface'));
		assert.ok(content.includes('.emergency-quick-weight-presets'));
		assert.ok(content.includes('.emergency-weight-chip'));
		assert.ok(content.includes('.emergency-kit-row'));
	});

	it('emergencyRescue.css enforces high-stress touch targets min-height >= 48px', () => {
		const content = fs.readFileSync(path.join(emergencyDir, 'emergencyRescue.css'), 'utf8');
		assert.ok(content.match(/\.emergency-weight-chip\s*\{[^}]*min-height:\s*48px/));
		assert.ok(content.match(/\.emergency-timer-btn\s*\{[^}]*min-height:\s*48px/));
		assert.ok(content.match(/\.emergency-call-112-btn\s*\{[^}]*min-height:\s*48px/));
		assert.ok(content.match(/\.emergency-copy-act-btn\s*\{[^}]*min-height:\s*48px/));
	});
});
