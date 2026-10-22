/**
 * emergencyRelativeNotice.test.ts
 * Pure function & markup tests for Wave 53 / Feature 241
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../../../testCssStub.mjs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EmergencyRescueModal, formatEmergencyRelativeNotice, type EmergencyRelativeNoticeParams } from '../EmergencyRescueModal';

const emergencyDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARTOON_EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('Wave 53: Emergency Relative Notice & Markup', () => {
	const sampleParams: EmergencyRelativeNoticeParams = {
		clinicName: 'Стоматологическая клиника DENTE',
		clinicAddress: 'г. Москва, ул. Клиническая, д. 10, стр. 2',
		clinicPhone: '+7 (495) 123-45-67',
		cabinetNumber: '3',
		patientName: 'Сидоров Петр Алексеевич',
		scenarioTitleRu: 'Анафилактический шок',
		doctorFullName: 'Д-р Соколов И. В.'
	};

	it('formats structured emergency notice with all required attributes and zero emojis', () => {
		const text = formatEmergencyRelativeNotice(sampleParams);
		assert.ok(text.includes('Экстренное медицинское извещение (клиника «Стоматологическая клиника DENTE»):'));
		assert.ok(text.includes('Пациент: Сидоров Петр Алексеевич'));
		assert.ok(text.includes('Клиническое состояние: Анафилактический шок'));
		assert.ok(text.includes('Адрес нахождения пациента: г. Москва, ул. Клиническая, д. 10, стр. 2, кабинет 3.'));
		assert.ok(text.includes('Лечащий врач: Д-р Соколов И. В.'));
		assert.ok(text.includes('Контактный телефон клиники для связи: +7 (495) 123-45-67.'));
		assert.strictEqual(CARTOON_EMOJI_REGEX.test(text), false);
	});

	it('respects different clinic phone numbers and custom scenarios', () => {
		const customNotice = formatEmergencyRelativeNotice({
			...sampleParams,
			clinicPhone: '+7 (812) 999-88-77',
			scenarioTitleRu: 'LAST-интоксикация местным анестетиком',
			cabinetNumber: '2'
		});
		assert.ok(customNotice.includes('+7 (812) 999-88-77'));
		assert.ok(customNotice.includes('Клиническое состояние: LAST-интоксикация местным анестетиком'));
		assert.ok(customNotice.includes('кабинет 2'));
		assert.strictEqual(CARTOON_EMOJI_REGEX.test(customNotice), false);
	});

	it('renders emergency-print-act-btn and emergency-copy-relative-notice-btn when open', () => {
		const html = renderToString(
			<EmergencyRescueModal isOpen={true} onClose={() => {}} clinicName="ООО ДЕНТЕ" clinicPhone="+7 (495) 777-88-99" initialPatientName="Петров В. В." />
		);
		assert.ok(html.includes('data-testid="emergency-print-act-btn"'));
		assert.ok(html.includes('Печать Акта (СМП)'));
		assert.ok(html.includes('data-testid="emergency-copy-relative-notice-btn"'));
		assert.ok(html.includes('Извещение родственникам'));
		assert.ok(html.includes('title="Распечатать Акт оказания экстренной помощи для передачи бригаде СМП (А4)"'));
		assert.ok(html.includes('title="Скопировать экстренное извещение для родственников в WhatsApp/Telegram"'));
	});

	it('renders null when isOpen is false', () => {
		const html = renderToString(<EmergencyRescueModal isOpen={false} onClose={() => {}} />);
		assert.strictEqual(html, '');
	});

	it('buttons have class emergency-copy-act-btn and CSS defines min-height: 44px', () => {
		const html = renderToString(<EmergencyRescueModal isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes('data-testid="emergency-print-act-btn"'));
		assert.ok(html.includes('data-testid="emergency-copy-relative-notice-btn"'));

		const cssPath = path.resolve(emergencyDir, 'emergencyRescue.css');
		assert.ok(fs.existsSync(cssPath));
		const cssContent = fs.readFileSync(cssPath, 'utf-8');
		assert.ok(cssContent.includes('.emergency-copy-act-btn'));
		assert.ok(cssContent.includes('min-height: 44px;'));
	});
});
