/**
 * emergencyPrintAndMessenger.test.tsx
 * Interactive testing for Wave 53: Print Act & Relative Notice Messenger Copy
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import '../../../../testCssStub.mjs';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EmergencyRescueModal } from '../EmergencyRescueModal';
import { setupMockDom, findNodeByTestId, clickNode, type MockDomNode } from './mockDomForRescue';

describe('Wave 53: Interactive Print & Messenger Notice', () => {
	let mockDom: ReturnType<typeof setupMockDom>;
	let container: MockDomNode;
	let root: Root | null = null;

	beforeEach(() => {
		mockDom = setupMockDom();
		container = mockDom.doc.createElement('div');
		mockDom.doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
		mockDom.reset();
	});

	it('clicking emergency-print-act-btn calls window.print() and shows info toast', async () => {
		await act(async () => {
			root?.render(<EmergencyRescueModal isOpen={true} onClose={() => {}} clinicName="Клиника DENTE" initialPatientName="Иванов Иван Иванович" />);
		});

		const printBtn = findNodeByTestId(container, 'emergency-print-act-btn');
		assert.ok(printBtn, 'emergency-print-act-btn must exist in DOM');
		assert.strictEqual(mockDom.wasPrintCalled(), false);

		await clickNode(printBtn);
		assert.strictEqual(mockDom.wasPrintCalled(), true);

		const toast = mockDom.getLastToast();
		assert.ok(toast);
		assert.strictEqual((toast as unknown as { detail: { text: string; type: string } }).detail?.text, 'Отправлено на печать: Акт передачи пациента бригаде СМП');
		assert.strictEqual((toast as unknown as { detail: { text: string; type: string } }).detail?.type, 'info');
	});

	it('clicking emergency-copy-relative-notice-btn copies notice to clipboard and shows success toast', async () => {
		await act(async () => {
			root?.render(
				<EmergencyRescueModal
					isOpen={true} onClose={() => {}} clinicName="Стоматология DENTE" clinicAddress="ул. Ленина, д. 5"
					clinicPhone="+7 (495) 987-65-43" cabinetNumber="4" initialPatientName="Васильев Андрей Дмитриевич" doctorFullName="Д-р Григорьев К. П."
				/>
			);
		});

		const copyRelativeBtn = findNodeByTestId(container, 'emergency-copy-relative-notice-btn');
		assert.ok(copyRelativeBtn);

		await clickNode(copyRelativeBtn);

		const copiedText = mockDom.getClipboardText();
		assert.ok(copiedText.length > 0);
		assert.ok(copiedText.includes('Стоматология DENTE'));
		assert.ok(copiedText.includes('Васильев Андрей Дмитриевич'));
		assert.ok(copiedText.includes('Анафилактический шок'));
		assert.ok(copiedText.includes('ул. Ленина, д. 5, кабинет 4'));
		assert.ok(copiedText.includes('+7 (495) 987-65-43'));
		assert.ok(copiedText.includes('Д-р Григорьев К. П.'));

		const toast = mockDom.getLastToast();
		assert.ok(toast);
		assert.strictEqual((toast as unknown as { detail: { text: string } }).detail?.text, 'Извещение для родственников скопировано в буфер обмена');
	});

	it('uses clean fallback when clinicPhone prop is omitted', async () => {
		await act(async () => {
			root?.render(<EmergencyRescueModal isOpen={true} onClose={() => {}} initialPatientName="Тестов Т. Т." />);
		});

		const copyRelativeBtn = findNodeByTestId(container, 'emergency-copy-relative-notice-btn');
		assert.ok(copyRelativeBtn);

		await clickNode(copyRelativeBtn);
		const copiedText = mockDom.getClipboardText();
		assert.ok(!copiedText.includes('+7 (495) 123-45-67'));
		assert.ok(copiedText.includes('Контактный телефон клиники для связи: не указан'));
	});
});
